import { ticketSchema, createTicketFromInput } from '../src/models/ticket.js';

describe('Ticket Model Validation', () => {
  const base = {
    customer_id: 'A1',
    customer_email: 'a1@example.com',
    customer_name: 'Alice',
    subject: 'Valid subject',
    description: 'Valid description long enough',
    category: 'other',
    priority: 'medium',
    status: 'new',
    tags: ['test'],
    metadata: { source: 'api', browser: 'Chrome', device_type: 'desktop' },
  };

  test('creates a valid ticket', () => {
    const t = createTicketFromInput(base);
    const { error } = ticketSchema.validate(t);
    expect(error).toBeUndefined();
    expect(t.id).toBeDefined();
  });

  test('rejects invalid email', () => {
    expect(() => createTicketFromInput({ ...base, customer_email: 'bad' })).toThrow('Validation failed');
  });

  test('rejects short subject', () => {
    expect(() => createTicketFromInput({ ...base, subject: '' })).toThrow('Validation failed');
  });

  test('rejects short description', () => {
    expect(() => createTicketFromInput({ ...base, description: 'short' })).toThrow('Validation failed');
  });

  test('rejects invalid category', () => {
    expect(() => createTicketFromInput({ ...base, category: 'invalid' })).toThrow('Validation failed');
  });

  test('rejects invalid priority', () => {
    expect(() => createTicketFromInput({ ...base, priority: 'invalid' })).toThrow('Validation failed');
  });

  test('rejects invalid status', () => {
    expect(() => createTicketFromInput({ ...base, status: 'invalid' })).toThrow('Validation failed');
  });

  test('allows null assigned_to and resolved_at', () => {
    const t = createTicketFromInput({ ...base, assigned_to: null });
    expect(t.assigned_to).toBeNull();
    expect(t.resolved_at).toBeNull();
  });

  test('fills defaults for metadata', () => {
    const t = createTicketFromInput({ ...base, metadata: { source: 'api', device_type: 'desktop' } });
    expect(t.metadata.browser).toBeDefined();
  });
});
