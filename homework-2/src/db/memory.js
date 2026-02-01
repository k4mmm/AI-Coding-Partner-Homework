// Simple in-memory data store for tickets and logs
const store = {
  tickets: [],
  classificationLogs: [],
};

export function createTicket(ticket) {
  store.tickets.push(ticket);
  return ticket;
}

export function listTickets(filters = {}) {
  const { category, priority, status, tags, search } = filters;
  return store.tickets.filter((t) => {
    if (category && t.category !== category) return false;
    if (priority && t.priority !== priority) return false;
    if (status && t.status !== status) return false;
    if (tags) {
      const reqTags = Array.isArray(tags) ? tags : String(tags).split(',').map((s) => s.trim());
      if (!reqTags.every((tag) => t.tags?.includes(tag))) return false;
    }
    if (search) {
      const s = String(search).toLowerCase();
      const hay = `${t.subject} ${t.description}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
}

export function getTicket(id) {
  return store.tickets.find((t) => t.id === id) || null;
}

export function updateTicket(id, updates) {
  const idx = store.tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  store.tickets[idx] = { ...store.tickets[idx], ...updates };
  return store.tickets[idx];
}

export function deleteTicket(id) {
  const idx = store.tickets.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  store.tickets.splice(idx, 1);
  return true;
}

export function logClassification(entry) {
  store.classificationLogs.push({ ...entry, timestamp: new Date().toISOString() });
}

export function resetStore() {
  store.tickets = [];
  store.classificationLogs = [];
}

export function getStore() {
  return store;
}
