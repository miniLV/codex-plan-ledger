# Fixtures

The `*.message.md` files in this folder are **synthetic**. The files in `real/` are not (see below). They were written by hand to follow the
format that Codex Plan mode asks for in `codex-rs/collaboration-mode-templates/templates/plan.md`
(a `<proposed_plan>` block with Markdown inside: title, Summary, Key Changes, Test Plan,
Assumptions). They are not captured from a real Codex session.

| File | Style |
| --- | --- |
| `send-later.message.md` | English plan with an explicit `## Decisions` section, `(Recommended)` markers and `Affects:` lines |
| `rate-limit.message.md` | English plan in the default native layout; decisions are inline questions, `Option A/B` and TBD |
| `csv-export.zh.message.md` | Chinese plan with `## 待决` and `方案 A/B`, `推荐：` |
| `no-plan.message.md` | A normal assistant reply with no plan block (pass-through case) |

## `real/`: captured from a real Codex session

| File | What it is |
| --- | --- |
| `real/strict-option.rev1.message.md` | First `<proposed_plan>` for the bench task `strict-option` (ledger arm) |
| `real/strict-option.rev2.message.md` | The plan after the `plan-ledger answers` reply in the same session |

How they were captured (2026-10-09): codex-cli 0.156.0, native Plan mode started through
`codex app-server` (`collaborationMode: plan`), model `codex/gpt-6.1-sol`, reasoning effort
medium, repo vercel/ms@2.1.3 with the round-1 `AGENTS.md` (`bench/results/2026-10-09-round1/ledger-arm.AGENTS.round1.md`). The text is the assistant
message copied verbatim from the session transcript (`~/.codex/sessions/.../rollout-*.jsonl`),
including the `<proposed_plan>` tags Codex emitted. Nothing was edited.
Full run: `bench/results/2026-10-09-round1/`.
