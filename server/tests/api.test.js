const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const http = require('node:http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const env = require('../config/env');
const { pool } = require('../config/db');
const {
  validateCreateComplaint,
  validateTrackComplaint,
  validateStatusUpdate,
} = require('../validators/complaintValidator');
const { parseImagePaths, generateComplaintId } = require('../utils/complaintUtils');
const { verifyPassword } = require('../services/authService');
const app = require('../app');

/**
 * Invokes the Express app in-memory without opening a TCP socket.
 */
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

describe('GramSetu Backend Unit & Integration Tests', () => {
  let originalExecute;
  let originalGetConnection;

  before(() => {
    originalExecute = pool.execute.bind(pool);
    originalGetConnection = pool.getConnection.bind(pool);
  });

  after(() => {
    pool.execute = originalExecute;
    pool.getConnection = originalGetConnection;
  });

  it('validates complaint creation fields matching PHP rules', () => {
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

    const valid = validateCreateComplaint({
      name: 'Lakshmi Devi',
      mobile: '9876543210',
      village_id: '1',
      ward_no: '7',
      category: 'Street Light',
      title: 'Light broken',
      description: 'Near main road',
    });
    assert.equal(valid.valid, true);
    assert.equal(valid.data.villageId, 1);
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

  it('validates track complaint and status update payloads', () => {
    assert.equal(validateTrackComplaint({ complaint_id: '', mobile: '9876543210' }).valid, false);
    assert.equal(validateTrackComplaint({ complaint_id: 'GS-2026-12345', mobile: '9876543210' }).valid, true);
    assert.equal(validateStatusUpdate({ status: 'Invalid' }).valid, false);
    assert.equal(validateStatusUpdate({ status: 'In Progress' }).valid, true);
  });

  it('GET /test confirms backend server is running', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/test' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.message, 'GramSetu backend is running');
  });

  it('GET /api/villages returns active villages from database', async () => {
    pool.execute = async () => [
      [{ id: 1, village_name: 'Kondapalli', panchayath_id: 1, panchayath_name: 'Kondapalli Panchayath' }],
    ];
    const res = await invokeApp(app, { method: 'GET', url: '/api/villages' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'success');
    assert.equal(res.body.villages.length, 1);
    assert.equal(res.body.villages[0].village_name, 'Kondapalli');
  });

  it('POST /api/complaints creates complaint inside transaction', async () => {
    let committed = false;
    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      execute: async (sql) => {
        if (sql.includes('FROM villages')) {
          return [[{ id: 1, panchayath_id: 1 }]];
        }
        if (sql.includes('SELECT id FROM complaints')) {
          return [[]];
        }
        return [{ insertId: 13 }];
      },
      commit: async () => {
        committed = true;
      },
      rollback: async () => {},
      release: () => {},
    });

    const boundary = '----GramSetuTestBoundary123';
    const fields = {
      name: 'Lakshmi Devi',
      mobile: '9876543210',
      village_id: '1',
      ward_no: '7',
      category: 'Street Light',
      title: 'Light off',
      description: 'Pole 12 dark',
    };
    const multipartBody =
      Object.entries(fields)
        .map(
          ([k, v]) =>
            `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
        )
        .join('') + `--${boundary}--\r\n`;

    const res = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body: multipartBody,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'success');
    assert.match(res.body.complaint_id, /^GS-\d{4}-\d{5}$/);
    assert.equal(committed, true);
  });

  it('POST /api/complaints/track and /api/complaints/lookup return formatted results', async () => {
    pool.execute = async (sql) => {
      if (sql.includes('WHERE c.complaint_id = ? AND c.mobile = ?')) {
        return [[{
          id: 11,
          complaint_id: 'GS-2026-59312',
          name: 'vamsi',
          mobile: '8790808059',
          village_name: 'Kondapalli',
          category: 'Garbage Collection',
          title: 'shit',
          description: 'waste',
          image_path: '["uploads/images/test.jpg"]',
          audio_path: null,
          status: 'Resolved',
          created_at: '2026-06-25T11:28:31.000Z',
        }]];
      }
      return [[{
        complaint_id: 'GS-2026-59312',
        title: 'shit',
        status: 'Resolved',
        created_at: '2026-06-25T11:28:31.000Z',
      }]];
    };

    const trackRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/track',
      body: { complaint_id: 'GS-2026-59312', mobile: '8790808059' },
    });
    assert.equal(trackRes.status, 200);
    assert.equal(trackRes.body.complaint.village, 'Kondapalli');
    assert.deepEqual(trackRes.body.complaint.images, ['uploads/images/test.jpg']);

    const lookupRes = await invokeApp(app, {
      method: 'POST',
      url: '/api/complaints/lookup',
      body: { mobile: '8790808059' },
    });
    assert.equal(lookupRes.status, 200);
    assert.equal(lookupRes.body.length, 1);
  });

  it('rejects unauthenticated access to protected /api/admin/* routes', async () => {
    const res = await invokeApp(app, { method: 'GET', url: '/api/admin/dashboard' });
    assert.equal(res.status, 401);
    assert.equal(res.body.status, 'error');
  });

  it('allows authenticated panchayath admin to view scoped dashboard and update status', async () => {
    const token = jwt.sign(
      { id: 1, name: 'Kondapalli Panchayath', username: 'kondapalli', email: '', role: 'panchayath_admin' },
      env.jwtSecret
    );

    pool.execute = async (sql, params) => {
      if (sql.includes('FROM panchayaths WHERE id = ?')) {
        return [[{ id: 1, name: 'Kondapalli Panchayath', username: 'kondapalli', email: '', status: 'active' }]];
      }
      if (sql.includes('FROM villages WHERE panchayath_id = ?')) {
        return [[{ id: 1, name: 'Kondapalli' }]];
      }
      if (sql.includes('GROUP BY status')) {
        return [[{ status: 'Resolved', count: 1 }]];
      }
      if (sql.includes('LIMIT 10')) {
        return [[{ id: 11, complaint_id: 'GS-2026-59312', name: 'vamsi', status: 'Resolved', village_name: 'Kondapalli' }]];
      }
      if (sql.includes('WHERE c.id = ? AND c.village_id IN')) {
        return params[0] === 11
          ? [[{ id: 11, complaint_id: 'GS-2026-59312', name: 'vamsi', status: 'In Progress', village_name: 'Kondapalli' }]]
          : [[]];
      }
      return [{ affectedRows: 1 }];
    };

    const dashRes = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(dashRes.status, 200);
    assert.equal(dashRes.body.stats.total, 1);
    assert.equal(dashRes.body.stats.Resolved, 1);

    const patchRes = await invokeApp(app, {
      method: 'PATCH',
      url: '/api/admin/complaints/11/status',
      headers: { Authorization: `Bearer ${token}` },
      body: { status: 'In Progress' },
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.complaint.status, 'In Progress');

    const outOfScopeRes = await invokeApp(app, {
      method: 'PATCH',
      url: '/api/admin/complaints/999/status',
      headers: { Authorization: `Bearer ${token}` },
      body: { status: 'Resolved' },
    });
    assert.equal(outOfScopeRes.status, 404);
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
