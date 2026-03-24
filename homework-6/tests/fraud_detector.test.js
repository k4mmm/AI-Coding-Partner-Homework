'use strict';

const { processMessage } = require('../agents/fraud_detector');

function makeMessage(dataOverrides = {}) {
  return {
    message_id: 'test-msg-id',
    timestamp: '2026-03-16T10:00:00Z',
    source_agent: 'transaction_validator',
    target_agent: 'fraud_detector',
    message_type: 'transaction',
    data: {
      transaction_id: 'TXN_TEST',
      amount: '500.00',
      currency: 'USD',
      source_account: 'ACC-1001',
      destination_account: 'ACC-2001',
      timestamp: '2026-03-16T10:00:00Z',
      transaction_type: 'transfer',
      status: 'validated',
      metadata: { channel: 'online', country: 'US' },
      ...dataOverrides,
    },
  };
}

describe('Fraud Detector — processMessage', () => {
  describe('low-risk transactions', () => {
    test('assigns LOW risk to a domestic small transfer', () => {
      const result = processMessage(makeMessage({ amount: '500.00' }));
      expect(result.data.fraud_risk_level).toBe('LOW');
      expect(result.data.fraud_risk_score).toBe(0);
    });

    test('result routes to settlement_processor', () => {
      const result = processMessage(makeMessage());
      expect(result.source_agent).toBe('fraud_detector');
      expect(result.target_agent).toBe('settlement_processor');
    });
  });

  describe('amount thresholds', () => {
    test('amount > $10,000 adds 3 points → MEDIUM', () => {
      const result = processMessage(makeMessage({ amount: '25000.00' }));
      expect(result.data.fraud_risk_score).toBe(3);
      expect(result.data.fraud_risk_level).toBe('MEDIUM');
    });

    test('amount exactly $10,000.01 triggers the >$10k rule', () => {
      const result = processMessage(makeMessage({ amount: '10000.01' }));
      expect(result.data.fraud_risk_score).toBe(3);
    });

    test('amount > $50,000 adds 7 points → HIGH', () => {
      const result = processMessage(makeMessage({ amount: '75000.00' }));
      expect(result.data.fraud_risk_score).toBe(7);
      expect(result.data.fraud_risk_level).toBe('HIGH');
    });

    test('amount exactly $10,000 does NOT trigger the >$10k rule', () => {
      const result = processMessage(makeMessage({ amount: '10000.00' }));
      expect(result.data.fraud_risk_score).toBe(0);
    });
  });

  describe('unusual hour rule', () => {
    test('transaction at 02:00 UTC adds 2 points', () => {
      const result = processMessage(makeMessage({
        timestamp: '2026-03-16T02:47:00Z',
        amount: '500.00',
      }));
      expect(result.data.fraud_risk_score).toBe(2);
    });

    test('transaction at 04:59 UTC adds 2 points', () => {
      const result = processMessage(makeMessage({
        timestamp: '2026-03-16T04:59:00Z',
      }));
      expect(result.data.fraud_risk_score).toBe(2);
    });

    test('transaction at 05:00 UTC does NOT trigger unusual hour', () => {
      const result = processMessage(makeMessage({
        timestamp: '2026-03-16T05:00:00Z',
      }));
      expect(result.data.fraud_risk_score).toBe(0);
    });

    test('transaction at 10:00 UTC does NOT trigger unusual hour', () => {
      const result = processMessage(makeMessage({
        timestamp: '2026-03-16T10:00:00Z',
      }));
      expect(result.data.fraud_risk_score).toBe(0);
    });
  });

  describe('cross-border rule', () => {
    test('cross-border transaction adds 1 point', () => {
      const result = processMessage(makeMessage({
        metadata: { channel: 'api', country: 'DE' },
      }));
      expect(result.data.fraud_risk_score).toBe(1);
    });

    test('domestic (US) transaction does not add cross-border points', () => {
      const result = processMessage(makeMessage({
        metadata: { channel: 'online', country: 'US' },
      }));
      expect(result.data.fraud_risk_score).toBe(0);
    });

    test('missing metadata does not crash', () => {
      const msg = makeMessage();
      delete msg.data.metadata;
      const result = processMessage(msg);
      expect(result.data.fraud_risk_score).toBe(0);
    });
  });

  describe('combined scoring', () => {
    test('unusual hour + cross-border = score 3 (MEDIUM)', () => {
      const result = processMessage(makeMessage({
        timestamp: '2026-03-16T02:47:00Z',
        metadata: { channel: 'api', country: 'DE' },
        amount: '500.00',
      }));
      expect(result.data.fraud_risk_score).toBe(3);
      expect(result.data.fraud_risk_level).toBe('MEDIUM');
    });

    test('score is clamped at 10 maximum', () => {
      // >50k (+7) + unusual hour (+2) + cross-border (+1) = 10
      const result = processMessage(makeMessage({
        amount: '75000.00',
        timestamp: '2026-03-16T03:00:00Z',
        metadata: { channel: 'api', country: 'DE' },
      }));
      expect(result.data.fraud_risk_score).toBe(10);
      expect(result.data.fraud_risk_level).toBe('HIGH');
    });
  });

  describe('rejected transaction pass-through', () => {
    test('already-rejected message is passed through without scoring', () => {
      const result = processMessage(makeMessage({ status: 'rejected', reason: 'INVALID_CURRENCY' }));
      expect(result.data.fraud_risk_score).toBeUndefined();
      expect(result.data.fraud_risk_level).toBeUndefined();
      expect(result.data.status).toBe('rejected');
    });
  });

  describe('risk level boundaries', () => {
    test('score 2 → LOW', () => {
      const result = processMessage(makeMessage({
        timestamp: '2026-03-16T02:00:00Z',
        metadata: { channel: 'api', country: 'US' },
      }));
      expect(result.data.fraud_risk_score).toBe(2);
      expect(result.data.fraud_risk_level).toBe('LOW');
    });

    test('score 3 → MEDIUM', () => {
      const result = processMessage(makeMessage({ amount: '25000.00' }));
      expect(result.data.fraud_risk_level).toBe('MEDIUM');
    });

    test('score 7 → HIGH', () => {
      const result = processMessage(makeMessage({ amount: '75000.00' }));
      expect(result.data.fraud_risk_level).toBe('HIGH');
    });
  });
});
