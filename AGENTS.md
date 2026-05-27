# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a blank project root. Keep future work organized with a predictable layout:

- `src/` for application source code and reusable modules.
- `tests/` for automated tests that mirror the `src/` structure.
- `assets/` for static files such as images, icons, fixtures, or sample data.
- `docs/` for design notes, architecture decisions, and user-facing documentation.
- Project configuration files such as `package.json`, `pyproject.toml`, or build scripts should remain at the root.

Avoid placing generated artifacts, dependency caches, or local environment files in version control.

## Build, Test, and Development Commands

No build system is defined yet. When one is added, document the exact commands here. Prefer common entry points such as:

- `npm install` / `pip install -r requirements.txt`: install dependencies.
- `npm run dev` / `python -m <module>`: start the local development workflow.
- `npm test` / `pytest`: run the full automated test suite.
- `npm run build`: create production-ready output.

If commands differ by platform, include Windows PowerShell examples.

## Coding Style & Naming Conventions

Follow the style of the language and framework introduced by the project. Use consistent indentation: 2 spaces for JSON, YAML, CSS, and JavaScript/TypeScript; 4 spaces for Python. Prefer descriptive names such as `taskScheduler`, `TaskCard`, `task_scheduler.py`, and `test_task_scheduler.py`.

Add formatters and linters early, then make them the source of truth. Examples include Prettier and ESLint, or Black and Ruff.

## Testing Guidelines

Place tests under `tests/` and name them after the behavior under test. Use `*.test.ts`, `*.spec.ts`, or `test_*.py` consistently once the stack is chosen. New features should include focused unit tests; bug fixes should include regression tests.

## Commit & Pull Request Guidelines

There is no commit history yet, so no existing convention is available. Use short, imperative messages and prefer Conventional Commits, for example `feat: add task list view` or `fix: handle empty task titles`.

Pull requests should include a clear summary, test results, linked issues when relevant, and screenshots or recordings for UI changes. Keep changes scoped.

## Agent-Specific Instructions

Before editing, inspect the current tree because the project is still forming. Do not assume a framework until configuration files or user direction establish one. Keep generated files out of the repository unless they are required source assets.
