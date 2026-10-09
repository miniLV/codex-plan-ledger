# Round 1 (2026-10-09): directional first round, n = 1 pair

**This is not evidence of an effect.** One task (`strict-option`), one run per arm, same
model and settings. It checks that the harness works end to end and gives a first look.
The decision lines in [`docs/measurement-plan.md`](../../../docs/measurement-plan.md) need
≥ 3 repeats on several tasks; this round does not meet them.

Planned was 2 tasks × 2 arms × 1 run. Only `strict-option` ran: one pair already used
1.30M tokens (the previous intent-tests round used about 1.1M for 6 runs), so `month-unit`
was left for the next round. Its oracle, prompt and planted content are in `bench/tasks/`.

## Setup

- codex-cli 0.156.0, `codex app-server`, native Plan mode (`collaborationMode: plan`), model
  `codex/gpt-6.1-sol`, reasoning effort medium, on the user's own machine and Codex config,
  with plugins, MCP servers and memories switched off for the run (`-c ...enabled=false`).
  User-level skills were still loaded (the agent mentioned one in its first message, in the ledger arm).
- Repo: vercel/ms@2.1.3 (`1c6264b`). Prompt: [`tasks/strict-option/prompt.md`](../../tasks/strict-option/prompt.md).
- Hidden oracle: [`tasks/strict-option/oracle.json`](../../tasks/strict-option/oracle.json). A scripted responder
  ([`lib/responder.mjs`](../../lib/responder.mjs)) answers from it in both arms with the same matching rules.
- **native**: Plan mode as shipped; `request_user_input` questions are answered by the responder.
- **ledger**: Plan mode + plan-ledger's Stop and UserPromptSubmit hooks (session config, trust bypassed for
  the run) + [`ledger-arm.AGENTS.md`](../../ledger-arm.AGENTS.md). Open decisions are answered all at once with a
  `plan-ledger answers` message built from the oracle.
- Then one implementation turn (`Implement the plan now.`, workspace-write) and the held-out verify script
  (`verify/strict-option.cjs` from intent-tests).

## Results

| | native | ledger |
| --- | --- | --- |
| Rounds until the plan was final | **1** (1 `request_user_input` call, 1 question) | **2** (1 reply to a draft without a plan block, 1 `plan-ledger answers`) |
| Planning tokens: input / cached / output / reasoning | 294,933 / 236,416 / 941 / 65 | 372,651 / 307,456 / 1,632 / 119 |
| Total tokens incl. implementation (`totalTokens`) | 717,487 | 586,971 |
| Total: input / cached / output / reasoning | 714,448 / 644,096 / 3,039 / 250 | 584,218 / 515,200 / 2,753 / 145 |
| Wall time, planning / total | 69 s / 151 s | 90 s / 132 s |
| Held-out verify | pass | pass |
| Files changed | `index.js`, `readme.md`, `tests.js` | `index.js`, `readme.md` |
| Files outside the intent's scope (`index.js`, `readme.md`) | `tests.js` | none |

`totalTokens` is Codex's own count (`thread/tokenUsage/updated`). Cached input is part of input.

What this pair shows, and only for this pair:

- Rounds: the ledger arm did **not** need fewer rounds. Its first turn ended with a draft and no
  `<proposed_plan>`, which cost one extra reply.
- The native arm asked one question (how to enable strict). Test files were never asked about, and it
  edited `tests.js`, which the oracle would have refused. In the ledger arm the plan listed
  "limit changes to `index.js`, `tests.js`, `readme.md`" as a decision; the oracle answer ("do not change
  test files") was applied and `tests.js` was not changed.
- Both arms passed the held-out checks.

## Planted drift (ledger arm, after implementation)

Base = the setup commit; `plan-ledger check --base <base> --json` on copies of the worktree.

| Case | Expected | Result |
| --- | --- | --- |
| clean (no plant) | no drift | no drift |
| S1 scope: new unplanned file `lib/planted.js` | caught | **caught** (`files_outside_plan: lib/planted.js`) |
| S2 scope: revert the files a decision lists as affected | caught | **caught** (`decisions_not_touched` has 1 decision) |
| C1 content: code in `index.js` that contradicts the "strict is opt-in" decision | not caught in v0.1 | **not caught** (as expected) |

## Live hook findings (what actually happened)

- The Stop hook ran in Plan mode. In codex-cli 0.156.0 the Stop payload had
  `last_assistant_message: ""` when the turn ended with a plan: the plan arrives as a separate `plan`
  item. The session transcript still holds the raw assistant message with the `<proposed_plan>` tags.
  plan-ledger now falls back to `transcript_path` for that case (added in this round); with it the
  ledger and HTML page were written by the real hook (`hook_live: true`).
- An ephemeral thread has `transcript_path: null`, so the hook cannot see the plan there.
- `permission_mode` in the payload was `bypassPermissions`, not `plan`, so plan-ledger does not rely on it.
- The answers message was recorded by the real UserPromptSubmit hook (`recorded 3 answer(s)`).
- The model did not follow the requested decision format: it wrote `**D1 resolved:** …` items without
  options, and a `## Recorded Decisions` section after the answers. The v0.1 parser used in this round
  turned those into 3 open decisions each time, so the hook said "3 decision(s) to answer" for the final plan.
  After the round the parser was changed to skip resolved items and "Recorded/Resolved decisions"
  sections (test on the captured plans in `test/fixtures/real/`). The numbers above are from the old parser.

## Files

- `runs.jsonl`: one row per run (all fields from `bench/run.mjs`; `changed_files` was recomputed from the
  run worktree with `git status` after a string-trim bug in `run.mjs`, noted in each row).
- `<task>-<arm>/events.jsonl`: every turn, question, answer, agent message and plan text.
- `<task>-<arm>/diff.patch`: the code change. Ledger arm also has `decisions.json`, `plan.md`, `plan.html` as the hook wrote them.

Token use for this milestone: about 0.56M for three smoke tests, 1.30M for this round.
