# OPS — codex-plan-ledger

Standing milestone / ops log. Factual only. Root file (not under `docs/`) so Pages does not publish it.

## Last patrol

**2026-10-13 ~10:00 Asia/Shanghai** (scheduled morning patrol; no user message)

## Snapshot

| Item | Value |
| --- | --- |
| Stars | 0 |
| Forks | 0 |
| Open issues | 1 ([#1](https://github.com/miniLV/codex-plan-ledger/issues/1), later version only) |
| Open PRs | 0 |
| Default branch | `main` |
| Latest commit (pre-this-patrol) | `aedf6b0` — ops: note 掘金 article published (evening patrol) (2026-10-12T10:09Z = 18:09 Asia/Shanghai) |
| CI | Green (latest CI + Pages build success) |
| Homepage | https://minilv.github.io/codex-plan-ledger/ |
| Topics | ai-agents, codex, codex-cli, coding-agents, developer-tools, html, openai-codex, plan-mode |
| Releases | **[v0.1.0 — early prototype](https://github.com/miniLV/codex-plan-ledger/releases/tag/v0.1.0)** published 2026-10-13 10:03 Asia/Shanghai on `aedf6b0` |
| `npm test` (this run) | 53/53 pass |
| Mac + Codex A/B this morning | Skipped — user Mac still disconnected |

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
- [awesome-codex-cli #393](https://github.com/RoggeOhta/awesome-codex-cli/pull/393) — still **OPEN** (checked 2026-10-13 morning); do **not** ping maintainers
- [openai/codex Show and tell #53043](https://github.com/openai/codex/discussions/53043) — posted 2026-10-11; API shows 4 comments, last update 2026-10-11 20:01 Asia/Shanghai (no new activity since); repo issue #1 filed for later behavior↔evidence check (v0.1 stays file-level)
- **掘金** — published 2026-10-12 evening as https://juejin.cn/post/7695576950509568041 (account 小蠢驴打代码; 审核中 at publish time). Live URL; audit status not re-verified this morning without browser. Draft source: `launch/juejin-zh.md`.
- Next interactive channels (r/codex, Show HN) still waiting for a 2–3h answer window — **not** posting from this morning patrol
- V2EX / OpenAI forum still later per `launch/promo-plan.md`

## NEXT (ranked)

1. **Post Channel #2 r/codex** only when someone can answer 2–3h (draft in `launch/promo-plan.md`); can now link the v0.1.0 release
2. **Show HN** Tue–Thu this week, US morning window (~23:00–01:00 Asia/Shanghai), only with live answer coverage (draft `launch/show-hn-en.md`)
3. Re-check 掘金 audit status (needs signed-in browser; not a GitHub op)
4. Leave **awesome-codex-cli #393** alone unless maintainers ask
5. **Issue #1** = later version candidate only; do not implement in v0.1
6. More **A/B** only when Mac + Codex available
7. Optional later: V2EX 分享创造 / OpenAI Developer Forum if earlier channels get useful feedback

## Honest-data rules

- No fake stars / engagement
- No competitor bashing; at most one neutral thank-you line for inspiration
- Early-prototype / directional wording when there is no new measured data beyond `bench/results` (n=3)
- Numbers only from public repo evidence
