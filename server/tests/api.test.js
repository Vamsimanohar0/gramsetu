process.env.NODE_ENV = 'test';

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
const {
  parseImagePaths,
  generateComplaintId,
  maskPersonName,
  maskMobile,
  maskTitle,
} = require('../utils/complaintUtils');
const { verifyPassword } = require('../services/authService');
const {
  classifyLegacyComplaints,
  buildManualReviewManifest,
  validateManualAssignments,
  rollbackBatch,
} = require('../scripts/migrateLegacyComplaints');
const { detectImageTypeFromBuffer } = require('../middleware/uploadMiddleware');
const { MySQLRateLimitStore } = require('../middleware/rateLimiter');
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

    // Support res.sendFile in in-memory test dispatcher
    res.sendFile = (filePath) => {
      fs.readFile(filePath, (err, fileBuffer) => {
        if (err) {
          res.statusCode = 404;
          res.end(JSON.stringify({ status: 'error', message: 'Not found' }));
          return;
        }
        res.setHeader('Content-Type', filePath.endsWith('.png') ? 'image/png' : 'image/jpeg');
        res.end(fileBuffer);
      });
    };

    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    res.write = (chunk, encoding, cb) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      return origWrite(chunk, encoding, cb);
    };
    res.end = (chunk, encoding, cb) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      const rawBuffer = Buffer.concat(chunks);
      const rawBody = rawBuffer.toString('utf8');
      let parsedBody = rawBody;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        // Leave as raw string/buffer for binary responses
      }
      origEnd(chunk, encoding, cb);
      resolve({ status: res.statusCode, headers: res.getHeaders(), body: parsedBody, rawBuffer });
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

  beforeEach(async () => {
    await publicRoutes.limiters.submitComplaintLimiter.reset();
    await publicRoutes.limiters.trackComplaintLimiter.reset();
    await publicRoutes.limiters.lookupIpLimiter.reset();
    await publicRoutes.limiters.lookupMobileLimiter.reset();
    await adminRoutes.limiters.loginLimiter.reset();
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

  it('parses image_path and masks public citizen PII and titles', () => {
    assert.deepEqual(parseImagePaths(null), []);
    assert.deepEqual(parseImagePaths('NULL'), []);
    assert.deepEqual(parseImagePaths('["uploads/images/a.jpg","uploads/images/b.png"]'), [
      'uploads/images/a.jpg',
      'uploads/images/b.png',
    ]);
    assert.deepEqual(parseImagePaths('uploads/images/legacy.jpg'), ['uploads/images/legacy.jpg']);

    assert.equal(maskPersonName('Lakshmi Devi'), 'L****** D***');
    assert.equal(maskMobile('8790808059'), '******8059');
    assert.equal(maskTitle('Road Damage'), 'Ro** Da****');
    assert.match(generateComplaintId(), /^GS-\d{4}-\d{5}$/);
  });

  it('blocks plaintext and shared default passwords in production while allowing strong bcrypt hashes', async () => {
    const devPlain = await verifyPassword('admin', 'admin', 'development');
    assert.equal(devPlain.matched, true);
    assert.equal(devPlain.needsRehash, true);

    const prodPlain = await verifyPassword('admin', 'admin', 'production');
    assert.equal(prodPlain.matched, false);
    assert.equal(prodPlain.blockedDefault, true);

    const defaultBcrypt = await bcrypt.hash('admin', 4);
    const prodDefaultBcrypt = await verifyPassword('admin', defaultBcrypt, 'production');
    assert.equal(prodDefaultBcrypt.matched, false);
    assert.equal(prodDefaultBcrypt.blockedDefault, true);

    const strongHash = await bcrypt.hash('K0nd@palli#2026!', 4);
    const phpStyleStrong = `$2y$${strongHash.slice(4)}`;
    const prodStrong = await verifyPassword('K0nd@palli#2026!', phpStyleStrong, 'production');
    assert.equal(prodStrong.matched, true);
    assert.equal(prodStrong.blockedDefault, false);
  });

  it('supports manual review workflow and batch-scoped rollback for legacy complaints', async () => {
    const legacyComplaints = [
      { id: 1, complaint_id: 'GS-2026-36691', name: 'A', title: 'T1', village: 'hjgf', village_id: null, panchayath_id: null },
      { id: 8, complaint_id: 'GS-2026-77716', name: 'B', title: 'T2', village: 'kaza', village_id: null, panchayath_id: null },
      { id: 9, complaint_id: 'GS-2026-73512', name: 'C', title: 'T3', village: ' guntur ', village_id: null, panchayath_id: null },
      { id: 10, complaint_id: 'GS-2026-99999', name: 'D', title: 'T4', village: 'Ramapuram', village_id: null, panchayath_id: null },
      { id: 11, complaint_id: 'GS-2026-59312', village: null, village_id: 1, panchayath_id: 1 },
    ];
    const activeVillages = [
      { id: 1, name: 'Kondapalli', panchayath_id: 1, panchayath_name: 'Kondapalli Panchayath', status: 'active' },
      { id: 4, name: 'Guntur', panchayath_id: 2, panchayath_name: 'Guntur Panchayath', status: 'active' },
      { id: 20, name: 'Ramapuram', panchayath_id: 1, panchayath_name: 'Kondapalli Panchayath', status: 'active' },
      { id: 21, name: 'Ramapuram', panchayath_id: 3, panchayath_name: 'Narasaraopet Panchayath', status: 'active' },
    ];

    const classified = classifyLegacyComplaints(legacyComplaints, activeVillages);
    assert.equal(classified.unambiguous.length, 1);
    assert.equal(classified.unambiguous[0].id, 9);
    assert.equal(classified.ambiguous.length, 1);
    assert.equal(classified.unmatched.length, 2);

    // Export manual review manifest for ambiguous + unmatched items
    const manifest = buildManualReviewManifest(classified, activeVillages);
    assert.equal(manifest.records.length, 3);
    assert.equal(manifest.records[0].classification, 'AMBIGUOUS_MANUAL_REVIEW_REQUIRED');
    assert.equal(manifest.records[0].candidate_villages.length, 2);

    // Reviewer assigns complaint id=10 (Ramapuram) to village 21 (Narasaraopet) and leaves id=1/id=8 null
    manifest.records[0].assigned_village_id = 21;
    const validManual = validateManualAssignments(manifest.records, activeVillages, legacyComplaints);
    assert.equal(validManual.errors.length, 0);
    assert.equal(validManual.approved.length, 1);
    assert.equal(validManual.approved[0].panchayath_id, 3);
    assert.equal(validManual.skipped.length, 2);

    // Invalid village ID is caught cleanly
    manifest.records[1].assigned_village_id = 9999;
    const invalidManual = validateManualAssignments(manifest.records, activeVillages, legacyComplaints);
    assert.equal(invalidManual.errors.length, 1);

    // Verify batch-scoped rollback touches ONLY the target batch_id
    const executedSql = [];
    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async (sql, params) => {
        executedSql.push({ sql, params });
        if (sql.includes('SELECT complaint_pk')) {
          return [[{ complaint_pk: 10, previous_village_id: null, previous_panchayath_id: null }]];
        }
        return [{ affectedRows: 1 }];
      },
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });

    const rb = await rollbackBatch('manual_batch_1');
    assert.equal(rb.revertedCount, 1);
    assert.ok(executedSql.some((q) => q.sql.includes('WHERE a.batch_id = ?') && q.params[0] === 'manual_batch_1'));
    assert.ok(executedSql.some((q) => q.sql.includes('DELETE FROM legacy_complaint_mapping_audit WHERE batch_id = ?') && q.params[0] === 'manual_batch_1'));
  });

  it('implements shared MySQL rate-limit store queries cleanly', async () => {
    const store = new MySQLRateLimitStore({ prefix: 'test:', useMemoryOnly: false });
    store.init({ windowMs: 60000 });

    const seenQueries = [];
    pool.execute = async (sql, params) => {
      seenQueries.push({ sql, params });
      if (sql.startsWith('INSERT INTO rate_limits')) {
        return [{ affectedRows: 1 }];
      }
      return [[{ hits: 3, reset_at: new Date(Date.now() + 60000).toISOString() }]];
    };

    const res = await store.increment('127.0.0.1');
    assert.equal(res.totalHits, 3);
    assert.equal(seenQueries.length, 2);
    assert.match(seenQueries[0].sql, /INSERT INTO rate_limits/);
    assert.equal(seenQueries[0].params[0], 'test:127.0.0.1');
  });

  it('detects real JPEG/PNG magic bytes and rejects non-image content', () => {
    assert.equal(detectImageTypeFromBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), 'jpeg');
    assert.equal(
      detectImageTypeFromBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'png'
    );
    assert.equal(detectImageTypeFromBuffer(Buffer.from('<script>alert(1)</script>')), null);
  });

  it('GET /test confirms backend server is running and /uploads is not publicly exposed', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/test' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');

    const staticLeak = await invokeApp(app, { method: 'GET', url: '/uploads/images/any.jpg' });
    assert.equal(staticLeak.status, 404);
  });

  it('POST /api/complaints validates magic bytes and serves private evidence only to authorized callers', async () => {
    let savedFilename = '';
    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async (sql) => {
        if (sql.includes('FROM villages')) return [[{ id: 1, panchayath_id: 1 }]];
        if (sql.includes('SELECT id FROM complaints')) return [[]];
        return [{ insertId: 13 }];
      },
      commit: async () => {},
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

    // Spoofed .jpg rejected
    const spoofed = buildMultipartPayload(baseFields, [
      { filename: 'evil.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('<script>alert(1)</script>') },
    ]);
    const spoofRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints',
      headers: { 'content-type': spoofed.contentType },
      body: spoofed.body,
    });
    assert.equal(spoofRes.status, 400);

    // Valid JPEG accepted
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
      savedFilename = okRes.body.images[0];
      const complaintId = okRes.body.complaint_id;

      const hash = await bcrypt.hash('admin', 4);
      pool.execute = async (sql, params) => {
        if (sql.includes('WHERE c.complaint_id = ? AND c.mobile = ?')) {
          return [[{
            id: 13,
            complaint_id: complaintId,
            name: 'Lakshmi Devi',
            mobile: '9876543210',
            village_name: 'Kondapalli',
            category: 'Street Light',
            title: 'Light off',
            description: 'Pole 12 dark',
            image_path: JSON.stringify([`uploads/images/${savedFilename}`]),
            status: 'Submitted',
            created_at: '2026-06-25T10:02:59.000Z',
          }]];
        }
        if (sql.includes('SELECT image_path FROM complaints WHERE complaint_id = ?')) {
          return [[{ image_path: JSON.stringify([`uploads/images/${savedFilename}`]) }]];
        }
        if (sql.includes('WHERE username = ?')) {
          return [[{ id: params[0] === 'guntur' ? 2 : 1, name: 'Test Panchayath', username: params[0], password: hash, status: 'active' }]];
        }
        if (sql.includes('FROM panchayaths WHERE id = ?')) {
          return [[{ id: params[0], name: 'Test Panchayath', username: 'test', email: '', status: 'active' }]];
        }
        if (sql.includes('FROM villages WHERE panchayath_id = ?')) {
          return params[0] === 1 ? [[{ id: 1, name: 'Kondapalli' }]] : [[{ id: 4, name: 'Guntur' }]];
        }
        if (sql.includes('WHERE c.id = ? AND')) {
          return params[0] === 13 && params[1] === 1
            ? [[{ id: 13, complaint_id: complaintId, image_path: JSON.stringify([`uploads/images/${savedFilename}`]) }]]
            : [[]];
        }
        return [[]];
      };

      // Citizen tracks complaint -> receives masked PII + signed evidence URL
      const trackRes = await invokeApp(app, {
        method: 'POST',
        url: '/api/complaints/track',
        body: { complaint_id: complaintId, mobile: '9876543210' },
      });
      assert.equal(trackRes.status, 200);
      assert.equal(trackRes.body.complaint.id, undefined);
      assert.equal(trackRes.body.complaint.name, 'L****** D***');
      assert.equal(trackRes.body.complaint.mobile, '******3210');
      assert.equal(trackRes.body.complaint.images.length, 1);

      const citizenUrl = trackRes.body.complaint.images[0];
      const citizenImgRes = await invokeApp(app, { method: 'GET', url: citizenUrl });
      assert.equal(citizenImgRes.status, 200);
      assert.equal(citizenImgRes.headers['cache-control'], 'private, no-store');

      // Citizen evidence without/tampered token must be 403
      const tampered = await invokeApp(app, {
        method: 'GET',
        url: `/api/complaints/evidence/${complaintId}/${savedFilename}?token=bad`,
      });
      assert.equal(tampered.status, 403);

      // Admin evidence: unauthenticated -> 401
      const noAuthAdminImg = await invokeApp(app, {
        method: 'GET',
        url: `/api/admin/complaints/13/evidence/${savedFilename}`,
      });
      assert.equal(noAuthAdminImg.status, 401);

      // Admin evidence: wrong Panchayat (guntur=2) -> 404
      const gLogin = await invokeApp(app, {
        method: 'POST',
        url: '/api/admin/login',
        body: { username: 'guntur', password: 'admin' },
      });
      const gCookie = extractCookiePair(gLogin.headers['set-cookie']);
      const crossAdminImg = await invokeApp(app, {
        method: 'GET',
        url: `/api/admin/complaints/13/evidence/${savedFilename}`,
        headers: { Cookie: gCookie },
      });
      assert.equal(crossAdminImg.status, 404);

      // Admin evidence: owning Panchayat (kondapalli=1) -> 200
      const kLogin = await invokeApp(app, {
        method: 'POST',
        url: '/api/admin/login',
        body: { username: 'kondapalli', password: 'admin' },
      });
      const kCookie = extractCookiePair(kLogin.headers['set-cookie']);
      const ownAdminImg = await invokeApp(app, {
        method: 'GET',
        url: `/api/admin/complaints/13/evidence/${savedFilename}`,
        headers: { Cookie: kCookie },
      });
      assert.equal(ownAdminImg.status, 200);
    } finally {
      if (savedFilename) {
        const filePath = path.join(env.uploadsDir, 'images', savedFilename);
        await fs.promises.unlink(filePath).catch(() => {});
      }
    }
  });

  it('masks mobile lookup results and enforces per-mobile and per-IP enumeration rate limits', async () => {
    pool.execute = async () => [[{
      complaint_id: 'GS-2026-73512',
      title: 'Street Light Fault',
      status: 'Resolved',
      created_at: '2026-06-25T10:02:59.000Z',
    }]];

    // 5 lookups allowed per target mobile
    for (let i = 0; i < 5; i += 1) {
      const res = await invokeApp(app, {
        method: 'POST',
        url: '/api/complaints/lookup',
        body: { mobile: '8790808059' },
      });
      assert.equal(res.status, 200);
      assert.equal(res.body[0].title, 'St**** Li*** Fa***');
    }

    // 6th lookup for the same mobile is throttled (429)
    const mobileThrottled = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/lookup',
      body: { mobile: '8790808059' },
    });
    assert.equal(mobileThrottled.status, 429);

    // Different mobile from same IP still hits per-IP limit (6 used + 4 more = 10, 11th -> 429)
    for (let i = 0; i < 4; i += 1) {
      const r = await invokeApp(app, {
        method: 'POST',
        url: '/api/complaints/lookup',
        body: { mobile: `987654321${i}` },
      });
      assert.equal(r.status, 200);
    }
    const ipThrottled = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/lookup',
      body: { mobile: '9999999999' },
    });
    assert.equal(ipThrottled.status, 429);
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

    const setCookie = String(loginRes.headers['set-cookie']);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    const cookiePair = extractCookiePair(loginRes.headers['set-cookie']);
    const jwtValue = cookiePair.split('=')[1];

    const bearerAttempt = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/me',
      headers: { Authorization: `Bearer ${jwtValue}` },
    });
    assert.equal(bearerAttempt.status, 401);

    const meRes = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/me',
      headers: { Cookie: cookiePair },
    });
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.panchayath.id, 1);

    const logoutRes = await invokeApp(app, { method: 'POST', url: '/api/admin/logout' });
    assert.equal(logoutRes.status, 200);
    assert.match(String(logoutRes.headers['set-cookie']), /Expires=Thu, 01 Jan 1970/i);
  });

  it('enforces Panchayat isolation across legacy and village-scoped complaints and status updates', async () => {
    const hash = await bcrypt.hash('admin', 4);
    pool.execute = async (sql, params) => {
      if (sql.includes('WHERE username = ?')) {
        return [[{ id: 2, name: 'Guntur Panchayath', username: 'guntur', password: hash, status: 'active' }]];
      }
      if (sql.includes('FROM panchayaths WHERE id = ?')) {
        return [[{ id: 2, name: 'Guntur Panchayath', username: 'guntur', email: '', status: 'active' }]];
      }
      if (sql.includes('FROM villages WHERE panchayath_id = ?')) {
        return [[{ id: 4, name: 'Guntur' }]];
      }
      if (sql.includes('GROUP BY status')) {
        assert.match(sql, /panchayath_id = \? OR village_id IN/);
        assert.deepEqual(params, [2, 4]);
        return [[{ status: 'Submitted', count: 2 }, { status: 'Resolved', count: 1 }]];
      }
      if (sql.includes('LIMIT 10')) {
        return [[{ id: 9, complaint_id: 'GS-2026-73512', name: 'nithin', village_name: 'Guntur', status: 'Resolved' }]];
      }
      if (sql.includes('WHERE c.id = ? AND')) {
        return params[0] === 9
          ? [[{ id: 9, complaint_id: 'GS-2026-73512', name: 'nithin', village_name: 'Guntur', status: 'In Progress' }]]
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

    const updateOwn = await invokeApp(app, {
      method: 'PATCH',
      url: '/api/admin/complaints/9/status',
      headers: { Cookie: cookiePair },
      body: { status: 'In Progress' },
    });
    assert.equal(updateOwn.status, 200);
    assert.equal(updateOwn.body.complaint.status, 'In Progress');

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
