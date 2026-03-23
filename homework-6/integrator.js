'use strict';

/**
 * Banking Pipeline Integrator / Orchestrator
 *
 * Loads sample-transactions.json, wraps each transaction in a message
 * envelope, and runs it through the three agents in sequence:
 *   1. transaction_validator
 *   2. fraud_detector
 *   3. settlement_processor
 *
 * Results land in shared/results/{transaction_id}.json
 *
 * Usage: node integrator.js
 *        npm run pipeline
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const validator = require('./agents/transaction_validator');
const fraudDetector = require('./agents/fraud_detector');
const settlementProcessor = require('./agents/settlement_processor');

const SHARED_DIRS = [
  path.join(__dirname, 'shared', 'input'),
  path.join(__dirname, 'shared', 'processing'),
  path.join(__dirname, 'shared', 'output'),
  path.join(__dirname, 'shared', 'results'),
];

const SAMPLE_FILE = path.join(__dirname, 'sample-transactions.json');

function setupDirectories() {
  for (const dir of SHARED_DIRS) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function clearDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    fs.unlinkSync(path.join(dir, file));
  }
}

function clearSharedDirs() {
  for (const dir of SHARED_DIRS) {
    clearDirectory(dir);
  }
}

function wrapTransaction(tx) {
  return {
    message_id: uuidv4(),
    timestamp: new Date().toISOString(),
    source_agent: 'integrator',
    target_agent: 'transaction_validator',
    message_type: 'transaction',
    data: { ...tx },
  };
}

function printSummary(results) {
  const counts = { settled: 0, held_for_review: 0, rejected: 0 };
  for (const r of results) {
    const s = r.data.settlement_status;
    if (counts[s] !== undefined) counts[s]++;
  }

  console.log('\n========================================');
  console.log('  PIPELINE SUMMARY');
  console.log('========================================');
  console.log(`  Total processed : ${results.length}`);
  console.log(`  Settled         : ${counts.settled}`);
  console.log(`  Held for review : ${counts.held_for_review}`);
  console.log(`  Rejected        : ${counts.rejected}`);
  console.log('----------------------------------------');

  const rejected = results.filter(r => r.data.settlement_status === 'rejected');
  if (rejected.length > 0) {
    console.log('\n  Rejected transactions:');
    for (const r of rejected) {
      console.log(`    ${r.data.transaction_id} — ${r.data.reason}`);
    }
  }

  const held = results.filter(r => r.data.settlement_status === 'held_for_review');
  if (held.length > 0) {
    console.log('\n  Held for review:');
    for (const r of held) {
      console.log(
        `    ${r.data.transaction_id} — risk score ${r.data.fraud_risk_score} (${r.data.fraud_risk_level})`
      );
    }
  }

  console.log('========================================\n');
}

function runPipeline() {
  console.log('[integrator] Starting banking pipeline...');

  setupDirectories();
  clearSharedDirs();

  if (!fs.existsSync(SAMPLE_FILE)) {
    console.error(`[integrator] ERROR: ${SAMPLE_FILE} not found.`);
    process.exit(1);
  }

  const transactions = JSON.parse(fs.readFileSync(SAMPLE_FILE, 'utf8'));
  console.log(`[integrator] Loaded ${transactions.length} transactions from sample-transactions.json`);

  const results = [];

  for (const tx of transactions) {
    try {
      // Stage 1 — wrap in envelope
      const initial = wrapTransaction(tx);

      // Stage 2 — validate
      const validated = validator.processMessage(initial);

      // Stage 3 — fraud score (even rejected transactions pass through)
      const scored = fraudDetector.processMessage(validated);

      // Stage 4 — settle and write result
      const final = settlementProcessor.processMessage(scored);

      results.push(final);
    } catch (err) {
      // System error: write a safe fallback result rather than crashing
      console.error(`[integrator] System error processing ${tx.transaction_id}: ${err.message}`);
      const errorResult = {
        message_id: uuidv4(),
        timestamp: new Date().toISOString(),
        source_agent: 'integrator',
        target_agent: 'results',
        message_type: 'transaction',
        data: {
          transaction_id: tx.transaction_id || 'UNKNOWN',
          status: 'rejected',
          reason: `SYSTEM_ERROR:${err.message}`,
          settlement_status: 'rejected',
          settlement_id: null,
          processed_at: new Date().toISOString(),
        },
      };
      const resultsDir = path.join(__dirname, 'shared', 'results');
      fs.mkdirSync(resultsDir, { recursive: true });
      fs.writeFileSync(
        path.join(resultsDir, `${errorResult.data.transaction_id}.json`),
        JSON.stringify(errorResult, null, 2)
      );
      results.push(errorResult);
    }
  }

  printSummary(results);
  console.log(`[integrator] Results written to shared/results/ (${results.length} files)`);
}

if (require.main === module) {
  runPipeline();
}

module.exports = { runPipeline, setupDirectories, clearDirectory, clearSharedDirs, wrapTransaction, printSummary };
