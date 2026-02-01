import express from 'express';
import { createTicketFromInput } from '../models/ticket.js';
import { createTicket, listTickets, getTicket, updateTicket, deleteTicket } from '../db/memory.js';
import { classifyTicket } from '../services/classificationService.js';
import { bulkImport } from '../services/importService.js';

const router = express.Router();

// Create a new support ticket
router.post('/', (req, res, next) => {
  try {
    const autoClassify = Boolean(req.query.auto_classify || req.body.auto_classify);
    const ticket = createTicketFromInput(req.body);
    let final = ticket;
    if (autoClassify) {
      const { updated } = classifyTicket(ticket);
      final = updated;
    }
    createTicket(final);
    res.status(201).json(final);
  } catch (err) {
    next(err);
  }
});

// Bulk import from CSV/JSON/XML
router.post('/import', (req, res, next) => {
  try {
    const { format, content, auto_classify } = req.body || {};
    if (!format || !content) {
      const err = new Error('Missing required fields: format, content');
      err.status = 400;
      throw err;
    }
    const { tickets, summary } = bulkImport(String(format).toLowerCase(), content);
    const saved = [];
    for (const t of tickets) {
      let final = t;
      if (auto_classify) {
        const { updated } = classifyTicket(t);
        final = updated;
      }
      createTicket(final);
      saved.push(final);
    }
    res.status(201).json({ summary, tickets: saved });
  } catch (err) {
    next(err);
  }
});

// List all tickets (with filtering)
router.get('/', (req, res) => {
  const filters = {
    category: req.query.category,
    priority: req.query.priority,
    status: req.query.status,
    tags: req.query.tags,
    search: req.query.search,
  };
  res.json(listTickets(filters));
});

// Get specific ticket
router.get('/:id', (req, res) => {
  const ticket = getTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not Found' });
  res.json(ticket);
});

// Update ticket
router.put('/:id', (req, res, next) => {
  try {
    const existing = getTicket(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not Found' });
    const merged = { ...existing, ...req.body, updated_at: new Date().toISOString() };
    // Validate merged result
    const validated = createTicketFromInput({ ...merged, id: existing.id });
    const updated = updateTicket(req.params.id, validated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete ticket
router.delete('/:id', (req, res) => {
  const ok = deleteTicket(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not Found' });
  res.status(204).send();
});

// Auto-classify endpoint
router.post('/:id/auto-classify', (req, res) => {
  const ticket = getTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Not Found' });
  const { decision, updated } = classifyTicket(ticket);
  updateTicket(ticket.id, updated);
  res.json({ id: ticket.id, ...decision });
});

export default router;
