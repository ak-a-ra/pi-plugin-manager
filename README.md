# pi-plugin-manager

Pi extension that lets the AI manage Pi plugins through callable tools.

## What it does

Registers tools the AI model can call directly:

| Tool | Action |
|------|--------|
| `pi_plugin_list` | List installed Pi packages/extensions |
| `pi_plugin_install <source>` | Install from npm, git, or local path |
| `pi_plugin_remove <source>` | Remove a plugin |
| `pi_plugin_update [source]` | Update one plugin or all (`--extensions`) |
| `pi_plugin_enable <name>` | Enable a disabled extension |
| `pi_plugin_disable <name>` | Disable an extension |
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

The extension uses `pi.exec()` to run `pi list`, `pi install`, `pi remove`, `pi update` under the hood, returning their output to the AI. Enable/disable point the user at `/config` (the interactive resource configuration TUI), since plugin enable/disable is stored in settings and toggled there.

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