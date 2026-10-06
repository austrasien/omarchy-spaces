// Spaces agent reporter for Pi (https://github.com/earendil-works/pi).
//
// Tells the Spaces bar what this Pi session is doing, so a Foot window with
// app-id org.omarchy.agent.pi gets the same badge Cursor / OpenCode get.
//
//   working  the agent is running
//   done     the agent finished its turn (settled; no auto-continue left)
//   end      the session is gone
//
// Reports go through the same omarchy-shell entry point:
//
//   omarchy-shell tornikegomareli.spaces agent <session> <state> <pids>
//
// pids[0] is this Pi process (long-lived); a later pid is Foot so Spaces can
// match the Hyprland window. Writes last/ so spaces-cursor-notify can
// re-push working after a shell reload.
//
// Install (link into Pi's extensions folder, keep settings in sync):
//
//   ln -sfn ~/.config/omarchy/plugins/tornikegomareli.spaces/hooks/pi-extension.ts \
//           ~/.pi/agent/extensions/spaces.ts
//
// Then add "~/.pi/agent/extensions/spaces.ts" to the "extensions" array in
// ~/.pi/agent/settings.json (same style as window-title.ts). Restart Pi.

import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync, unlinkSync, readFileSync } from "node:fs"
import { basename, extname, join } from "node:path"
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent"

const PLUGIN_ID = "tornikegomareli.spaces"
const STATE_DIR = join(process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid?.() ?? 1000}`, "spaces-agent")
const LAST_DIR = join(STATE_DIR, "last")

function parentPid(pid: number): number {
	try {
		const stat = readFileSync(`/proc/${pid}/stat`, "utf8")
		const rest = stat.slice(stat.lastIndexOf(")") + 1).trim()
		return Number(rest.split(" ")[1]) || 0
	} catch {
		return 0
	}
}

function pidChain(pid = process.pid): number[] {
	const chain: number[] = []
	let current = pid
	while (current > 1) {
		chain.push(current)
		const next = parentPid(current)
		if (!next || next === current) break
		current = next
	}
	return chain
}

function safeId(id: string): string {
	const cleaned = String(id || "").replace(/[^A-Za-z0-9._-]/g, "_")
	return cleaned || "unknown"
}

function sessionId(ctx?: ExtensionContext): string {
	try {
		const file = ctx?.sessionManager?.getSessionFile?.()
		if (file) {
			const base = basename(file, extname(file))
			if (base) return base
		}
	} catch {
		/* ignore */
	}
	return `pi-${process.pid}`
}

function remember(id: string, state: string, pids: number[]): void {
	try {
		mkdirSync(LAST_DIR, { recursive: true })
		writeFileSync(join(LAST_DIR, safeId(id)), `${state} ${pids.join(",")}\n`, "utf8")
	} catch {
		/* ignore */
	}
}

function forget(id: string): void {
	try {
		unlinkSync(join(LAST_DIR, safeId(id)))
	} catch {
		/* ignore */
	}
}

function send(session: string, state: string, pids: number[]): void {
	if (!session || !state || !pids.length) return
	remember(session, state, pids)
	try {
		const child = spawn(
			"omarchy-shell",
			[PLUGIN_ID, "agent", session, state, pids.join(",")],
			{ detached: true, stdio: "ignore" },
		)
		child.on("error", () => {})
		child.unref()
	} catch {
		/* ignore */
	}
}

function sendSync(session: string, state: string, pids: number[]): void {
	if (!session || !state || !pids.length) return
	remember(session, state, pids)
	try {
		spawnSync("omarchy-shell", [PLUGIN_ID, "agent", session, state, pids.join(",")], {
			stdio: "ignore",
		})
	} catch {
		/* ignore */
	}
}

export default function (pi: ExtensionAPI) {
	const pids = pidChain()
	let currentSession = `pi-${process.pid}`

	function report(state: string, ctx?: ExtensionContext): void {
		currentSession = sessionId(ctx)
		send(currentSession, state, pids)
	}

	pi.on("session_start", (_event, ctx) => {
		currentSession = sessionId(ctx)
	})

	pi.on("agent_start", (_event, ctx) => {
		report("working", ctx)
	})

	// Mid-turn re-assert: Spaces is in-memory; a shell restart drops the chip.
	pi.on("tool_call", (_event, ctx) => {
		report("working", ctx)
	})

	// If an extension asks the user for confirmation mid-turn, report waiting
	pi.on("extension_ui_request", (event, ctx) => {
		if (["confirm", "select", "input", "editor"].includes(event.method)) {
			report("waiting", ctx)
		}
	})

	// When the UI interaction finishes, go back to working
	pi.on("extension_ui_response", (_event, ctx) => {
		report("working", ctx)
	})

	// agent_end can fire before retries / compaction / queued follow-ups.
	// agent_settled is the real "your turn" boundary (same as notify.ts).
	pi.on("agent_settled", (_event, ctx) => {
		report("done", ctx)
	})

	pi.on("session_shutdown", (_event, ctx) => {
		const id = sessionId(ctx)
		send(id, "end", pids)
		forget(id)
	})

	process.once("exit", () => {
		sendSync(currentSession, "end", pids)
		forget(currentSession)
	})
}
