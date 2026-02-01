import fs from 'fs';
import path from 'path';
import { importFromJSON } from '../src/services/importService.js';

describe('JSON Import', () => {
  test('parses sample JSON with 20 records', () => {
    const p = path.join(process.cwd(), 'tests/fixtures/sample_tickets.json');
    const content = fs.readFileSync(p, 'utf8');
    const records = importFromJSON(content);
    expect(records.length).toBe(20);
  });

  test('parses single object', () => {
    const obj = JSON.stringify({ customer_id: 'JX', customer_email: 'jx@example.com', customer_name: 'JX', subject: 'S', description: 'desc long enough', category: 'other', priority: 'low', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' } });
    const recs = importFromJSON(obj);
    expect(recs.length).toBe(1);
  });

  test('parses wrapper object with tickets', () => {
    const obj = JSON.stringify({ tickets: [{ customer_id: 'JY', customer_email: 'jy@example.com', customer_name: 'JY', subject: 'S', description: 'desc long enough', category: 'other', priority: 'low', status: 'new', metadata: { source: 'api', browser: '', device_type: 'desktop' } }] });
    const recs = importFromJSON(obj);
    expect(recs.length).toBe(1);
  });

  test('throws on malformed JSON', () => {
    expect(() => importFromJSON('{bad json}')).toThrow('Malformed JSON file');
  });

  test('maps metadata correctly', () => {
    const obj = JSON.stringify({ customer_id: 'JZ', customer_email: 'jz@example.com', customer_name: 'JZ', subject: 'S', description: 'desc long enough', metadata: { source: 'api', browser: 'Chrome', device_type: 'desktop' } });
    const recs = importFromJSON(obj);
    expect(recs[0].metadata.source).toBe('api');
  });
});
