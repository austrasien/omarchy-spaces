# Changelog

## 1.3.9

- Cursor’s `Cursor is waiting for you` toast no longer lights the red
  pulse by itself. Cursor sends that text on `stop` (follow-up prompt)
  as well as on a real approval, which left a desk pulsing after both
  agents were idle. Waiting still comes from the Foot title
  (`Waiting for confirmation`) or a specific Approve toast.

## 1.3.8

- The Framework power/fingerprint ring follows the same alert as Caps
  Lock: blink for unseen `waiting`, stay lit for unseen `done`, off when
  nothing is signalling. Disabling Agent status restores the ring to the
  EC (`auto`). Super+Caps Lock is unchanged.

## 1.3.7

- Cursor gold chip survives an Omarchy shell restart. The hook re-asserts
  `working` on tool events without walking `/proc` again. `bin/spaces-cursor-notify`
  re-pushes live `working` / `waiting` ~0.4s after Spaces or the shell reloads.

## 1.3.6

- README documents the Super+Caps Lock bind (`focusAlert`): same filter as
  the Caps Lock LED, and both `Caps_Lock` and `Multi_key` because Caps is
  Compose on Omarchy.

## 1.3.5

- Caps Lock follows the pill pulses. It blinks while a `waiting` desk is
  not on screen (same as the red pulse) and stays lit while a `done` desk
  is not (same as the accent pulse). Waiting wins over done. Opening a
  desk drops that pulse, then the LED shows whatever is left.
- Cursor “allow tools” / confirmation: Spaces now reads the Foot title
  (`Waiting for confirmation`) instead of only matching a few toast
  titles. `preToolUse` no longer clears that badge while the card is up.
- Super+Caps Lock jumps to the smallest workspace the Caps Lock LED is
  signalling (`omarchy-shell tornikegomareli.spaces focusAlert`). Does
  nothing when the LED is off.

## 1.3.4

- Caps Lock LED blinks three times when an agent (or Bambu, etc.) first
  reports `waiting` or `done`. Repeats of the same state do not retrigger it.

## 1.3.3

- Ordinary Brave / Chromium windows show the current tab's site favicon
  instead of the browser icon. `--app` webapps still use their desktop file.

## 1.3.2

- Scratchpad pill 0 stays while Super+` is showing it, even if it has no
  windows, so an empty scratchpad is selected the same way as an empty desk.
- Chromium / Brave web-app icons match by URL path, so two Gmail accounts
  keep distinct desktop files instead of sharing the first `mail.google.com`
  icon.
- Cursor agent status: `hooks/cursor-hook` reports working / done the same
  way as Claude Code. It puts `cursor-agent` first in the PID list, so the
  gold chip survives Spaces' one-minute process check.

## 1.3.1

- Agent done pulses the theme accent instead of a fixed green. Waiting and
  window-urgent share the bar urgent colour; a transparent bar only raises
  the pulse opacity so both follow the theme.
- The occupied pill fill no longer sits on top of an urgent or done pulse.
- Pulse animation restarts when bar transparency (and therefore the opacity
  range) changes, so a colour edit cannot keep the previous pulse running.

## 1.3.0

- Super+= opens the lowest regular workspace with no windows. The scratchpad is not a candidate.
- Super+Left and Super+Right jump to the nearest workspace that already has a window, lower or higher than the current one. If none does, the current workspace stays put.

## 1.2.0

- Workspace 10 is labeled X. The scratchpad stays 0, so the two no longer share a digit.
- The scratchpad shows as pill 0 while it has windows.
- Agent status: a gold chip on the app icon while the agent works, no spinner.
  A workspace waiting on you still pulses red. When the agent finishes, that
  workspace pulses green until you open it.

## 1.1.0

- Settings are organised into six pages: App icons, Windows, Appearance,
  Workspaces, Previews, and Behaviour. They work from the keyboard, the
  focused title length can be set, and resetting asks first (#8, @tcballard)
- The settings gear is off by default. Right-click the widget to open
  settings, or turn the gear on under Appearance; it now sits in a fixed slot
  before the workspaces (#8)
- Agent status for OpenCode: link `hooks/opencode-plugin.js` into OpenCode and
  its terminals get the same badges as Claude Code. A permission prompt waits
  1.5s before showing `!`, so `--auto` never flashes (#4, @FarzadHayat)
- Agent status: a `working` or `waiting` badge left behind by a crashed agent
  clears within a minute (#3, @FarzadHayat)
- Previews fit portrait and rotated monitors (#6, @VulpesZerda27)
- Fixed: changing the animation speed, or turning animations off and on, hid
  every workspace pill until the shell restarted (#9, reported by @movshuri,
  fix by @Coding-Sparrow)

## 1.0.0

First stable release, ready for the Omarchy plugin marketplace.

- The plugin ID is now `tornikegomareli.spaces`, matching the repository owner.
  If you installed an earlier version, remove `insanearts.spaces`, add the plugin
  again, and update the hook paths in `~/.claude/settings.json`.
- README: screenshots from the product film, requirements, and update and
  removal instructions
- Marketplace preview image
- Verified with the bar on the top, bottom, left and right edges

## 0.3.0

- Agent status: terminals running Claude Code show a spinner while the agent
  works, a pulsing `!` when it needs input, and a check mark when it is done.
  Workspaces with a waiting agent pulse
- `hooks/claude-hook` reports agent state; see the README for setup
- Setting to turn agent status off

## 0.2.0

- Live workspace previews: hover another workspace to see a miniature of it,
  with each window where it really is. Click a window to jump to it
- The preview slides between workspaces as you move along the bar
- Hovering an app icon highlights its window in the preview
- `peek` command to open a preview from a keybinding:
  `omarchy-shell insanearts.spaces peek 3`
- Settings: turn previews on or off, preview size, live video or still frame
- Icons for apps with reverse-DNS ids, such as `dev.example.tool`
- Fix: workspaces could stay half faded after appearing

## 0.1.0

First release.

- Workspace pills that show the icons of the apps open on each workspace
- The active workspace slides open; the focused window is highlighted
- Click a workspace or an icon to focus it; scroll to switch workspaces
- Settings panel: when icons show, icon style and size, grouping by app,
  active style, labels, density, urgent highlights, tooltips, animations
- Icons for Chromium web apps and apps missing from the icon theme
