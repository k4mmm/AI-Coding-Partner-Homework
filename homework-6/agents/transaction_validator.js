'use strict';

const Decimal = require('decimal.js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { log, maskAccount } = require('./logger');

const AGENT_NAME = 'transaction_validator';

// ISO 4217 currency whitelist
const VALID_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
  'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'NZD', 'MXN', 'BRL',
  'INR', 'KRW', 'ZAR', 'RUB',
]);

const REQUIRED_FIELDS = [
  'transaction_id',
  'amount',
  'currency',
  'source_account',
  'destination_account',
  'timestamp',
  'transaction_type',
];

/**
 * Validates a transaction message envelope.
 * @param {object} message - Standard pipeline message envelope
 * @returns {object} - Updated message with data.status and optional data.reason
 */
function processMessage(message) {
  const data = { ...message.data };
  const txId = data.transaction_id || 'UNKNOWN';

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      const reason = `MISSING_FIELD:${field}`;
      log(AGENT_NAME, txId, 'rejected', { reason });
      return buildMessage(message, data, 'rejected', reason, 'fraud_detector');
    }
  }

  // Validate currency
  if (!VALID_CURRENCIES.has(data.currency)) {
    const reason = 'INVALID_CURRENCY';
    log(AGENT_NAME, txId, 'rejected', { reason, currency: data.currency });
    return buildMessage(message, data, 'rejected', reason, 'fraud_detector');
  }

  // Validate amount
  let amount;
  try {
    amount = new Decimal(data.amount);
  } catch {
    const reason = 'INVALID_AMOUNT:not_a_number';
    log(AGENT_NAME, txId, 'rejected', { reason });
    return buildMessage(message, data, 'rejected', reason, 'fraud_detector');
  }

  if (amount.lte(0)) {
    const reason = 'INVALID_AMOUNT:must_be_positive';
    log(AGENT_NAME, txId, 'rejected', {
      reason,
      source: maskAccount(data.source_account),
    });
    return buildMessage(message, data, 'rejected', reason, 'fraud_detector');
  }

  log(AGENT_NAME, txId, 'validated', {
    source: maskAccount(data.source_account),
    destination: maskAccount(data.destination_account),
  });

  return buildMessage(message, data, 'validated', null, 'fraud_detector');
}

function buildMessage(original, data, status, reason, targetAgent) {
  const updated = { ...data, status };
  if (reason) updated.reason = reason;

  return {
    message_id: uuidv4(),
    timestamp: new Date().toISOString(),
    source_agent: AGENT_NAME,
    target_agent: targetAgent,
    message_type: 'transaction',
    data: updated,
  };
}

// CLI dry-run mode: validate all transactions and print report
if (require.main === module && process.argv.includes('--dry-run')) {
  const txFile = path.join(__dirname, '..', 'sample-transactions.json');
  const transactions = JSON.parse(fs.readFileSync(txFile, 'utf8'));

  let valid = 0;
  let invalid = 0;
  const rows = [];

  for (const tx of transactions) {
    const message = {
      message_id: uuidv4(),
      timestamp: new Date().toISOString(),
      source_agent: 'integrator',
      target_agent: AGENT_NAME,
      message_type: 'transaction',
      data: { ...tx },
    };

    const result = processMessage(message);
    const { status, reason, transaction_id } = result.data;

    if (status === 'validated') {
      valid++;
      rows.push({ transaction_id, status, reason: '-' });
    } else {
      invalid++;
      rows.push({ transaction_id, status, reason: reason || '-' });
    }
  }

  console.log('\n=== Dry-Run Validation Report ===');
  console.log(`Total:   ${transactions.length}`);
  console.log(`Valid:   ${valid}`);
  console.log(`Invalid: ${invalid}`);
  console.log('\nResults:');
  console.table(rows);
}

module.exports = { processMessage, VALID_CURRENCIES, REQUIRED_FIELDS };
