'use strict';

const { maskAccount, log } = require('../agents/logger');

describe('logger — maskAccount', () => {
  test('masks a normal account number, keeping last 4 chars', () => {
    expect(maskAccount('ACC-1001')).toBe('****1001');
    expect(maskAccount('ACC-9999')).toBe('****9999');
  });

  test('returns **** for null', () => {
    expect(maskAccount(null)).toBe('****');
  });

  test('returns **** for undefined', () => {
    expect(maskAccount(undefined)).toBe('****');
  });

  test('returns **** for non-string input', () => {
    expect(maskAccount(12345)).toBe('****');
  });

  test('returns **** for a short account (4 chars or fewer)', () => {
    expect(maskAccount('AB')).toBe('****');
    expect(maskAccount('1234')).toBe('****');
  });
});

describe('logger — log', () => {
  let spy;
  beforeEach(() => { spy = jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => spy.mockRestore());

  test('logs a JSON line with required fields', () => {
    log('test_agent', 'TXN001', 'validated');
    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0]);
    expect(entry.agent).toBe('test_agent');
    expect(entry.transaction_id).toBe('TXN001');
    expect(entry.outcome).toBe('validated');
    expect(entry.timestamp).toBeDefined();
  });

  test('log includes extra fields when provided', () => {
    log('test_agent', 'TXN001', 'settled', { settlement_id: 'abc-123' });
    const entry = JSON.parse(spy.mock.calls[0][0]);
    expect(entry.settlement_id).toBe('abc-123');
  });
});
