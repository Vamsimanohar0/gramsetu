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
  validateFeedbackSubmit,
  validateVoteAction,
} = require('../validators/complaintValidator');
const { parseCoordinatePair, toApproximateCoordinates } = require('../utils/locationUtils');
const { normalizeMobileNumber, hashVoterKey } = require('../utils/voterHash');
const {
  ALLOWED_STATUSES,
  ADMIN_UI_STATUSES,
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
    await publicRoutes.limiters.voteIpLimiter.reset();
    await publicRoutes.limiters.feedbackLimiter.reset();
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
      privacy_mode: 'CONSENT',
      consent_accepted: 'true',
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
    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async () => [{ affectedRows: 1 }],
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });
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

  it('validates optional coordinates and computes privacy-safe approximate coordinates without exposing exact public pins', async () => {
    const omitted = parseCoordinatePair(undefined, '');
    assert.equal(omitted.provided, false);
    assert.equal(omitted.valid, true);
    assert.equal(omitted.latitude, null);

    const partial = parseCoordinatePair('16.5062', '');
    assert.equal(partial.valid, false);

    const outOfRange = parseCoordinatePair('95.1', '80.6');
    assert.equal(outOfRange.valid, false);

    const exact = { lat: 16.5062451, lng: 80.6480123 };
    const approx = toApproximateCoordinates(exact.lat, exact.lng, 'GS-2026-10001');
    assert.ok(Math.abs(approx.approxLatitude - exact.lat) < 0.01);
    assert.ok(Math.abs(approx.approxLongitude - exact.lng) < 0.01);
    assert.notEqual(approx.approxLatitude, exact.lat);
    assert.notEqual(approx.approxLongitude, exact.lng);

    const validCreateWithLocation = validateCreateComplaint({
      privacy_mode: 'CONSENT',
      consent_accepted: true,
      name: 'Rama Rao',
      mobile: '+91 9876543210',
      village_id: '1',
      category: 'Road Damage',
      title: 'Broken culvert',
      description: 'Water logging near bus stop',
      latitude: '16.5062451',
      longitude: '80.6480123',
      location_source: 'gps',
    });
    assert.equal(validCreateWithLocation.valid, true);
    assert.equal(validCreateWithLocation.data.mobile, '9876543210');
    assert.equal(validCreateWithLocation.data.locationSource, 'gps');

    const hash = await bcrypt.hash('admin', 4);
    pool.execute = async (sql, params) => {
      if (sql.includes('c.approx_latitude')) {
        if (sql.includes('WHERE username = ?')) return [[]];
        if (sql.includes('FROM villages')) return [[{ id: 1, name: 'Kondapalli' }]];
        if (sql.includes('c.latitude')) {
          // Admin map query
          return [[
            {
              id: 21,
              complaint_id: 'GS-2026-20021',
              name: 'Rama Rao',
              village_id: 1,
              village_name: 'Kondapalli',
              category: 'Road Damage',
              title: 'Broken culvert',
              status: 'Submitted',
              latitude: '16.5062451',
              longitude: '80.6480123',
              approx_latitude: approx.approxLatitude,
              approx_longitude: approx.approxLongitude,
              location_source: 'gps',
              vote_count: 2,
              created_at: '2026-06-25T10:02:59.000Z',
            },
            {
              id: 22,
              complaint_id: 'GS-2026-20022',
              name: 'Sita',
              village_id: 1,
              village_name: 'Kondapalli',
              category: 'Water Supply',
              title: 'No tap water',
              status: 'Submitted',
              latitude: null,
              longitude: null,
              approx_latitude: null,
              approx_longitude: null,
              location_source: null,
              vote_count: 0,
              created_at: '2026-06-25T11:02:59.000Z',
            },
          ]];
        }
        // Public map query
        return [[
          {
            complaint_id: 'GS-2026-20021',
            village_id: 1,
            village_name: 'Kondapalli',
            category: 'Road Damage',
            title: 'Broken culvert',
            status: 'Submitted',
            approx_latitude: approx.approxLatitude,
            approx_longitude: approx.approxLongitude,
            vote_count: 2,
            created_at: '2026-06-25T10:02:59.000Z',
          },
          {
            complaint_id: 'GS-2026-20022',
            village_id: 1,
            village_name: 'Kondapalli',
            category: 'Water Supply',
            title: 'No tap water',
            status: 'Submitted',
            approx_latitude: null,
            approx_longitude: null,
            vote_count: 0,
            created_at: '2026-06-25T11:02:59.000Z',
          },
        ]];
      }
      if (sql.includes('WHERE username = ?')) {
        return [[{ id: 1, name: 'Kondapalli Panchayath', username: params[0], password: hash, status: 'active' }]];
      }
      if (sql.includes('FROM panchayaths WHERE id = ?')) {
        return [[{ id: 1, name: 'Kondapalli Panchayath', username: 'kondapalli', email: '', status: 'active' }]];
      }
      if (sql.includes('FROM villages WHERE panchayath_id = ?')) {
        return [[{ id: 1, name: 'Kondapalli' }]];
      }
      return [[]];
    };

    const publicMap = await invokeApp(app, { method: 'GET', url: '/api/complaints/map?village_id=1' });
    assert.equal(publicMap.status, 200);
    assert.equal(publicMap.body.summary.total, 2);
    assert.equal(publicMap.body.summary.mapped, 1);
    assert.equal(publicMap.body.summary.unmapped, 1);
    assert.equal(publicMap.body.markers[0].latitude, undefined);
    assert.equal(publicMap.body.markers[0].longitude, undefined);
    assert.equal(publicMap.body.markers[0].name, undefined);
    assert.equal(publicMap.body.markers[0].approx_latitude, approx.approxLatitude);

    const unauthAdminMap = await invokeApp(app, { method: 'GET', url: '/api/admin/complaints/map' });
    assert.equal(unauthAdminMap.status, 401);

    const kLogin = await invokeApp(app, {
      method: 'POST',
      url: '/api/admin/login',
      body: { username: 'kondapalli', password: 'admin' },
    });
    const kCookie = extractCookiePair(kLogin.headers['set-cookie']);

    const adminMap = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/complaints/map',
      headers: { Cookie: kCookie },
    });
    assert.equal(adminMap.status, 200);
    assert.equal(adminMap.body.markers[0].latitude, exact.lat);
    assert.equal(adminMap.body.markers[0].longitude, exact.lng);
    assert.equal(adminMap.body.summary.unmapped, 1);
  });

  it('verifies ownership for feedback & reopening, updates status history transactionally, and supports controlled feedback edits', async () => {
    assert.equal(validateFeedbackSubmit({ complaint_id: 'GS-2026-1', mobile: '9876543210', rating: 6, resolution_confirmed: true }).valid, false);
    assert.equal(validateFeedbackSubmit({ complaint_id: 'GS-2026-1', mobile: '9876543210', rating: 5 }).valid, false);

    let mockStatus = 'In Progress';
    let mockFeedback = null;
    const mockHistory = [
      { id: 1, from_status: null, to_status: 'Submitted', actor_type: 'system', note: 'Complaint registered', created_at: '2026-06-25T10:00:00Z' },
    ];

    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async (sql, params) => {
        if (sql.includes('WHERE complaint_id = ? AND mobile = ?')) {
          if (params[0] === 'GS-2026-55555' && params[1] === '9876543210') {
            return [[{ id: 55, complaint_id: 'GS-2026-55555', status: mockStatus }]];
          }
          return [[]];
        }
        if (sql.includes('FROM complaint_feedback') && sql.includes('WHERE complaint_pk = ?')) {
          return [mockFeedback ? [mockFeedback] : []];
        }
        if (sql.includes('FROM complaint_status_history')) {
          return [mockHistory];
        }
        if (sql.startsWith('INSERT INTO complaint_feedback')) {
          mockFeedback = {
            id: 1,
            rating: params[1],
            comment: params[2],
            resolution_confirmed: params[3],
            reopen_requested: params[4],
            submitted_at: '2026-06-26T10:00:00Z',
            updated_at: '2026-06-26T10:00:00Z',
          };
          return [{ insertId: 1 }];
        }
        if (sql.startsWith('UPDATE complaint_feedback')) {
          mockFeedback = {
            ...mockFeedback,
            rating: params[0],
            comment: params[1],
            resolution_confirmed: params[2],
            reopen_requested: params[3],
            updated_at: '2026-06-26T10:05:00Z',
          };
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE complaints SET status = ?')) {
          mockStatus = params[0];
          return [{ affectedRows: 1 }];
        }
        if (sql.includes('INSERT INTO complaint_status_history')) {
          mockHistory.push({
            id: mockHistory.length + 1,
            from_status: mockStatus === 'Submitted' ? 'Resolved' : mockStatus,
            to_status: sql.includes("'Resolved', 'Submitted'") ? 'Submitted' : mockStatus,
            actor_type: 'citizen',
            note: params[params.length - 1],
            created_at: '2026-06-26T10:06:00Z',
          });
          return [{ insertId: mockHistory.length }];
        }
        return [{ affectedRows: 1 }];
      },
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });

    // Cannot submit feedback before complaint is Resolved
    const beforeResolved = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/feedback',
      body: { complaint_id: 'GS-2026-55555', mobile: '9876543210', rating: 5, comment: 'Fast', resolution_confirmed: true },
    });
    assert.equal(beforeResolved.status, 400);

    // Wrong mobile fails ownership check
    mockStatus = 'Resolved';
    const wrongOwner = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/feedback',
      body: { complaint_id: 'GS-2026-55555', mobile: '9999999999', rating: 5, resolution_confirmed: true },
    });
    assert.equal(wrongOwner.status, 404);

    // Owner submits feedback on Resolved complaint
    const okFeedback = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/feedback',
      body: { complaint_id: 'GS-2026-55555', mobile: '9876543210', rating: 4, comment: 'Fixed partially', resolution_confirmed: true },
    });
    assert.equal(okFeedback.status, 200);
    assert.equal(okFeedback.body.reopened, false);
    assert.equal(okFeedback.body.feedback.rating, 4);

    // Controlled correction -> triggers reopening when resolution_confirmed is false
    const reopenRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/feedback',
      body: { complaint_id: 'GS-2026-55555', mobile: '9876543210', rating: 2, comment: 'Light went out again', resolution_confirmed: false },
    });
    assert.equal(reopenRes.status, 200);
    assert.equal(reopenRes.body.reopened, true);
    assert.equal(reopenRes.body.complaint_status, 'Submitted');
    assert.ok(reopenRes.body.updates.some((u) => u.status === 'Submitted' && /reopened/i.test(u.remarks)));

    // Duplicate reopen is rejected with 409 while still pending review
    const dupReopen = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/feedback',
      body: { complaint_id: 'GS-2026-55555', mobile: '9876543210', rating: 1, comment: 'Still waiting', resolution_confirmed: false },
    });
    assert.equal(dupReopen.status, 409);
  });

  it('supports zero-OTP signed voter cookies, duplicate prevention, withdrawal ownership, status immutability, and missing-table resilience', async () => {
    // Keyed voter HMAC hashing
    assert.equal(normalizeMobileNumber('+91 98765-43210'), '9876543210');
    assert.equal(hashVoterKey('voter-abc-123'), hashVoterKey('voter-abc-123'));
    assert.notEqual(hashVoterKey('voter-abc-123'), 'voter-abc-123');
    assert.equal(validateVoteAction({ complaint_id: 'GS-2026-10001' }).valid, true);
    assert.equal(validateVoteAction({ complaint_id: 'bad id!' }).valid, false);

    // Resilience: missing optional tables (ER_NO_SUCH_TABLE) must NOT break complaint tracking
    pool.execute = async (sql) => {
      if (sql.includes('WHERE c.complaint_id = ? AND c.mobile = ?')) {
        return [[{
          id: 77,
          complaint_id: 'GS-2026-77777',
          name: 'Lakshmi Devi',
          mobile: '9876543210',
          village_name: 'Kondapalli',
          category: 'Water Supply',
          title: 'Low pressure',
          description: 'Water stops after 7am',
          image_path: null,
          status: 'Verified',
          created_at: '2026-06-25T10:02:59.000Z',
        }]];
      }
      if (
        sql.includes('FROM complaint_votes') ||
        sql.includes('FROM complaint_status_history') ||
        sql.includes('FROM complaint_feedback')
      ) {
        const missingErr = new Error("Table 'vgmp.complaint_votes' doesn't exist");
        missingErr.code = 'ER_NO_SUCH_TABLE';
        missingErr.errno = 1146;
        throw missingErr;
      }
      return [[]];
    };

    const resilientTrack = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/track',
      body: { complaint_id: 'GS-2026-77777', mobile: '9876543210' },
    });
    assert.equal(resilientTrack.status, 200);
    assert.equal(resilientTrack.body.complaint.vote_count, 0);
    assert.equal(resilientTrack.body.complaint.user_voted, false);
    assert.equal(resilientTrack.body.updates.length, 1);
    assert.equal(resilientTrack.body.feedback, null);

    // Zero-OTP voting with signed HttpOnly cookie
    const voteSet = new Set();
    let storedStatus = 'Submitted';

    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async (sql, params) => {
        if (sql.includes('SELECT id, complaint_id, status FROM complaints')) {
          return [[{ id: 99, complaint_id: params[0], status: storedStatus }]];
        }
        if (sql.startsWith('INSERT INTO complaint_votes')) {
          const hmac = params[1];
          if (voteSet.has(hmac)) {
            const dup = new Error('Duplicate entry');
            dup.code = 'ER_DUP_ENTRY';
            throw dup;
          }
          voteSet.add(hmac);
          return [{ insertId: 1 }];
        }
        if (sql.startsWith('DELETE FROM complaint_votes')) {
          const hmac = params[1];
          const existed = voteSet.delete(hmac);
          return [{ affectedRows: existed ? 1 : 0 }];
        }
        if (sql.includes('SELECT COUNT(*) AS count FROM complaint_votes')) {
          return [[{ count: voteSet.size }]];
        }
        return [{ affectedRows: 1 }];
      },
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });

    // Cast vote without OTP -> issues HttpOnly voter cookie, increments count, leaves status intact
    const voteOk = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/GS-2026-10001/votes',
    });
    assert.equal(voteOk.status, 201);
    assert.equal(voteOk.body.vote_count, 1);
    assert.equal(voteOk.body.user_voted, true);
    assert.equal(voteOk.body.status, 'Submitted');
    assert.equal(storedStatus, 'Submitted');
    const voterSetCookie = String(voteOk.headers['set-cookie']);
    assert.match(voterSetCookie, /gramsetu_voter=/i);
    assert.match(voterSetCookie, /HttpOnly/i);
    const voterCookiePair = extractCookiePair(voteOk.headers['set-cookie']);

    // Duplicate vote from same browser cookie -> 409 Conflict
    const dupVote = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/GS-2026-10001/votes',
      headers: { Cookie: voterCookiePair },
    });
    assert.equal(dupVote.status, 409);

    // Withdrawal without valid cookie -> 403 Unauthorized
    const unauthWithdraw = await invokeApp(app, {
      method: 'DELETE',
      url: '/api/complaints/GS-2026-10001/votes',
    });
    assert.equal(unauthWithdraw.status, 403);

    // Withdraw with tampered cookie -> 403 Unauthorized
    const tamperedWithdraw = await invokeApp(app, {
      method: 'DELETE',
      url: '/api/complaints/GS-2026-10001/votes',
      headers: { Cookie: `${env.voterCookieName}=tampered.value` },
    });
    assert.equal(tamperedWithdraw.status, 403);

    // Track reflects user_voted=true for same voter cookie
    pool.execute = async (sql) => {
      if (sql.includes('WHERE c.complaint_id = ? AND c.mobile = ?')) {
        return [[{
          id: 99,
          complaint_id: 'GS-2026-10001',
          name: 'Lakshmi',
          mobile: '9876543210',
          village_name: 'Kondapalli',
          status: 'Submitted',
          created_at: '2026-06-25T10:02:59.000Z',
        }]];
      }
      if (sql.includes('COUNT(*) AS vote_count')) {
        return [[{ complaint_pk: 99, vote_count: voteSet.size }]];
      }
      if (sql.includes('WHERE voter_key_hmac = ?')) {
        return [[{ complaint_pk: 99 }]];
      }
      return [[]];
    };
    const trackedWithVote = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/track',
      headers: { Cookie: voterCookiePair },
      body: { complaint_id: 'GS-2026-10001', mobile: '9876543210' },
    });
    assert.equal(trackedWithVote.status, 200);
    assert.equal(trackedWithVote.body.complaint.vote_count, 1);
    assert.equal(trackedWithVote.body.complaint.user_voted, true);

    // Valid withdrawal -> 200 and vote_count drops to 0
    const withdrawOk = await invokeApp(app, {
      method: 'DELETE',
      url: '/api/complaints/GS-2026-10001/votes',
      headers: { Cookie: voterCookiePair },
    });
    assert.equal(withdrawOk.status, 200);
    assert.equal(withdrawOk.body.vote_count, 0);
    assert.equal(withdrawOk.body.user_voted, false);

    // Closed/Rejected/Resolved complaints cannot receive new votes
    storedStatus = 'Rejected';
    const voteRejected = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/GS-2026-10001/votes',
      headers: { Cookie: voterCookiePair },
    });
    assert.equal(voteRejected.status, 400);
  });

  it('handles missing location columns (ER_BAD_FIELD_ERROR) gracefully across submission, maps, and errorHandler, and aligns admin UI statuses', async () => {
    assert.deepEqual(ADMIN_UI_STATUSES, ALLOWED_STATUSES);
    assert.ok(ALLOWED_STATUSES.includes('Assigned'));

    // Submission without coords falls back cleanly to legacy 10-column INSERT on ER_BAD_FIELD_ERROR
    let insertAttempt = 0;
    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async (sql) => {
        if (sql.includes('FROM villages')) return [[{ id: 1, panchayath_id: 1 }]];
        if (sql.includes('SELECT id FROM complaints')) return [[]];
        if (sql.includes('INSERT INTO complaints')) {
          insertAttempt += 1;
          if (sql.includes('approx_latitude')) {
            const badField = new Error("Unknown column 'latitude' in 'field list'");
            badField.code = 'ER_BAD_FIELD_ERROR';
            badField.errno = 1054;
            throw badField;
          }
          return [{ insertId: 44 }];
        }
        return [{ affectedRows: 1 }];
      },
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });

    const fallbackCreate = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints',
      body: {
        privacy_mode: 'CONSENT',
        consent_accepted: true,
        name: 'Anitha',
        mobile: '9876543211',
        village_id: '1',
        ward_no: '3',
        category: 'Water Supply',
        title: 'Pipe leak',
        description: 'Water leaking near school gate',
      },
    });
    assert.equal(fallbackCreate.status, 201);
    assert.equal(insertAttempt, 2);

    // Submission WITH coords returns controlled 503 without leaking raw SQL error when columns missing
    const pinnedUnmigrated = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints',
      body: {
        privacy_mode: 'CONSENT',
        consent_accepted: true,
        name: 'Anitha',
        mobile: '9876543211',
        village_id: '1',
        category: 'Water Supply',
        title: 'Pipe leak',
        description: 'Water leaking near school gate',
        latitude: '16.5062',
        longitude: '80.6480',
      },
    });
    assert.equal(pinnedUnmigrated.status, 503);
    assert.doesNotMatch(pinnedUnmigrated.body.message, /Unknown column/i);

    // Public map falls back to unmapped list cleanly on ER_BAD_FIELD_ERROR
    pool.execute = async (sql) => {
      if (sql.includes('c.approx_latitude')) {
        const badField = new Error("Unknown column 'c.approx_latitude' in 'field list'");
        badField.code = 'ER_BAD_FIELD_ERROR';
        badField.errno = 1054;
        throw badField;
      }
      if (sql.includes('FROM complaints c')) {
        return [[{
          id: 44,
          complaint_id: 'GS-2026-44444',
          village_id: 1,
          village_name: 'Kondapalli',
          category: 'Water Supply',
          title: 'Pipe leak',
          status: 'Submitted',
          created_at: '2026-06-26T10:00:00Z',
        }]];
      }
      return [[]];
    };

    const mapFallback = await invokeApp(app, { method: 'GET', url: '/api/complaints/map' });
    assert.equal(mapFallback.status, 200);
    assert.equal(mapFallback.body.summary.total, 1);
    assert.equal(mapFallback.body.summary.mapped, 0);
    assert.equal(mapFallback.body.summary.unmapped, 1);

    // Direct ER_BAD_FIELD_ERROR bubbles to safe 503 without raw SQL leak
    pool.execute = async () => {
      const badField = new Error("Unknown column 'foo' in 'field list'");
      badField.code = 'ER_BAD_FIELD_ERROR';
      badField.errno = 1054;
      throw badField;
    };
    const safeSchemaErr = await invokeApp(app, { method: 'GET', url: '/api/villages' });
    assert.equal(safeSchemaErr.status, 503);
    assert.doesNotMatch(safeSchemaErr.body.message, /Unknown column|foo/i);
  });

  it('enforces Anonymous Mode and Consent Mode validation, storage, admin privacy, and lookup', async () => {
    // 1. Validator rules for privacy_mode and consent_accepted
    const missingMode = validateCreateComplaint({
      name: 'Sita',
      mobile: '9876543210',
      village_id: '1',
      category: 'Water Supply',
      title: 'No water',
      description: 'Main pipeline dry',
    });
    assert.equal(missingMode.valid, false);

    const consentNoAgree = validateCreateComplaint({
      privacy_mode: 'CONSENT',
      consent_accepted: 'false',
      name: 'Sita',
      mobile: '9876543210',
      village_id: '1',
      category: 'Water Supply',
      title: 'No water',
      description: 'Main pipeline dry',
    });
    assert.equal(consentNoAgree.valid, false);
    assert.match(consentNoAgree.message, /consent/i);

    const consentNoName = validateCreateComplaint({
      privacy_mode: 'CONSENT',
      consent_accepted: true,
      name: '',
      mobile: '9876543210',
      village_id: '1',
      category: 'Water Supply',
      title: 'No water',
      description: 'Main pipeline dry',
    });
    assert.equal(consentNoName.valid, false);

    const consentValid = validateCreateComplaint({
      privacy_mode: 'CONSENT',
      consent_accepted: true,
      name: 'Sita',
      mobile: '9876543210',
      village_id: '1',
      category: 'Water Supply',
      title: 'No water',
      description: 'Main pipeline dry',
    });
    assert.equal(consentValid.valid, true);
    assert.equal(consentValid.data.privacyMode, 'CONSENT');
    assert.equal(consentValid.data.name, 'Sita');
    assert.equal(consentValid.data.mobile, '9876543210');

    const anonValid = validateCreateComplaint({
      privacy_mode: 'ANONYMOUS',
      name: 'ShouldBeIgnored',
      mobile: '9876543210',
      village_id: '1',
      category: 'Road Damage',
      title: 'Potholes',
      description: 'Deep potholes near school',
    });
    assert.equal(anonValid.valid, true);
    assert.equal(anonValid.data.privacyMode, 'ANONYMOUS');
    assert.equal(anonValid.data.name, null);
    assert.equal(anonValid.data.mobile, '9876543210');

    // 2. POST /api/complaints persists ANONYMOUS with null name and plain-text mobile
    let capturedInsertParams = null;
    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async (sql, params) => {
        if (sql.includes('FROM villages')) return [[{ id: 1, panchayath_id: 1 }]];
        if (sql.includes('SELECT id FROM complaints')) return [[]];
        if (sql.includes('INSERT INTO complaints')) {
          capturedInsertParams = params;
          return [{ insertId: 77 }];
        }
        return [{ affectedRows: 1 }];
      },
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });

    const anonCreate = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints',
      body: {
        privacy_mode: 'ANONYMOUS',
        mobile: '9876500001',
        village_id: '1',
        category: 'Road Damage',
        title: 'Anonymous issue',
        description: 'Broken drain near bus stand',
      },
    });
    assert.equal(anonCreate.status, 201);
    assert.equal(anonCreate.body.privacy_mode, 'ANONYMOUS');
    assert.ok(Array.isArray(capturedInsertParams));
    assert.equal(capturedInsertParams[1], null); // name is null
    assert.equal(capturedInsertParams[2], '9876500001'); // plain-text mobile stored for lookup
    assert.equal(capturedInsertParams[capturedInsertParams.length - 1], 'ANONYMOUS');

    // Fails closed with 503 if ANONYMOUS submitted before migration 006 column exists
    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async (sql) => {
        if (sql.includes('FROM villages')) return [[{ id: 1, panchayath_id: 1 }]];
        if (sql.includes('SELECT id FROM complaints')) return [[]];
        if (sql.includes('INSERT INTO complaints')) {
          const badField = new Error("Unknown column 'privacy_mode' in 'field list'");
          badField.code = 'ER_BAD_FIELD_ERROR';
          badField.errno = 1054;
          throw badField;
        }
        return [{ affectedRows: 1 }];
      },
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });
    const anonUnmigrated = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints',
      body: {
        privacy_mode: 'ANONYMOUS',
        mobile: '9876500001',
        village_id: '1',
        category: 'Road Damage',
        title: 'Anonymous issue',
        description: 'Broken drain near bus stand',
      },
    });
    assert.equal(anonUnmigrated.status, 503);

    // 3. Admin APIs hide anonymous citizen identity, expose consent/legacy, and guard mobile search
    const hash = await bcrypt.hash('admin', 4);
    const sampleRows = [
      {
        id: 77,
        complaint_id: 'GS-2026-77001',
        name: 'LeakedNameShouldBeMasked',
        mobile: '9876500001',
        privacy_mode: 'ANONYMOUS',
        village_id: 1,
        village_name: 'Kondapalli',
        category: 'Road Damage',
        title: 'Anonymous issue',
        description: 'Broken drain near bus stand',
        status: 'Submitted',
        created_at: '2026-06-26T10:00:00Z',
      },
      {
        id: 78,
        complaint_id: 'GS-2026-77002',
        name: 'Rama Devi',
        mobile: '9876500002',
        privacy_mode: 'CONSENT',
        village_id: 1,
        village_name: 'Kondapalli',
        category: 'Water Supply',
        title: 'Consent issue',
        description: 'Tap leaking',
        status: 'Submitted',
        created_at: '2026-06-26T11:00:00Z',
      },
      {
        id: 79,
        complaint_id: 'GS-2026-77003',
        name: 'Legacy Citizen',
        mobile: '9876500003',
        privacy_mode: null,
        village_id: 1,
        village_name: 'Kondapalli',
        category: 'Other',
        title: 'Legacy issue',
        description: 'Existing pre-feature row',
        status: 'Submitted',
        created_at: '2026-06-25T11:00:00Z',
      },
    ];

    let capturedSearchSql = '';
    pool.execute = async (sql, params) => {
      if (sql.includes('WHERE username = ?')) {
        return [[{ id: 1, name: 'Kondapalli', username: 'kondapalli', password: hash, status: 'active' }]];
      }
      if (sql.includes('FROM panchayaths WHERE id = ?')) {
        return [[{ id: 1, name: 'Kondapalli', username: 'kondapalli', email: '', status: 'active' }]];
      }
      if (sql.includes('FROM villages WHERE panchayath_id = ?')) {
        return [[{ id: 1, name: 'Kondapalli' }]];
      }
      if (sql.includes('WHERE c.complaint_id = ? AND c.mobile = ?')) {
        return [[sampleRows[0]]];
      }
      if (sql.includes('SELECT complaint_id, title, status, created_at') && sql.includes('WHERE mobile = ?')) {
        return [[{ complaint_id: 'GS-2026-77001', title: 'Anonymous issue', status: 'Submitted', created_at: '2026-06-26T10:00:00Z' }]];
      }
      if (sql.includes('GROUP BY status')) {
        return [[{ status: 'Submitted', total: 3 }]];
      }
      if (sql.includes('c.privacy_mode <> \'ANONYMOUS\'')) {
        capturedSearchSql = sql;
        return [[sampleRows[1]]];
      }
      if (sql.includes('WHERE c.id = ?')) {
        const match = sampleRows.find((r) => r.id === params[0]);
        return [match ? [match] : []];
      }
      if (sql.includes('FROM complaints c')) {
        return [sampleRows];
      }
      return [[]];
    };

    const loginRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/admin/login',
      body: { username: 'kondapalli', password: 'admin' },
    });
    assert.equal(loginRes.status, 200);
    const cookie = String(loginRes.headers['set-cookie']).split(';')[0];

    const listRes = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/complaints',
      headers: { Cookie: cookie },
    });
    assert.equal(listRes.status, 200);
    const anonRow = listRes.body.complaints.find((c) => c.id === 77);
    const consentRow = listRes.body.complaints.find((c) => c.id === 78);
    const legacyRow = listRes.body.complaints.find((c) => c.id === 79);
    assert.equal(anonRow.name, 'Anonymous Citizen');
    assert.equal(anonRow.mobile, null);
    assert.equal(anonRow.is_anonymous, true);
    assert.equal(consentRow.name, 'Rama Devi');
    assert.equal(consentRow.mobile, '9876500002');
    assert.equal(consentRow.privacy_mode, 'CONSENT');
    assert.equal(legacyRow.name, 'Legacy Citizen');
    assert.equal(legacyRow.mobile, '9876500003');
    assert.equal(legacyRow.privacy_mode, null);

    const detailAnon = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/complaints/77',
      headers: { Cookie: cookie },
    });
    assert.equal(detailAnon.status, 200);
    assert.equal(detailAnon.body.complaint.name, 'Anonymous Citizen');
    assert.equal(detailAnon.body.complaint.mobile, null);

    const mapAnon = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/complaints/map',
      headers: { Cookie: cookie },
    });
    assert.equal(mapAnon.status, 200);
    const mapAnonRow = mapAnon.body.complaints.find((c) => c.id === 77);
    assert.equal(mapAnonRow.name, 'Anonymous Citizen');
    assert.equal(mapAnonRow.mobile, null);

    const searchRes = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/complaints?search=9876500001',
      headers: { Cookie: cookie },
    });
    assert.equal(searchRes.status, 200);
    assert.match(capturedSearchSql, /c\.privacy_mode <> 'ANONYMOUS'/);

    const dashAnon = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: cookie },
    });
    assert.equal(dashAnon.status, 200);
    const dashAnonRow = dashAnon.body.recentComplaints.find((c) => c.id === 77);
    assert.equal(dashAnonRow.name, 'Anonymous Citizen');
    assert.equal(dashAnonRow.mobile, null);

    // 4. Tracking shows Anonymous Citizen & preserves Lookup by plain-text mobile
    const trackAnon = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/track',
      body: { complaint_id: 'GS-2026-77001', mobile: '9876500001' },
    });
    assert.equal(trackAnon.status, 200);
    assert.equal(trackAnon.body.complaint.name, 'Anonymous Citizen');
    assert.equal(trackAnon.body.complaint.mobile, 'Hidden (Anonymous)');

    const { findComplaintsByMobile } = require('../services/complaintService');
    const lookupRows = await findComplaintsByMobile('9876500001');
    assert.equal(lookupRows.length, 1);
    assert.equal(lookupRows[0].complaint_id, 'GS-2026-77001');
  });
});
