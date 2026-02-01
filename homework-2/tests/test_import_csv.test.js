import fs from 'fs';
import path from 'path';
import { importFromCSV } from '../src/services/importService.js';

describe('CSV Import', () => {
  test('parses sample CSV with 50 rows', () => {
    const p = path.join(process.cwd(), 'tests/fixtures/sample_tickets.csv');
    const content = fs.readFileSync(p, 'utf8');
    const records = importFromCSV(content);
    expect(records.length).toBe(50);
  });

  test('maps fields correctly', () => {
    const csv = 'customer_id,customer_email,customer_name,subject,description,category,priority,status,source,browser,device_type\nID,email@example.com,Name,Subj,Valid desc,other,low,new,api,,desktop';
    const records = importFromCSV(csv);
    expect(records[0].metadata.source).toBe('api');
    expect(records[0].metadata.device_type).toBe('desktop');
  });

  test('handles tags list', () => {
    const csv = 'customer_id,customer_email,customer_name,subject,description,category,priority,status,tags,source,browser,device_type\nID,email@example.com,Name,Subj,Valid desc,other,low,new,"tag1,tag2",api,,desktop';
    const records = importFromCSV(csv);
    expect(Array.isArray(records[0].tags)).toBe(true);
    expect(records[0].tags).toEqual(['tag1', 'tag2']);
  });

  test('throws on malformed CSV', () => {
    expect(() => importFromCSV('bad,bad\nno')).toThrow('Malformed CSV file');
  });

  test('works with extra columns', () => {
    const csv = 'customer_id,customer_email,customer_name,subject,description,category,priority,status,extra,source,browser,device_type\nID,email@example.com,Name,Subj,Valid desc,other,low,new,extra,api,,desktop';
    const records = importFromCSV(csv);
    expect(records.length).toBe(1);
  });

  test('trim values', () => {
    const csv = 'customer_id,customer_email,customer_name,subject,description,category,priority,status,source,browser,device_type\n ID , email@example.com , Name , Subj , Valid desc , other , low , new , api , , desktop ';
    const records = importFromCSV(csv);
    expect(records[0].customer_id).toBe('ID');
  });
});
