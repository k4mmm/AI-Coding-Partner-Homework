'use strict';

const Decimal = require('decimal.js');
const { v4: uuidv4 } = require('uuid');
const { log, maskAccount } = require('./logger');

const AGENT_NAME = 'fraud_detector';

const THRESHOLD_HIGH = new Decimal('10000');
const THRESHOLD_VERY_HIGH = new Decimal('50000');
const HOME_COUNTRY = 'US';
const UNUSUAL_HOUR_START = 2; // 02:00 UTC inclusive
const UNUSUAL_HOUR_END = 5;   // 05:00 UTC exclusive

/**
 * Scores a validated transaction for fraud risk.
 * Skips scoring for already-rejected transactions (passes them through).
 * @param {object} message - Pipeline message envelope from transaction_validator
 * @returns {object} - Message enriched with fraud_risk_score and fraud_risk_level
 */
function processMessage(message) {
  const data = { ...message.data };
  const txId = data.transaction_id || 'UNKNOWN';

  // Pass rejected transactions through without scoring
  if (data.status === 'rejected') {
    log(AGENT_NAME, txId, 'skipped', { reason: 'already_rejected' });
    return buildMessage(message, data, 'settlement_processor');
  }

  let score = 0;
  const triggers = [];

  const amount = new Decimal(data.amount);

  // High-value checks
  if (amount.gt(THRESHOLD_VERY_HIGH)) {
    score += 7; // +3 for >10k and +4 for >50k
    triggers.push('amount>50000(+7)');
  } else if (amount.gt(THRESHOLD_HIGH)) {
    score += 3;
    triggers.push('amount>10000(+3)');
  }

  // Unusual hour check (02:00–05:00 UTC)
  const hour = new Date(data.timestamp).getUTCHours();
  if (hour >= UNUSUAL_HOUR_START && hour < UNUSUAL_HOUR_END) {
    score += 2;
    triggers.push(`unusual_hour_${hour}UTC(+2)`);
  }

  // Cross-border check
  const country = data.metadata && data.metadata.country;
  if (country && country !== HOME_COUNTRY) {
    score += 1;
    triggers.push(`cross_border_${country}(+1)`);
  }

  // Clamp to 10
  score = Math.min(score, 10);

  const level = score <= 2 ? 'LOW' : score <= 6 ? 'MEDIUM' : 'HIGH';

  data.fraud_risk_score = score;
  data.fraud_risk_level = level;

  log(AGENT_NAME, txId, `scored_${level}`, {
    score,
    triggers,
    source: maskAccount(data.source_account),
  });

  return buildMessage(message, data, 'settlement_processor');
}

function buildMessage(original, data, targetAgent) {
  return {
    message_id: uuidv4(),
    timestamp: new Date().toISOString(),
    source_agent: AGENT_NAME,
    target_agent: targetAgent,
    message_type: 'transaction',
    data,
  };
}

module.exports = {
  processMessage,
  THRESHOLD_HIGH,
  THRESHOLD_VERY_HIGH,
  UNUSUAL_HOUR_START,
  UNUSUAL_HOUR_END,
};
