import request from 'supertest';
import app from '../src/app.js';
import { resetStore } from '../src/db/memory.js';

beforeEach(() => resetStore());

describe('Integration Workflows', () => {
  test('complete ticket lifecycle', async () => {
    const createRes = await request(app).post('/tickets').send({
      customer_id: 'I1', customer_email: 'i1@example.com', customer_name: 'I1', subject: 'Lifecycle', description: 'desc long enough',
      category: 'other', priority: 'medium', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' }
    });
    const id = createRes.body.id;
    await request(app).put(`/tickets/${id}`).send({ status: 'in_progress' });
    await request(app).post(`/tickets/${id}/auto-classify`);
    await request(app).put(`/tickets/${id}`).send({ status: 'resolved', resolved_at: new Date().toISOString() });
    const final = await request(app).get(`/tickets/${id}`);
    expect(final.body.status).toBe('resolved');
    await request(app).delete(`/tickets/${id}`);
    const gone = await request(app).get(`/tickets/${id}`);
    expect(gone.status).toBe(404);
  });

  test('bulk import with auto-classification', async () => {
    const json = JSON.stringify([
      { customer_id: 'B1', customer_email: 'b1@example.com', customer_name: 'B1', subject: 'Critical crash', description: 'production down', metadata: { source: 'api', device_type: 'desktop' } },
      { customer_id: 'B2', customer_email: 'b2@example.com', customer_name: 'B2', subject: 'Refund', description: 'duplicate charge', metadata: { source: 'api', device_type: 'desktop' } }
    ]);
    const res = await request(app).post('/tickets/import').send({ format: 'json', content: json, auto_classify: true });
    expect(res.status).toBe(201);
    expect(res.body.tickets.some((t) => t.priority === 'urgent')).toBe(true);
  });

  test('concurrent operations (20+ requests)', async () => {
    const payload = {
      customer_id: 'CX', customer_email: 'cx@example.com', customer_name: 'CX', subject: 'Concurrent', description: 'desc long enough',
      category: 'other', priority: 'medium', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' }
    };
    const promises = Array.from({ length: 25 }).map(() => request(app).post('/tickets').send(payload));
    const results = await Promise.all(promises);
    expect(results.every((r) => r.status === 201)).toBe(true);
    const list = await request(app).get('/tickets');
    expect(list.body.length).toBeGreaterThanOrEqual(25);
  });

  test('combined filtering by category and priority', async () => {
    const mk = (subject, category, priority) => ({
      customer_id: 'F', customer_email: 'f@example.com', customer_name: 'F', subject, description: 'desc long enough',
      category, priority, status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' },
    });
    await request(app).post('/tickets').send(mk('A', 'technical_issue', 'high'));
    await request(app).post('/tickets').send(mk('B', 'technical_issue', 'low'));
    const res = await request(app).get('/tickets?category=technical_issue&priority=high');
    expect(res.body.length).toBe(1);
    expect(res.body[0].priority).toBe('high');
  });

  test('import error handling with invalid format', async () => {
    const res = await request(app).post('/tickets/import').send({ format: 'yaml', content: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
