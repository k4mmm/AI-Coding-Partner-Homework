import { logClassification } from '../db/memory.js';

const categoryRules = [
  { key: 'account_access', patterns: [/login/i, /password/i, /2fa/i, /two[-\s]?factor/i, /can\'t access/i] },
  { key: 'technical_issue', patterns: [/error/i, /crash/i, /fail/i, /exception/i, /bug/i] },
  { key: 'billing_question', patterns: [/payment/i, /invoice/i, /refund/i, /billing/i, /charge/i] },
  { key: 'feature_request', patterns: [/feature/i, /enhancement/i, /suggestion/i, /request/i] },
  { key: 'bug_report', patterns: [/bug report/i, /reproduce/i, /steps to reproduce/i, /defect/i] },
];

const priorityRules = [
  { key: 'urgent', patterns: [/can\'t access/i, /critical/i, /production down/i, /security/i] },
  { key: 'high', patterns: [/important/i, /blocking/i, /asap/i] },
  { key: 'low', patterns: [/minor/i, /cosmetic/i, /suggestion/i] },
];

export function classifyTicket(ticket, options = {}) {
  const text = `${ticket.subject} ${ticket.description}`;
  const keywordsFound = [];

  let category = 'other';
  let categoryScore = 0;
  for (const rule of categoryRules) {
    const hits = rule.patterns.filter((p) => p.test(text)).length;
    if (hits > categoryScore && hits > 0) {
      category = rule.key;
      categoryScore = hits;
    }
    if (hits > 0) {
      keywordsFound.push(...rule.patterns.filter((p) => p.test(text)).map((p) => p.source));
    }
  }

  let priority = 'medium';
  let priorityScore = 0;
  for (const rule of priorityRules) {
    const hits = rule.patterns.filter((p) => p.test(text)).length;
    if (hits > priorityScore && hits > 0) {
      priority = rule.key;
      priorityScore = hits;
    }
    if (hits > 0) {
      keywordsFound.push(...rule.patterns.filter((p) => p.test(text)).map((p) => p.source));
    }
  }

  const confidence = Math.min(1, (categoryScore + priorityScore) / 4);
  const reasoning = `Category inferred from ${categoryScore} keyword hits; priority from ${priorityScore} hits.`;

  const decision = { category, priority, confidence, reasoning, keywords_found: Array.from(new Set(keywordsFound)) };

  // Log decision
  logClassification({ ticket_id: ticket.id, decision });

  const updated = { ...ticket, category, priority, classification_confidence: confidence };
  return { decision, updated };
}
