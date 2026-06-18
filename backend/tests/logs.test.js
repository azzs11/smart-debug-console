const request = require('supertest');

// Set env before requiring app so dotenv doesn't overwrite test values
process.env.NODE_ENV    = 'test';
process.env.ADMIN_API_KEY = 'test-admin-key';
process.env.CORS_ORIGIN   = 'http://localhost:3000';

const app = require('../src/app');

describe('GET /health', () => {
  it('returns 200 with feature flags', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.features).toHaveProperty('causal_intelligence', true);
    expect(res.body.features).toHaveProperty('anomaly_detection', true);
  });
});

describe('POST /api/logs', () => {
  it('creates a log and returns 201', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ message: 'Database connection refused', severity: 'error', source: 'api' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.severity).toBe('error');
    expect(res.body.data.source).toBe('api');
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('timestamp');
  });

  it('defaults severity to info when omitted', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ message: 'Something happened' });
    expect(res.status).toBe(201);
    expect(res.body.data.severity).toBe('info');
  });

  it('returns causal metadata on the log', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ message: 'test causal log', severity: 'warning', source: 'database' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('causal');
    expect(res.body.data).toHaveProperty('is_anomaly');
    expect(res.body.data).toHaveProperty('anomaly_score');
  });

  it('rejects empty message with 400', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ message: '', severity: 'info' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.errors[0].field).toBe('message');
  });

  it('rejects invalid severity with 400', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ message: 'test', severity: 'CATASTROPHIC' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('severity');
  });

  it('rejects source > 100 chars with 400', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ message: 'test', severity: 'info', source: 'x'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('source');
  });

  it('rejects message > 2000 chars with 400', async () => {
    const res = await request(app)
      .post('/api/logs')
      .send({ message: 'x'.repeat(2001), severity: 'info' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/logs', () => {
  it('returns a list of logs', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('respects limit query param', async () => {
    const res = await request(app).get('/api/logs?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('rejects invalid limit', async () => {
    const res = await request(app).get('/api/logs?limit=9999');
    expect(res.status).toBe(400);
  });

  it('supports severity filter', async () => {
    const res = await request(app).get('/api/logs?severity=error');
    expect(res.status).toBe(200);
    res.body.data.forEach(log => expect(log.severity).toBe('error'));
  });
});

describe('GET /api/logs/stats', () => {
  it('returns stats with bySeverity breakdown', async () => {
    const res = await request(app).get('/api/logs/stats');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('bySeverity');
    expect(res.body.data.bySeverity).toHaveProperty('critical');
    expect(res.body.data.bySeverity).toHaveProperty('error');
  });
});

describe('Generator endpoints', () => {
  it('returns 401 without API key', async () => {
    const res = await request(app).post('/api/logs/generator/start').send({});
    expect(res.status).toBe(401);
  });

  it('returns 403 with wrong API key', async () => {
    const res = await request(app)
      .post('/api/logs/generator/start')
      .set('x-api-key', 'WRONG')
      .send({});
    expect(res.status).toBe(403);
  });

  it('starts and stops with correct API key', async () => {
    const start = await request(app)
      .post('/api/logs/generator/start')
      .set('x-api-key', 'test-admin-key')
      .send({ interval: 60000 });
    expect(start.status).toBe(200);
    expect(start.body.message).toMatch(/started/i);

    const stop = await request(app)
      .post('/api/logs/generator/stop')
      .set('x-api-key', 'test-admin-key')
      .send({});
    expect(stop.status).toBe(200);
    expect(stop.body.message).toMatch(/stopped/i);
  });
});

describe('GET /api/metrics/summary', () => {
  it('returns summary with expected fields', async () => {
    const res = await request(app).get('/api/metrics/summary');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total_logs');
    expect(res.body.data).toHaveProperty('anomaly_count');
    expect(res.body.data).toHaveProperty('active_causal_chains');
    expect(res.body.data).toHaveProperty('blast_radius_max');
    expect(res.body.data).toHaveProperty('ml_available');
  });
});

describe('GET /api/causal/chains', () => {
  it('returns chains array', async () => {
    const res = await request(app).get('/api/causal/chains');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/causal/graph', () => {
  it('returns nodes and edges', async () => {
    const res = await request(app).get('/api/causal/graph');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('nodes');
    expect(res.body.data).toHaveProperty('edges');
  });
});
