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
| `probe.mjs` | Lists enabled skills/features for a profile; with `PROBE_TURN=1` measures one call's input baseline |
| `drift.mjs` | Recomputes planted drift for a recorded ledger-arm run with the current check |
| `reanalyze.mjs` | Offline replay of recorded plans through the current parser/ledger (no Codex calls) |
| `smoke.mjs` | Live smoke test: one Plan-mode turn with the hooks in session config |
| `ledger-arm.AGENTS.md` | The only instruction the ledger arm adds; kept identical to `examples/codex/AGENTS.md.snippet` (a test checks this) |
| `tasks/<task>/` | Prompt (what the agent sees), oracle (hidden), planted content-drift code |
| `results/` | Raw JSONL and a summary per round |

The verify scripts are the held-out checks from intent-tests (`examples/tasks/verify/`);
they are not copied here and never shown to the agent.

Results: [round 1 (directional, n = 1 pair)](results/2026-10-09-round1/summary.md) ·
[round 2 (directional, n = 2 pairs)](results/2026-10-09-round2/summary.md), run profile in
[round2/profile.md](results/2026-10-09-round2/profile.md).

## Changes after round 2 (no new runs yet)

Rounds 1 and 2 were run with the rules below as they were *before* these changes; their
recorded results are unchanged.

- **Responder matching.** An oracle entry can carry a `reject` pattern. An option that
  matches `reject` never counts as a match. Round 2 showed why: the strict-option plan's
  default "Change only `index.js`, `tests.js`, and `readme.md`." matched `docs-tests`
  through `readme(?!.*test)` and was kept, although the intent is "do not change test
  files". Covered by `test/responder.test.js` on that real plan.
- **Defaults are not open decisions.** Items under "Chosen defaults" / "Assumptions" are
  recorded as `status: default`, `kind: assumption`. The runner no longer sends an answer
  round just for them; the responder reviews them and answers only one that contradicts
  the oracle. In round 2 all four strict-option defaults were counted as open. Replayed
  under the new rules, that plan still gets one answer round, for the single default that
  contradicts the intent (the `tests.js` one); the rest are kept.
- **Negations in option patterns.** The strict-option `error` entry rejected "introduce no
  custom error class" because it contained "custom"; a preceding "no" is now respected.
- **Codex's own questions.** `request_user_input` questions and replies are read from the
  transcript into `decisions.json` (`source: "codex-native"`, answered) and never re-asked.
