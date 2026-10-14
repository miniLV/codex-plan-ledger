# OPS — codex-plan-ledger

Standing milestone / ops log. Factual only. Root file (not under `docs/`) so Pages does not publish it.

## Last patrol

**2026-10-14 ~17:56 Asia/Shanghai** (scheduled evening patrol; no user message)

## Snapshot

| Item | Value |
| --- | --- |
| Stars | 0 |
| Forks | 0 |
| Open issues | 1 ([#1](https://github.com/miniLV/codex-plan-ledger/issues/1), later version only) |
| Open PRs | 0 |
| Default branch | `main` |
| Latest commit (pre-this-patrol) | `78534c6` — ops: note awesome-codex #28 in promo-plan channel table (2026-10-13T10:02Z) |
| CI | Green (latest CI + Pages build success on `78534c6`; local `npm test` 53/53 pass) |
| Homepage | https://minilv.github.io/codex-plan-ledger/ |
| Topics | ai-agents, codex, codex-cli, coding-agents, developer-tools, html, openai-codex, plan-mode |
| Releases | **[v0.1.0 — early prototype](https://github.com/miniLV/codex-plan-ledger/releases/tag/v0.1.0)** published 2026-10-13 10:03 Asia/Shanghai |
| `npm test` (this run) | 53/53 pass |
| Mac + Codex A/B this evening | Skipped — user Mac still disconnected (`MacBook-Pro.local`) |


## Milestones

| Milestone | Status |
| --- | --- |
| MVP + CI green | **DONE** |
| Mac Codex A/B with public raw data (n=3 pairs in `bench/results`) | **DONE** (directional; 2 losses 1 tie on rounds; drift 3/3; in-file contradiction 0/3) |
| README real screenshots / GIFs | **DONE** |
| GitHub Pages zh/en landing | **DONE** (live) |
| Personal blog zh | **DONE** — https://minilv.github.io/2026/10/09/codex-plan-ledger/ |
| GitHub Release v0.1.0 | **DONE** 2026-10-13 — factual notes only (what it does, install, n=3 directional numbers, links) |
| Promo soft-launch | **IN PROGRESS** (see below) |

### Soft-launch detail

- [awesome-coding-agents #75](https://github.com/kailiu42/awesome-coding-agents/pull/75) — **MERGED** 2026-10-11
- [awesome-codex-cli #393](https://github.com/RoggeOhta/awesome-codex-cli/pull/393) — still **OPEN** (checked 2026-10-14 evening; clean/mergeable; 0 comments); do **not** ping maintainers
- [ichangyou/awesome-codex #28](https://github.com/ichangyou/awesome-codex/pull/28) — still **OPEN** (Hooks & Automation; checked 2026-10-14 evening; no checks reported / mergeable_state unstable; 0 comments); do **not** ping maintainers
- [openai/codex Show and tell #53043](https://github.com/openai/codex/discussions/53043) — posted 2026-10-11; still quiet (updated 2026-10-11 20:01 Asia/Shanghai; 1 upvote; no new activity); repo issue #1 filed for later behavior↔evidence check (v0.1 stays file-level)
- **掘金** — **approved / public** https://juejin.cn/post/7695576950509568041 (account 小蠢驴打代码). Last browser check 2026-10-13 ~10:04 Asia/Shanghai: 阅读 36 · 赞和收藏 1 · 评论 0. Draft source: `launch/juejin-zh.md`.
- Candidate extra awesome lists checked this evening and **skipped** (stale, plugins-only, or learning-resources): quome-cloud/awesome-coding-agents, darknorth-123/Awesome-Codex-Plugins, Caldalis/awesome-coding-agents
- Next interactive channels (r/codex, Show HN) still waiting for a 2–3h answer window — **not** posting from this evening patrol (Wed is in Tue–Thu Show HN window ~23:00 Asia/Shanghai, but no live answer coverage)
- V2EX / OpenAI forum still later per `launch/promo-plan.md`

## NEXT (ranked)

1. **Post Channel #2 r/codex** only when someone can answer 2–3h (draft in `launch/promo-plan.md`); can now link the v0.1.0 release
2. **Show HN** Tue–Thu this week, US morning window (~23:00–01:00 Asia/Shanghai), only with live answer coverage (draft `launch/show-hn-en.md`) — Wed evening is in-window but no live answer coverage this patrol, so **not** posting
3. Leave **awesome-codex-cli #393** and **ichangyou/awesome-codex #28** alone unless maintainers ask
4. **Issue #1** = later version candidate only; do not implement in v0.1
5. More **A/B** only when Mac + Codex available
6. Optional later: V2EX 分享创造 / OpenAI Developer Forum if earlier channels get useful feedback

## Honest-data rules

- No fake stars / engagement
- No competitor bashing; at most one neutral thank-you line for inspiration
- Early-prototype / directional wording when there is no new measured data beyond `bench/results` (n=3)
- Numbers only from public repo evidence
