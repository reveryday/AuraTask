use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: "
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    notes TEXT,
                    subject TEXT,
                    priority INTEGER NOT NULL DEFAULT 1,
                    due_date TEXT NOT NULL,
                    completed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
                CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create focus_sessions table",
            sql: "
                CREATE TABLE IF NOT EXISTS focus_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id INTEGER,
                    kind TEXT NOT NULL DEFAULT 'focus',
                    duration_sec INTEGER NOT NULL,
                    session_date TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    ended_at TEXT NOT NULL,
                    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL
                );
                CREATE INDEX IF NOT EXISTS idx_focus_date ON focus_sessions(session_date);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "allow null due_date for inbox tasks",
            sql: "
                CREATE TABLE tasks_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    notes TEXT,
                    subject TEXT,
                    priority INTEGER NOT NULL DEFAULT 1,
                    due_date TEXT,
                    completed_at TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                INSERT INTO tasks_new (id, title, notes, subject, priority, due_date, completed_at, created_at)
                    SELECT id, title, notes, subject, priority, due_date, completed_at, created_at FROM tasks;
                DROP TABLE tasks;
                ALTER TABLE tasks_new RENAME TO tasks;
                CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
                CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create daily_moods table",
            sql: "
                CREATE TABLE IF NOT EXISTS daily_moods (
                    date TEXT PRIMARY KEY,
                    mood TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create habits and habit_logs",
            sql: "
                CREATE TABLE IF NOT EXISTS habits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    emoji TEXT NOT NULL DEFAULT '⭐',
                    kind TEXT NOT NULL CHECK(kind IN ('binary','quantity')),
                    target_value REAL,
                    unit TEXT,
                    archived_at TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE TABLE IF NOT EXISTS habit_logs (
                    habit_id INTEGER NOT NULL,
                    date TEXT NOT NULL,
                    value REAL NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                    PRIMARY KEY (habit_id, date),
                    FOREIGN KEY(habit_id) REFERENCES habits(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create mindmaps and mindmap_nodes",
            sql: "
                CREATE TABLE IF NOT EXISTS mindmaps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE TABLE IF NOT EXISTS mindmap_nodes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    mindmap_id INTEGER NOT NULL,
                    parent_id INTEGER,
                    text TEXT NOT NULL DEFAULT '',
                    task_id INTEGER,
                    position INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY(mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
                    FOREIGN KEY(parent_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
                    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL
                );
                CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_map ON mindmap_nodes(mindmap_id);
                CREATE INDEX IF NOT EXISTS idx_mindmap_nodes_parent ON mindmap_nodes(parent_id);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add time_slot to tasks",
            sql: "ALTER TABLE tasks ADD COLUMN time_slot TEXT;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add manual task ordering",
            sql: "
                ALTER TABLE tasks ADD COLUMN position INTEGER;
                UPDATE tasks SET position = id WHERE position IS NULL;
                CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position);
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:auratask.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
