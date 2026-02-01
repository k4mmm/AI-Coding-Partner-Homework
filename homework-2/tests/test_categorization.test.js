import { classifyTicket } from '../src/services/classificationService.js';

const base = {
  id: 'id',
  customer_id: 'C',
  customer_email: 'c@example.com',
  customer_name: 'C',
  subject: 'S',
  description: 'A valid description long enough',
  category: 'other',
  priority: 'medium',
  status: 'new',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  resolved_at: null,
  assigned_to: null,
  tags: [],
  metadata: { source: 'api', browser: '', device_type: 'desktop' },
};

describe('Classification Service', () => {
  test('detects account_access', () => {
    const { decision } = classifyTicket({ ...base, subject: "Can't access", description: 'password issue with 2FA' });
    expect(decision.category).toBe('account_access');
  });

  test('detects technical_issue', () => {
    const { decision } = classifyTicket({ ...base, subject: 'Error occurs', description: 'Crash when saving' });
    expect(decision.category).toBe('technical_issue');
  });

  test('detects billing_question', () => {
    const { decision } = classifyTicket({ ...base, subject: 'Refund request', description: 'Duplicate charge' });
    expect(decision.category).toBe('billing_question');
  });

  test('detects feature_request', () => {
    const { decision } = classifyTicket({ ...base, subject: 'Feature request', description: 'Suggestion' });
    expect(decision.category).toBe('feature_request');
  });

  test('detects bug_report', () => {
    const { decision } = classifyTicket({ ...base, subject: 'Bug report', description: 'Steps to reproduce' });
    expect(decision.category).toBe('bug_report');
  });

  test('priority urgent', () => {
    const { decision } = classifyTicket({ ...base, subject: "Can't access", description: 'Critical production down' });
    expect(decision.priority).toBe('urgent');
  });

  test('priority high', () => {
    const { decision } = classifyTicket({ ...base, subject: 'Blocking ASAP', description: 'Important blocking issue' });
    expect(decision.priority).toBe('high');
  });

  test('priority low', () => {
    const { decision } = classifyTicket({ ...base, subject: 'Minor cosmetic', description: 'Suggestion only' });
    expect(decision.priority).toBe('low');
  });

  test('confidence between 0 and 1', () => {
    const { decision } = classifyTicket({ ...base, subject: 'Random', description: 'No keywords' });
    expect(decision.confidence).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
  });

  test('keywords include matched patterns', () => {
    const { decision } = classifyTicket({ ...base, subject: 'Security critical', description: 'Production down' });
    expect(decision.keywords_found.length).toBeGreaterThan(0);
  });
});
