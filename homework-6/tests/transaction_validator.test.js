'use strict';

const { processMessage, VALID_CURRENCIES, REQUIRED_FIELDS } = require('../agents/transaction_validator');

// Helper: build a minimal valid message envelope
function makeMessage(overrides = {}) {
  return {
    message_id: 'test-msg-id',
    timestamp: '2026-03-16T10:00:00Z',
    source_agent: 'integrator',
    target_agent: 'transaction_validator',
    message_type: 'transaction',
    data: {
      transaction_id: 'TXN_TEST',
      amount: '1500.00',
      currency: 'USD',
      source_account: 'ACC-1001',
      destination_account: 'ACC-2001',
      timestamp: '2026-03-16T10:00:00Z',
      transaction_type: 'transfer',
      description: 'Test payment',
      metadata: { channel: 'online', country: 'US' },
      ...overrides,
    },
  };
}

describe('Transaction Validator — processMessage', () => {
  describe('valid transactions', () => {
    test('validates a well-formed transaction', () => {
      const result = processMessage(makeMessage());
      expect(result.data.status).toBe('validated');
      expect(result.data.reason).toBeUndefined();
      expect(result.source_agent).toBe('transaction_validator');
      expect(result.target_agent).toBe('fraud_detector');
    });

    test('accepts all supported ISO 4217 currencies', () => {
      for (const currency of ['EUR', 'GBP', 'JPY', 'CAD', 'CHF']) {
        const result = processMessage(makeMessage({ currency }));
        expect(result.data.status).toBe('validated');
      }
    });

    test('accepts large valid amounts', () => {
      const result = processMessage(makeMessage({ amount: '999999.99' }));
      expect(result.data.status).toBe('validated');
    });

    test('result envelope has required message fields', () => {
      const result = processMessage(makeMessage());
      expect(result.message_id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.message_type).toBe('transaction');
    });
  });

  describe('currency validation', () => {
    test('rejects unknown currency code', () => {
      const result = processMessage(makeMessage({ currency: 'XYZ' }));
      expect(result.data.status).toBe('rejected');
      expect(result.data.reason).toBe('INVALID_CURRENCY');
    });

    test('rejects lowercase currency code', () => {
      const result = processMessage(makeMessage({ currency: 'usd' }));
      expect(result.data.status).toBe('rejected');
      expect(result.data.reason).toBe('INVALID_CURRENCY');
    });

    test('rejects empty currency string', () => {
      const result = processMessage(makeMessage({ currency: '' }));
      // Empty string is treated as a missing required field
      expect(result.data.status).toBe('rejected');
    });
  });

  describe('amount validation', () => {
    test('rejects negative amount', () => {
      const result = processMessage(makeMessage({ amount: '-100.00' }));
      expect(result.data.status).toBe('rejected');
      expect(result.data.reason).toBe('INVALID_AMOUNT:must_be_positive');
    });

    test('rejects zero amount', () => {
      const result = processMessage(makeMessage({ amount: '0' }));
      expect(result.data.status).toBe('rejected');
      expect(result.data.reason).toBe('INVALID_AMOUNT:must_be_positive');
    });

    test('rejects non-numeric amount', () => {
      const result = processMessage(makeMessage({ amount: 'not-a-number' }));
      expect(result.data.status).toBe('rejected');
      expect(result.data.reason).toBe('INVALID_AMOUNT:not_a_number');
    });
  });

  describe('required field validation', () => {
    test.each(REQUIRED_FIELDS)('rejects when %s is missing', (field) => {
      const data = {};
      data[field] = undefined;
      const result = processMessage(makeMessage(data));
      expect(result.data.status).toBe('rejected');
      expect(result.data.reason).toContain('MISSING_FIELD');
    });

    test('rejects when transaction_id is null', () => {
      const result = processMessage(makeMessage({ transaction_id: null }));
      expect(result.data.status).toBe('rejected');
      expect(result.data.reason).toBe('MISSING_FIELD:transaction_id');
    });
  });

  describe('constants', () => {
    test('VALID_CURRENCIES includes USD, EUR, GBP', () => {
      expect(VALID_CURRENCIES.has('USD')).toBe(true);
      expect(VALID_CURRENCIES.has('EUR')).toBe(true);
      expect(VALID_CURRENCIES.has('GBP')).toBe(true);
    });

    test('REQUIRED_FIELDS includes all mandatory transaction fields', () => {
      expect(REQUIRED_FIELDS).toContain('transaction_id');
      expect(REQUIRED_FIELDS).toContain('amount');
      expect(REQUIRED_FIELDS).toContain('currency');
      expect(REQUIRED_FIELDS).toContain('source_account');
      expect(REQUIRED_FIELDS).toContain('destination_account');
    });
  });
});
