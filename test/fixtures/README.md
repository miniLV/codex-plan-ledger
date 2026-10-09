# Fixtures

All `*.message.md` files are **synthetic**. They were written by hand to follow the
format that Codex Plan mode asks for in `codex-rs/collaboration-mode-templates/templates/plan.md`
(a `<proposed_plan>` block with Markdown inside: title, Summary, Key Changes, Test Plan,
Assumptions). They are not captured from a real Codex session.

| File | Style |
| --- | --- |
| `send-later.message.md` | English plan with an explicit `## Decisions` section, `(Recommended)` markers and `Affects:` lines |
| `rate-limit.message.md` | English plan in the default native layout; decisions are inline questions, `Option A/B` and TBD |
| `csv-export.zh.message.md` | Chinese plan with `## 待决` and `方案 A/B`, `推荐：` |
| `no-plan.message.md` | A normal assistant reply with no plan block (pass-through case) |
