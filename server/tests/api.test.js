const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const http = require('node:http');
const bcrypt = require('bcryptjs');

const env = require('../config/env');
const { pool } = require('../config/db');
const {
  validateCreateComplaint,
  validateTrackComplaint,
  validateLookupMobile,
  validateStatusUpdate,
} = require('../validators/complaintValidator');
const { parseImagePaths, generateComplaintId } = require('../utils/complaintUtils');
const { verifyPassword } = require('../services/authService');
const { classifyLegacyComplaints } = require('../scripts/migrateLegacyComplaints');
const { detectImageTypeFromBuffer } = require('../middleware/uploadMiddleware');
const publicRoutes = require('../routes/publicRoutes');
const adminRoutes = require('../routes/adminRoutes');
const app = require('../app');

function invokeApp(expressApp, { method = 'GET', url = '/', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const reqStream = new PassThrough();
    const req = new http.IncomingMessage(reqStream);
    req.method = method;
    req.url = url;
    req.headers = {
      host: 'localhost',
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    };

    if (body !== null) {
      const payload = Buffer.isBuffer(body)
        ? body
        : typeof body === 'string'
          ? Buffer.from(body)
          : Buffer.from(JSON.stringify(body));
      if (!req.headers['content-type']) {
        req.headers['content-type'] = 'application/json';
      }
      req.headers['content-length'] = String(payload.length);
      req.push(payload);
    }
    req.push(null);

    const res = new http.ServerResponse(req);
    const chunks = [];
    const socketStub = new PassThrough();
    socketStub.writable = true;
    res.assignSocket(socketStub);

    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    res.write = (chunk, encoding, cb) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      return origWrite(chunk, encoding, cb);
    };
    res.end = (chunk, encoding, cb) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      const rawBody = Buffer.concat(chunks).toString('utf8');
      let parsedBody = rawBody;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        // Leave as string if non-JSON.
      }
      origEnd(chunk, encoding, cb);
      resolve({ status: res.statusCode, headers: res.getHeaders(), body: parsedBody });
    };

    expressApp.handle(req, res, reject);
  });
}

function buildMultipartPayload(fields = {}, files = []) {
  const boundary = '----GramSetuTestBoundary987';
  const parts = [];

  for (const [k, v] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
      )
    );
  }

  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldName || 'images[]'}"; filename="${file.filename}"\r\nContent-Type: ${file.mimeType}\r\n\r\n`
      )
    );
    parts.push(file.buffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(parts),
  };
}

function extractCookiePair(setCookieHeader) {
  const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const first = list.find(Boolean) || '';
  return first.split(';')[0];
}

describe('GramSetu Backend Unit & Integration Tests (Mocked DB)', () => {
  let originalExecute;
  let originalGetConnection;

  before(() => {
    originalExecute = pool.execute.bind(pool);
    originalGetConnection = pool.getConnection.bind(pool);
  });

  beforeEach(() => {
    publicRoutes.limiters.submitComplaintLimiter.reset();
    publicRoutes.limiters.trackLookupLimiter.reset();
    adminRoutes.limiters.loginLimiter.reset();
  });

  after(() => {
    pool.execute = originalExecute;
    pool.getConnection = originalGetConnection;
  });

  it('validates complaint creation, tracking, lookup, and status payloads', () => {
    const missing = validateCreateComplaint({ name: 'Lakshmi' });
    assert.equal(missing.valid, false);
    assert.equal(missing.message, 'Please fill all required fields');

    const badMobile = validateCreateComplaint({
      name: 'Lakshmi Devi',
      mobile: '12345',
      village_id: '1',
      category: 'Street Light',
      title: 'Light broken',
      description: 'Near main road',
    });
    assert.equal(badMobile.valid, false);
    assert.equal(badMobile.message, 'Please enter a valid 10-digit mobile number');

    assert.equal(validateTrackComplaint({ complaint_id: '', mobile: '9876543210' }).valid, false);
    assert.equal(validateTrackComplaint({ complaint_id: 'bad id!', mobile: '9876543210' }).valid, false);
    assert.equal(validateTrackComplaint({ complaint_id: 'GS-2026-12345', mobile: 'abc' }).valid, false);
    assert.equal(validateTrackComplaint({ complaint_id: 'GS-2026-12345', mobile: '9876543210' }).valid, true);

    assert.equal(validateLookupMobile({ mobile: '' }).valid, false);
    assert.equal(validateLookupMobile({ mobile: '98765' }).valid, false);
    assert.equal(validateLookupMobile({ mobile: '9876543210' }).valid, true);

    assert.equal(validateStatusUpdate({ status: 'Invalid' }).valid, false);
    assert.equal(validateStatusUpdate({ status: 'In Progress' }).valid, true);
  });

  it('parses image_path whether JSON array, single string, or null', () => {
    assert.deepEqual(parseImagePaths(null), []);
    assert.deepEqual(parseImagePaths('NULL'), []);
    assert.deepEqual(parseImagePaths('["uploads/images/a.jpg","uploads/images/b.png"]'), [
      'uploads/images/a.jpg',
      'uploads/images/b.png',
    ]);
    assert.deepEqual(parseImagePaths('uploads/images/legacy.jpg'), ['uploads/images/legacy.jpg']);
  });

  it('generates GS-YYYY-XXXXX complaint IDs', () => {
    const id = generateComplaintId();
    assert.match(id, /^GS-\d{4}-\d{5}$/);
  });

  it('supports both bcrypt ($2a$/$2y$) and legacy plaintext passwords', async () => {
    const plainCheck = await verifyPassword('admin', 'admin');
    assert.equal(plainCheck.matched, true);
    assert.equal(plainCheck.needsRehash, true);

    const hash = await bcrypt.hash('secret123', 4);
    const phpStyleHash = `$2y$${hash.slice(4)}`;
    const hashCheck = await verifyPassword('secret123', phpStyleHash);
    assert.equal(hashCheck.matched, true);
    assert.equal(hashCheck.needsRehash, false);
  });

  it('classifies legacy complaints safely and skips ambiguous or unmatched village names', () => {
    const legacyComplaints = [
      { id: 1, complaint_id: 'GS-2026-36691', village: 'hjgf', village_id: null, panchayath_id: null },
      { id: 8, complaint_id: 'GS-2026-77716', village: 'kaza', village_id: null, panchayath_id: null },
      { id: 9, complaint_id: 'GS-2026-73512', village: ' guntur ', village_id: null, panchayath_id: null },
      { id: 10, complaint_id: 'GS-2026-99999', village: 'Ramapuram', village_id: null, panchayath_id: null },
      { id: 11, complaint_id: 'GS-2026-59312', village: null, village_id: 1, panchayath_id: 1 },
    ];
    const activeVillages = [
      { id: 1, name: 'Kondapalli', panchayath_id: 1, status: 'active' },
      { id: 4, name: 'Guntur', panchayath_id: 2, status: 'active' },
      { id: 20, name: 'Ramapuram', panchayath_id: 1, status: 'active' },
      { id: 21, name: 'Ramapuram', panchayath_id: 3, status: 'active' },
    ];

    const result = classifyLegacyComplaints(legacyComplaints, activeVillages);
    assert.equal(result.unambiguous.length, 1);
    assert.equal(result.unambiguous[0].id, 9);
    assert.equal(result.unambiguous[0].village_id, 4);
    assert.equal(result.unambiguous[0].panchayath_id, 2);

    assert.equal(result.ambiguous.length, 1);
    assert.equal(result.ambiguous[0].id, 10);
    assert.deepEqual(result.ambiguous[0].candidate_panchayath_ids, [1, 3]);

    assert.equal(result.unmatched.length, 2);
  });

  it('detects real JPEG/PNG magic bytes and rejects non-image content', () => {
    assert.equal(detectImageTypeFromBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), 'jpeg');
    assert.equal(
      detectImageTypeFromBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'png'
    );
    assert.equal(detectImageTypeFromBuffer(Buffer.from('<script>alert(1)</script>')), null);
  });

  it('GET /test confirms backend server is running', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/test' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('GET /api/villages returns active villages from database', async () => {
    pool.execute = async () => [
      [{ id: 1, village_name: 'Kondapalli', panchayath_id: 1, panchayath_name: 'Kondapalli Panchayath' }],
    ];
    const res = await invokeApp(app, { method: 'GET', url: '/api/villages' });
    assert.equal(res.status, 200);
    assert.equal(res.body.villages.length, 1);
  });

  it('POST /api/complaints accepts valid JPEG content and rejects spoofed .jpg file content', async () => {
    let committed = false;
    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async (sql) => {
        if (sql.includes('FROM villages')) return [[{ id: 1, panchayath_id: 1 }]];
        if (sql.includes('SELECT id FROM complaints')) return [[]];
        return [{ insertId: 13 }];
      },
      commit: async () => {
        committed = true;
      },
      rollback: async () => {},
      release: () => {},
    });

    const baseFields = {
      name: 'Lakshmi Devi',
      mobile: '9876543210',
      village_id: '1',
      ward_no: '7',
      category: 'Street Light',
      title: 'Light off',
      description: 'Pole 12 dark',
    };

    // 1. Spoofed .jpg containing HTML script bytes must be rejected and cleaned up.
    const spoofed = buildMultipartPayload(baseFields, [
      {
        filename: 'evil.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('<html><script>alert(1)</script></html>'),
      },
    ]);
    const spoofRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints',
      headers: { 'content-type': spoofed.contentType },
      body: spoofed.body,
    });
    assert.equal(spoofRes.status, 400);
    assert.equal(committed, false);

    // 2. Valid JPEG magic bytes succeed and save file.
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const validPayload = buildMultipartPayload(baseFields, [
      { filename: 'photo.jpg', mimeType: 'image/jpeg', buffer: validJpeg },
    ]);
    const okRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints',
      headers: { 'content-type': validPayload.contentType },
      body: validPayload.body,
    });

    try {
      assert.equal(okRes.status, 201);
      assert.equal(committed, true);
      assert.equal(okRes.body.images.length, 1);
      const savedPath = path.join(env.uploadsDir, okRes.body.images[0].replace(/^uploads\//, ''));
      assert.equal(fs.existsSync(savedPath), true);
    } finally {
      for (const rel of okRes.body?.images || []) {
        const filePath = path.join(env.uploadsDir, rel.replace(/^uploads\//, ''));
        await fs.promises.unlink(filePath).catch(() => {});
      }
    }
  });

  it('POST /api/complaints/track and /api/complaints/lookup validate inputs and enforce rate limits', async () => {
    const badLookup = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/lookup',
      body: { mobile: 'not-a-number' },
    });
    assert.equal(badLookup.status, 400);

    pool.execute = async (sql) => {
      if (sql.includes('WHERE c.complaint_id = ? AND c.mobile = ?')) {
        return [[{
          id: 9,
          complaint_id: 'GS-2026-73512',
          name: 'nithin',
          mobile: '8790808059',
          village: 'guntur',
          village_name: 'guntur',
          category: 'Street Light',
          title: 'wev',
          description: '3erg itb  fjlqe',
          image_path: null,
          audio_path: null,
          status: 'Resolved',
          created_at: '2026-06-25T10:02:59.000Z',
        }]];
      }
      return [[{
        complaint_id: 'GS-2026-73512',
        title: 'wev',
        status: 'Resolved',
        created_at: '2026-06-25T10:02:59.000Z',
      }]];
    };

    const trackRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/track',
      body: { complaint_id: 'GS-2026-73512', mobile: '8790808059' },
    });
    assert.equal(trackRes.status, 200);
    assert.equal(trackRes.body.complaint.village, 'guntur');

    // Hit trackLookupLimiter (2 already counted above, 28 more allowed, 31st returns 429).
    for (let i = 0; i < 28; i += 1) {
      const r = await invokeApp(app, {
        method: 'POST',
        url: '/api/complaints/lookup',
        body: { mobile: '8790808059' },
      });
      assert.equal(r.status, 200);
    }
    const throttled = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/lookup',
      body: { mobile: '8790808059' },
    });
    assert.equal(throttled.status, 429);

    // Verify submitComplaintLimiter (max 10 per window).
    for (let i = 0; i < 10; i += 1) {
      const r = await invokeApp(app, {
        method: 'POST',
        url: '/api/complaints',
        body: {},
      });
      assert.equal(r.status, 400);
    }
    const submitThrottled = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints',
      body: {},
    });
    assert.equal(submitThrottled.status, 429);
  });

  it('authenticates solely via HttpOnly cookie without exposing JWT in JSON or accepting Bearer headers', async () => {
    const hash = await bcrypt.hash('admin', 4);
    pool.execute = async (sql) => {
      if (sql.includes('WHERE username = ?')) {
        return [[{
          id: 1,
          name: 'Kondapalli Panchayath',
          username: 'kondapalli',
          password: hash,
          email: 'kondapalli@panchayath.in',
          status: 'active',
        }]];
      }
      if (sql.includes('FROM panchayaths WHERE id = ?')) {
        return [[{ id: 1, name: 'Kondapalli Panchayath', username: 'kondapalli', email: '', status: 'active' }]];
      }
      if (sql.includes('FROM villages WHERE panchayath_id = ?')) {
        return [[{ id: 1, name: 'Kondapalli' }]];
      }
      return [[]];
    };

    const loginRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/admin/login',
      body: { username: 'kondapalli', password: 'admin' },
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.token, undefined);
    assert.equal(loginRes.body.panchayath.username, 'kondapalli');

    const setCookie = String(loginRes.headers['set-cookie']);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    const cookiePair = extractCookiePair(loginRes.headers['set-cookie']);
    const jwtValue = cookiePair.split('=')[1];

    // Bearer header without cookie must be rejected.
    const bearerAttempt = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/me',
      headers: { Authorization: `Bearer ${jwtValue}` },
    });
    assert.equal(bearerAttempt.status, 401);

    // HttpOnly cookie succeeds.
    const meRes = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/me',
      headers: { Cookie: cookiePair },
    });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.panchayath.id, 1);

    // Logout clears cookie.
    const logoutRes = await invokeApp(app, { method: 'POST', url: '/api/admin/logout' });
    assert.equal(logoutRes.status, 200);
    assert.match(String(logoutRes.headers['set-cookie']), /Expires=Thu, 01 Jan 1970/i);
  });

  it('enforces Panchayat isolation across legacy and village-scoped complaints', async () => {
    const hash = await bcrypt.hash('admin', 4);
    pool.execute = async (sql, params) => {
      if (sql.includes('WHERE username = ?')) {
        return [[{
          id: 2,
          name: 'Guntur Panchayath',
          username: 'guntur',
          password: hash,
          email: '',
          status: 'active',
        }]];
      }
      if (sql.includes('FROM panchayaths WHERE id = ?')) {
        return [[{ id: 2, name: 'Guntur Panchayath', username: 'guntur', email: '', status: 'active' }]];
      }
      if (sql.includes('FROM villages WHERE panchayath_id = ?')) {
        return [[{ id: 4, name: 'Guntur' }]];
      }
      if (sql.includes('GROUP BY status')) {
        // Verify scope query checks both panchayath_id and village_id IN (...)
        assert.match(sql, /panchayath_id = \? OR village_id IN/);
        assert.deepEqual(params, [2, 4]);
        return [[{ status: 'Submitted', count: 2 }, { status: 'Resolved', count: 1 }]];
      }
      if (sql.includes('LIMIT 10')) {
        return [[{
          id: 9,
          complaint_id: 'GS-2026-73512',
          name: 'nithin',
          village: 'guntur',
          village_name: 'Guntur',
          category: 'Street Light',
          status: 'Resolved',
        }]];
      }
      if (sql.includes('WHERE c.id = ? AND')) {
        // Complaint 11 belongs to Panchayath 1 (Kondapalli), so Guntur (id=2) gets 0 rows.
        return params[0] === 9
          ? [[{ id: 9, complaint_id: 'GS-2026-73512', name: 'nithin', village_name: 'Guntur', status: 'Resolved' }]]
          : [[]];
      }
      return [{ affectedRows: 1 }];
    };

    const loginRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/admin/login',
      body: { username: 'guntur', password: 'admin' },
    });
    const cookiePair = extractCookiePair(loginRes.headers['set-cookie']);

    const dashRes = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: cookiePair },
    });
    assert.equal(dashRes.status, 200);
    assert.equal(dashRes.body.stats.total, 3);
    assert.equal(dashRes.body.recentComplaints[0].id, 9);

    const ownDetail = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/complaints/9',
      headers: { Cookie: cookiePair },
    });
    assert.equal(ownDetail.status, 200);

    const crossPanchayath = await invokeApp(app, {
      method: 'PATCH',
      url: '/api/admin/complaints/11/status',
      headers: { Cookie: cookiePair },
      body: { status: 'Resolved' },
    });
    assert.equal(crossPanchayath.status, 404);
  });

  it('returns safe 503 message when MySQL connection/auth fails', async () => {
    pool.execute = async () => {
      const err = new Error("Access denied for user 'root'@'localhost' (using password: NO)");
      err.code = 'ER_ACCESS_DENIED_ERROR';
      throw err;
    };

    const res = await invokeApp(app, {
      method: 'POST',
      url: '/api/admin/login',
      body: { username: 'kondapalli', password: 'admin' },
    });
    assert.equal(res.status, 503);
    assert.equal(res.body.status, 'error');
    assert.doesNotMatch(res.body.message, /root|localhost|using password/i);
  });
});
