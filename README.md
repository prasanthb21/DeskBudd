<div align="center">

<img src="icon.png" width="96" height="96" alt="DeskBudd icon" />

# DeskBudd

**A tiny hero that walks over when you tune out.**

An animated desktop character that lives on your screen, reacts with real
expressions, and nudges you to drink water, take standup breaks, run focus
sessions, and catch reminders — on whichever monitor you're actually looking at.

[![License: MIT](https://img.shields.io/badge/license-MIT-5aa2ff.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-5aa2ff.svg)](#download)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-5aa2ff.svg)](https://www.electronjs.org/)

[**⬇ Download for Windows**](../../releases/latest) · [Features](#features) · [Run from source](#run-from-source)

<img src="docs/screenshot-idle.png" width="240" alt="DeskBudd idling on the desktop" />

</div>

---

## Download

**[Download the latest release →](../../releases/latest)**

1. Grab `DeskBudd-<version>-win.zip` from the link above
2. Unzip it anywhere
3. Run `DeskBudd.exe` — no installer, no admin rights, nothing to configure first

It's a portable app: no accounts, no sign-up, nothing phones home. Delete the
folder to uninstall.

## Features

<img src="docs/screenshot.png" width="240" align="right" alt="Character picker on first launch" />

**Character & delivery**
- Five original characters — Nightfall, Webrunner, Titan, Valkyra, Buddy Jr —
  pick one on first launch and rename them whatever you like
- When a message arrives, your buddy **walks in**, does an **attention-grab
  jump + ping** (like someone knocking), then speaks — it doesn't just
  silently pop up
- **Emotion-aware face + posture** — calm for water breaks, excited for
  standup nudges, and friendly/urgent/excited/calm selectable per custom
  reminder
- **Multi-monitor aware** — relocates to whichever display currently has your
  mouse cursor before every message

**Productivity**
- Water and standup timers with an active-hours window (e.g. only 9am–6pm
  weekdays)
- Custom reminders: label + time + emotion
- **Focus sessions** (Pomodoro-style: 10/25/50 min) from the tray, with a
  countdown badge and quiet reminders while you're heads-down
- **Idle-aware "welcome back"** when you step away and return
- **Daily summary** of what you handled that day, at a time you set

**Engagement**
- Mood (0–100) that drifts down over time, boosted by acknowledging reminders
  or feeding your buddy a treat (🍪, capped per day)
- Streak tracking for consecutive days with at least one acknowledged reminder

**Customization**
- Size (small/medium/large), always-on-top toggle, reduce-motion for anyone
  who'd rather it just snap into place

<br clear="right"/>

## Run from source

```bash
git clone https://github.com/prasanthb21/DeskBudd.git
cd DeskBudd
npm install
npm start
```

## Building your own package

```bash
npm run dist
```

Produces `dist/DeskBudd-<version>-win.zip` — the same portable build the
releases on this repo ship.

## Not built (by design)

- **No in-app purchases** — this is free, and executing payments isn't
  something bolted onto a hobby project casually
- **No gambling-style mini-games** — works against the whole point of a
  productivity tool
- **No telemetry, no accounts, no network calls** — everything runs and stores
  locally on your machine

## Contributing

Issues and PRs welcome. The whole app is ~10 small files — see
[`renderer/characters.js`](renderer/characters.js) for the character system
and [`main.js`](main.js) for the reminder/focus/mood logic.

## License

[MIT](LICENSE)
