# Measurement plan / 实测计划

Status: **two directional rounds run (n = 3 pairs: round 1 = 1 task, round 2 = 2 tasks; 1 run per arm).** They do not meet the decision lines below, which need ≥ 3 repeats. So far decision line 1 (rounds) points the wrong way: plan-ledger lost 2 pairs and tied 1. Decision line 2 (planted scope drift caught) held in 3/3. Data: [round 1](../bench/results/2026-10-09-round1/summary.md), [round 2](../bench/results/2026-10-09-round2/summary.md). Harness: [`bench/`](../bench/README.md).

状态：**已跑两轮方向性实测（共 n = 3 对：第 1 轮 1 个任务，第 2 轮 2 个任务，每组 1 次）**，达不到下面要求至少 3 次重复的判定线。目前判定线 1（轮数）方向相反：plan-ledger 输 2 对、平 1 对；判定线 2（抓到埋入的范围偏离）3/3 成立。数据：[第 1 轮](../bench/results/2026-10-09-round1/summary.md)、[第 2 轮](../bench/results/2026-10-09-round2/summary.md)。

**Positioning after round 2 / 两轮之后的定位：** plan-ledger no longer aims to cut rounds. It records Plan-mode decisions (including Codex's own `request_user_input` Q&A) as `decisions.json` and checks scope drift after coding. The rounds question below is kept for the record. Next measurements: how completely the ledger captures the decisions of a session, and drift detection on more tasks with ≥ 3 runs. / 不再以减少轮数为目标，改为记录 Plan 模式的决策（含 Codex 原生问答）并在写完代码后查范围偏离。下面关于轮数的问题保留作记录；下一步测账本对一次会话决策的覆盖程度，以及更多任务、每组 ≥ 3 次的偏离检测。

Change from the first draft of this plan: runs use `codex app-server` with native Plan mode (`collaborationMode: plan`) instead of `codex exec`, because `codex exec` cannot select Plan mode. So arm A gets the real `request_user_input` questions, and the responder answers them through the same API. Rounds = `request_user_input` calls + plain-text replies + `plan-ledger answers` messages before the final plan.

## Question

On the same planning tasks, does answering decisions on one page (B) need fewer rounds to reach a final plan than native Plan-mode clarification (A), at what token cost, and does the ledger catch drift after implementation?

## Design

- **Paired A/B** in two isolated git worktrees per task and run, the same way [intent-tests](https://github.com/miniLV/intent-tests)' `intent-ab` does: same pinned commit, same prompt, same model and effort, `codex exec --json --ignore-user-config --ephemeral`, fixed sandbox.
- **Repeats:** at least 3 per task and arm. Report the **median** and publish **every raw run**.
- **Tasks:** at least 3 planning tasks on a small, neutral, pinned open-source repo (MIT or Apache-2.0), each with real trade-offs (for example storage choice, failure policy, limits). Each task has a hidden `oracle.json` with the "user's" real preferences.
- **Simulated user:** interactive Plan mode cannot be scripted directly, so a deterministic responder answers from `oracle.json`. Both arms share the same oracle.
  - **A (native):** `codex exec` produces questions or a plan. While the output still asks questions, the responder answers them with `codex exec resume`, until a `<proposed_plan>` appears that matches the oracle.
  - **B (plan-ledger):** the first `<proposed_plan>` goes through `plan-ledger render`; the responder fills every decision from the oracle in one reply JSON; one `codex exec resume` with that JSON.
- **Environment record:** Codex version, model, effort, OS, plan-ledger commit, task repo commit.

Known limit: `codex exec` is not the interactive `request_user_input` UI. The results speak about this scripted protocol, and the write-up will say so.

## Metrics

| Metric | Source |
| --- | --- |
| Rounds until the plan is final (number of `resume` calls) | run log |
| Tokens, split: `input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_output_tokens` | summed over every `turn.completed.usage` event of `codex exec --json` |
| Wall time | run log |
| Plan matches oracle (per decision) | script comparing the final plan / ledger with `oracle.json` |
| Scope drift caught | `plan-ledger check --json` on planted changes (below) |
| Content drift caught | same, reported separately (below) |

Tokens are reported per category, never only as a total: fewer output tokens can come with more cached input, and the report must show that.

## Planted drift

After the B arm implements each task, a script copies the worktree and applies small, deterministic patches, then runs `plan-ledger check --base <task commit> --json`. Two kinds are planted and **reported separately**:

1. **Scope drift** (what v0.1 is built to catch), 2–3 per task:
   - edit a file that no decision and no plan text mentions;
   - revert all changes to one decision's `affected` files.
2. **Content drift** (a known gap in v0.1), 2–3 per task:
   - inside a planned file, write code that contradicts the chosen option (for example the decision says "no retry" and the patch adds a retry loop).

Expected for v0.1: scope drift is caught; content drift is **not** caught, because the check only compares file lists. Content drift is measured anyway, so the gap has a baseline for a later version that checks decision content.

## Decision lines

1. **Rounds:** B needs clearly fewer rounds than A on the complex tasks: lower median on most tasks and higher on none.
2. **Ledger:** `plan-ledger check` catches the planted **scope** drift (every planted case).

If line 1 fails, the project is positioned as a decision ledger plus scope drift check only, and the README says so with the data. If line 2 fails, the check is fixed before anything else. Token results are published whatever they show; they are not a pass/fail line.

## Outputs

- `bench/results/*.jsonl`: one line per run, raw.
- `bench/README.md`: method, environment, versions, and how to rerun.
- Figures generated by a script from the raw files only.
