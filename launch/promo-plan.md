# Promo plan (draft, nothing posted)

Status of this file: plan and drafts only. Nothing here has been posted. Every channel below needs the maintainer to post from their own account.

## What we are promoting

One idea per post: **after Codex codes, one command shows which changed files the plan never named, and the decisions behind the plan sit in the PR as `decisions.json`.**

Facts every post must keep (no rounding up, no new numbers):

- Early prototype, v0.1.
- Measured rounds: n = 3 pairs, 2 losses and 1 tie. It does not save rounds; never claim it does.
- Scope drift (unplanned file) caught 3/3; untouched planned files 3/3; no false alarm on a clean tree 3/3.
- Contradicting code inside a planned file caught 0/3. It compares file lists, not code.
- Zero dependencies, Node 20+, MIT. No extra model calls, the hook never blocks.

Assets to link (all public):

- Repo: https://github.com/miniLV/codex-plan-ledger
- Site: https://minilv.github.io/codex-plan-ledger/ (zh: https://minilv.github.io/codex-plan-ledger/zh/)
- 10 s intro: https://minilv.github.io/codex-plan-ledger/assets/intro-en.mp4 (zh: `intro-zh.mp4`)
- Sequence diagram: https://minilv.github.io/codex-plan-ledger/assets/how-it-works-en.png (zh: `how-it-works-zh.png`)
- Blog (zh): https://minilv.github.io/2026/10/09/codex-plan-ledger/

## Rules

1. No fake stars, no vote rings, no asking friends to upvote or comment (HN says so explicitly; Reddit and V2EX treat it as manipulation).
2. No competitor bashing and no comparisons that put another tool down. Credit inspirations by name only where the README already does.
3. No savings claims (rounds, tokens, time). Quote the measured numbers above or nothing.
4. One channel at a time, and only when the maintainer can answer comments for the next 2 to 3 hours.
5. Answer criticism with facts or "you're right, that's the 0/3 limit". Don't argue.
6. Don't repost the same thing to the same place. One post per channel per real release.
7. Disclose that you made it ("I built this").

## Channels ranked by fit

| # | Channel | Fit for a Codex CLI hooks tool | Login needed | Gate / rule to check first |
| --- | --- | --- | --- | --- |
| 1 | openai/codex GitHub Discussions, **Show and tell** | Highest: everyone there runs Codex CLI; hooks are a Codex feature | GitHub (miniLV) | Category exists and is meant for "Show off something you've made". Post once, no cross-posting to Ideas/General. |
| 2 | r/codex | High: the subreddit is for Codex CLI / IDE / cloud | Reddit account | Post flair required; rules favour high-information posts and posters with comment karma; moderation is partly bot-driven; self-promotion judged case by case. Comment helpfully in the sub first. |
| 3 | Show HN | Medium fit, largest reach; HN accepts early-stage work if people can try it | HN account | Title must start with "Show HN"; must be runnable (it is: one npm command); no upvote requests. |
| 4 | V2EX 分享创造 (/go/create) | Medium: Chinese devs who use Codex; expects the "how and why", not an ad | V2EX account | Account needs to be ≥ 30 days old to post in 分享创造; repeat promotion goes to 推广. |
| 5 | 掘金 article | Medium: long-form zh write-up; draft exists in `juejin-zh.md` | 掘金 account | Article must stand alone; avoid 标题党. |
| 6 | OpenAI Developer Forum, Codex category | Medium-low: slower, but searchable and on-topic | community.openai.com account | Post as a workflow/tool share with a clear "not affiliated with OpenAI" line. |
| 7 | r/ChatGPTCoding | Low-medium: broader audience, many tools | Reddit account | Read the sidebar for self-promotion limits before posting; skip if it requires a flair or ratio we can't meet. |
| 8 | Awesome lists (already submitted) | Passive, long tail | none (done) | RoggeOhta/awesome-codex-cli#393 and kailiu42/awesome-coding-agents#75 are both still open. Don't ping maintainers; reply only if they ask for changes. |

### Suggested order and timing

1. Day 1: openai/codex Show and tell (lowest risk, best audience, gives a URL to point at).
2. Day 2 or 3: r/codex.
3. Later the same week: Show HN, Tuesday to Thursday. Common practice is a US-morning post (about 08:00–10:00 PT, which is 23:00–01:00 Asia/Shanghai while US daylight time lasts until Nov 1). That's folk advice, not measured. Only post if you can stay up to answer for 2 to 3 hours.
4. Chinese channels on a separate day: 掘金 article plus V2EX 分享创造 (if the account is old enough), around 10:00 or 20:00 Asia/Shanghai.
5. OpenAI forum and r/ChatGPTCoding only if the earlier posts got useful feedback worth sharing.

## Drafts

### 1. openai/codex Discussions, Show and tell

**Title:** plan-ledger: record what /plan agreed, then check which changed files fell outside it

**Body:**

I built a small pair of Codex hooks plus a CLI for Plan mode, and I'd like feedback from people who use `/plan` daily.

What it does:

- When `/plan` produces a plan, a `Stop` hook writes `docs/plans/<id>/decisions.json`: the questions Codex asked you (read from the session transcript) with your answers, the plan's open items, and the defaults it states. It also renders one offline HTML page to review them. The hook never blocks the turn and makes no model calls.
- After coding, `plan-ledger check --base main` compares `git diff` with the plan's scope and lists changed files the plan never named.

How it works (sequence diagram): https://minilv.github.io/codex-plan-ledger/assets/how-it-works-en.png

Honest status: early prototype (v0.1). In 3 measured pairs it did not reduce rounds (2 losses, 1 tie). Planted scope drift was caught 3/3; contradicting code inside a planned file 0/3, because it compares file lists, not code.

Install: `npm i -g github:miniLV/codex-plan-ledger && plan-ledger init --write`

Repo: https://github.com/miniLV/codex-plan-ledger

Questions I'd love input on: is `decisions.json` in the repo the right place, and what would you want the check to catch next?

### 2. r/codex

**Flair:** whichever "Showcase"/"Tool" flair the sub offers at posting time (check the list; don't guess).

**Title:** I made a Stop hook that writes your /plan decisions to the repo and flags files Codex edited outside the plan

**Body:**

When I let Codex plan and then code, it sometimes edits files I never agreed on, and the reasons behind the plan only live in the chat. So I built plan-ledger (open source, MIT, zero deps):

1. A `Stop` hook writes what you agreed in `/plan` (Codex's questions and your answers, open items, defaults, scope) to `decisions.json` in your repo. No model calls; it never blocks.
2. After coding, `plan-ledger check --base main` lists changed files the plan never named, e.g. `DRIFT 1 changed file(s) not covered by any decision or the plan: src/utils/analytics.ts`.
3. The ledger goes into the PR, so the reviewer sees what was chosen and why.

10 s demo: https://minilv.github.io/codex-plan-ledger/assets/intro-en.mp4

Limits, measured: n = 3 pairs; it did not cut rounds (2 losses, 1 tie). Drift caught 3/3; contradictions inside a planned file 0/3 (it compares file lists, not code). Early prototype.

Repo + setup: https://github.com/miniLV/codex-plan-ledger. Feedback on the ledger format is very welcome.

### 3. Show HN

Use `show-hn-en.md` (already drafted; links are current). Title:

> Show HN: codex-plan-ledger – a decision ledger and scope drift check for Codex /plan

First comment, posted right after submitting (HN convention for Show HN):

> Author here. Plain version: when Codex plans and then codes, it can quietly edit files you never agreed on. This records what you agreed (decisions.json, in your repo) and, after coding, lists changed files outside that record. It only compares file lists, so contradicting code inside a planned file is not caught (0/3 in my runs), and it did not reduce rounds (n = 3 pairs). Happy to answer anything about the hook or the ledger format.

### 4. V2EX 分享创造

**标题：** 给 Codex /plan 做了个决策账本：计划里定了什么写进仓库，代码写完一条命令查出计划外改动

**正文：**

我自己做的开源小工具，MIT，零依赖。

起因：让 Codex 先计划再写代码时，它可能顺手改了我没同意过的文件；计划里为什么这样选，也只留在对话里。

做法：

1. Codex 的 `Stop` hook：`/plan` 出计划时，把 Codex 问过的问题和回答、待定项、默认值、范围写进仓库里的 `decisions.json`，再生成一页离线 HTML。不调模型，不阻塞。
2. 代码写完跑 `plan-ledger check --base main`：对照 `git diff`，列出计划没提过却被改的文件。
3. 账本跟代码进同一个 PR，评审能看到选了什么、为什么。

时序图：https://minilv.github.io/codex-plan-ledger/assets/how-it-works-zh.png

老实说的局限：早期原型。实测 3 对任务，轮数没变少（输 2、平 1）；计划外文件 3/3 抓到，计划内文件里和决策相反的改动 0/3（只比对文件列表，不读代码）。

仓库：https://github.com/miniLV/codex-plan-ledger
主页：https://minilv.github.io/codex-plan-ledger/zh/

想听听大家对账本格式和下一步该查什么的意见。

### 5. 掘金

Use `juejin-zh.md` (draft; same content as the blog post, already using the new intro GIF and the zh sequence diagram). Tags: Codex、AI 编程、工程实践、开源.

### 6. OpenAI Developer Forum (Codex category)

**Title:** Sharing a Codex CLI hook: a decision ledger for /plan plus a scope drift check

**Body:** reuse draft 1, and add at the end: "Independent open-source project, not affiliated with OpenAI."

### 7. r/ChatGPTCoding

Reuse draft 2 with the title: "Open-source hook for Codex /plan: writes the agreed plan to the repo, then lists files edited outside it". Post only after checking the sidebar's self-promotion rule.

## Top 3

1. **openai/codex Discussions, Show and tell.** Exact audience, low risk, needs only the GitHub login.
2. **r/codex.** Big on-topic audience; needs a Reddit account with some comment history and the right flair.
3. **Show HN.** Largest reach; post Tue to Thu, US morning (late night Asia/Shanghai), and only when you can reply for 2 to 3 hours.
