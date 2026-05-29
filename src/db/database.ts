import Database from "@tauri-apps/plugin-sql";
import { logicalDateISO } from "../utils/date";
import { getDayStartHour } from "../utils/settings";
import type {
  DailyMood,
  DailyNote,
  DayMetric,
  FocusSession,
  Habit,
  HabitLog,
  Mindmap,
  MindmapNode,
  NewFocusSession,
  NewHabit,
  NewTask,
  SubjectMetric,
  Task,
} from "../types";

let dbPromise: Promise<Database> | null = null;

export const getDb = () => {
  if (!dbPromise) dbPromise = Database.load("sqlite:auratask.db");
  return dbPromise;
};

export const listTasksInRange = async (startISO: string, endISO: string): Promise<Task[]> => {
  const db = await getDb();
  return db.select<Task[]>(
    "SELECT * FROM tasks WHERE due_date IS NOT NULL AND due_date >= $1 AND due_date <= $2 ORDER BY due_date ASC, completed_at IS NOT NULL, position ASC, created_at ASC, id ASC",
    [startISO, endISO],
  );
};

export const listInboxTasks = async (): Promise<Task[]> => {
  const db = await getDb();
  return db.select<Task[]>(
    "SELECT * FROM tasks WHERE due_date IS NULL ORDER BY completed_at IS NOT NULL, position ASC, created_at ASC, id ASC",
  );
};

export const createTask = async (t: NewTask): Promise<void> => {
  const db = await getDb();
  const rows = await db.select<{ next_position: number }[]>(
    "SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM tasks WHERE (($1 IS NULL AND due_date IS NULL) OR due_date = $1)",
    [t.due_date],
  );
  const position = rows[0]?.next_position ?? 1;
  await db.execute(
    "INSERT INTO tasks (title, notes, subject, priority, due_date, time_slot, position) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      t.title,
      t.notes ?? null,
      t.subject ?? null,
      t.priority ?? 1,
      t.due_date,
      t.time_slot ?? null,
      position,
    ],
  );
};

export const toggleTask = async (id: number, done: boolean): Promise<void> => {
  const db = await getDb();
  await db.execute("UPDATE tasks SET completed_at = $1 WHERE id = $2", [
    done ? new Date().toISOString() : null,
    id,
  ]);
};

export const deleteTask = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM tasks WHERE id = $1", [id]);
};

export const listOpenTasks = async (): Promise<Task[]> => {
  const db = await getDb();
  return db.select<Task[]>(
    "SELECT * FROM tasks WHERE completed_at IS NULL ORDER BY due_date IS NULL, due_date ASC, position ASC, created_at ASC, id ASC LIMIT 50",
  );
};

export const createFocusSession = async (s: NewFocusSession): Promise<void> => {
  const db = await getDb();
  // Bucket the session into the logical day it started in (respects the
  // user's "day starts at" preference for night owls).
  const date = logicalDateISO(new Date(s.started_at), getDayStartHour());
  await db.execute(
    "INSERT INTO focus_sessions (task_id, kind, duration_sec, session_date, started_at, ended_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [s.task_id, s.kind, s.duration_sec, date, s.started_at, s.ended_at],
  );
};

export const todayFocusStats = async (
  dateISO: string,
): Promise<{ sessions: number; totalMinutes: number }> => {
  const db = await getDb();
  const rows = await db.select<{ sessions: number; total: number | null }[]>(
    "SELECT COUNT(*) as sessions, COALESCE(SUM(duration_sec),0) as total FROM focus_sessions WHERE kind='focus' AND session_date = $1",
    [dateISO],
  );
  const r = rows[0] ?? { sessions: 0, total: 0 };
  return { sessions: r.sessions, totalMinutes: Math.round((r.total ?? 0) / 60) };
};

export const recentFocusSessions = async (limit = 8): Promise<FocusSession[]> => {
  const db = await getDb();
  return db.select<FocusSession[]>(
    "SELECT * FROM focus_sessions WHERE kind='focus' ORDER BY id DESC LIMIT $1",
    [limit],
  );
};

export const dailyMetricsInRange = async (
  startISO: string,
  endISO: string,
): Promise<DayMetric[]> => {
  const db = await getDb();
  const focusRows = await db.select<{ d: string; mins: number }[]>(
    "SELECT session_date as d, COALESCE(SUM(duration_sec),0)/60 as mins FROM focus_sessions WHERE kind='focus' AND session_date BETWEEN $1 AND $2 GROUP BY session_date",
    [startISO, endISO],
  );
  const taskRows = await db.select<{ d: string; planned: number; done: number }[]>(
    "SELECT due_date as d, COUNT(*) as planned, SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as done FROM tasks WHERE due_date BETWEEN $1 AND $2 GROUP BY due_date",
    [startISO, endISO],
  );
  const map = new Map<string, DayMetric>();
  for (const r of focusRows) {
    map.set(r.d, { date: r.d, focus_min: r.mins, done: 0, planned: 0 });
  }
  for (const r of taskRows) {
    const ex = map.get(r.d) ?? { date: r.d, focus_min: 0, done: 0, planned: 0 };
    ex.planned = r.planned;
    ex.done = r.done;
    map.set(r.d, ex);
  }
  return Array.from(map.values());
};

export const subjectBreakdown = async (
  startISO: string,
  endISO: string,
): Promise<SubjectMetric[]> => {
  const db = await getDb();
  return db.select<SubjectMetric[]>(
    `SELECT COALESCE(t.subject, '未分类') as subject,
            COALESCE(SUM(f.duration_sec),0)/60 as focus_min,
            COUNT(DISTINCT t.id) as task_count
     FROM tasks t
     LEFT JOIN focus_sessions f ON f.task_id = t.id AND f.kind='focus'
     WHERE t.due_date BETWEEN $1 AND $2
     GROUP BY COALESCE(t.subject, '未分类')
     ORDER BY focus_min DESC, task_count DESC`,
    [startISO, endISO],
  );
};

export const setMood = async (date: string, mood: string, score: number): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "INSERT INTO daily_moods (date, mood, score, updated_at) VALUES ($1, $2, $3, datetime('now')) " +
      "ON CONFLICT(date) DO UPDATE SET mood=excluded.mood, score=excluded.score, updated_at=excluded.updated_at",
    [date, mood, score],
  );
};

export const clearMood = async (date: string): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM daily_moods WHERE date = $1", [date]);
};

export const getMood = async (date: string): Promise<DailyMood | null> => {
  const db = await getDb();
  const rows = await db.select<DailyMood[]>("SELECT * FROM daily_moods WHERE date = $1", [
    date,
  ]);
  return rows[0] ?? null;
};

export const listMoodsInRange = async (
  startISO: string,
  endISO: string,
): Promise<DailyMood[]> => {
  const db = await getDb();
  return db.select<DailyMood[]>(
    "SELECT * FROM daily_moods WHERE date BETWEEN $1 AND $2 ORDER BY date ASC",
    [startISO, endISO],
  );
};

// ----- Daily note to self -----

export const getDailyNote = async (date: string): Promise<string | null> => {
  const db = await getDb();
  const rows = await db.select<DailyNote[]>(
    "SELECT date, text FROM daily_notes WHERE date = $1",
    [date],
  );
  return rows[0]?.text ?? null;
};

export const setDailyNote = async (date: string, text: string): Promise<void> => {
  const db = await getDb();
  const trimmed = text.trim();
  if (!trimmed) {
    await db.execute("DELETE FROM daily_notes WHERE date = $1", [date]);
    return;
  }
  await db.execute(
    "INSERT INTO daily_notes (date, text, updated_at) VALUES ($1, $2, datetime('now')) " +
      "ON CONFLICT(date) DO UPDATE SET text=excluded.text, updated_at=excluded.updated_at",
    [date, trimmed],
  );
};

// ----- Habits -----

export const listActiveHabits = async (): Promise<Habit[]> => {
  const db = await getDb();
  return db.select<Habit[]>(
    "SELECT * FROM habits WHERE archived_at IS NULL ORDER BY id ASC",
  );
};

export const listAllHabits = async (): Promise<Habit[]> => {
  const db = await getDb();
  return db.select<Habit[]>("SELECT * FROM habits ORDER BY archived_at IS NOT NULL, id ASC");
};

export const createHabit = async (h: NewHabit): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "INSERT INTO habits (name, emoji, kind, target_value, unit) VALUES ($1, $2, $3, $4, $5)",
    [h.name, h.emoji, h.kind, h.target_value, h.unit],
  );
};

export const updateHabit = async (id: number, h: NewHabit): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "UPDATE habits SET name=$1, emoji=$2, kind=$3, target_value=$4, unit=$5 WHERE id=$6",
    [h.name, h.emoji, h.kind, h.target_value, h.unit, id],
  );
};

export const archiveHabit = async (id: number, archived: boolean): Promise<void> => {
  const db = await getDb();
  await db.execute("UPDATE habits SET archived_at=$1 WHERE id=$2", [
    archived ? new Date().toISOString() : null,
    id,
  ]);
};

export const deleteHabit = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM habits WHERE id=$1", [id]);
};

export const upsertHabitLog = async (
  habit_id: number,
  date: string,
  value: number,
): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "INSERT INTO habit_logs (habit_id, date, value, updated_at) VALUES ($1, $2, $3, datetime('now')) " +
      "ON CONFLICT(habit_id, date) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
    [habit_id, date, value],
  );
};

export const clearHabitLog = async (habit_id: number, date: string): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM habit_logs WHERE habit_id=$1 AND date=$2", [habit_id, date]);
};

export const listHabitLogs = async (
  habit_id: number,
  startISO: string,
  endISO: string,
): Promise<HabitLog[]> => {
  const db = await getDb();
  return db.select<HabitLog[]>(
    "SELECT habit_id, date, value FROM habit_logs WHERE habit_id=$1 AND date BETWEEN $2 AND $3 ORDER BY date ASC",
    [habit_id, startISO, endISO],
  );
};

export const listAllLogsForDate = async (date: string): Promise<HabitLog[]> => {
  const db = await getDb();
  return db.select<HabitLog[]>(
    "SELECT habit_id, date, value FROM habit_logs WHERE date=$1",
    [date],
  );
};

export const listAllLogsInRange = async (
  startISO: string,
  endISO: string,
): Promise<HabitLog[]> => {
  const db = await getDb();
  return db.select<HabitLog[]>(
    "SELECT habit_id, date, value FROM habit_logs WHERE date BETWEEN $1 AND $2",
    [startISO, endISO],
  );
};

// ----- Mindmaps -----

export const listMindmaps = async (): Promise<Mindmap[]> => {
  const db = await getDb();
  return db.select<Mindmap[]>("SELECT * FROM mindmaps ORDER BY updated_at DESC");
};

export const createMindmap = async (title: string): Promise<number> => {
  const db = await getDb();
  const res = await db.execute("INSERT INTO mindmaps (title) VALUES ($1)", [title]);
  const mid = Number(res.lastInsertId);
  await db.execute(
    "INSERT INTO mindmap_nodes (mindmap_id, parent_id, text, position) VALUES ($1, NULL, $2, 0)",
    [mid, title],
  );
  return mid;
};

export const renameMindmap = async (id: number, title: string): Promise<void> => {
  const db = await getDb();
  await db.execute(
    "UPDATE mindmaps SET title=$1, updated_at=datetime('now') WHERE id=$2",
    [title, id],
  );
};

export const deleteMindmap = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM mindmaps WHERE id=$1", [id]);
};

export const touchMindmap = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.execute("UPDATE mindmaps SET updated_at=datetime('now') WHERE id=$1", [id]);
};

export const listMindmapNodes = async (mindmap_id: number): Promise<MindmapNode[]> => {
  const db = await getDb();
  return db.select<MindmapNode[]>(
    "SELECT id, mindmap_id, parent_id, text, task_id, position FROM mindmap_nodes WHERE mindmap_id=$1 ORDER BY position ASC, id ASC",
    [mindmap_id],
  );
};

export const createMindmapNode = async (
  mindmap_id: number,
  parent_id: number | null,
  text: string,
  position: number,
): Promise<number> => {
  const db = await getDb();
  const res = await db.execute(
    "INSERT INTO mindmap_nodes (mindmap_id, parent_id, text, position) VALUES ($1, $2, $3, $4)",
    [mindmap_id, parent_id, text, position],
  );
  await touchMindmap(mindmap_id);
  return Number(res.lastInsertId);
};

export const updateMindmapNode = async (
  id: number,
  patch: { text?: string; task_id?: number | null },
): Promise<void> => {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (patch.text !== undefined) {
    fields.push(`text=$${i++}`);
    values.push(patch.text);
  }
  if (patch.task_id !== undefined) {
    fields.push(`task_id=$${i++}`);
    values.push(patch.task_id);
  }
  if (!fields.length) return;
  values.push(id);
  await db.execute(`UPDATE mindmap_nodes SET ${fields.join(", ")} WHERE id=$${i}`, values);
};

export const deleteMindmapNode = async (id: number): Promise<void> => {
  const db = await getDb();
  await db.execute("DELETE FROM mindmap_nodes WHERE id=$1", [id]);
};

export const updateTask = async (id: number, patch: Partial<NewTask>): Promise<void> => {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = $${i++}`);
    values.push(v);
  }
  if (!fields.length) return;
  values.push(id);
  await db.execute(`UPDATE tasks SET ${fields.join(", ")} WHERE id = $${i}`, values);
};

export const updateTaskPositions = async (taskIds: number[]): Promise<void> => {
  const db = await getDb();
  for (const [index, id] of taskIds.entries()) {
    await db.execute("UPDATE tasks SET position = $1 WHERE id = $2", [index + 1, id]);
  }
};
