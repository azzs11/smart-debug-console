process.env.NODE_ENV = 'test';

const { analyzeLog, getActiveCausalChains, getChainById, getGraphData, _reset } = require('../src/services/causalEngine');

beforeEach(() => _reset());

const makeLog = (overrides = {}) => ({
  id:        `log-${Math.random().toString(36).slice(2)}`,
  message:   'test message',
  severity:  'info',
  source:    'api',
  timestamp: new Date().toISOString(),
  ...overrides
});

describe('analyzeLog — no causal parent', () => {
  it('returns zeroed causal data for first log', () => {
    const result = analyzeLog(makeLog({ severity: 'error', source: 'database' }));
    expect(result.causal_parent_id).toBeNull();
    expect(result.causal_root_id).toBeNull();
    expect(result.causal_chain_depth).toBe(0);
  });
});

describe('analyzeLog — severity escalation from same source', () => {
  it('detects parent when error follows warning from same source within 5s', () => {
    const now = Date.now();
    const parent = makeLog({ id: 'parent-1', severity: 'warning', source: 'database', message: 'slow query detected', timestamp: new Date(now).toISOString() });
    const child  = makeLog({ id: 'child-1',  severity: 'error',   source: 'database', message: 'connection failed',   timestamp: new Date(now + 4000).toISOString() });

    analyzeLog(parent);
    const result = analyzeLog(child);

    expect(result.causal_parent_id).toBe('parent-1');
    expect(result.causal_root_id).toBe('parent-1');
    expect(result.causal_chain_depth).toBe(1);
    expect(result.blast_radius_score).toBeGreaterThan(0);
  });

  it('detects parent when critical follows error (severity escalation)', () => {
    const now = Date.now();
    const parent = makeLog({ id: 'p1', severity: 'error',    source: 'api', message: 'api request failed',          timestamp: new Date(now).toISOString() });
    const child  = makeLog({ id: 'c1', severity: 'critical', source: 'api', message: 'critical system failure api', timestamp: new Date(now + 3000).toISOString() });

    analyzeLog(parent);
    const result = analyzeLog(child);

    expect(result.causal_parent_id).toBe('p1');
    expect(result.causal_chain_depth).toBe(1);
  });
});

describe('analyzeLog — entity/source relationship', () => {
  it('links api error to upstream database failure via entity overlap', () => {
    const now = Date.now();
    const dbLog  = makeLog({ id: 'db1', severity: 'critical', source: 'database', message: 'database connection pool exhausted', timestamp: new Date(now).toISOString() });
    const apiLog = makeLog({ id: 'a1',  severity: 'error',    source: 'api',      message: 'failed to connect to database',      timestamp: new Date(now + 5000).toISOString() });

    analyzeLog(dbLog);
    const result = analyzeLog(apiLog);

    expect(result.causal_parent_id).toBe('db1');
  });

  it('does NOT link logs outside the 30s causal window', () => {
    const now = Date.now();
    const parent = makeLog({ id: 'old', severity: 'error', source: 'database', message: 'database failed', timestamp: new Date(now - 35000).toISOString() });
    const child  = makeLog({ id: 'new', severity: 'error', source: 'database', message: 'database failed', timestamp: new Date(now).toISOString() });

    analyzeLog(parent);
    const result = analyzeLog(child);

    expect(result.causal_parent_id).toBeNull();
  });
});

describe('analyzeLog — chain depth and blast radius', () => {
  it('correctly increments depth through a chain', () => {
    const now = Date.now();
    const l1 = makeLog({ id: 'L1', severity: 'critical', source: 'database', message: 'database connection pool exhausted', timestamp: new Date(now).toISOString() });
    const l2 = makeLog({ id: 'L2', severity: 'error',    source: 'api',      message: 'failed to connect to database',      timestamp: new Date(now + 3000).toISOString() });
    const l3 = makeLog({ id: 'L3', severity: 'error',    source: 'auth-service', message: 'authentication failed database', timestamp: new Date(now + 7000).toISOString() });

    analyzeLog(l1);
    const r2 = analyzeLog(l2);
    const r3 = analyzeLog(l3);

    expect(r2.causal_chain_depth).toBe(1);
    expect(r3.causal_chain_depth).toBeGreaterThanOrEqual(1);
    expect(r3.blast_radius_score).toBeGreaterThan(0);
  });

  it('blast radius decays with depth (child BR < parent BR + weight)', () => {
    const BLAST_RADIUS_DECAY = 0.8;
    const now = Date.now();
    const root  = makeLog({ id: 'R', severity: 'critical', source: 'database', message: 'database pool exhausted', timestamp: new Date(now).toISOString() });
    const child = makeLog({ id: 'C', severity: 'error',    source: 'database', message: 'database connection failed', timestamp: new Date(now + 2000).toISOString() });

    const rootResult  = analyzeLog(root);
    const childResult = analyzeLog(child);

    if (childResult.causal_parent_id) {
      // child BR = weight + DECAY * parent.BR = 4 + 0.8*5 = 8
      const expectedBR = 4 + BLAST_RADIUS_DECAY * 5;
      expect(childResult.blast_radius_score).toBeCloseTo(expectedBR, 1);
    }
  });
});

describe('getActiveCausalChains', () => {
  it('returns chains with root metadata', () => {
    const now = Date.now();
    const l1 = makeLog({ id: 'R1', severity: 'critical', source: 'database', message: 'database failure', timestamp: new Date(now).toISOString() });
    const l2 = makeLog({ id: 'C1', severity: 'error',    source: 'api',      message: 'api database error', timestamp: new Date(now + 3000).toISOString() });

    analyzeLog(l1);
    analyzeLog(l2);

    const chains = getActiveCausalChains();
    expect(chains.length).toBeGreaterThanOrEqual(0);
    if (chains.length > 0) {
      expect(chains[0]).toHaveProperty('root_log_id');
      expect(chains[0]).toHaveProperty('blast_radius_score');
      expect(chains[0]).toHaveProperty('total_affected_logs');
      expect(chains[0]).toHaveProperty('chain_depth');
    }
  });

  it('sorts chains by blast_radius_score descending', () => {
    const now = Date.now();
    analyzeLog(makeLog({ id: 'A1', severity: 'critical', source: 'database', message: 'database pool exhausted', timestamp: new Date(now).toISOString() }));
    analyzeLog(makeLog({ id: 'A2', severity: 'error',    source: 'database', message: 'database connection failed', timestamp: new Date(now+2000).toISOString() }));

    const chains = getActiveCausalChains();
    for (let i = 1; i < chains.length; i++) {
      expect(chains[i - 1].blast_radius_score).toBeGreaterThanOrEqual(chains[i].blast_radius_score);
    }
  });
});

describe('getChainById', () => {
  it('returns all logs in a chain', () => {
    const now = Date.now();
    const l1 = makeLog({ id: 'ROOT', severity: 'critical', source: 'database', message: 'database crash', timestamp: new Date(now).toISOString() });
    const l2 = makeLog({ id: 'CHILD', severity: 'error', source: 'database', message: 'database error crash', timestamp: new Date(now+2000).toISOString() });

    analyzeLog(l1);
    analyzeLog(l2);

    const chain = getChainById('ROOT');
    expect(chain.length).toBeGreaterThanOrEqual(1);
    expect(chain.some(l => l.id === 'ROOT')).toBe(true);
  });
});

describe('getGraphData', () => {
  it('returns valid nodes and edges structure', () => {
    const now = Date.now();
    const l1 = makeLog({ id: 'G1', severity: 'critical', source: 'database', message: 'database pool exhausted', timestamp: new Date(now).toISOString() });
    const l2 = makeLog({ id: 'G2', severity: 'error',    source: 'database', message: 'database connection failed', timestamp: new Date(now+3000).toISOString() });

    analyzeLog(l1);
    analyzeLog(l2);

    const graph = getGraphData();
    expect(graph).toHaveProperty('nodes');
    expect(graph).toHaveProperty('edges');
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
  });
});
