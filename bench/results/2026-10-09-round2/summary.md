# Round 2 (2026-10-09): directional, n = 2 pairs

**Not evidence of an effect.** Two tasks, one run per arm, same model and settings.
Still below the decision lines in [`docs/measurement-plan.md`](../../../docs/measurement-plan.md)
(≥ 3 repeats on several tasks).

## Setup

- codex-cli 0.156.0, `codex app-server`, native Plan mode, model `codex/gpt-6.1-sol`, medium effort,
  repo vercel/ms@2.1.3, prompts in `bench/tasks/<task>/prompt.md`, hidden oracles in `oracle.json`.
- New in round 2:
  - Ledger arm uses the shipped [`examples/codex/AGENTS.md.snippet`](../../../examples/codex/AGENTS.md.snippet)
    (end every planning reply with a `<proposed_plan>`, open choices under `## Decisions`).
  - Parser and ledger fixes from after round 1 (resolved items skipped, answers carried across revisions).
  - A much smaller per-call baseline, applied to both arms: [`profile.md`](profile.md) (53k → 8.6k input tokens per call).
    Round-2 tokens are therefore not comparable with round 1.
- Same responder rules in both arms (`bench/lib/responder.mjs`).

## Results

| Task | Arm | Rounds until plan final | Planning tokens in / cached / out / reasoning | Total tokens (`totalTokens`) | Wall planning / total | Verify | Files outside intent scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| strict-option | native | 1 (1 `request_user_input`, 1 question) | 65,931 / 49,792 / 865 / 61 | 180,208 | 54 s / 134 s | pass | `tests.js` |
| strict-option | ledger | 2 (1 `request_user_input` + 1 `plan-ledger answers`) | 83,141 / 55,424 / 1,284 / 134 | 205,644 | 61 s / 138 s | pass | `tests.js` |
| month-unit | native | 1 (1 `request_user_input`, 2 questions) | 79,553 / 48,256 / 853 / 0 | 179,053 | 57 s / 121 s | pass | `tests.js` |
| month-unit | ledger | 1 (1 `request_user_input`, 2 questions) | 66,354 / 50,048 / 781 / 59 | 140,020 | 57 s / 117 s | pass | `tests.js` |

Round 2 total: 704,925 tokens for the four runs, plus 62,022 for the two baseline probes (766,947).

## What happened

- **Plan mode kept asking natively.** In both ledger runs Codex still called `request_user_input`
  first, exactly like the native arm, and its plans had **no `## Decisions` section**. The AGENTS
  snippet did not change that behaviour. Every run (both arms) produced a `<proposed_plan>` on
  the first turn, so the round-1 "draft without a plan block" did not recur, but the native arm
  did that too, so it cannot be credited to the snippet.
- **strict-option, ledger: one extra round.** The plan ended with `## Chosen defaults`, four bullet
  points restating choices already made. The parser treated them as assumptions to confirm (4 open
  decisions), so the runner sent one `plan-ledger answers` message. That round added nothing.
- **month-unit, ledger: tie.** Its `### Chosen defaults` was a paragraph, so no decisions were found
  and the plan was final after the native question round.
- **Responder defect (harness).** For strict-option, the bullet "Change only `index.js`, `tests.js`
  and `readme.md`" was matched to the oracle's docs/tests entry, but the option regex accepted the
  plan's own wording, so the responder *kept* it instead of answering "do not change test files".
  In every run, both arms, `tests.js` was edited; no arm was asked about test files.
- **Hooks:** the live Stop hook wrote the ledger in both ledger runs (`hook_live: true`), via the
  transcript fallback; the UserPromptSubmit hook recorded the answers (strict-option).

## Planted drift (ledger arm, recomputed with `bench/drift.mjs`)

| Case | strict-option | month-unit |
| --- | --- | --- |
| clean (no plant) | no drift | no drift |
| S1 scope: unplanned new file | caught | caught |
| S2 scope: revert the listed files | caught (via `earlier_answers`) | caught (via the plan's own file list) |
| C1 content: contradicting code in `index.js` | not caught (expected) | not caught (expected) |

At run time `run.mjs` reported a false positive for strict-option: the plan text mentions
`options.strict`, which the file-list rule took for a file. `planned_files_not_touched` now only
counts files that exist (test added), and the drift for both runs was recomputed with that code.
The original output is kept in each row as `drift_at_run_time`.

## Files

`runs.jsonl` (one row per run), `<task>-<arm>/events.jsonl` (every turn, question, answer, plan),
`diff.patch`, and for the ledger arm the `decisions.json`, `plan.md`, `plan.html` the hook wrote.
