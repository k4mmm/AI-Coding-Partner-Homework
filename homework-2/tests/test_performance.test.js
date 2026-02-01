import request from 'supertest';
import app from '../src/app.js';
import { resetStore } from '../src/db/memory.js';

beforeEach(() => resetStore());

describe('Performance Benchmarks', () => {
  test('create 100 tickets under time budget', async () => {
    const payload = {
      customer_id: 'P', customer_email: 'p@example.com', customer_name: 'P', subject: 'Perf', description: 'desc long enough',
      category: 'other', priority: 'medium', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' }
    };
    const start = Date.now();
    const promises = Array.from({ length: 100 }).map(() => request(app).post('/tickets').send(payload));
    const results = await Promise.all(promises);
    const duration = Date.now() - start;
    expect(results.every((r) => r.status === 201)).toBe(true);
    // Simple performance threshold: 3 seconds for 100 in-memory ops
    expect(duration).toBeLessThan(3000);
  });

  test('list tickets is fast', async () => {
    const payload = {
      customer_id: 'P', customer_email: 'p@example.com', customer_name: 'P', subject: 'Perf', description: 'desc long enough',
      category: 'other', priority: 'medium', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' }
    };
    await Promise.all(Array.from({ length: 200 }).map(() => request(app).post('/tickets').send(payload)));
    const start = Date.now();
    const res = await request(app).get('/tickets?priority=medium');
    const duration = Date.now() - start;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });

  test('auto-classify is fast', async () => {
    const { body } = await request(app).post('/tickets').send({
      customer_id: 'PC', customer_email: 'pc@example.com', customer_name: 'PC', subject: 'Critical crash', description: 'production down',
      category: 'other', priority: 'medium', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' }
    });
    const start = Date.now();
    const res = await request(app).post(`/tickets/${body.id}/auto-classify`);
    const duration = Date.now() - start;
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(200);
  });

  test('bulk import 50 CSV tickets under budget', async () => {
    const csv = `customer_id,customer_email,customer_name,subject,description,category,priority,status,source,browser,device_type\n` +
      Array.from({ length: 50 }).map((_, i) => `ID${i},id${i}@example.com,Name${i},S,Valid description,other,low,new,api,,desktop`).join('\n');
    const start = Date.now();
    const res = await request(app).post('/tickets/import').send({ format: 'csv', content: csv });
    const duration = Date.now() - start;
    expect(res.status).toBe(201);
    expect(res.body.summary.successful).toBe(50);
    expect(duration).toBeLessThan(1500);
  });

  test('bulk import XML 30 tickets under budget', async () => {
    const tickets = Array.from({ length: 30 }).map((_, i) => `<ticket><customer_id>X${i}</customer_id><customer_email>x${i}@example.com</customer_email><customer_name>X${i}</customer_name><subject>S</subject><description>Valid desc</description><source>api</source><device_type>desktop</device_type></ticket>`).join('');
    const xml = `<tickets>${tickets}</tickets>`;
    const start = Date.now();
    const res = await request(app).post('/tickets/import').send({ format: 'xml', content: xml });
    const duration = Date.now() - start;
    expect(res.status).toBe(201);
    expect(res.body.summary.successful).toBe(30);
    expect(duration).toBeLessThan(1500);
  });
});
