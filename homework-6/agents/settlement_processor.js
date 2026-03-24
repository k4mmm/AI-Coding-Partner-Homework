'use strict';

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { log, maskAccount } = require('./logger');

const AGENT_NAME = 'settlement_processor';
const RESULTS_DIR = path.join(__dirname, '..', 'shared', 'results');

/**
 * Makes the final settlement decision for each transaction and writes the
 * result file to shared/results/{transaction_id}.json.
 * @param {object} message - Pipeline message envelope from fraud_detector
 * @returns {object} - Final message with settlement fields attached
 */
function processMessage(message) {
  const data = { ...message.data };
  const txId = data.transaction_id || 'UNKNOWN';

  let settlementStatus;
  let settlementId = null;

  if (data.status === 'rejected') {
    settlementStatus = 'rejected';
    log(AGENT_NAME, txId, 'settlement_rejected', {
      reason: data.reason,
      source: maskAccount(data.source_account),
    });
  } else if (data.fraud_risk_level === 'HIGH') {
    settlementStatus = 'held_for_review';
    log(AGENT_NAME, txId, 'held_for_review', {
      fraud_risk_score: data.fraud_risk_score,
      source: maskAccount(data.source_account),
    });
  } else {
    settlementStatus = 'settled';
    settlementId = uuidv4();
    log(AGENT_NAME, txId, 'settled', {
      settlement_id: settlementId,
      fraud_risk_level: data.fraud_risk_level,
      source: maskAccount(data.source_account),
    });
  }

  data.settlement_status = settlementStatus;
  data.settlement_id = settlementId;
  data.processed_at = new Date().toISOString();

  const result = {
    message_id: uuidv4(),
    timestamp: new Date().toISOString(),
    source_agent: AGENT_NAME,
    target_agent: 'results',
    message_type: 'transaction',
    data,
  };

  writeResult(txId, result);
  return result;
}

function writeResult(txId, result) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const filePath = path.join(RESULTS_DIR, `${txId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
}

module.exports = { processMessage, writeResult };
