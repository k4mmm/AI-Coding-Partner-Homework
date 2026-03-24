'use strict';

const fs = require('fs');
const path = require('path');
const { processMessage } = require('../agents/settlement_processor');

// Spy on fs so we don't touch the real filesystem
let mkdirSpy;
let writeSpy;

beforeEach(() => {
  mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
  writeSpy  = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function makeMessage(dataOverrides = {}) {
  return {
    message_id: 'test-msg-id',
    timestamp: '2026-03-16T10:00:00Z',
    source_agent: 'fraud_detector',
    target_agent: 'settlement_processor',
    message_type: 'transaction',
    data: {
      transaction_id: 'TXN_TEST',
      amount: '1500.00',
      currency: 'USD',
      source_account: 'ACC-1001',
      destination_account: 'ACC-2001',
      timestamp: '2026-03-16T10:00:00Z',
      transaction_type: 'transfer',
      status: 'validated',
      fraud_risk_score: 0,
      fraud_risk_level: 'LOW',
      ...dataOverrides,
    },
  };
}

describe('Settlement Processor — processMessage', () => {
  describe('settled transactions', () => {
    test('settles a validated LOW-risk transaction', () => {
      const result = processMessage(makeMessage());
      expect(result.data.settlement_status).toBe('settled');
      expect(result.data.settlement_id).toBeDefined();
      expect(result.data.settlement_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    test('settles a validated MEDIUM-risk transaction', () => {
      const result = processMessage(makeMessage({ fraud_risk_level: 'MEDIUM', fraud_risk_score: 4 }));
      expect(result.data.settlement_status).toBe('settled');
      expect(result.data.settlement_id).toBeDefined();
    });

    test('each settled transaction gets a unique settlement_id', () => {
      const r1 = processMessage(makeMessage({ transaction_id: 'TXN_A' }));
      const r2 = processMessage(makeMessage({ transaction_id: 'TXN_B' }));
      expect(r1.data.settlement_id).not.toBe(r2.data.settlement_id);
    });

    test('settled result includes processed_at ISO timestamp', () => {
      const result = processMessage(makeMessage());
      expect(result.data.processed_at).toBeDefined();
      expect(new Date(result.data.processed_at).toISOString()).toBe(result.data.processed_at);
    });
  });

  describe('held for review (HIGH risk)', () => {
    test('holds a HIGH-risk transaction without settlement_id', () => {
      const result = processMessage(makeMessage({
        fraud_risk_level: 'HIGH',
        fraud_risk_score: 7,
      }));
      expect(result.data.settlement_status).toBe('held_for_review');
      expect(result.data.settlement_id).toBeNull();
    });

    test('held result still includes processed_at', () => {
      const result = processMessage(makeMessage({ fraud_risk_level: 'HIGH', fraud_risk_score: 7 }));
      expect(result.data.processed_at).toBeDefined();
    });
  });

  describe('rejected transactions', () => {
    test('marks pre-rejected transaction as rejected, no settlement_id', () => {
      const result = processMessage(makeMessage({
        status: 'rejected',
        reason: 'INVALID_CURRENCY',
        fraud_risk_score: undefined,
        fraud_risk_level: undefined,
      }));
      expect(result.data.settlement_status).toBe('rejected');
      expect(result.data.settlement_id).toBeNull();
    });

    test('rejected result preserves the original reason', () => {
      const result = processMessage(makeMessage({
        status: 'rejected',
        reason: 'INVALID_AMOUNT:must_be_positive',
      }));
      expect(result.data.reason).toBe('INVALID_AMOUNT:must_be_positive');
    });
  });

  describe('file writing', () => {
    test('writes result to shared/results/{transaction_id}.json', () => {
      processMessage(makeMessage({ transaction_id: 'TXN_FILE_TEST' }));
      expect(writeSpy).toHaveBeenCalledTimes(1);
      const [filePath] = writeSpy.mock.calls[0];
      expect(filePath).toContain('TXN_FILE_TEST.json');
      expect(filePath).toContain(path.join('shared', 'results'));
    });

    test('written content is valid JSON', () => {
      processMessage(makeMessage({ transaction_id: 'TXN_JSON_TEST' }));
      const [, content] = writeSpy.mock.calls[0];
      expect(() => JSON.parse(content)).not.toThrow();
    });

    test('result envelope has correct source and target agents', () => {
      const result = processMessage(makeMessage());
      expect(result.source_agent).toBe('settlement_processor');
      expect(result.target_agent).toBe('results');
    });
  });
});
