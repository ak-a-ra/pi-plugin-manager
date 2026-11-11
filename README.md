# pi-plugin-manager Blueprint

Pi extension that lets the AI manage Pi plugins through callable tools.

## System Overview

`pi-plugin-manager` is a single-file Pi extension (`index.ts`) registered through `package.json`'s `pi.extensions` entry. It exposes model-callable tools and an interactive `/plugin` slash command for listing, installing, removing, updating, enabling, and disabling Pi packages/extensions, plus updating Pi itself. CLI-backed operations delegate to the `pi` executable via `pi.exec()` and return its stdout/stderr to the caller. `pi_plugin_enable`/`pi_plugin_disable` toggle `settings.json` directly; `/plugin enable`/`/plugin disable` still direct the user to `/config` for interactive management.

Package metadata: name `pi-plugin-manager`, version `1.0.0`, license `MIT`, entry point `index.ts`, peer dependencies `@earendil-works/pi-coding-agent` and `typebox`.

## Local Interface & Invariants

Direct source file: `index.ts`.

Symbols:

- `ListPluginsInput`, `InstallPluginInput`, `RemovePluginInput`, `EnablePluginInput`, `DisablePluginInput`, `UpdatePluginInput`: Typebox object schemas for tool parameters.
- `ListPluginsInput`, `InstallPluginInput`, `RemovePluginInput`, `EnablePluginInput`, `DisablePluginInput`, `UpdatePluginInput` (types): inferred static parameter types.
- `pluginOutput(result: ExecResult): string`: returns trimmed `stdout`, falling back to trimmed `stderr`, then `"(no output)"`.
- `runPiCommand(pi: ExtensionAPI, args: string[], cwd: string): Promise<ExecResult>`: runs `pi.exec("pi", args, { cwd })`.
- Default export `function (pi: ExtensionAPI)`: registers tools and the `/plugin` command.
- Registered tools: `pi_plugin_list`, `pi_plugin_install`, `pi_plugin_remove`, `pi_plugin_update`, `pi_plugin_enable`, `pi_plugin_disable`, `pi_self_update`.
- Registered command: `plugin` with subcommands `list`, `install`, `remove`, `update`, `enable`, `disable`.

Invariants:

- CLI-backed tools execute with `ctx.cwd` as the working directory.
- `pi_plugin_install`, `pi_plugin_remove`, and `pi_plugin_update` append `-l` only when `local` is true.
- `pi_plugin_update` updates all extensions (`--extensions`) when `source` is omitted; when `source` is supplied it updates only that source.
- The `/plugin update` command always includes `--extensions` and inserts an optional source before it.
- `pi_plugin_enable` and `pi_plugin_disable` read-modify-write `settings.json`; they flip the leading `-` disable marker on the matching `settings.extensions` entry.
- CLI-backed tool results set `isError` to true exactly when the underlying `pi` process exits non-zero.
- `pi_plugin_enable` and `pi_plugin_disable` set `isError` to true when the requested extension is not found in settings.
- Matching strips an optional leading `-`/`+` from each entry, then tests whether the remainder contains the user-supplied `name` (substring match).
- The `/plugin` handler splits arguments on whitespace and removes empty entries.
- `plugin` subcommands map to the corresponding `pi` CLI operations, except `enable` and `disable`, which notify the user to use `/config`.

Side effects:

- Registers extension tools and a slash command with the Pi host.
- Spawns the external `pi` CLI for list, install, remove, and update operations.
- Writes `settings.json` via read-modify-write during enable/disable to flip the extension's disabled marker; all other settings keys are preserved.
- Global scope: `PI_CODING_AGENT_DIR ?? ~/.pi/agent` + `/settings.json`. Project scope: `ctx.cwd` + `/.pi/settings.json` (selected with `local: true`).
- Emits UI notifications through `ctx.ui.notify` in the `/plugin` command handler.
- Returns tool results to the model; does not write repository or user files directly.

## Subdirectories & System Boundaries

- (none) This repository has no code-bearing subdirectories; it is a single-file extension.

## Global Invariants

- The extension is loaded from `./index.ts` by Pi's extension loader.
- All package-management operations are delegated to the Pi CLI rather than reimplemented.
- Plugin enable/disable state remains owned by Pi settings and is changed by this extension's tools via `settings.json` read-modify-write.

## Global Side Effects

- Depends on the `pi` executable being available on `PATH`.
- Uses the Pi host APIs `pi.exec`, `pi.registerTool`, `pi.registerCommand`, and `ctx.getSettings`.

## System Verification

- Run: `<test-command>`
- Note: `package.json` has no `test` script and no automated tests are present.

## What it does

Registers tools the AI model can call directly:

| Tool | Action |
|------|--------|
| `pi_plugin_list` | List installed Pi packages/extensions |
| `pi_plugin_install <source>` | Install from npm, git, or local path |
| `pi_plugin_remove <source>` | Remove a plugin |
| `pi_plugin_update [source]` | Update one plugin or all (`--extensions`) |
| `pi_plugin_enable <name>` | Enable a disabled extension (writes `settings.json`) |
| `pi_plugin_disable <name>` | Disable an extension (writes `settings.json`) |
| `pi_self_update` | Update Pi itself |

Plus an interactive `/plugin` slash command:

```
/plugin list
/plugin install npm:@foo/bar
/plugin remove npm:@foo/bar
/plugin update
/plugin enable <name>
/plugin disable <name>
```

## Install

```bash
# From local path
pi install ./pi-plugin-manager

# From npm (once published)
pi install npm:pi-plugin-manager

# One-shot test
pi -e ./index.ts --print "List plugins"
```

## How it works

The extension uses `pi.exec()` to run `pi list`, `pi install`, `pi remove`, `pi update` under the hood, returning their output to the AI. `pi_plugin_enable`/`pi_plugin_disable` toggle `settings.json` directly via read-modify-write, so the AI can complete enable/disable without manual steps. The `/plugin enable`/`/plugin disable` slash subcommands still point the user at `/config` (the interactive resource configuration TUI) for interactive management, since plugin enable/disable state is stored in settings.

Place `index.ts` in `~/.pi/agent/extensions/` for auto-load on every Pi start.

## Files

```
pi-plugin-manager/
├── index.ts      # Extension source (TypeScript, loaded by jiti)
├── package.json  # Package manifest with pi.extensions entry
└── README.md
```

## License

MIT
