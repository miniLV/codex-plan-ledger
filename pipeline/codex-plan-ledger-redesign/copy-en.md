# Copy draft · English

Paste-ready. Plain sentences. Numbers match the repo benches.

---

## A. README.en.md

### Language bar

```markdown
[简体中文](./README.md) · [English](./README.en.md)
```

### Title and tagline

```markdown
# codex-plan-ledger

**A decision ledger for Codex `/plan`**

The questions Codex asked you, the open choices in the plan, and the defaults the plan stated are written to `decisions.json` in your repo so they diff and get reviewed in the PR. After coding, a scope drift check compares the changed files with the plan's scope.
```

### Links and install

```markdown
[Homepage](https://minilv.github.io/codex-plan-ledger/?lang=en) · [Skill](./skills/plan-ledger/SKILL.md) · [Schema](./schema/decisions.schema.json) · [Measurement plan](./docs/measurement-plan.md)

```sh
npm i -g github:miniLV/codex-plan-ledger && plan-ledger init --write
```

Codex CLI · Node.js 20+ · zero dependencies · no extra model calls · MIT
```

### Status callout

```markdown
> **Measured, in one line:** across n = 3 pairs, rounds did not improve (2 losses, 1 tie); scope drift (unplanned files, planned files left untouched) was caught 3/3; in-file contradictions of a decision were caught 0/3. See [Measured](#measured-two-rounds-directional-n--3-pairs).
>
> **Status: early prototype, v0.1.** It works and has tests. It does not replace Codex's native questions and does not aim to cut rounds. It keeps decisions as a record and checks scope after coding.
```

### What it is (lede)

```markdown
## What it is

Keep using Codex's native Plan mode and answer its questions in Codex. When the plan arrives, the `Stop` hook reads those Q&A from the session, writes them with the plan's open items and stated defaults to `docs/plans/<id>/decisions.json`, and renders one offline HTML page for review. The ledger ships in the same PR as the code; after implementation, run `plan-ledger check`.
```

(Keep the existing component table: hook-stop / plan.html / decisions.json / check / hook-prompt / skill. Do not rewrite into marketing copy.)

### Workflow lede

```markdown
## How it works

1. Run `/plan` as usual and answer Codex's own questions. When a `<proposed_plan>` appears, the Stop hook only parses, renders, and writes the ledger, then ends the turn. It never blocks and never waits.
2. Open `plan.html` to review. Answer remaining open items in one pass. Stated defaults are reviewable and do not count as open. Unanswered items are stored as "not answered; default kept", not as agreement.
3. Use "Build reply JSON and copy", then paste into your next Codex message. Optional `hook-prompt` records answers into the ledger.
4. After coding, run `plan-ledger check --base main`.

Rendering never calls a model. If `<proposed_plan>` parsing fails, the turn is left alone (exit 0).
```

### Scope drift · known limit

```markdown
## Scope drift check

`plan-ledger check` compares `git diff` with each decision's `affected` files and files named in the plan text. It reports files changed outside the plan, decisions whose files were never touched, and related cases (see the table in the repo README).

**Known limit: it only checks which files changed; it does not read code.** Unplanned edits and untouched planned files are in scope for v0.1. Code inside a planned file that contradicts a chosen decision is **not** caught. That is why it is called a scope drift check, not a decision-compliance check.
```

### Measured lede and conclusion

```markdown
## Measured (two rounds, directional, n = 3 pairs)

**This is not evidence of an effect.** Each pair is one native Plan run and one plan-ledger run on the same task, same model and settings, on vercel/ms@2.1.3. Round 2 used a leaner profile for both arms, so tokens are not comparable across rounds.

**Result:** plan-ledger did not win on rounds in any pair (2 losses, 1 tie). Total tokens went both ways. The idea of replacing native questions with one HTML pass is not supported by this data; the project is positioned as a decision ledger plus a scope drift check.

Scope drift check on the 3 plan-ledger runs (planted after implementation): clean tree 3/3 no false positive; unplanned new file 3/3 caught; planned files reverted 3/3 caught; contradicting code inside a planned file 0/3 caught, matching the known limit.

Raw data: [round 1](bench/results/2026-10-09-round1/summary.md) · [round 2](bench/results/2026-10-09-round2/summary.md)
```

### Status / thanks / license

```markdown
## Status

Early prototype v0.1. Only the directional runs above. It does not aim to save rounds. Next steps: [measurement plan](docs/measurement-plan.md).

## Thanks

Inspired in part by community work that renders plans as HTML. No code was copied from those projects.

## License

[MIT](LICENSE)
```

---

## B. Homepage sections (`docs/index.html`)

### Top bar

- Brand: `codex-plan-ledger`
- Anchors: How it works · Measured · GitHub
- Language: `中文` · `English` (current language as plain text)

### Hero (left-aligned, not a marketing center stack)

- Status: Early prototype · v0.1
- H1: A decision ledger for Codex `/plan`
- Lede: The questions Codex asked, the open choices, and the plan's stated defaults go into `decisions.json` so they diff in the PR. After coding, a scope drift check compares changed files with the plan.
- Measured line: Across n = 3 pairs, rounds did not improve; scope drift 3/3; in-file contradictions 0/3. [Details](#status)
- Install: `npm i -g github:miniLV/codex-plan-ledger && plan-ledger init --write`
- Buttons: Copy install · View on GitHub (secondary: Open demo)

### How it works (four steps)

1. Stop hook writes the ledger  
   Parse the plan, write `decisions.json` and offline HTML, end the turn.
2. Review on one page  
   Open, answered, and default items; copy reply JSON when done.
3. Decisions in the PR  
   Ledger reviewed next to the code.
4. Scope drift check  
   `plan-ledger check --base main` against changed files and plan scope.

### Decision page block

- Title: Every decision in one reviewable place
- Body: One card per decision: options, recommendation, default, affected files. Items answered in Codex are marked; plan defaults are reviewable and not counted as open. Unanswered means default kept, not agreement.
- Three bullets: plain templates, no model, offline; hook never waits; answers carried across plan revisions and marked as carried.

### Scope drift / limit

- Title: Scope drift check
- Body: Compares `git diff` with `affected`; reports unplanned files and untouched decisions.
- Callout: File lists only. Contradicting code inside a planned file is not caught in v0.1.

### Measured block

- Title: Status and measurements
- Note: Directional only, n = 3 pairs over two rounds. Not evidence of an effect. No pair won on rounds. The tool does not aim to cut rounds.
- Table: same numbers as the current site (1/2, 1/2, 1/1, token columns).
- Links: Round 1 · Round 2 · Measurement plan

### Footer

`github.com/miniLV/codex-plan-ledger` · MIT · Codex CLI · Node 20+ · zero dependencies

### Captions

- Decision screenshot: headless Chrome; synthetic fixture from the repo.
- Flow figure: schematic; no measured data.
- PR diff figure: example generated in-repo.
- Demo GIF/MP4: synthetic; if not on the first screen, place under Demo with the same label.

