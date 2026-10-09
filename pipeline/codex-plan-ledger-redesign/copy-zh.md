# 文案草稿 · 简体中文

可直接粘贴。语气：平实、短句。数字与仓库实测一致。

---

## A. README.md

### 顶栏

```markdown
[简体中文](./README.md) · [English](./README.en.md)
```

### 标题与标语

```markdown
# codex-plan-ledger

**Codex `/plan` 的决策账本**

把 Codex 问过的问题、计划里未定的选项、计划写明的默认做法，写入仓库里的 `decisions.json`，能在 PR 里 diff 和 review。代码写完后，用范围偏离检查对照改动文件和计划范围。
```

### 链接与安装

```markdown
[主页](https://minilv.github.io/codex-plan-ledger/) · [Skill](./skills/plan-ledger/SKILL.md) · [Schema](./schema/decisions.schema.json) · [实测计划](./docs/measurement-plan.md)

```sh
npm i -g github:miniLV/codex-plan-ledger && plan-ledger init --write
```

Codex CLI · Node.js 20+ · 零依赖 · 不额外调用模型 · MIT
```

### 状态引用块

```markdown
> **实测一句话：** 在 n = 3 对任务里，轮数没有变少（输 2、平 1）；范围偏离（计划外文件、该改未改）3/3 抓到；文件内与决策相反的改动 0/3 抓到。详见 [实测](#实测两轮方向性共-n--3-对)。
>
> **状态：早期原型 v0.1。** 功能可用，有测试。它不替代 Codex 的原生提问，也不以减少轮次为目标；它把决策留成记录，并在写完代码后查范围。
```

### 它是什么（表头说明可保留现有四行组件表，导语改为）

```markdown
## 它是什么

Codex 原生 Plan 模式照常用，提问仍在 Codex 里答。计划出来后，`Stop` hook 从会话里读出这些问答，连同计划里的待定项和默认项，写入 `docs/plans/<id>/decisions.json`，并生成一页离线 HTML 供复核。账本和代码进同一个 PR；实现结束后跑 `plan-ledger check`。
```

（下方组件表：hook-stop / plan.html / decisions.json / check / hook-prompt / skill —— 技术描述可沿用仓库现文，勿改成营销句。）

### 工作流程导语

```markdown
## 工作流程

1. 在 Codex 里照常 `/plan` 并回答原生问题。出现 `<proposed_plan>` 时，Stop hook 只做解析、渲染、写账本，然后正常结束；从不阻塞、从不等待。
2. 打开 `plan.html` 复核。待定项一次答完；计划写明的默认标为可复核，不算待答。未选的项记为「未作答，保留默认」，不算同意。
3. 点「生成回传并复制」，粘到 Codex 下一条消息。可选的 `hook-prompt` 会把答案记进账本。
4. 代码写完后执行 `plan-ledger check --base main`。

渲染不调用模型。`<proposed_plan>` 解析失败时原样放行，退出码 0。
```

### 范围偏离检查 · 已知局限

```markdown
## 范围偏离检查

`plan-ledger check` 用 `git diff` 对照各决策的 `affected` 与计划正文提到的文件，报出：计划外被改的文件、该改却未碰的决策等（详见上表）。

**已知局限：只检查改了哪些文件，不读代码内容。** 计划外改动、计划内文件未被碰，能抓到；若改动落在计划内文件里，但实现与某项决策相反，**抓不到**。所以叫「范围偏离检查」，不叫决策合规检查。
```

### 实测导语与结论（表格数字照抄仓库，此处为段落）

```markdown
## 实测（两轮，方向性，共 n = 3 对）

**这不是效果证据。** 每对是同一任务上原生 Plan 与 plan-ledger 各 1 次，同一模型与设置。任务在 vercel/ms@2.1.3。第 2 轮换了更省的运行配置（两组相同），两轮 token 不能跨轮比较。

**结论：** 轮数上 plan-ledger 一对都没有赢（输 2、平 1）。总 token 有高有低，没有一致方向。一页答完替代原生提问这一设想，数据不支持；定位改为决策账本 + 范围偏离检查。

范围偏离检查（3 次 plan-ledger 运行，实现后埋入）：干净树无误报 3/3；计划外新文件 3/3 抓到；该改未改 3/3 抓到；在计划内文件写与决策相反的代码 0/3 抓到，与已知局限一致。

原始数据：[第 1 轮](bench/results/2026-10-09-round1/summary.md) · [第 2 轮](bench/results/2026-10-09-round2/summary.md)
```

### 状态 / 致谢 / 许可

```markdown
## 状态

早期原型 v0.1。只有上述方向性实测。不以省轮次为目标。下一步见 [实测计划](docs/measurement-plan.md)。

## 致谢

思路上参考过社区里把计划渲染成 HTML 的做法；本仓库未复制其代码。

## 许可

[MIT](LICENSE)
```

---

## B. 官网 `docs/index.html` 各区块

### 顶栏

- 品牌：`codex-plan-ledger`
- 锚点：用法 · 实测 · GitHub
- 语言：`中文` · `English`（当前页为中文时「中文」为纯文本）

### 首屏

- 状态条：早期原型 · v0.1
- 标语（h1）：Codex `/plan` 的决策账本
- 副标题：把 Codex 问过的问题、未定选项和计划默认写入 `decisions.json`，可在 PR 里 diff；写完代码后再做范围偏离检查。
- 实测一行：n = 3 对里，轮数没有变少；范围偏离 3/3 抓到；文件内矛盾 0/3 抓到。[详情](#status)
- 安装命令：`npm i -g github:miniLV/codex-plan-ledger && plan-ledger init --write`
- 按钮文案：复制安装命令 · 看 GitHub（次要：打开演示）

### 怎么用（四步标题）

1. Stop hook 写入账本  
   计划到达时解析并写 `decisions.json` 与离线 HTML，本轮正常结束。
2. 一页复核  
   待定、已答、默认分开展示；改完后复制回传 JSON。
3. 决策进 PR  
   账本与代码同一 PR review。
4. 范围偏离检查  
   `plan-ledger check --base main` 对照改动文件与计划范围。

### 决策页区块

- 标题：决策放在一页里复核
- 正文：每项一张卡片：选项、推荐、默认、影响的文件。Codex 里已答的会标出；计划默认可改但不算待答。未答记为保留默认，不算同意。
- 三条：纯模板、不调用模型、不联网；hook 不等待；计划改版时沿用旧答并标明。

### 范围偏离 / 局限

- 标题：范围偏离检查
- 正文：对照 `git diff` 与 `affected`，报计划外文件与未碰决策。
- 灰框：只比对文件，不读计划内文件的代码内容。文件内与决策相反的实现，当前抓不到。

### 实测区块

- 标题：现状与实测
- 注意框：方向性数据，两轮共 n = 3 对，不是效果证据。轮数上一对都没赢。不以省轮次为目标。
- 表头：轮/任务 · 定稿前轮数（原生 / plan-ledger）· 计划阶段 input · 总 token · 验收  
  行数据与现行官网表一致（1/2、1/2、1/1 等）。
- 链：第 1 轮 · 第 2 轮 · 实测计划

### 页脚

`github.com/miniLV/codex-plan-ledger` · MIT · Codex CLI · Node 20+ · 零依赖

### 图注（统一口径）

- 决策页图：无头 Chrome 截取；内容来自仓库合成样例 fixture。
- 流程图：流程示意，不含测量数据。
- PR diff 图：示例，仓库脚本生成。
- 演示 GIF/MP4：合成示例；若首屏不放，可放到「演示」小节并同样标注。

