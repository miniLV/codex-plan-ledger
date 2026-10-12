# OPS — codex-plan-ledger

Standing milestone / ops log. Factual only. Root file (not under `docs/`) so Pages does not publish it.

## Last patrol

**2026-10-12 ~18:08 Asia/Shanghai** (scheduled evening patrol; user messaged only for 掘金 publish milestone)

## Snapshot

| Item | Value |
| --- | --- |
| Stars | 0 |
| Forks | 0 |
| Open issues | 1 ([#1](https://github.com/miniLV/codex-plan-ledger/issues/1)) |
| Open PRs | 0 |
| Default branch | `main` |
| Latest commit (pre-this-patrol) | `f02671e` — ops: note juejin 403 during morning patrol (2026-10-12T02:04:07Z) |
| CI | Green (latest CI + Pages build success) |
| Homepage | https://minilv.github.io/codex-plan-ledger/ |
| Topics | ai-agents, codex, codex-cli, coding-agents, developer-tools, html, openai-codex, plan-mode |
| Releases | None yet |
| `npm test` (this run) | 53/53 pass |
| Mac + Codex A/B this evening | Skipped — user Mac disconnected |

## Milestones

| Milestone | Status |
| --- | --- |
| MVP + CI green | **DONE** |
| Mac Codex A/B with public raw data (n=3 pairs in `bench/results`) | **DONE** (directional; 2 losses 1 tie on rounds; drift 3/3; in-file contradiction 0/3) |
| README real screenshots / GIFs | **DONE** |
| GitHub Pages zh/en landing | **DONE** (live) |
| Personal blog zh | **DONE** — https://minilv.github.io/2026/10/09/codex-plan-ledger/ |
| Promo soft-launch | **IN PROGRESS** (see below) |

### Soft-launch detail

- [awesome-coding-agents #75](https://github.com/kailiu42/awesome-coding-agents/pull/75) — **MERGED** 2026-10-11
- [awesome-codex-cli #393](https://github.com/RoggeOhta/awesome-codex-cli/pull/393) — still **OPEN** (mergeable, 0 comments, updated 2026-10-09); do **not** ping maintainers
- [openai/codex Show and tell #53043](https://github.com/openai/codex/discussions/53043) — posted 2026-10-11; still 1 reply thread (answered); repo issue #1 filed for later behavior↔evidence check (v0.1 stays file-level)
- **掘金** — **PUBLISHED** 2026-10-12 evening as https://juejin.cn/post/7695576950509568041 (account 小蠢驴打代码; status showed 审核中 at publish time). Draft source: `launch/juejin-zh.md`. Morning 403 cleared for the signed-in browser session.
- Next interactive channels (r/codex, Show HN) need a 2–3h answer window — **not** posting from this evening patrol
- V2EX / OpenAI forum still later per `launch/promo-plan.md`

## NEXT (ranked)

1. **Post Channel #2 r/codex** only when someone can answer 2–3h (draft in `launch/promo-plan.md`)
2. **Show HN** later this week, US morning window (~23:00–01:00 Asia/Shanghai), only with live answer coverage
3. Leave **awesome-codex-cli #393** alone unless maintainers ask
4. **Issue #1** = later version candidate only; do not implement in v0.1
5. More **A/B** only when Mac + Codex available
6. Optional later: V2EX 分享创造 / OpenAI Developer Forum if earlier channels get useful feedback

## Honest-data rules

- No fake stars / engagement
- No competitor bashing; at most one neutral thank-you line for inspiration
- Early-prototype / directional wording when there is no new measured data beyond `bench/results` (n=3)
- Numbers only from public repo evidence
