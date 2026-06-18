-- Migration 001: Initial schema for Smart Debug Console
-- Run this file manually against your PostgreSQL instance, or mount as docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('critical','error','warning','info','debug')),
  source VARCHAR(100) NOT NULL DEFAULT 'unknown',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ml_predicted_severity VARCHAR(10),
  ml_confidence FLOAT,
  ml_severity_match BOOLEAN,
  ml_probabilities JSONB,
  causal_parent_id UUID REFERENCES logs(id),
  causal_root_id UUID REFERENCES logs(id),
  causal_chain_depth INTEGER DEFAULT 0,
  blast_radius_score FLOAT DEFAULT 0,
  fingerprint_hash VARCHAR(64),
  is_anomaly BOOLEAN DEFAULT FALSE,
  anomaly_score FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE causal_chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  root_log_id UUID NOT NULL REFERENCES logs(id),
  chain_depth INTEGER NOT NULL,
  total_affected_logs INTEGER NOT NULL,
  blast_radius_score FLOAT NOT NULL,
  chain_summary TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE anomaly_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fingerprint_hash VARCHAR(64) UNIQUE NOT NULL,
  pattern_description TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  occurrence_count INTEGER DEFAULT 1,
  avg_blast_radius FLOAT DEFAULT 0
);

CREATE INDEX idx_logs_severity      ON logs(severity);
CREATE INDEX idx_logs_timestamp     ON logs(timestamp DESC);
CREATE INDEX idx_logs_source        ON logs(source);
CREATE INDEX idx_logs_causal_root   ON logs(causal_root_id);
CREATE INDEX idx_logs_anomaly       ON logs(is_anomaly) WHERE is_anomaly = TRUE;
CREATE INDEX idx_logs_fingerprint   ON logs(fingerprint_hash);
