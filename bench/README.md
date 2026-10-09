# bench

Paired runs for [`docs/measurement-plan.md`](../docs/measurement-plan.md): native Codex Plan mode
vs Plan mode with plan-ledger, on the same task, model and settings.

```bash
# one run (needs codex-cli with `app-server`, a local clone of vercel/ms, and the held-out verify scripts)
BENCH_BASE=~/cpl-bench/ms-base BENCH_VERIFY_DIR=~/cpl-bench/verify \
BENCH_ARGS='["-c","features.memories=false"]' BENCH_RESULTS=runs.jsonl \
node bench/run.mjs strict-option ledger out/strict-option-ledger
```

| Path | What |
| --- | --- |
| `run.mjs` | One run: worktree at ms@2.1.3 → plan turns → implementation turn → verify → planted drift |
| `lib/appserver.mjs` | Minimal JSON-RPC client for `codex app-server` (stdio) |
| `lib/responder.mjs` | Scripted user: answers questions / decisions from the hidden `oracle.json` |
| `smoke.mjs` | Live smoke test: one Plan-mode turn with the hooks in session config |
| `ledger-arm.AGENTS.md` | The only instruction the ledger arm adds; kept identical to `examples/codex/AGENTS.md.snippet` (a test checks this) |
| `tasks/<task>/` | Prompt (what the agent sees), oracle (hidden), planted content-drift code |
| `results/` | Raw JSONL and a summary per round |

The verify scripts are the held-out checks from intent-tests (`examples/tasks/verify/`);
they are not copied here and never shown to the agent.

Results: [round 1 (directional, n = 1 pair)](results/2026-10-09-round1/summary.md).
