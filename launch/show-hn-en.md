# Show HN draft (not posted)

**Title:** Show HN: codex-plan-ledger – a decision ledger and scope drift check for Codex /plan

**URL:** https://github.com/miniLV/codex-plan-ledger

**Text:**

In Codex's Plan mode, the useful part of a plan is often the handful of choices made along the way: retry or fail fast, a flag or an env var, which files are off limits. Those choices tend to live only in the chat. When the PR shows up, reviewers see the code but not why it was done that way, and there is nothing to compare the change against.

codex-plan-ledger is a pair of Codex hooks plus a small CLI (Node 20+, zero dependencies, MIT):

- When Codex outputs a plan, a Stop hook writes `docs/plans/<id>/decisions.json`: the questions Codex asked you (read from the session transcript) with your answers, the plan's open decisions, and the defaults the plan states. It also renders one offline HTML page to review or change them. The ledger goes into the same PR as the code, so it can be diffed and reviewed.
- After coding, `plan-ledger check --base main` compares the changed files with the plan: files changed outside the plan, and decisions whose files were never touched. `--strict` exits 1 for CI.

No extra model calls, the hook never blocks the turn, and answers are stored as data, never executed.

Measured status, honestly: I started out expecting "answer everything on one page" to need fewer rounds than native Plan mode. In paired runs on vercel/ms (same task, model and settings; a script answering from a hidden oracle; two rounds, 2 tasks, n = 3 pairs, directional only), rounds did not improve (2 losses, 1 tie) and tokens went both ways. The drift check caught planted scope drift 3/3 with no false positives on clean trees, and caught contradicting code inside a planned file 0/3; it only looks at which files changed, not their content. So the project is now positioned as a decision ledger plus a scope drift check, not as a way to save rounds. All raw data and the harness are in the repo.

One live end-to-end check of the native Q&A capture: in a real Plan-mode session Codex asked 2 questions, and the real Stop hook recorded both as `source: "codex-native"` (about 43k tokens for the turn; the prompt asked Codex to ask first, so this is a functional check).

Early prototype (v0.1). Next: checking decisions against code content, and more tasks with ≥ 3 runs per arm. Feedback on the ledger format (there's a JSON Schema) is very welcome.

Demo: https://minilv.github.io/codex-plan-ledger/
