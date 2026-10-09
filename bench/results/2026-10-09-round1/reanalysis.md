# Round 1, re-analysis (offline, no new Codex calls)

`bench/reanalyze.mjs` replays the plan texts recorded in `events.jsonl` through the current
parser and ledger code (resolved items skipped, answers carried across revisions), with the
same oracle and responder. It cannot change what the model did, so rounds that came from the
model (the first turn ending without a plan block) stay as recorded. The new AGENTS guidance
(always end with a `<proposed_plan>`) was **not** tested here; that needs new Codex runs (round 2).
Raw output: [`reanalysis.json`](reanalysis.json).

| Ledger arm | Recorded (round 1 parser) | Re-analysis (current parser) |
| --- | --- | --- |
| Decisions on the page, first plan | 3 (`D1 resolved`, `D2 resolved`, "Limit changes to …") | 1 ("Limit changes to `index.js`, `tests.js`, `readme.md` …") |
| Answers sent in the one `plan-ledger answers` message | 3 | 1 (same oracle answer: do not change test files) |
| Decisions on the page, final plan | 3, hook said "3 decision(s) to answer" | 0, hook would say "no open decisions" |
| The answer in the final ledger | lost (ids changed, old decisions dropped) | kept in `earlier_answers` (decision not in this revision) |
| Rounds until the plan was final | 2 (1 text reply + 1 ledger answer) | 2 (unchanged) |
| Native arm rounds (for comparison) | 1 | 1 (not replayed; its final plan would render with 0 decisions) |

Planted drift, re-run on the recorded worktree against the replayed final ledger:

| Case | Recorded | Re-analysis |
| --- | --- | --- |
| clean | no drift | no drift |
| S1 scope: unplanned new file | caught | caught |
| S2 scope: revert the files a decision lists | caught | **not testable**: the final ledger has no open decision with files, so there is nothing to revert |
| C1 content: contradicting code in `index.js` | not caught (expected) | not caught (expected) |

Reading: the parser fixes make the page and the final ledger correct for this session, but they
do not change the round count, and ledger arm still did not win on rounds in this pair. S2 now
depends on decisions staying in the final plan; a check that also uses `earlier_answers` or the
plan's file list is a next step.
