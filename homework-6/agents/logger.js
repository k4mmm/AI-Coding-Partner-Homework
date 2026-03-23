'use strict';

/**
 * Shared audit logger for all pipeline agents.
 * Masks account numbers in log output — never logs full account IDs.
 */

function maskAccount(account) {
  if (!account || typeof account !== 'string') return '****';
  return account.length > 4 ? `****${account.slice(-4)}` : `****`;
}

function log(agent, transactionId, outcome, extra = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    agent,
    transaction_id: transactionId,
    outcome,
    ...extra,
  };
  console.log(JSON.stringify(entry));
}

module.exports = { log, maskAccount };
