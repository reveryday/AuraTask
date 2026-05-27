# AuraTask

**English** · [简体中文](./README.zh-CN.md)

[![Latest release](https://img.shields.io/github/v/release/reveryday/AuraTask?label=download&color=4f46e5&style=flat-square)](https://github.com/reveryday/AuraTask/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/reveryday/AuraTask/total?style=flat-square)](https://github.com/reveryday/AuraTask/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue?style=flat-square)](#install-end-user)

AuraTask folds the handful of things a graduate student actually does every day — planning tasks, focusing in short bursts, building habits, mapping out ideas, tracking how you feel — into a single lightweight native app. Everything lives in a local SQLite file. No accounts, no cloud, no telemetry. Close it and it forgets you exist.

## Features

- **Day / week / month** views at any granularity, tasks tagged as **primary** or **secondary** ("延伸"), week view banded by **morning / afternoon / evening** color blocks;
- **Later inbox** — a parking spot for undated tasks until you have time;

- Pomodoro timer with **custom focus / break lengths** (25/5, 50/10, 90/20 presets), can be bound to a task ("I'm focusing on…"), end-of-session is logged automatically and pops a Windows notification;

- **Binary habits** ("did I do it?") and **quantitative habits** (e.g. study 7h/day — only counts when the target is hit), each card shows **current streak**, **30-day completion rate**, and a **mini heatmap**;
- **Left-to-right mindmaps**, multiple named maps, nodes can **link to a task** and reflect its completion state;

- One-tap daily **mood emoji** (😄🙂😐😕😭), visible as small badges on the week/month grid;
- A **statistics** page rolls up weekly/monthly focus minutes, completion rate, active days, mood trend, habit streaks, and tag-time breakdown;

- **One-click JSON backup / restore** (export to OneDrive/Dropbox — survive Windows reinstalls)
- Local SQLite, schema managed via migration versions

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + N` | New task (anywhere) |
| `Ctrl + 1` | Calendar |
| `Ctrl + 2` | Later inbox |
| `Ctrl + 3` | Habits |
| `Ctrl + 4` | Mindmaps |
| `Ctrl + 5` | Focus timer |
| `Ctrl + 6` | Statistics |
| `Esc` | Close dialog |

Inside a mindmap:

| Shortcut | Action |
| --- | --- |
| `Tab` | New child topic |
| `Enter` | New sibling (Tab on the root) |
| `F2` / double-click | Edit node |
| `Del` / `Backspace` | Delete node (with subtree) |
| `Tab` while editing | Save + immediately create a child |
| `Esc` while editing | Discard changes |

## Tech stack

- **Tauri 2** — Rust core, native Windows app, custom frameless window
- **React 19 + TypeScript + Vite**
- **SQLite** via [`tauri-plugin-sql`](https://github.com/tauri-apps/plugins-workspace)
- Desktop plugins: `tauri-plugin-window-state`, `tauri-plugin-notification`, `tauri-plugin-dialog`, `tauri-plugin-fs`
- Hand-written CSS only (no UI kit), layered surfaces and hairline borders inspired by macOS

Data is stored at `%APPDATA%\com.auratask.app\auratask.db`.

## Install (end user)

**👉 [Download the latest installer](https://github.com/reveryday/AuraTask/releases/latest)** (Windows 10 / 11 `.msi` or `.exe`).

The build is unsigned, so SmartScreen may warn you the first time — click *More info → Run anyway*. After installation your data lives at `%APPDATA%\com.auratask.app\auratask.db` and you can back it up from the sidebar at any time.

## Develop

### Prerequisites

- **Node.js** 20+
- **Rust** stable (install via `rustup`)
- **Visual Studio Build Tools 2022** — make sure the *Desktop development with C++* workload is selected (provides `link.exe`)
- **Windows 10 SDK** or Windows 11 SDK (10 SDK has fewer install hiccups)

Quick sanity check: `where.exe link` should print a path.

### Run

```powershell
npm install
npm run tauri dev   # Vite + native window with hot reload
```

Front-end only (no MSVC required, handy for UI iteration):

```powershell
npm run dev
```

### Type check

```powershell
npx tsc --noEmit
```

### Build a release bundle

```powershell
npm run tauri build
```

Output lands in `src-tauri/target/release/bundle/` and includes a standalone `AuraTask.exe` and an `.msi` installer.

## Project layout

```
src/
├── App.tsx                  # View routing + top-level state + global shortcuts
├── main.tsx
├── types.ts                 # Data models + enums
├── db/
│   └── database.ts          # The only module talking to SQLite
├── components/              # Views and dialogs
│   ├── DayView.tsx / WeekView.tsx / MonthView.tsx
│   ├── InboxView.tsx / FocusView.tsx
│   ├── HabitsView.tsx / MindmapsView.tsx / StatsView.tsx
│   ├── TaskDialog.tsx / HabitDialog.tsx
│   ├── TopbarChips.tsx / WindowControls.tsx
│   ├── ThemeToggle.tsx / BackupActions.tsx
│   └── ...
├── hooks/
│   └── useFocusTimer.ts     # Pomodoro state lifted to App scope, survives view switches
├── i18n/                    # Language toggle (zh / en)
├── utils/                   # Pure functions: dates, tree layout, backup, notifications
└── styles/global.css        # Global CSS variables driving light + dark themes

src-tauri/
├── src/lib.rs               # Rust entry: plugin registration + SQL migrations
├── tauri.conf.json          # Window config (frameless) + app metadata
├── capabilities/default.json  # Plugin permission allowlist
└── icons/                   # Full icon set
```

## Migration policy

The SQLite schema is managed through `tauri-plugin-sql`'s `Migration` array (see `src-tauri/src/lib.rs`). **Once a migration has shipped, never change its SQL string** — the plugin hashes each migration and will refuse to start with `"migration N was previously applied but has been modified"`. New schema needs always go in as `version: N+1`.

## Backup

Sidebar footer: *💾 Export* / *📂 Import*:

- **Export** — native save dialog writes a full JSON dump (all 7 tables + version + timestamp)
- **Import** — pick a JSON file; **the current database will be wiped and replaced** (with a confirm step)

Drop the export on OneDrive / Dropbox / iCloud and you don't have to fear a Windows reinstall.

## License

All rights reserved. The source code is published for transparency. No license is granted to copy, modify, redistribute, or use it beyond running the official builds from the Releases page. See [LICENSE](./LICENSE) for the full notice.
