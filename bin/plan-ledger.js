#!/usr/bin/env node
import { main } from '../src/cli.js';

main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (err) => {
    const hook = /^hook-/.test(process.argv[2] || '');
    process.stderr.write(`plan-ledger: ${err?.stack || err}\n`);
    // Hooks must never break the Codex turn.
    process.exitCode = hook ? 0 : 2;
  },
);
