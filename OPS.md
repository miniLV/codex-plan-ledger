# OPS — codex-plan-ledger

Standing milestone / ops log. Factual only. Root file (not under `docs/`) so Pages does not publish it.

## Last patrol

**2026-10-16 ~18:05 Asia/Shanghai** (scheduled weekday evening patrol; no user message)

## Snapshot

| Item | Value |
| --- | --- |
| Stars | 0 |
| Forks | 0 |
| Open issues | 1 ([#1](https://github.com/miniLV/codex-plan-ledger/issues/1), later version only) |
| Open PRs | 0 |
| Default branch | `main` |
| Latest commit (pre-this-patrol) | `53453be` — ops: morning patrol 2026-10-16 — Mac smoke green on 0.162.1 |
| CI | Green (latest CI + Pages build success on `53453be`; local `npm test` 53/53 pass) |
| Homepage | https://minilv.github.io/codex-plan-ledger/ |
| Topics | ai-agents, codex, codex-cli, coding-agents, developer-tools, html, openai-codex, plan-mode |
| Releases | **[v0.1.0 — early prototype](https://github.com/miniLV/codex-plan-ledger/releases/tag/v0.1.0)** published 2026-10-13 10:03 Asia/Shanghai |
| `npm test` (this run) | 53/53 pass |
| Mac repo | Already at `53453be` (`/Users/tyrion/Github/codex-plan-ledger`); connected |
| Codex on Mac | `codex-cli 0.162.1` |
| Quota gate (evening) | `SMOKE_DRY=1` config/read OK (model `gpt-6.1-sol`); no usageLimitExceeded |
| Evening A/B | **Attempted one pair (`month-unit` × native + ledger); incomplete.** Native completed (verify pass, 201,960 tokens, 85 s wall). Ledger plan turn + Stop hook wrote ledger (`hook_live: true`, 2 decisions), then harness aborted: `ReferenceError: needsAnswer is not defined` in `bench/run.mjs` (uses `needsAnswer` without importing it from `src/ledger.js`; present since `6689687`, after round 2). No implementation on ledger arm. Artifacts kept local only under `~/cpl-bench/ab-2026-10-16-evening/` (summary.md). **Not published** to `bench/results/`; README / public n=3 unchanged. No invented numbers. |

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
- [awesome-codex-cli #393](https://github.com/RoggeOhta/awesome-codex-cli/pull/393) — still **OPEN** (checked 2026-10-16 evening; mergeable_state clean; 0 comments; last update 2026-10-09); do **not** ping maintainers
- [ichangyou/awesome-codex #28](https://github.com/ichangyou/awesome-codex/pull/28) — **MERGED** 2026-10-15 16:57 Asia/Shanghai by ichangyou (Hooks & Automation in README.md + README.zh-CN.md)
- [openai/codex Show and tell #53043](https://github.com/openai/codex/discussions/53043) — posted 2026-10-11; still quiet (updated 2026-10-11; 1 upvote; 1 comment); repo issue #1 filed for later behavior↔evidence check (v0.1 stays file-level)
- **掘金** — **approved / public** https://juejin.cn/post/7695576950509568041 (account 小蠢驴打代码). Last browser check 2026-10-13 ~10:04 Asia/Shanghai: 阅读 36 · 赞和收藏 1 · 评论 0. Draft source: `launch/juejin-zh.md`.
- Candidate extra awesome lists checked 2026-10-14 evening and **skipped** (stale, plugins-only, or learning-resources): quome-cloud/awesome-coding-agents, darknorth-123/Awesome-Codex-Plugins, Caldalis/awesome-coding-agents
- Next interactive channels (Show HN; r/codex only via user account — bot Reddit blocked) still waiting for a 2–3h answer window — **not** posting from this evening patrol (Friday is outside the Tue–Thu Show HN window anyway)
- V2EX / OpenAI forum still later per `launch/promo-plan.md`

## NEXT (ranked)

1. **Fix bench harness**: import `{ ANSWER_PREFIX, needsAnswer }` in `bench/run.mjs` (one-line); then optionally retry **one** measured A/B pair when quota healthy — do not expand to a multi-pair round
2. **Show HN** Tue–Thu only, US morning window (~23:00–01:00 Asia/Shanghai), only with live answer coverage (draft `launch/show-hn-en.md`) — next window Mon/Tue evening CST; **not** posting without coverage
3. **r/codex** — user-only if wanted (bot exit IP blocked; no bot Reddit tasks); draft remains in `launch/promo-plan.md`
4. Leave **awesome-codex-cli #393** alone unless maintainers ask
5. **Issue #1** = later version candidate only; do not implement in v0.1
6. Optional later: V2EX 分享创造 / OpenAI Developer Forum if earlier channels get useful feedback

## Honest-data rules

- No fake stars / engagement
- No competitor bashing; at most one neutral thank-you line for inspiration
- Early-prototype / directional wording when there is no new measured data beyond `bench/results` (n=3)
- Numbers only from public repo evidence
