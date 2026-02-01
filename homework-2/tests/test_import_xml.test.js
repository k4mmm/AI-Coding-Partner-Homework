import fs from 'fs';
import path from 'path';
import { importFromXML } from '../src/services/importService.js';

describe('XML Import', () => {
  test('parses sample XML with 30 tickets', () => {
    const p = path.join(process.cwd(), 'tests/fixtures/sample_tickets.xml');
    const content = fs.readFileSync(p, 'utf8');
    const records = importFromXML(content);
    expect(records.length).toBe(30);
  });

  test('parses single ticket', () => {
    const xml = '<ticket><customer_id>X</customer_id><customer_email>x@example.com</customer_email><customer_name>X</customer_name><subject>S</subject><description>desc long enough</description><source>api</source><device_type>desktop</device_type></ticket>';
    const recs = importFromXML(xml);
    expect(recs.length).toBe(1);
  });

  test('maps device_type', () => {
    const xml = '<tickets><ticket><customer_id>X</customer_id><customer_email>x@example.com</customer_email><customer_name>X</customer_name><subject>S</subject><description>desc long enough</description><source>api</source><device_type>desktop</device_type></ticket></tickets>';
    const recs = importFromXML(xml);
    expect(recs[0].metadata.device_type).toBe('desktop');
  });

  test('handles malformed XML gracefully', () => {
    // Use invalid file content to ensure parser errors handled without crashing
    const p = path.join(process.cwd(), 'tests/fixtures/invalid.xml');
    const content = fs.readFileSync(p, 'utf8');
    const records = importFromXML(content);
    expect(Array.isArray(records)).toBe(true);
  });

  test('handles array and single object', () => {
    const xml = '<tickets><ticket><customer_id>A</customer_id><customer_email>a@example.com</customer_email><customer_name>A</customer_name><subject>S</subject><description>desc long enough</description><source>api</source><device_type>desktop</device_type></ticket><ticket><customer_id>B</customer_id><customer_email>b@example.com</customer_email><customer_name>B</customer_name><subject>S</subject><description>desc long enough</description><source>api</source><device_type>desktop</device_type></ticket></tickets>';
    const recs = importFromXML(xml);
    expect(recs.length).toBe(2);
  });
});
