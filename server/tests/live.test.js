/**
 * Live MySQL integration tests against the configured `vgmp` database.
 * Run locally with: npm run test:live
 * Note: Requires a reachable MySQL server and valid `server/.env` DB credentials.
 */
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const http = require('node:http');

const shouldRun = process.env.RUN_LIVE_DB_TESTS === '1';
const { pool } = require('../config/db');
const app = require('../app');
const { run: runLegacyCheck } = require('../scripts/migrateLegacyComplaints');

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
      const payload = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
      if (!req.headers['content-type']) req.headers['content-type'] = 'application/json';
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
        // ignore non-JSON
      }
      origEnd(chunk, encoding, cb);
      resolve({ status: res.statusCode, headers: res.getHeaders(), body: parsedBody });
    };

    expressApp.handle(req, res, reject);
  });
}

describe('GramSetu Live MySQL Integration Tests', { skip: !shouldRun }, () => {
  after(async () => {
    await pool.end();
  });

  it('connects to live MySQL database and fetches active villages', async () => {
    const health = await invokeApp(app, { method: 'GET', url: '/api/health' });
    assert.equal(health.status, 200);
    assert.equal(health.body.database, 'connected');

    const villages = await invokeApp(app, { method: 'GET', url: '/api/villages' });
    assert.equal(villages.status, 200);
    assert.ok(villages.body.villages.length > 0);
  });

  it('runs non-destructive dry-run check for legacy complaints', async () => {
    const report = await runLegacyCheck([]);
    assert.ok(Array.isArray(report.unambiguous));
    assert.ok(Array.isArray(report.ambiguous));
    assert.ok(Array.isArray(report.unmatched));
  });

  it('verifies Panchayat isolation between Kondapalli and Guntur accounts', async () => {
    const kLogin = await invokeApp(app, {
      method: 'POST',
      url: '/api/admin/login',
      body: { username: 'kondapalli', password: 'admin' },
    });
    assert.equal(kLogin.status, 200);
    const kCookie = String(kLogin.headers['set-cookie']).split(';')[0];

    const gLogin = await invokeApp(app, {
      method: 'POST',
      url: '/api/admin/login',
      body: { username: 'guntur', password: 'admin' },
    });
    assert.equal(gLogin.status, 200);
    const gCookie = String(gLogin.headers['set-cookie']).split(';')[0];

    const kList = await invokeApp(app, {
      method: 'GET',
      url: '/api/admin/complaints',
      headers: { Cookie: kCookie },
    });
    assert.equal(kList.status, 200);
    for (const row of kList.body.complaints) {
      const gView = await invokeApp(app, {
        method: 'GET',
        url: `/api/admin/complaints/${row.id}`,
        headers: { Cookie: gCookie },
      });
      assert.equal(gView.status, 404);
    }
  });
});

