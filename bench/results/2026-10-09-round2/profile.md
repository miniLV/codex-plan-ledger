# Round 2 run profile (applied to both arms)

Goal: cut the fixed input that every model call carries, without changing what the
task needs (shell, file edits, Plan mode, `request_user_input`). The same
`codex app-server` arguments were used for all four runs.

On top of round 1's profile (all plugins, all MCP servers and memories off):

| Setting | Value |
| --- | --- |
| Skills | every installed skill disabled by name with `-c skills.config=[{name=…,enabled=false}, …]` (50 skills; `skills/list` reported 0 enabled) |
| `features.*` set to `false` | `multi_agent`, `apps`, `browser_use`, `browser_use_external`, `computer_use`, `image_generation`, `goals`, `tool_suggest`, `sleep_tool`, `skill_search`, `skill_mcp_dependency_install`, `view_image`, `plugins`, `remote_plugin` |
| `web_search` | `"disabled"` |
| Kept | shell / unified exec, file edits, Plan mode with `request_user_input`, hooks |

The user's own `config.toml` was not edited; everything is per-process `-c` overrides.
The names of the user's skills and plugins are left out of this repo on purpose.

## Baseline probe (`bench/probe.mjs`, one default-mode turn: "Reply with exactly: OK")

| Profile | input tokens of that one call |
| --- | --- |
| round 1 profile (plugins, MCP, memories off) | 53,457 |
| round 2 profile (above) | 8,555 |

The two probe calls used 62,022 tokens together.

Because the profile changed, round-2 token numbers are **not comparable** with round 1.
Compare arms only within a round.
