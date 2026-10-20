# OPS — codex-plan-ledger

Standing milestone / ops log. Factual only. Root file (not under `docs/`) so Pages does not publish it.

## Last patrol

**2026-10-20 ~10:03 Asia/Shanghai** (scheduled weekday morning patrol; no user message). Stars still 0; CI green on `1730687`; `npm test` 53/53; Pages HTTP 200; Mac still disconnected — A/B deferred; Show and tell #53043 still quiet (1 comment, last update 2026-10-11); ichangyou/awesome-codex listing still present; milisp/awesome-codex-cli scouted (issues-only submit; <100★ quality path exists but 0★ + author-driven listings are weak — **deferred** until Show HN or clearer non-author usage); Show HN not posted this morning (owned by Tue 18:00 Asia/Shanghai window routine + needs answer coverage); no user ping.

**2026-10-19 ~18:03 Asia/Shanghai** (scheduled weekday evening patrol; no user message). Mac still disconnected — A/B retry deferred; Show HN not posted (Tue–Thu US morning window + answer coverage); no user ping.

**2026-10-19 ~14:25 Asia/Shanghai** (proactive ops check). Confirmed RoggeOhta/awesome-codex-cli #393 **closed without merge** by miniLV at 14:15 Asia/Shanghai; OPS link status updated. No user ping from this check.

**2026-10-19 ~10:00 Asia/Shanghai** (scheduled weekday morning patrol; no user message). Mac disconnected — deferred optional A/B retry; no user ping.

## Snapshot

| Item | Value |
| --- | --- |
| Stars | 0 |
| Forks | 0 |
| Open issues | 1 ([#1](https://github.com/miniLV/codex-plan-ledger/issues/1), later version only) |
| Open PRs | 0 |
| Default branch | `main` |
| Latest commit (pre-this-patrol) | `1730687` — ops: evening patrol 2026-10-19 — Mac offline, soft-launch hold |
| CI | Green (latest CI + Pages build success on `1730687`) |
| Homepage | https://minilv.github.io/codex-plan-ledger/ (HTTP 200 verified this patrol) |
| Topics | ai-agents, codex, codex-cli, coding-agents, developer-tools, html, openai-codex, plan-mode |
| Releases | **[v0.1.0 — early prototype](https://github.com/miniLV/codex-plan-ledger/releases/tag/v0.1.0)** published 2026-10-13 10:03 Asia/Shanghai |
| `npm test` (this run) | 53/53 pass |
| Mac repo | **Disconnected** (`MacBook-Pro.local` not connected); A/B / live Codex smoke blocked this patrol |
| Codex on Mac | last known `codex-cli 0.162.1` (2026-10-16) |
| Quota gate | not checked (Mac offline) |
| Optional A/B | **Deferred.** Harness `needsAnswer` import fixed in `f5c1b02` (2026-10-16 evening). Planned one `month-unit` retry when Mac reconnects and quota is healthy. Incomplete 2026-10-16 evening artifacts stay local-only under `~/cpl-bench/ab-2026-10-16-evening/` — **not** published. Public `bench/results` still n=3. No invented numbers. |

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
- [awesome-codex-cli #393](https://github.com/RoggeOhta/awesome-codex-cli/pull/393) — **CLOSED without merge** 2026-10-19 14:15 Asia/Shanghai by miniLV (no maintainer comments; upstream README last commit 2026-09-06). Not listed. Do **not** reopen or ping.
- [ichangyou/awesome-codex #28](https://github.com/ichangyou/awesome-codex/pull/28) — **MERGED** 2026-10-15 16:57 Asia/Shanghai by ichangyou (Hooks & Automation in README.md + README.zh-CN.md); still listed this patrol
- [openai/codex Show and tell #53043](https://github.com/openai/codex/discussions/53043) — posted 2026-10-11; still quiet (1 comment, last update 2026-10-11); repo issue #1 filed for later behavior↔evidence check (v0.1 stays file-level)
- **掘金** — **approved / public** https://juejin.cn/post/7695576950509568041 (account 小蠢驴打代码). Last browser check 2026-10-13 ~10:04 Asia/Shanghai: 阅读 36 · 赞和收藏 1 · 评论 0. Draft source: `launch/juejin-zh.md`.
- Candidate extra awesome lists checked 2026-10-14 evening and **skipped** (stale, plugins-only, or learning-resources): quome-cloud/awesome-coding-agents, darknorth-123/Awesome-Codex-Plugins, Caldalis/awesome-coding-agents
- **2026-10-19 evening scout:** [shinpr/awesome-codex-workflows](https://github.com/shinpr/awesome-codex-workflows) (20★, active merges) — **skipped**. CONTRIBUTING requires projects “ready for others to use, rather than as experiments or proofs of concept”; we still label early prototype. Prefers recommendation issue before PR. Revisit after a clearer “ready” bar or more public evidence.
- **2026-10-20 morning scout:** [milisp/awesome-codex-cli](https://github.com/milisp/awesome-codex-cli) (124★, active) — issues-only “Submit a resource”; PRs restricted. Fits Tools / Code Quality & Review or Workflows. Criteria allow <100★ via quality points, but form text still emphasizes 100★ and “No users yet? Submit once you meet the criteria.” With **0★**, submission deferred; do not open a weak issue that burns the slot. KarelDO/awesome-codex skipped (legacy 2021 Codex model list). onurkanbakirci/awesome-codex-automations skipped (scheduled-automation prompts, not CLI hooks/tools).
- Next interactive channels (Show HN; r/codex only via user account — bot Reddit blocked) still waiting for a 2–3h answer window — **not** posting from this evening patrol (next Show HN window Tue–Thu US morning / ~23:00–01:00 Asia/Shanghai; needs live answer coverage)
- V2EX / OpenAI forum still later per `launch/promo-plan.md`

## NEXT (ranked)

1. **Optional one measured A/B pair** when Mac reconnects and quota is healthy (harness `needsAnswer` import fixed `f5c1b02`); do not expand to a multi-pair round
2. **Show HN** Tue–Thu only, US morning window (~23:00–01:00 Asia/Shanghai), only with live answer coverage (draft `launch/show-hn-en.md`) — next candidate window Tue evening CST if coverage exists; **not** posting without coverage
3. **r/codex** — user-only if wanted (bot exit IP blocked; no bot Reddit tasks); draft remains in `launch/promo-plan.md`
4. **awesome-codex-cli #393** closed without merge (2026-10-19); no reopen. Prefer other lists / Show HN for discovery.
5. **Issue #1** = later version candidate only; do not implement in v0.1
6. **milisp/awesome-codex-cli** — issues-only resource submit; deferred at 0★ (quality path needs stronger non-author usage than our own awesome-list merges). Revisit after Show HN or measurable external use.
7. Optional later: V2EX 分享创造 / OpenAI Developer Forum if earlier channels get useful feedback; revisit shinpr/awesome-codex-workflows only if product framing is no longer “early prototype”

## Honest-data rules

- No fake stars / engagement
- No competitor bashing; at most one neutral thank-you line for inspiration
- Early-prototype / directional wording when there is no new measured data beyond `bench/results` (n=3)
- Numbers only from public repo evidence
