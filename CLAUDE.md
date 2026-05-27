# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AuraTask is a minimalist Windows desktop app for student task & study planning, with day / week / month views.

Stack: **Tauri 2 (Rust shell) + React 19 + TypeScript + Vite**, persistence via **SQLite** through `tauri-plugin-sql`.

## Prerequisites (Windows)

Anything that invokes `cargo` (i.e. `npm run tauri dev` / `tauri build`) needs the **MSVC toolchain**, not just `rustup`. Required:

- Visual Studio Build Tools 2022 with the **"Desktop development with C++"** workload
- A Windows SDK (Win10 SDK 10.0.19041+ works fine; Win11 SDK 10.0.22621 is known to fail with MSI error 1321 on this machine — prefer Win10 SDK)

Verify with `where.exe link` — if it doesn't resolve, the Rust build will fail with `error: linker 'link.exe' not found` and no amount of code changes will help. After installing/modifying Build Tools, **restart the PowerShell session** so PATH picks up MSVC.

`npm run dev` (Vite-only) does **not** need MSVC and is the right fallback for pure-UI work when the toolchain is broken.

## Common commands

Run from repo root (`D:/Projects/AuraTask`):

- `npm install` – install JS deps (Rust deps are fetched on first `tauri dev` / `tauri build`)
- `npm run dev` – Vite dev server only (no native window; useful for pure-UI iteration on the empty DB)
- `npm run tauri dev` – full dev: launches Vite + native Tauri window with SQLite enabled
- `npm run build` – `tsc --noEmit`-style check + production frontend bundle to `dist/`
- `npm run tauri build` – produce Windows installer (`src-tauri/target/release/bundle/`)
- `npx tsc --noEmit` – fast TypeScript check without bundling

Rust side (rarely needed directly):

- `cargo check` / `cargo build` from `src-tauri/`

There is no test runner configured yet.

## Architecture

Two processes glued by Tauri IPC:

1. **Frontend (`src/`)** – React app rendered inside the Tauri WebView. All UI state lives here.
2. **Native shell (`src-tauri/`)** – Rust binary that hosts the window and exposes plugins (currently `tauri-plugin-sql` + `tauri-plugin-opener`).

### Data flow

- `src/db/database.ts` is the **only** module that talks to SQLite. It lazy-loads a single `Database` handle via `Database.load("sqlite:auratask.db")` and exposes typed CRUD helpers (`listTasksInRange`, `createTask`, `toggleTask`, …). Add new queries here rather than calling the plugin from components.
- The DB file is created in Tauri's app-data dir on first run, populated by migrations declared in `src-tauri/src/lib.rs` (`migrations: vec![Migration { version: 1, … }]`). **Schema changes must be added as a new `Migration` with an incremented `version`** — never edit the v1 SQL once it has shipped, or existing user DBs will desync.
- ⚠️ `tauri-plugin-sql` hashes each migration's SQL text and will refuse to start with `"migration N was previously applied but has been modified"` if **any character** (including whitespace/indentation) of a previously-applied migration changes. When adding a new migration, **don't reformat or reindent the older ones** — preserve their string content verbatim. If you must reset for development, delete `%APPDATA%\com.auratask.app\auratask.db` (plus `.db-shm` / `.db-wal`).
- SQL plugin permissions are whitelisted in `src-tauri/capabilities/default.json`. New plugin commands won't work until added there.

### UI structure

- `App.tsx` owns the three pieces of global state: `view` (`day|week|month`), `anchor: Date`, and the `tasks` array for the current range. It computes a `[startISO, endISO]` window via `rangeFor(view, anchor)` and re-queries on every change.
- View components (`DayView`, `WeekView`, `MonthView`) are pure renderers — they receive tasks already filtered to the visible range and emit toggle/delete/pick-day events upward. Clicking a day in Week/Month switches to `day` view at that anchor.
- `utils/date.ts` is the single source of truth for date math (Monday-start weeks, 6-row month grid, ISO date strings). UI code should not call `Date` math directly; reuse these helpers so week boundaries stay consistent.
- `types.ts` defines `Task` mirroring the SQLite schema. Priorities are `0 | 1 | 2` (low/normal/high); a task is "done" iff `completed_at` is non-null. The `subject` column is **labelled "标签" in the UI** (the user is a grad student, so it's a free-form tag, not a school subject). Don't rename the DB column — UI text only.
- Styling is plain CSS in `src/styles/global.css` using CSS variables for theming — there is no component library. Keep the aesthetic minimal (soft borders, generous whitespace, single indigo accent).

### Things to know before changing things

- The project identifier is `com.auratask.app` (`src-tauri/tauri.conf.json`). Changing it will orphan existing users' SQLite files.
- Cargo crate name is `auratask` with `lib` name `auratask_lib`; `src-tauri/src/main.rs` calls `auratask_lib::run()`. Rename together if ever changed.
- Roadmap items already stubbed in the sidebar (专注计时 / 学习统计): when implementing, add new tables via a fresh migration and put queries in `db/database.ts`.

## Repo conventions

- See `AGENTS.md` for the broader contributor guidelines (layout, commit style, PR expectations) — those apply on top of this file.
- User-facing copy is Chinese; keep UI strings in Chinese unless asked otherwise.
