// Run: node tests/model.test.js
const fs = require("fs")
const path = require("path")
const assert = require("assert")

const src = fs.readFileSync(path.join(__dirname, "..", "Model.js"), "utf8").replace(/^\.pragma library\s*/, "")
const mod = { exports: {} }
new Function("module", src)(mod)
const M = mod.exports

let failed = 0
function test(name, fn) {
  try { fn(); console.log("ok   " + name) } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message) }
}

test("resolveSettings fills defaults and clamps", () => {
  const s = M.resolveSettings({ iconSize: 99, showApps: "bogus", persistentWorkspaces: -3, groupApps: "yes" })
  assert.strictEqual(s.iconSize, 24)
  assert.strictEqual(s.showApps, "hover")
  assert.strictEqual(s.persistentWorkspaces, 0)
  assert.strictEqual(s.groupApps, false)
})

test("workspaceIds keeps persistent, adds occupied and active, sorted", () => {
  assert.deepStrictEqual(M.workspaceIds({ 7: 2, 2: 0 }, [9], 3, false), [1, 2, 3, 7, 9])
})

test("workspaceIds hideEmpty keeps only occupied and active", () => {
  assert.deepStrictEqual(M.workspaceIds({ 1: 0, 4: 1 }, [2], 5, true), [2, 4])
})

test("workspaceIds pins the scratchpad first only while it has windows", () => {
  assert.deepStrictEqual(M.workspaceIds({ "-98": 2, 4: 1 }, [], 6, true), [-98, 4])
  assert.deepStrictEqual(M.workspaceIds({ "-98": 0, 1: 1 }, [], 6, true), [1])
})

test("workspaceIds shows empty scratchpad when it is the active desk", () => {
  assert.deepStrictEqual(M.workspaceIds({ 1: 1 }, [-98], 6, true), [-98, 1])
})

test("parseActiveSpecial reads Hyprland activespecialv2", () => {
  assert.strictEqual(M.parseActiveSpecial("-98,special:scratchpad,eDP-1"), -98)
  assert.strictEqual(M.parseActiveSpecial("activespecialv2>>-98,special:scratchpad,eDP-1"), -98)
  assert.strictEqual(M.parseActiveSpecial("special:scratchpad,eDP-1"), "open")
  assert.strictEqual(M.parseActiveSpecial(",,eDP-1"), 0)
  assert.strictEqual(M.parseActiveSpecial("-99,special:magic,eDP-1"), null)
})

test("workspaceLabel", () => {
  assert.strictEqual(M.workspaceLabel(10, false, "number"), "X")
  assert.strictEqual(M.workspaceLabel(-98, false, "number"), "0")
  assert.strictEqual(M.workspaceLabel(3, true, "none"), "")
  assert.notStrictEqual(M.workspaceLabel(3, true, "glyph"), "3")
  assert.strictEqual(M.workspaceLabel(3, false, "glyph"), "3")
})

test("sortWindows orders by x then y, unknown last", () => {
  const w = [{ id: "a", at: [500, 0] }, { id: "b" }, { id: "c", at: [10, 300] }, { id: "d", at: [10, 5] }]
  assert.deepStrictEqual(M.sortWindows(w).map(x => x.id), ["d", "c", "a", "b"])
})

test("iconItems groups same app and keeps focused address", () => {
  const r = M.iconItems([
    { address: "1", appId: "foot", title: "a", focused: false },
    { address: "2", appId: "zen", title: "b", focused: false },
    { address: "3", appId: "Foot", title: "c", focused: true }
  ], true, 8)
  assert.strictEqual(r.items.length, 2)
  assert.strictEqual(r.items[0].count, 2)
  assert.strictEqual(r.items[0].address, "3")
  assert.strictEqual(r.items[0].focused, true)
})

test("iconItems leaves shell-hosted windows ungrouped", () => {
  const r = M.iconItems([
    { address: "1", appId: "org.quickshell", title: "Omamail", focused: false },
    { address: "2", appId: "org.quickshell", title: "Omarchy", focused: false }
  ], true, 8)
  assert.strictEqual(r.items.length, 2)
})

test("iconItems overflow never hides focused", () => {
  const ws = [1, 2, 3, 4, 5].map(i => ({ address: String(i), appId: "a" + i, title: "", focused: i === 5 }))
  const r = M.iconItems(ws, false, 3)
  assert.strictEqual(r.overflow, 2)
  assert.deepStrictEqual(r.items.map(i => i.address), ["1", "2", "5"])
})

test("focusedLabel uses app name for single window, title for many", () => {
  assert.strictEqual(M.focusedLabel({ focused: true, count: 1, title: "t" }, "Foot", 20), "Foot")
  assert.strictEqual(M.focusedLabel({ focused: true, count: 2, title: "long title here" }, "Foot", 6), "long …")
  assert.strictEqual(M.focusedLabel({ focused: false, count: 1 }, "Foot", 20), "")
})

test("isBrowserWindow is only ordinary browser windows", () => {
  assert.strictEqual(M.isBrowserWindow("brave-origin"), true)
  assert.strictEqual(M.isBrowserWindow("Brave-Origin"), true)
  assert.strictEqual(M.isBrowserWindow("brave-mail.google.com__mail_u_1_-Default"), false)
  assert.strictEqual(M.isBrowserWindow("foot"), false)
})

test("truncate keeps ASCII behaviour unchanged", () => {
  const legacy = (t, max) => t.length > max ? t.slice(0, Math.max(1, max - 1)) + "…" : t
  const maxes = [NaN, undefined]
  for (let max = -2; max <= 30; max++) maxes.push(max)
  for (const t of ["", "a", "foot", "long title here", "~/code/omarchy-spaces — nvim"])
    for (const max of maxes) assert.strictEqual(M.truncate(t, max), legacy(t, max), t + " @ " + max)
  assert.strictEqual(M.truncate("", -1), "…")
  assert.strictEqual(M.truncate(null, -1), "…")
  assert.strictEqual(M.truncate("abc", NaN), "abc")
  assert.strictEqual(M.truncate("abc", undefined), "abc")
})

test("truncate counts wide characters double", () => {
  assert.strictEqual(M.truncate("한국어", 8), "한국어")
  assert.strictEqual(M.truncate("터미널 설정 열기", 8), "터미널 …")
  assert.strictEqual(M.truncate("日本語のタイトル", 8), "日本語…")
  assert.strictEqual(M.truncate("Vim 설정 파일", 7), "Vim 설…")
  assert.strictEqual(M.truncate("☕".repeat(8), 8), "☕☕☕…")
  assert.strictEqual(M.truncate("\uFE50".repeat(8), 8), "\uFE50\uFE50\uFE50…")
  assert.strictEqual(M.truncate("\u2329abc", 4), "\u2329a…")
  assert.strictEqual(M.truncate("❤\uFE0F❤\uFE0Fab", 5), "❤\uFE0F❤\uFE0F…")
  assert.strictEqual(M.truncate("1\uFE0F\u20E3abcd", 5), "1\uFE0F\u20E3ab…")
  assert.strictEqual(M.truncate("❤\uFE0Fab", 4), "❤\uFE0Fab")
  // A wide first character that does not fit the budget leaves only the ellipsis.
  assert.strictEqual(M.truncate("한국", 1), "…")
})

test("truncate never splits an emoji or accented letter", () => {
  assert.strictEqual(M.truncate("👍🏽👍🏽👍🏽👍🏽👍🏽", 8), "👍🏽👍🏽👍🏽…")
  assert.strictEqual(M.truncate("ab👨‍👩‍👧‍👦cd", 5), "ab👨‍👩‍👧‍👦…")
  assert.strictEqual(M.truncate("🇰🇷🇯🇵🇺🇸", 5), "🇰🇷🇯🇵…")
  assert.strictEqual(M.truncate("🇰🇷🇯🇵🇺🇸", 6), "🇰🇷🇯🇵🇺🇸")
  assert.strictEqual(M.truncate("e\u0301e\u0301e\u0301e\u0301e\u0301", 4), "e\u0301e\u0301e\u0301…")
  assert.strictEqual(M.truncate("Cafe\u0301", 4), "Cafe\u0301")
  assert.strictEqual(M.truncate("aaaaaがxxxx", 8), "aaaaaが…")
  assert.strictEqual(M.truncate("aaaaaか\u3099xxxx", 8), "aaaaaか\u3099…")
  assert.strictEqual(M.truncate("葛\uDB40\uDD00葛\uDB40\uDD00葛", 5), "葛\uDB40\uDD00葛\uDB40\uDD00…")
})

test("webAppHost parses chromium app classes", () => {
  assert.strictEqual(M.webAppHost("chrome-web.whatsapp.com__-Default"), "web.whatsapp.com")
  assert.strictEqual(M.webAppHost("brave-app.hey.com__-Profile_1"), "app.hey.com")
  assert.strictEqual(M.webAppHost("chrome-x.com__home-Default"), "x.com")
  assert.strictEqual(M.webAppHost("foot"), "")
})

test("webAppHint keeps Gmail account path", () => {
  assert.deepStrictEqual(M.webAppHint("brave-mail.google.com__mail_u_1_-Default"), { host: "mail.google.com", path: "mail/u/1" })
  assert.deepStrictEqual(M.webAppHint("brave-mail.google.com__-Default"), { host: "mail.google.com", path: "" })
})

test("scoreWebAppExec prefers the longer Gmail path", () => {
  const hint = M.webAppHint("brave-mail.google.com__mail_u_1_-Default")
  const account = 'omarchy-launch-webapp "https://mail.google.com/mail/u/1/"'
  const perso = "omarchy-launch-webapp https://mail.google.com/"
  assert.ok(M.scoreWebAppExec(account, hint) > M.scoreWebAppExec(perso, hint))
  assert.strictEqual(M.scoreWebAppExec(perso, hint), -1)
  const persoHint = M.webAppHint("brave-mail.google.com__-Default")
  assert.ok(M.scoreWebAppExec(perso, persoHint) > M.scoreWebAppExec(account, persoHint))
})

test("bestWebAppExecIndex falls back to Meet host when room path mismatches", () => {
  const hint = M.webAppHint("brave-meet.google.com__nus-izau-cip-Default")
  const meetHome = 'omarchy-launch-webapp "https://meet.google.com/home?authuser=1&pageId=none"'
  const chat = "omarchy-launch-webapp https://chat.google.com/u/1/app/home"
  assert.strictEqual(M.scoreWebAppExec(meetHome, hint), -1)
  assert.strictEqual(M.bestWebAppExecIndex([chat, meetHome], hint), 1)
  const gmailHint = M.webAppHint("brave-mail.google.com__mail_u_1_-Default")
  const account = 'omarchy-launch-webapp "https://mail.google.com/mail/u/1/"'
  const perso = "omarchy-launch-webapp https://mail.google.com/"
  assert.strictEqual(M.bestWebAppExecIndex([perso, account], gmailHint), 1)
})

test("appIdCandidates includes desktop file id", () => {
  const c = M.appIdCandidates("brave-mail.google.com__mail_u_1_-Default")
  assert.ok(c.indexOf("brave-mail.google.com__mail_u_1_-Default.desktop") !== -1)
})

test("iconPathScore prefers svg then larger png", () => {
  assert.ok(M.iconPathScore("/a/scalable/apps/x.svg") > M.iconPathScore("/a/128x128/apps/x.png"))
  assert.ok(M.iconPathScore("/a/128x128/apps/x.png") > M.iconPathScore("/a/16x16/apps/x.png"))
  assert.strictEqual(M.iconNameFromPath("/a/b/zen-browser.png"), "zen-browser")
})

test("stepWorkspace wraps", () => {
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 5, 1), 1)
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 1, -1), 5)
  assert.strictEqual(M.stepWorkspace([1, 2, 5], 2, 1), 5)
})

test("mergedEntry keeps id first and applies delta", () => {
  assert.deepStrictEqual(M.mergedEntry("x.y", { id: "old", a: 1 }, { b: 2 }), { id: "x.y", a: 1, b: 2 })
})

test("showsApps respects master switch and modes", () => {
  const s = (o) => M.resolveSettings(o)
  assert.strictEqual(M.showsApps(s({ showIcons: false, showApps: "all" }), true, true, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "all" }), true, false, false), true)
  assert.strictEqual(M.showsApps(s({ showApps: "all" }), false, true, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "active" }), true, false, true), false)
  assert.strictEqual(M.showsApps(s({ showApps: "hover" }), true, false, true), true)
  assert.strictEqual(M.showsApps(s({ showApps: "hoverOnly" }), true, true, false), false)
  assert.strictEqual(M.showsApps(s({ showApps: "hoverOnly" }), true, false, true), true)
})

test("new settings validate", () => {
  const s = M.resolveSettings({ density: "huge", iconStyle: "mono", activeClick: "previous", settingsButton: "x" })
  assert.strictEqual(s.density, "normal")
  assert.strictEqual(s.iconStyle, "mono")
  assert.strictEqual(s.activeClick, "previous")
  assert.strictEqual(s.settingsButton, "never")
  assert.strictEqual(s.showIcons, true)
  assert.strictEqual(s.pillBackground, true)
  assert.strictEqual(M.resolveSettings({ pillBackground: false }).pillBackground, false)
})

test("normalizeAddress strips 0x and lowercases", () => {
  assert.strictEqual(M.normalizeAddress("0x624FAC"), "624fac")
  assert.strictEqual(M.normalizeAddress("624fac"), "624fac")
})

test("monitorArea removes reserved space in logical coords", () => {
  const a = M.monitorArea({ x: 0, y: 0, width: 3440, height: 1440, scale: 1.25, reserved: [0, 35, 0, 0] })
  assert.deepStrictEqual(a, { x: 0, y: 35, width: 2752, height: 1117 })
  assert.strictEqual(M.monitorArea(null), null)
})

test("previewLayout scales real positions and puts floating last", () => {
  const area = { x: 0, y: 0, width: 1000, height: 500 }
  const out = M.previewLayout([
    { address: "f", at: [100, 100], size: [200, 100], floating: true },
    { address: "a", at: [0, 0], size: [500, 500] },
    { address: "b", at: [500, 0], size: [500, 500] }
  ], area, 100, 50)
  assert.deepStrictEqual(out.map(p => p.address), ["a", "b", "f"])
  assert.deepStrictEqual(out[1], { address: "b", x: 50, y: 0, width: 50, height: 50, floating: false })
  assert.deepStrictEqual([out[2].x, out[2].y, out[2].width, out[2].height], [10, 10, 20, 10])
})

test("monitorArea handles every rotation before scale and logical reservations", () => {
  for (let transform = 0; transform < 8; transform++) {
    const area = M.monitorArea({ x: -1200, y: -400, width: 2560, height: 1440,
      scale: 1.25, transform, reserved: [10, 20, 30, 40] })
    assert.deepStrictEqual(area, { x: -1190, y: -380,
      width: (transform % 2 ? 1152 : 2048) - 40,
      height: (transform % 2 ? 2048 : 1152) - 60 })
  }
})

test("portrait preview keeps both stacked windows fully visible", () => {
  const area = M.monitorArea({ x: -1440, y: -480, width: 2560, height: 1440,
    transform: 1, scale: 1, reserved: [0, 0, 0, 26] })
  const size = M.previewDimensions(area, 380, 1000, 900)
  assert.strictEqual(size.height, 380)
  assert.ok(size.height > size.width)
  const windows = [
    { address: "top", at: [-1440, -480], size: [1440, 1267] },
    { address: "bottom", at: [-1440, 787], size: [1440, 1267] }
  ]
  const out = M.previewLayout(windows, area, size.width, size.height)
  assert.strictEqual(out[0].height, out[1].height)
  assert.strictEqual(out[1].y + out[1].height, size.height)
  assert.strictEqual(out[1].width, size.width)
})

test("previewDimensions fits portrait workspaces on short or narrow screens", () => {
  const area = { width: 1440, height: 2534 }
  for (const bounds of [[1000, 400], [200, 900]]) {
    const size = M.previewDimensions(area, 520, ...bounds)
    assert.ok(size.width <= bounds[0])
    assert.ok(size.height <= bounds[1])
    assert.ok(Math.abs(size.width / size.height - area.width / area.height) < 1e-10)
  }
  assert.deepStrictEqual(M.previewDimensions({ width: 1600, height: 900 }, 380, 1000, 900),
    { width: 380, height: 213.75 })
  assert.deepStrictEqual(M.previewDimensions(null, 380, 1000, 900),
    { width: 380, height: 213.75 })
})

test("preview size has the same longest side and area in either orientation", () => {
  for (const preset of ["small", "medium", "large"]) {
    const extent = M.previewWidth(preset)
    const landscape = M.previewDimensions({ width: 1600, height: 900 }, extent, 2000, 2000)
    const portrait = M.previewDimensions({ width: 900, height: 1600 }, extent, 2000, 2000)
    assert.strictEqual(portrait.height, landscape.width)
    assert.strictEqual(portrait.width, landscape.height)
  }
})

test("previewLayout clamps windows hanging off screen", () => {
  const out = M.previewLayout([{ address: "a", at: [-100, 0], size: [300, 100] }], { x: 0, y: 0, width: 1000, height: 1000 }, 100, 100)
  assert.deepStrictEqual([out[0].x, out[0].width], [0, 20])
})

test("previewLayout falls back to a grid without positions", () => {
  const out = M.previewLayout([{ address: "a" }, { address: "b" }, { address: "c" }], null, 100, 100)
  assert.strictEqual(out.length, 3)
  assert.strictEqual(out[0].x, 0)
  assert.ok(out[1].x > 0)
  assert.ok(out[2].y > 0)
})

test("preview settings validate", () => {
  const s = M.resolveSettings({ previewSize: "huge", previews: false })
  assert.strictEqual(s.previewSize, "medium")
  assert.strictEqual(s.previews, false)
  assert.strictEqual(s.previewLive, true)
  assert.strictEqual(M.previewWidth("large"), 520)
})

test("appIdCandidates adds the last reverse-DNS segment", () => {
  assert.deepStrictEqual(M.appIdCandidates("dev.tgomareli.logi-kvm-console"), [
    "dev.tgomareli.logi-kvm-console",
    "dev.tgomareli.logi-kvm-console.desktop",
    "logi-kvm-console"
  ])
  assert.deepStrictEqual(M.appIdCandidates("Slack"), ["Slack", "slack", "Slack.desktop", "slack.desktop"])
  assert.deepStrictEqual(M.appIdCandidates(""), [])
})

test("fallbackLetter prefers the readable tail of a reverse-DNS class", () => {
  // Without this every org.omarchy.* app shares the letter "O".
  assert.strictEqual(M.fallbackLetter("", "org.omarchy.herdr"), "H")
  assert.strictEqual(M.fallbackLetter("", "org.omarchy.agent"), "A")
  // A real desktop-entry name always wins.
  assert.strictEqual(M.fallbackLetter("Zen Browser", "zen"), "Z")
  // appId echoed back as the name is not a real name.
  assert.strictEqual(M.fallbackLetter("org.kde.dolphin", "org.kde.dolphin"), "D")
  assert.strictEqual(M.fallbackLetter("", "foot"), "F")
  assert.strictEqual(M.fallbackLetter("", ""), "")
  // A whole emoji or syllable, never half of a surrogate pair.
  assert.strictEqual(M.fallbackLetter("😀 Smile", "smile"), "😀")
  assert.strictEqual(M.fallbackLetter("👍🏽 Thumbs", "thumbs"), "👍🏽")
  assert.strictEqual(M.fallbackLetter("🇰🇷 Korea", "korea"), "🇰🇷")
  assert.strictEqual(M.fallbackLetter("한글 메모", "memo"), "한")
  assert.strictEqual(M.fallbackLetter("éclair", "eclair"), "É")
  assert.strictEqual(M.fallbackLetter("か\u3099", ""), "か\u3099")
  assert.strictEqual(M.fallbackLetter("が", ""), "が")
})

test("agentWindowStates picks the nearest window and the most urgent state", () => {
  const windows = [
    { address: "0x1", pid: 100 },
    { address: "0x2", pid: 200 },
    { address: "0x3", pid: 300 }
  ]
  const agents = {
    a: { state: "working", pids: [5, 6, 100, 200] },
    b: { state: "waiting", pids: [7, 100] },
    c: { state: "done", pids: [8, 300] },
    d: { state: "idle", pids: [9, 300] },
    e: { state: "working", pids: [10, 11] },
    f: { state: "working", pids: [12, 300] }
  }
  assert.deepStrictEqual(M.agentWindowStates(agents, windows), { "1": "waiting", "3": "done" })
})

test("agentWindowStates keeps a shared-PID badge in its pinned window", () => {
  const windows = [
    { address: "0xa", pid: 400 },
    { address: "0xb", pid: 400 },
    { address: "0xc", pid: 400 }
  ]
  // No pin: the PID is ambiguous, so every window with it is badged.
  assert.deepStrictEqual(
    M.agentWindowStates({ s: { state: "working", pids: [9, 400] } }, windows),
    { a: "working", b: "working", c: "working" })
  // Pinned: only the owning window, whatever the address spelling.
  assert.deepStrictEqual(
    M.agentWindowStates({ s: { state: "working", pids: [9, 400], address: "0xB" } }, windows),
    { b: "working" })
  // A pin to a gone window falls back to the ambiguous set.
  assert.deepStrictEqual(
    M.agentWindowStates({ s: { state: "working", pids: [9, 400], address: "0xdead" } }, windows),
    { a: "working", b: "working", c: "working" })
})

test("agentPinAddress pins an ambiguous PID to the focused window", () => {
  const windows = [
    { address: "0xa", pid: 400 },
    { address: "0xb", pid: 400 },
    { address: "0xc", pid: 500 }
  ]
  // Focused window owns the agent: pin it.
  assert.strictEqual(M.agentPinAddress([9, 400], windows, "0xb"), "b")
  // Focused window is not an owner: no pin (avoids badging the wrong window).
  assert.strictEqual(M.agentPinAddress([9, 400], windows, "0xc"), "")
  // A unique PID needs no focus.
  assert.strictEqual(M.agentPinAddress([9, 500], windows, "0xa"), "c")
  // No window in the chain.
  assert.strictEqual(M.agentPinAddress([9, 10], windows, "0xa"), "")
})

test("normalizeAgentState accepts only badge states", () => {
  assert.strictEqual(M.normalizeAgentState("waiting"), "waiting")
  assert.strictEqual(M.normalizeAgentState("end"), "")
  assert.strictEqual(M.normalizeAgentState("exploding"), "")
  assert.strictEqual(M.normalizeAgentState(undefined), "")
})

test("agentProcessIds collects one live process per active session", () => {
  const agents = {
    a: { state: "working", pids: [101, 1] },
    b: { state: "waiting", pids: [202, 101] },
    c: { state: "waiting", pids: [101, 303] },
    d: { state: "done", pids: [404, 1] },
    e: { state: "working", pids: ["nope", 1] }
  }
  assert.deepStrictEqual(M.agentProcessIds(agents), [101, 202])
})

test("pruneDeadAgents removes only dead live claims", () => {
  const agents = {
    live: { state: "working", pids: [101, 1] },
    dead: { state: "waiting", pids: [202, 1] },
    finished: { state: "done", pids: [303, 1] },
    malformed: { state: "working", pids: [] }
  }
  assert.deepStrictEqual(M.pruneDeadAgents(agents, [101]), {
    live: { state: "working", pids: [101, 1] },
    finished: { state: "done", pids: [303, 1] },
    malformed: { state: "working", pids: [] }
  })
  assert.strictEqual(M.pruneDeadAgents(agents, [101, 202]), agents)
})

test("parsePids drops junk and init", () => {
  assert.deepStrictEqual(M.parsePids("12,abc,1,,34"), [12, 34])
})

// Apps and web pages set their own window titles. Qt guesses rich text by
// default, so a title with markup could load remote images in the shell.
test("window titles render as plain text", () => {
  const qml = fs.readFileSync(path.join(__dirname, "..", "Spaces.qml"), "utf8")
  const blocks = []
  const re = /^\s*Text\s*\{/gm
  let m
  while ((m = re.exec(qml))) {
    let depth = 0, i = qml.indexOf("{", m.index)
    const start = i
    for (; i < qml.length; i++) {
      if (qml[i] === "{") depth++
      else if (qml[i] === "}" && --depth === 0) break
    }
    blocks.push(qml.slice(start, i + 1))
  }
  const titled = blocks.filter((b) => /^\s*text:.*title/im.test(b))
  assert.ok(titled.length >= 2, "expected the focused title and the preview footer")
  for (const b of titled) assert.match(b, /textFormat:\s*Text\.PlainText/, b.split("\n").find((l) => /text:/.test(l)).trim())
})

if (failed) { console.log(failed + " failed"); process.exit(1) }
