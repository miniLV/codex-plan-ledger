# OPS — codex-plan-ledger

Standing milestone / ops log. Factual only. Root file (not under `docs/`) so Pages does not publish it.

## Last patrol

**2026-10-15 ~10:03 Asia/Shanghai** (scheduled weekday morning patrol; no user message)

## Snapshot

| Item | Value |
| --- | --- |
| Stars | 0 |
| Forks | 0 |
| Open issues | 1 ([#1](https://github.com/miniLV/codex-plan-ledger/issues/1), later version only) |
| Open PRs | 0 |
| Default branch | `main` |
| Latest commit (pre-this-patrol) | `c1d0064` — ops: evening patrol 2026-10-14 — soft-launch still waiting |
| CI | Green (latest CI + Pages build success on `c1d0064`; local `npm test` 53/53 pass) |
| Homepage | https://minilv.github.io/codex-plan-ledger/ |
| Topics | ai-agents, codex, codex-cli, coding-agents, developer-tools, html, openai-codex, plan-mode |
| Releases | **[v0.1.0 — early prototype](https://github.com/miniLV/codex-plan-ledger/releases/tag/v0.1.0)** published 2026-10-13 10:03 Asia/Shanghai |
| `npm test` (this run) | 53/53 pass |
| Mac repo | Synced ff-only to `c1d0064` (`/Users/tyrion/Github/codex-plan-ledger`; was behind 17 at `af41e97`) |
| Codex on Mac | `codex-cli 0.162.1` (was 0.156.0 in published A/B); Node `v22.23.2`; `~/cpl-bench/ms-base` + `~/cpl-bench/verify` present |
| Mac smoke (this morning) | **Blocked by usage limit** — not an API/behavior break. `bench/smoke.mjs` on scratch `~/cpl-bench/smoke-repo`: app-server `initialize` + `thread/start` (hooks wired) + Plan `turn/start` succeeded on 0.162.1; `UserPromptSubmit` hook completed; turn `status=failed` with `codexErrorInfo=usageLimitExceeded` (“try again at 12:27 PM” local / Asia/Shanghai). Out: `~/cpl-bench/smoke-out-2026-10-15-morning`. No new A/B metrics. |


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
- [awesome-codex-cli #393](https://github.com/RoggeOhta/awesome-codex-cli/pull/393) — still **OPEN** (checked 2026-10-15 morning; mergeable; 0 comments); do **not** ping maintainers
- [ichangyou/awesome-codex #28](https://github.com/ichangyou/awesome-codex/pull/28) — still **OPEN** (Hooks & Automation; checked 2026-10-15 morning; mergeable_state unstable; 0 comments); do **not** ping maintainers
- [openai/codex Show and tell #53043](https://github.com/openai/codex/discussions/53043) — posted 2026-10-11; still quiet (updated 2026-10-11 20:01 Asia/Shanghai; 1 upvote; no new activity); repo issue #1 filed for later behavior↔evidence check (v0.1 stays file-level)
- **掘金** — **approved / public** https://juejin.cn/post/7695576950509568041 (account 小蠢驴打代码). Last browser check 2026-10-13 ~10:04 Asia/Shanghai: 阅读 36 · 赞和收藏 1 · 评论 0. Draft source: `launch/juejin-zh.md`.
- Candidate extra awesome lists checked 2026-10-14 evening and **skipped** (stale, plugins-only, or learning-resources): quome-cloud/awesome-coding-agents, darknorth-123/Awesome-Codex-Plugins, Caldalis/awesome-coding-agents
- Next interactive channels (r/codex, Show HN) still waiting for a 2–3h answer window — **not** posting from this morning patrol
- V2EX / OpenAI forum still later per `launch/promo-plan.md`

## NEXT (ranked)

1. **Re-run Mac smoke** after Codex usage resets (~12:27 Asia/Shanghai today) to confirm Plan-mode + Stop hooks green on 0.162.1; if green, evening patrol may schedule **one** measured A/B pair (not a full multi-pair round)
2. **Post Channel #2 r/codex** only when someone can answer 2–3h (draft in `launch/promo-plan.md`); can now link the v0.1.0 release
3. **Show HN** Tue–Thu this week, US morning window (~23:00–01:00 Asia/Shanghai), only with live answer coverage (draft `launch/show-hn-en.md`) — **not** posting without coverage
4. Leave **awesome-codex-cli #393** and **ichangyou/awesome-codex #28** alone unless maintainers ask
5. **Issue #1** = later version candidate only; do not implement in v0.1
6. Optional later: V2EX 分享创造 / OpenAI Developer Forum if earlier channels get useful feedback

## Honest-data rules

- No fake stars / engagement
- No competitor bashing; at most one neutral thank-you line for inspiration
- Early-prototype / directional wording when there is no new measured data beyond `bench/results` (n=3)
- Numbers only from public repo evidence
