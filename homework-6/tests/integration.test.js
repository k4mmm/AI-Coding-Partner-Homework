'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const validator = require('../agents/transaction_validator');
const fraudDetector = require('../agents/fraud_detector');
const settlementProcessor = require('../agents/settlement_processor');
const {
  setupDirectories,
  clearDirectory,
  clearSharedDirs,
  wrapTransaction,
  printSummary,
  runPipeline,
} = require('../integrator');

// Suppress console output during tests
beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

// Shared spy refs for fs mocks
let mkdirSpy;
let writeSpy;

beforeEach(() => {
  mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
  writeSpy  = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Load sample transactions once
const SAMPLE = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'sample-transactions.json'), 'utf8')
);

// Run the full pipeline through all three agents
function runAll(transactions) {
  return transactions.map((tx) => {
    const msg = wrapTransaction(tx);
    const validated = validator.processMessage(msg);
    const scored = fraudDetector.processMessage(validated);
    return settlementProcessor.processMessage(scored);
  });
}

describe('Integration — full pipeline on all 8 sample transactions', () => {
  let results;

  beforeEach(() => {
    results = runAll(SAMPLE);
  });

  test('processes all 8 transactions', () => {
    expect(results).toHaveLength(8);
  });

  test('every result has a valid settlement_status', () => {
    for (const r of results) {
      expect(['settled', 'held_for_review', 'rejected']).toContain(r.data.settlement_status);
    }
  });

  test('TXN001 — $1,500 domestic → settled, LOW risk (score 0)', () => {
    const r = results.find(r => r.data.transaction_id === 'TXN001');
    expect(r.data.settlement_status).toBe('settled');
    expect(r.data.fraud_risk_level).toBe('LOW');
    expect(r.data.fraud_risk_score).toBe(0);
  });

  test('TXN002 — $25,000 wire → settled, MEDIUM risk (score 3)', () => {
    const r = results.find(r => r.data.transaction_id === 'TXN002');
    expect(r.data.settlement_status).toBe('settled');
    expect(r.data.fraud_risk_level).toBe('MEDIUM');
    expect(r.data.fraud_risk_score).toBe(3);
  });

  test('TXN003 — $9,999.99 → settled, LOW risk', () => {
    const r = results.find(r => r.data.transaction_id === 'TXN003');
    expect(r.data.settlement_status).toBe('settled');
    expect(r.data.fraud_risk_level).toBe('LOW');
  });

  test('TXN004 — cross-border EUR at 02:47 UTC → settled, MEDIUM (score 3)', () => {
    const r = results.find(r => r.data.transaction_id === 'TXN004');
    expect(r.data.settlement_status).toBe('settled');
    expect(r.data.fraud_risk_score).toBe(3);
    expect(r.data.fraud_risk_level).toBe('MEDIUM');
  });

  test('TXN005 — $75,000 wire → held_for_review, HIGH risk (score 7)', () => {
    const r = results.find(r => r.data.transaction_id === 'TXN005');
    expect(r.data.settlement_status).toBe('held_for_review');
    expect(r.data.fraud_risk_level).toBe('HIGH');
    expect(r.data.fraud_risk_score).toBe(7);
    expect(r.data.settlement_id).toBeNull();
  });

  test('TXN006 — currency XYZ → rejected (INVALID_CURRENCY)', () => {
    const r = results.find(r => r.data.transaction_id === 'TXN006');
    expect(r.data.settlement_status).toBe('rejected');
    expect(r.data.reason).toBe('INVALID_CURRENCY');
  });

  test('TXN007 — negative amount → rejected (INVALID_AMOUNT)', () => {
    const r = results.find(r => r.data.transaction_id === 'TXN007');
    expect(r.data.settlement_status).toBe('rejected');
    expect(r.data.reason).toBe('INVALID_AMOUNT:must_be_positive');
  });

  test('TXN008 — $3,200 domestic → settled, LOW risk', () => {
    const r = results.find(r => r.data.transaction_id === 'TXN008');
    expect(r.data.settlement_status).toBe('settled');
    expect(r.data.fraud_risk_level).toBe('LOW');
  });

  test('exactly 5 settled, 1 held, 2 rejected', () => {
    const settled = results.filter(r => r.data.settlement_status === 'settled');
    const held    = results.filter(r => r.data.settlement_status === 'held_for_review');
    const rejected = results.filter(r => r.data.settlement_status === 'rejected');
    expect(settled).toHaveLength(5);
    expect(held).toHaveLength(1);
    expect(rejected).toHaveLength(2);
  });

  test('settled transactions all have unique UUIDs', () => {
    const ids = results
      .filter(r => r.data.settlement_status === 'settled')
      .map(r => r.data.settlement_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Integrator helpers', () => {
  test('wrapTransaction produces valid message envelope', () => {
    const tx = SAMPLE[0];
    const msg = wrapTransaction(tx);
    expect(msg.source_agent).toBe('integrator');
    expect(msg.target_agent).toBe('transaction_validator');
    expect(msg.message_type).toBe('transaction');
    expect(msg.message_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(msg.data.transaction_id).toBe(tx.transaction_id);
  });

  test('wrapTransaction preserves all transaction fields', () => {
    const tx = SAMPLE[0];
    const msg = wrapTransaction(tx);
    expect(msg.data.amount).toBe(tx.amount);
    expect(msg.data.currency).toBe(tx.currency);
  });

  test('printSummary runs without throwing', () => {
    const fakeResults = [
      { data: { settlement_status: 'settled' } },
      { data: { settlement_status: 'held_for_review', fraud_risk_score: 7, fraud_risk_level: 'HIGH' } },
      { data: { settlement_status: 'rejected', transaction_id: 'TXN_X', reason: 'INVALID_CURRENCY' } },
    ];
    expect(() => printSummary(fakeResults)).not.toThrow();
  });

  test('clearDirectory does not throw for non-existent directory', () => {
    expect(() => clearDirectory('/tmp/non-existent-pipeline-dir-xyz')).not.toThrow();
  });

  test('setupDirectories calls mkdirSync for each shared dir', () => {
    setupDirectories();
    expect(mkdirSpy).toHaveBeenCalled();
  });

  test('clearSharedDirs runs without throwing', () => {
    expect(() => clearSharedDirs()).not.toThrow();
  });
});

describe('runPipeline — error handling', () => {
  test('handles missing sample-transactions.json gracefully', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    expect(() => runPipeline()).toThrow('process.exit');
  });

  test('handles a corrupt/throwing transaction gracefully', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('sample-transactions')) {
        return JSON.stringify([{ transaction_id: 'TXN_ERR', amount: null }]);
      }
      return '{}';
    });
    // Should not throw — writes a system_error result instead
    expect(() => runPipeline()).not.toThrow();
  });
});
