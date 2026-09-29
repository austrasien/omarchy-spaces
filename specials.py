#!/usr/bin/env python3
"""Print the scratchpad workspace, or null when it has no windows."""
import json
import subprocess

NAME = "special:scratchpad"


def load(args):
    return json.loads(subprocess.check_output(args))


workspaces = load(["hyprctl", "workspaces", "-j"])
clients = load(["hyprctl", "clients", "-j"])
monitors = load(["hyprctl", "monitors", "-j"])

pad = next((workspace for workspace in workspaces if workspace.get("name") == NAME), None)
windows = []
for client in clients:
    workspace = client.get("workspace") or {}
    if workspace.get("name") != NAME:
        continue
    windows.append({
        "address": client.get("address") or "",
        "class": client.get("class") or "",
        "title": client.get("title") or "",
        "pid": client.get("pid") or 0,
        "floating": bool(client.get("floating")),
        "at": client.get("at"),
        "size": client.get("size"),
    })

# The numbered desk stays activeWorkspace. The scratchpad is on screen
# when a monitor's specialWorkspace is named special:scratchpad.
active = any(
    ((monitor.get("specialWorkspace") or {}).get("name") == NAME) for monitor in monitors
)

if pad is None or not isinstance(pad.get("id"), int) or pad["id"] >= 0 or not windows:
    print("null")
else:
    print(json.dumps({
        "id": pad["id"],
        "name": NAME,
        "active": active,
        "windows": windows,
    }))
