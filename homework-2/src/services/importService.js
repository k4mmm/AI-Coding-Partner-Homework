import { parse } from 'csv-parse/sync';
import { XMLParser } from 'fast-xml-parser';
import { createTicketFromInput } from '../models/ticket.js';

function normalizeRecord(rec) {
  const obj = {
    customer_id: rec.customer_id || rec.customerId,
    customer_email: rec.customer_email || rec.customerEmail,
    customer_name: rec.customer_name || rec.customerName,
    subject: rec.subject,
    description: rec.description,
    category: rec.category,
    priority: rec.priority,
    status: rec.status,
    assigned_to: rec.assigned_to || null,
    tags: Array.isArray(rec.tags) ? rec.tags : rec.tags ? String(rec.tags).split(',').map((s) => s.trim()) : [],
    metadata: {
      source: rec.metadata?.source || rec.source || 'api',
      browser: rec.metadata?.browser || rec.browser || '',
      device_type: rec.metadata?.device_type || rec.device_type || 'desktop',
    },
  };
  return obj;
}

export function importFromCSV(content) {
  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records.map((r) => normalizeRecord(r));
  } catch (e) {
    const err = new Error('Malformed CSV file');
    err.status = 400;
    err.details = [e.message];
    throw err;
  }
}

export function importFromJSON(content) {
  try {
    const data = JSON.parse(content);
    const records = Array.isArray(data) ? data : data.tickets || [data];
    return records.map((r) => normalizeRecord(r));
  } catch (e) {
    const err = new Error('Malformed JSON file');
    err.status = 400;
    err.details = [e.message];
    throw err;
  }
}

export function importFromXML(content) {
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', trimValues: true });
    const data = parser.parse(content);
    const records = data.tickets?.ticket || data.ticket || [];
    const arr = Array.isArray(records) ? records : [records];
    return arr.map((r) => normalizeRecord(r));
  } catch (e) {
    const err = new Error('Malformed XML file');
    err.status = 400;
    err.details = [e.message];
    throw err;
  }
}

export function bulkImport(format, content) {
  let records = [];
  if (format === 'csv') records = importFromCSV(content);
  else if (format === 'json') records = importFromJSON(content);
  else if (format === 'xml') records = importFromXML(content);
  else {
    const err = new Error('Unsupported format');
    err.status = 400;
    err.details = [`Expected one of: csv, json, xml. Got: ${format}`];
    throw err;
  }

  const summary = { total: records.length, successful: 0, failed: 0, errors: [] };
  const tickets = [];
  for (let i = 0; i < records.length; i++) {
    try {
      const ticket = createTicketFromInput(records[i]);
      summary.successful += 1;
      tickets.push(ticket);
    } catch (e) {
      summary.failed += 1;
      summary.errors.push({ index: i, message: e.message, details: e.details });
    }
  }
  return { tickets, summary };
}
