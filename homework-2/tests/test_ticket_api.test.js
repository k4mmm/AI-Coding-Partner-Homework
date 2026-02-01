import request from 'supertest';
import app from '../src/app.js';
import { resetStore, getStore } from '../src/db/memory.js';

beforeEach(() => resetStore());

describe('Ticket API', () => {
  test('health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('create ticket', async () => {
    const payload = {
      customer_id: 'C1',
      customer_email: 'c1@example.com',
      customer_name: 'Customer One',
      subject: 'Subject',
      description: 'A valid description long enough',
      category: 'other',
      priority: 'medium',
      status: 'new',
      metadata: { source: 'api', browser: 'Chrome', device_type: 'desktop' },
    };
    const res = await request(app).post('/tickets').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  test('create ticket with auto_classify', async () => {
    const payload = {
      customer_id: 'C2',
      customer_email: 'c2@example.com',
      customer_name: 'Customer Two',
      subject: 'Critical crash in production',
      description: 'App crashes when saving settings',
      category: 'other',
      priority: 'medium',
      status: 'new',
      metadata: { source: 'api', browser: 'Chrome', device_type: 'desktop' },
    };
    const res = await request(app).post('/tickets?auto_classify=true').send(payload);
    expect(res.status).toBe(201);
    expect(['urgent', 'high']).toContain(res.body.priority);
    expect(res.body.category).toBe('technical_issue');
  });

  test('list tickets with filtering', async () => {
    const mk = (subject, category, priority) => ({
      customer_id: 'F', customer_email: 'f@example.com', customer_name: 'F', subject, description: 'desc long enough',
      category, priority, status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' },
    });
    await request(app).post('/tickets').send(mk('A', 'other', 'medium'));
    await request(app).post('/tickets').send(mk('B', 'technical_issue', 'high'));
    const res = await request(app).get('/tickets?category=technical_issue');
    expect(res.body.length).toBe(1);
    expect(res.body[0].category).toBe('technical_issue');
  });

  test('get specific ticket', async () => {
    const resCreate = await request(app).post('/tickets').send({
      customer_id: 'C3', customer_email: 'c3@example.com', customer_name: 'C3', subject: 'S', description: 'desc long enough',
      category: 'other', priority: 'medium', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' }
    });
    const id = resCreate.body.id;
    const res = await request(app).get(`/tickets/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  test('update ticket', async () => {
    const { body } = await request(app).post('/tickets').send({
      customer_id: 'C4', customer_email: 'c4@example.com', customer_name: 'C4', subject: 'S', description: 'desc long enough',
      category: 'other', priority: 'medium', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' }
    });
    const res = await request(app).put(`/tickets/${body.id}`).send({ priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
  });

  test('delete ticket', async () => {
    const { body } = await request(app).post('/tickets').send({
      customer_id: 'C5', customer_email: 'c5@example.com', customer_name: 'C5', subject: 'S', description: 'desc long enough',
      category: 'other', priority: 'medium', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' }
    });
    const res = await request(app).delete(`/tickets/${body.id}`);
    expect(res.status).toBe(204);
  });

  test('404 on missing ticket', async () => {
    const res = await request(app).get('/tickets/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  test('import JSON bulk', async () => {
    const json = JSON.stringify([{ customer_id: 'I1', customer_email: 'i1@example.com', customer_name: 'I1', subject: 'S', description: 'desc long enough', category: 'other', priority: 'low', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' } }]);
    const res = await request(app).post('/tickets/import').send({ format: 'json', content: json });
    expect(res.status).toBe(201);
    expect(res.body.summary.successful).toBe(1);
  });

  test('import CSV bulk', async () => {
    const csv = 'customer_id,customer_email,customer_name,subject,description,category,priority,status,source,browser,device_type\nI2,i2@example.com,I2,Subject,Valid description,other,low,new,api,,desktop';
    const res = await request(app).post('/tickets/import').send({ format: 'csv', content: csv });
    expect(res.status).toBe(201);
    expect(res.body.summary.successful).toBe(1);
  });

  test('import XML bulk', async () => {
    const xml = '<tickets><ticket><customer_id>I3</customer_id><customer_email>i3@example.com</customer_email><customer_name>I3</customer_name><subject>Subject</subject><description>Valid description xml</description><category>other</category><priority>low</priority><status>new</status><source>api</source><device_type>desktop</device_type></ticket></tickets>';
    const res = await request(app).post('/tickets/import').send({ format: 'xml', content: xml });
    expect(res.status).toBe(201);
    expect(res.body.summary.successful).toBe(1);
  });

  test('auto-classify endpoint', async () => {
    const { body } = await request(app).post('/tickets').send({
      customer_id: 'C6', customer_email: 'c6@example.com', customer_name: 'C6', subject: 'Critical production down', description: 'Service unavailable; crash',
      category: 'other', priority: 'medium', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' }
    });
    const res = await request(app).post(`/tickets/${body.id}/auto-classify`);
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('technical_issue');
    expect(['urgent', 'high']).toContain(res.body.priority);
    expect(res.body.confidence).toBeGreaterThan(0);
  });
});
