# Live check: Codex-native questions captured by the real Stop hook

One Plan-mode turn on 2026-10-09 (21:22 Asia/Shanghai), codex-cli 0.156.0 via `codex app-server`,
model `codex/gpt-6.1-sol` (medium), the lean round-2 profile (`bench/results/2026-10-09-round2/profile.md`),
non-ephemeral thread so a transcript exists. This is a functional check, not a measurement.

```sh
BENCH_ARGS="$(cat lean2-args.json)" SMOKE_PERSIST=1 \
SMOKE_PROMPT='Plan how to add support for greeting in other languages to hello.js. Two choices are open: which languages to support, and how the user selects the language. Ask me about those two before you write the plan. Keep the plan small.' \
node bench/smoke.mjs <scratch repo with hello.js + README.md> <out>
```

The prompt asks Codex to ask first, so that a `request_user_input` call is sure to happen.
The smoke script answers each question with its first option.

Result:

- Codex asked 2 questions in one `request_user_input` call; the script picked the recommended options.
- The Stop payload had `last_assistant_message: null` and a `transcript_path`; the real `plan-ledger hook-stop` read the plan and the Q&A from the transcript.
- Hook output: `plan-ledger: nothing to answer; 2 answered in Codex → …/plan.html`.
- [`decisions.json`](decisions.json): `n-languages` and `n-selection`, both `source: "codex-native"`, `status: "answered"`, `chosen: "a"`. The plan itself had no open decisions.
- Tokens for the whole turn: 42,990 total (42,497 input, 20,864 cached, 493 output, 0 reasoning). See [`summary.json`](summary.json).

The `request_user_input` call and its output are kept as a test fixture
(`test/fixtures/real/live-native.rollout.jsonl`, only those two lines), and `test/native.test.js`
replays the hook on it and checks the result equals this `decisions.json`.
