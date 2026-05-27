# AuraTask

**English** · [简体中文](./README.zh-CN.md)

> A minimalist Windows desktop task manager tuned to a graduate-student rhythm — local-first, no accounts, no cloud, no telemetry.

AuraTask folds the handful of things you actually do during research — planning tasks, focusing in short bursts, sticking to habits, mapping out ideas, and tracking how you feel — into a single lightweight native app. Everything lives in a local SQLite file. Close it and it forgets you exist.

## Features

### Tasks
- **Day / week / month** views, switchable at any granularity (a single sidebar entry remembers the last one used)
- **Later inbox** for tasks you don't want to schedule yet
- Mark tasks as **primary** or **secondary** ("延伸") rather than 1-5 priority levels
- Free-form **tags** (no rigid "subject" model — fits research workflows: 论文 / 组会 / reading)
- Week view bands each day into **morning / afternoon / evening** color blocks

### Focus timer
- Pomodoro with **custom focus / break durations** (25/5, 50/10, 90/20 presets included)
- Optionally bind the session to a task ("I'm focusing on…")
- Sessions are logged automatically and a Windows notification fires at the end
- **Runs in the background** — switching to another view keeps the timer ticking

### Habits
- Two kinds: **binary** ("did I do it?") and **quantitative** ("study 7 h/day", counts as done only when the target is met)
- Each card shows **current streak**, **30-day completion rate**, and a **mini heatmap**
- Archive / restore / delete

### Mindmaps
- **Left-to-right tree layout**, multiple named maps
- Nodes can **link to a task** and reflect its completion state
- Fully keyboard-driven: `Tab` child, `Enter` sibling, `F2` rename, `Del` delete

### Mood & review
- One-tap daily mood emoji (😄🙂😐😕😭); shown as small badges on the week/month grid
- A **statistics** page rolls up focus minutes, completion rate, active days, mood trend, habit streaks, and tag breakdown for the current week or month

### Desktop polish
- **Frameless custom title bar** with a single draggable region and minimal window controls
- **Topbar chips**: `⏳ 3 tasks left · 67%` and a pulsing `🍅 14:23` while a pomodoro is running
- **Desktop notifications**: end-of-pomodoro alerts plus a once-a-day "you still have N tasks" summary
- **Window size and position remembered** across launches
- **Dark mode**, follows system on first launch, manual toggle anytime
- **Sidebar collapsible**

### Data
- **One-click JSON backup / restore** (drop the backup in OneDrive / Dropbox to survive reinstalls)
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

Grab the latest installer from the [Releases](https://github.com/reveryday/AuraTask/releases) page and run it. Windows 10 / 11 are supported. The build is unsigned, so SmartScreen may warn you the first time — click *More info → Run anyway*.

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
