<h1 align="center">Spaces</h1>

<h3 align="center">See what runs on every workspace.</h3>

<p align="center">
  <img src=".github/assets/film-apps.png" width="100%" alt="The Omarchy bar with Spaces: five workspaces, each showing the app icons open on it" />
</p>

Spaces is a workspace switcher for the [Omarchy](https://omarchy.org) bar. Each workspace shows the icons of the apps open on it. The active one slides open, and the focused window is highlighted. Ordinary Brave or Chromium windows show the current tab's favicon instead of the browser icon.

## Peek before you jump

Hover another workspace to see it live, laid out the way it is on screen. Click a window in the preview to jump to it.

Previews follow the monitor's orientation, including portrait displays, and shrink to fit the available screen space while keeping the full workspace visible. The size setting controls the longest side, so portrait and landscape previews have a comparable size.

<p align="center">
  <img src=".github/assets/film-preview.png" width="100%" alt="Hovering workspace 2 opens a live preview with omarchy.org and Neovim side by side" />
</p>

## Know when your agent needs you

Terminals running Claude Code get a gold chip on the app icon while the agent works, and a pulsing `!` when it needs your input. A workspace waiting on you pulses in the theme urgent colour. When the agent finishes, that workspace pulses in the theme accent until you open it. The Caps Lock LED and, on a Framework laptop, the power/fingerprint ring follow that pulse together: they blink while a waiting workspace is not on screen (same as the red pulse) and stay lit while a finished workspace is not (same as the accent pulse). Waiting wins. Opening that desk drops the pulse and the LEDs show whatever is left (same for Bambu and any other reporter). Idle means both off, so the fingerprint ring is dark unless something is alerting. Super+Caps Lock can jump to that desk (see [Using it](#using-it)). If a reporting process dies without sending `end`, the bar clears its live badge after the next process check, normally within a minute.

<p align="center">
  <img src=".github/assets/film-agent.png" width="100%" alt="A terminal icon on workspace 4 with an orange exclamation badge: the agent needs input" />
</p>

To turn it on, add these hooks to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/tornikegomareli.spaces/hooks/claude-hook working", "async": true }] }],
    "PostToolUse": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/tornikegomareli.spaces/hooks/claude-hook working", "async": true }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/tornikegomareli.spaces/hooks/claude-hook waiting", "async": true }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/tornikegomareli.spaces/hooks/claude-hook done", "async": true }] }],
    "SessionEnd": [{ "hooks": [{ "type": "command", "command": "~/.config/omarchy/plugins/tornikegomareli.spaces/hooks/claude-hook end", "async": true }] }]
  }
}
```

Other agents can report the same way: `omarchy-shell tornikegomareli.spaces agent <session> <working|waiting|done|end> <pids>`, where `<pids>` lists the agent's process and its parents, comma-separated.

### OpenCode

`hooks/opencode-plugin.js` is an OpenCode plugin that reports for you, so a terminal running OpenCode gets the same badge a Claude Code terminal gets. It reports through the `omarchy-shell` command above, so nothing else is needed.

To turn it on, link it into OpenCode's plugins folder:

```sh
mkdir -p ~/.config/opencode/plugins
ln -sfn ~/.config/omarchy/plugins/tornikegomareli.spaces/hooks/opencode-plugin.js \
        ~/.config/opencode/plugins/spaces.js
```

The link points into the installed plugin, so `omarchy plugin update tornikegomareli.spaces` updates the reporter too. Restart OpenCode, run a prompt, and the terminal icon shows a gold chip while it works. The workspace pulses in the theme accent when it stops, until you open that workspace.

`working` and `done` are reported as OpenCode works. `waiting` needs a permission prompt, so with `--auto` it rarely appears: OpenCode answers its own permission requests in milliseconds, and the plugin waits 1.5s before showing a `!` so a prompt answered instantly never flashes. To see it, run `opencode` without `--auto` and ask it to do something that needs approval.

### Cursor

`hooks/cursor-hook` reports Cursor CLI (and the Cursor IDE) the same way. Cursor runs hooks from a short-lived worker; the reporter puts `cursor-agent` first in the PID list so Spaces does not clear the gold chip when that worker exits. Mid-turn tool events re-assert `working` so a shell restart does not leave the chip off. `bin/spaces-cursor-notify` re-pushes live `working` / `waiting` ~0.4s after Spaces reloads (Foot titles, title-confirmed Approve toasts, and `last/`).

To turn it on, link it into Cursor's user hooks folder:

```sh
mkdir -p ~/.cursor/hooks
ln -sfn ~/.config/omarchy/plugins/tornikegomareli.spaces/hooks/cursor-hook \
        ~/.cursor/hooks/spaces-agent.sh
```

Then add it to `~/.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [{ "command": "./hooks/spaces-agent.sh" }],
    "preToolUse": [{ "command": "./hooks/spaces-agent.sh" }],
    "beforeShellExecution": [{ "command": "./hooks/spaces-agent.sh" }],
    "beforeMCPExecution": [{ "command": "./hooks/spaces-agent.sh" }],
    "subagentStop": [{ "command": "./hooks/spaces-agent.sh" }],
    "stop": [{ "command": "./hooks/spaces-agent.sh" }],
    "sessionEnd": [{ "command": "./hooks/spaces-agent.sh" }]
  }
}
```

A gold chip shows while the agent works; a pulsing `!` shows when Cursor is waiting for approval (`Waiting for confirmation` / `Waiting for you` in the Foot title). Approve toasts are ignored unless that title is already up: Cursor also sends `Approve command: …` for a hook that auto-allows, with no TUI card. The vague `Cursor is waiting for you` and `Cursor needs your input` toasts are ignored: the first is also sent when a turn finishes, the second while an unfocused agent is still working. The first-run “allow tools” card uses the title and often no toast.

### Pi

`hooks/pi-extension.ts` is a Pi extension that reports the same way for Foot windows with app-id `org.omarchy.agent.pi`. It listens to `agent_start` / `tool_call` (`working`), `agent_settled` (`done`), and `session_shutdown` (`end`). It also listens to `extension_ui_request` to show `waiting` when a tool asks for confirmation.

To turn it on, link it into Pi’s extensions folder and list it in settings:

```sh
mkdir -p ~/.pi/agent/extensions
ln -sfn ~/.config/omarchy/plugins/tornikegomareli.spaces/hooks/pi-extension.ts \
        ~/.pi/agent/extensions/spaces.ts
```

In `~/.pi/agent/settings.json`:

```json
{
  "extensions": [
    "~/.pi/agent/extensions/window-title.ts",
    "~/.pi/agent/extensions/spaces.ts"
  ]
}
```

Restart each Pi session (or `/reload`), run a prompt, and the terminal icon shows a gold chip while it works. The workspace pulses in the theme accent when the turn settles, until you open that workspace.

## Install

```sh
omarchy plugin add https://github.com/tornikegomareli/omarchy-spaces.git --enable
omarchy plugin disable omarchy.workspaces   # optional: replace the built-in switcher
```

Requirements:

- Omarchy 4 with the Quickshell bar (Hyprland 0.56 or newer)
- `jq` for the agent hook (installed with Omarchy)
- Claude Code, OpenCode, Cursor, or Pi, only for agent status

Works with the bar on any edge of the screen. Tested on a single monitor.

To update, then load the new code:

```sh
omarchy plugin update tornikegomareli.spaces
omarchy restart shell
```

## Remove

```sh
omarchy plugin remove tornikegomareli.spaces
omarchy plugin enable omarchy.workspaces   # bring back the built-in switcher
```

If you added the agent hooks, the settings key, or the workspace jump keys below, delete those lines from `~/.claude/settings.json`, `~/.cursor/hooks.json`, `~/.pi/agent/settings.json`, and `~/.config/hypr/bindings.lua`. If you linked the OpenCode, Cursor, or Pi reporter, remove the link:

```sh
rm ~/.config/opencode/plugins/spaces.js
rm ~/.cursor/hooks/spaces-agent.sh
rm ~/.pi/agent/extensions/spaces.ts
```

## Using it

- Click a workspace to go there. Click an icon to focus that window.
- Scroll over the widget to move between workspaces.
- Hover an icon to see the window title.
- Hover another workspace to preview it. Click a window in the preview to focus it.
- Right-click the widget to open settings. An optional gear can be enabled under Appearance → Settings button; it stays in a fixed slot before the workspaces.

## Settings

<img src=".github/assets/settings.png" width="330" align="right" alt="Spaces settings panel" />

Settings are organised into App icons, Windows, Appearance, Workspaces, Previews, and Behaviour. Each section fits its controls without an internal scroll area, and changes apply automatically and are saved to `~/.config/omarchy/shell.json`.

Use Tab / Shift+Tab to move through controls and Enter / Space to activate them. On sliders, use Left / Right to adjust by one, or Home / End for the minimum or maximum. Reset to defaults asks for confirmation before resetting all sections.

Super+= opens the first regular workspace with no windows (the scratchpad does not count). Super+Left and Super+Right jump to the nearest workspace that already has a window. If there is none in that direction, nothing happens. On Omarchy these keys used to resize or focus a window, so unbind them first. Add this to `~/.config/hypr/bindings.lua`:

```lua
hl.unbind("SUPER + code:21")
o.bind("SUPER + code:21", "First empty workspace", hl.dsp.focus({ workspace = "empty" }))

hl.unbind("SUPER + LEFT")
hl.unbind("SUPER + RIGHT")
local spaces = os.getenv("HOME") .. "/.config/omarchy/plugins/tornikegomareli.spaces/bin/hypr-workspace-occupied"
o.bind("SUPER + LEFT", "Previous workspace with a window", spaces .. " left")
o.bind("SUPER + RIGHT", "Next workspace with a window", spaces .. " right")
```

`code:21` is the = key, without Shift. The left and right jumps need `jq`.

To jump to the desk the Caps Lock LED is signalling, bind Super+Caps Lock. It uses the same filter as the LEDs: unseen `waiting` first, then unseen `done`. The smallest numbered workspace wins; the scratchpad only if nothing else is alerting. If the LEDs are off, the bind does nothing.

On Omarchy, Caps is Compose (`compose:caps`), so the key often arrives as `Multi_key`. Bind both keysyms:

```lua
o.bind("SUPER + Caps_Lock", "Spaces LED alert", "omarchy-shell tornikegomareli.spaces focusAlert")
o.bind("SUPER + Multi_key", "Spaces LED alert", "omarchy-shell tornikegomareli.spaces focusAlert")
```

To open settings with a key, add this to `~/.config/hypr/bindings.lua`:

```lua
o.bind("SUPER + CTRL + ALT + S", "Spaces settings", "omarchy-shell tornikegomareli.spaces toggle")
```

To preview a workspace from a key or script, without hovering:

```sh
omarchy-shell tornikegomareli.spaces peek 3
```

Settings can also be set from a script:

```sh
omarchy bar set tornikegomareli.spaces showApps all
```

<br clear="right" />

## Development

From a clone of this repository, link it into Omarchy and run the tests:

```sh
ln -sfn "$PWD" ~/.config/omarchy/plugins/tornikegomareli.spaces
omarchy plugin enable tornikegomareli.spaces
node tests/model.test.js
python3 favicons.py --self-test
node tests/opencode-plugin.test.js
bash tests/settings.sh
# Optional: opens a temporary Wayland window to test the settings gear
bash tests/gear.sh
```

After code changes, run `omarchy restart shell`.

## License

[MIT License](LICENSE).
