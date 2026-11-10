import { Type, type Static } from "typebox";
import type { ExtensionAPI, ExecResult } from "@earendil-works/pi-coding-agent";

const ListPluginsInput = Type.Object({});
const InstallPluginInput = Type.Object({
  source: Type.String({ description: "Package source: npm:@scope/pkg, git:github.com/user/repo, or local path" }),
  local: Type.Optional(Type.Boolean({ description: "Install to project settings instead of global", default: false })),
});
const RemovePluginInput = Type.Object({
  source: Type.String({ description: "Package source to remove" }),
  local: Type.Optional(Type.Boolean({ description: "Remove from project settings", default: false })),
});
const EnablePluginInput = Type.Object({
  name: Type.String({ description: "Plugin/extension name to enable" }),
  local: Type.Optional(Type.Boolean({ description: "Apply to project scope", default: false })),
});
const DisablePluginInput = Type.Object({
  name: Type.String({ description: "Plugin/extension name to disable" }),
  local: Type.Optional(Type.Boolean({ description: "Apply to project scope", default: false })),
});
const UpdatePluginInput = Type.Object({
  source: Type.Optional(Type.String({ description: "Specific package to update; omit to update all" })),
  local: Type.Optional(Type.Boolean({ description: "Use project scope", default: false })),
});

type ListPluginsInput = Static<typeof ListPluginsInput>;
type InstallPluginInput = Static<typeof InstallPluginInput>;
type RemovePluginInput = Static<typeof RemovePluginInput>;
type EnablePluginInput = Static<typeof EnablePluginInput>;
type DisablePluginInput = Static<typeof DisablePluginInput>;
type UpdatePluginInput = Static<typeof UpdatePluginInput>;

function pluginOutput(result: ExecResult): string {
  const out = result.stdout?.trim() ?? result.stderr?.trim() ?? "";
  return out || "(no output)";
}

async function runPiCommand(pi: ExtensionAPI, args: string[], cwd: string): Promise<ExecResult> {
  const result = await pi.exec("pi", args, { cwd });
  return result;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "pi_plugin_list",
    label: "List Pi Plugins",
    description: "List all installed Pi packages/extensions with their status",
    parameters: ListPluginsInput,
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const result = await runPiCommand(pi, ["list"], ctx.cwd);
      return {
        content: [{ type: "text", text: pluginOutput(result) }],
        details: { exitCode: result.code },
        isError: result.code !== 0,
      };
    },
  });

  pi.registerTool({
    name: "pi_plugin_install",
    label: "Install Pi Plugin",
    description: "Install a Pi package/extension from npm, git, or local path",
    parameters: InstallPluginInput,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const args = ["install", params.source];
      if (params.local) args.push("-l");
      const result = await runPiCommand(pi, args, ctx.cwd);
      return {
        content: [{ type: "text", text: pluginOutput(result) }],
        details: { exitCode: result.code },
        isError: result.code !== 0,
      };
    },
  });

  pi.registerTool({
    name: "pi_plugin_remove",
    label: "Remove Pi Plugin",
    description: "Remove a Pi package/extension",
    parameters: RemovePluginInput,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const args = ["remove", params.source];
      if (params.local) args.push("-l");
      const result = await runPiCommand(pi, args, ctx.cwd);
      return {
        content: [{ type: "text", text: pluginOutput(result) }],
        details: { exitCode: result.code },
        isError: result.code !== 0,
      };
    },
  });

  pi.registerTool({
    name: "pi_plugin_update",
    label: "Update Pi Plugins",
    description: "Update Pi packages/extensions or Pi itself",
    parameters: UpdatePluginInput,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const args = ["update"];
      if (params.source) {
        args.push(params.source);
      } else {
        args.push("--extensions");
      }
      if (params.local) args.push("-l");
      const result = await runPiCommand(pi, args, ctx.cwd);
      return {
        content: [{ type: "text", text: pluginOutput(result) }],
        details: { exitCode: result.code },
        isError: result.code !== 0,
      };
    },
  });

  pi.registerTool({
    name: "pi_plugin_enable",
    label: "Enable Pi Plugin",
    description: "Enable a disabled extension/plugin",
    parameters: EnablePluginInput,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const settings = ctx.getSettings();
      const scope = params.local ? "project" : "global";
      const extensions = settings.extensions ?? [];
      const idx = extensions.findIndex((e: string) => e.includes(params.name));
      if (idx === -1) {
        return { content: [{ type: "text", text: `Extension "${params.name}" not found in ${scope} settings` }], isError: true };
      }
      return { content: [{ type: "text", text: `Extension "${params.name}" found in ${scope}. Use /config to enable it interactively, or edit settings.json directly.` }] };
    },
  });

  pi.registerTool({
    name: "pi_plugin_disable",
    label: "Disable Pi Plugin",
    description: "Disable an extension/plugin",
    parameters: DisablePluginInput,
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const settings = ctx.getSettings();
      const scope = params.local ? "project" : "global";
      const extensions = settings.extensions ?? [];
      const idx = extensions.findIndex((e: string) => e.includes(params.name));
      if (idx === -1) {
        return { content: [{ type: "text", text: `Extension "${params.name}" not found in ${scope} settings` }], isError: true };
      }
      return { content: [{ type: "text", text: `Extension "${params.name}" found in ${scope}. Use /config to disable it interactively, or edit settings.json directly.` }] };
    },
  });

  pi.registerTool({
    name: "pi_self_update",
    label: "Update Pi",
    description: "Update Pi to the latest version",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const result = await runPiCommand(pi, ["update"], ctx.cwd);
      return {
        content: [{ type: "text", text: pluginOutput(result) }],
        details: { exitCode: result.code },
        isError: result.code !== 0,
      };
    },
  });

  // Capture pi for use in command handler
  const piApi = pi;

  pi.registerCommand("plugin", {
    description: "Manage Pi plugins: list, install, remove, update, enable, disable",
    handler: async (args, ctx) => {
      const [subcommand, ...rest] = args.split(/\s+/).filter(Boolean);
      
      if (!subcommand) {
        ctx.ui.notify("Usage: /plugin <list|install|remove|update|enable|disable> [args]", "warning");
        return;
      }

      const runCmd = async (cmdArgs: string[]) => {
        const result = await piApi.exec("pi", cmdArgs, { cwd: ctx.cwd });
        return result;
      };

      switch (subcommand) {
        case "list": {
          const result = await runCmd(["list"]);
          ctx.ui.notify(pluginOutput(result) || "No plugins installed", "info");
          break;
        }
        case "install": {
          if (!rest[0]) {
            ctx.ui.notify("Usage: /plugin install <source>", "warning");
            return;
          }
          const result = await runCmd(["install", rest[0]]);
          ctx.ui.notify(pluginOutput(result) || "Installed", result.code === 0 ? "info" : "error");
          break;
        }
        case "remove": {
          if (!rest[0]) {
            ctx.ui.notify("Usage: /plugin remove <source>", "warning");
            return;
          }
          const result = await runCmd(["remove", rest[0]]);
          ctx.ui.notify(pluginOutput(result) || "Removed", result.code === 0 ? "info" : "error");
          break;
        }
        case "update": {
          const cmdArgs = ["update", "--extensions"];
          if (rest[0]) cmdArgs.splice(1, 0, rest[0]);
          const result = await runCmd(cmdArgs);
          ctx.ui.notify(pluginOutput(result) || "Updated", result.code === 0 ? "info" : "error");
          break;
        }
        case "enable": {
          ctx.ui.notify("Use /config to enable/disable extensions interactively", "info");
          break;
        }
        case "disable": {
          ctx.ui.notify("Use /config to enable/disable extensions interactively", "info");
          break;
        }
        default:
          ctx.ui.notify(`Unknown subcommand: ${subcommand}`, "error");
      }
    },
  });
}