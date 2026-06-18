process.env.NODE_ENV    = 'test';
process.env.ADMIN_API_KEY = 'test-key';
process.env.CORS_ORIGIN   = 'http://localhost:3000';

const request = require('supertest');
const app     = require('../src/app');

describe('Log body validation', () => {
  const post = (body) => request(app).post('/api/logs').send(body);

  it('accepts all valid severity values', async () => {
    for (const sev of ['critical', 'error', 'warning', 'info', 'debug']) {
      const res = await post({ message: `test ${sev}`, severity: sev });
      expect(res.status).toBe(201);
    }
  });

  it('normalises severity to lowercase', async () => {
    const res = await post({ message: 'test', severity: 'ERROR' });
    expect(res.status).toBe(201);
    expect(res.body.data.severity).toBe('error');
  });

  it('trims whitespace from message', async () => {
    const res = await post({ message: '  trimmed  ', severity: 'info' });
    expect(res.status).toBe(201);
    expect(res.body.data.message).toBe('trimmed');
  });

  it('rejects missing message', async () => {
    const res = await post({ severity: 'info' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.field === 'message')).toBe(true);
  });

  it('rejects whitespace-only message', async () => {
    const res = await post({ message: '   ', severity: 'info' });
    expect(res.status).toBe(400);
  });

  it('rejects message over 2000 chars', async () => {
    const res = await post({ message: 'a'.repeat(2001) });
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.field === 'message')).toBe(true);
  });

  it('rejects unknown severity', async () => {
    const res = await post({ message: 'test', severity: 'verbose' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.field === 'severity')).toBe(true);
  });

  it('accepts missing severity (defaults to info)', async () => {
    const res = await post({ message: 'no severity provided' });
    expect(res.status).toBe(201);
    expect(res.body.data.severity).toBe('info');
  });

  it('rejects source over 100 chars', async () => {
    const res = await post({ message: 'test', source: 'x'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.field === 'source')).toBe(true);
  });

  it('accepts source at exactly 100 chars', async () => {
    const res = await post({ message: 'test', source: 'x'.repeat(100) });
    expect(res.status).toBe(201);
  });

  it('accepts missing source (uses unknown)', async () => {
    const res = await post({ message: 'test', severity: 'debug' });
    expect(res.status).toBe(201);
    expect(res.body.data.source).toBe('unknown');
  });
});

describe('Query limit validation', () => {
  it('accepts valid limit', async () => {
    const res = await request(app).get('/api/logs?limit=25');
    expect(res.status).toBe(200);
  });

  it('rejects limit=0', async () => {
    const res = await request(app).get('/api/logs?limit=0');
    expect(res.status).toBe(400);
  });

  it('rejects limit>500', async () => {
    const res = await request(app).get('/api/logs?limit=501');
    expect(res.status).toBe(400);
  });

  it('rejects non-integer limit', async () => {
    const res = await request(app).get('/api/logs?limit=abc');
    expect(res.status).toBe(400);
  });
});

describe('API key validation', () => {
  it('returns 401 with no key', async () => {
    const res = await request(app).post('/api/logs/generator/start').send({});
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/missing/i);
  });

  it('returns 403 with wrong key', async () => {
    const res = await request(app)
      .post('/api/logs/generator/start')
      .set('x-api-key', 'wrong-key')
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 200 with correct key', async () => {
    const start = await request(app)
      .post('/api/logs/generator/start')
      .set('x-api-key', 'test-key')
      .send({ interval: 60000 });
    expect(start.status).toBe(200);

    await request(app)
      .post('/api/logs/generator/stop')
      .set('x-api-key', 'test-key')
      .send({});
  });
});

describe('Route 404', () => {
  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });
});
