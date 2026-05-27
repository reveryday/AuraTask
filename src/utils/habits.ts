import type { Habit, HabitLog } from "../types";
import { addDays, toISODate } from "./date";

export const isCompleted = (habit: Habit, value: number): boolean => {
  if (habit.kind === "binary") return value >= 1;
  if (habit.target_value == null) return value > 0;
  return value >= habit.target_value;
};

/** Streak counted backwards from today (today not yet logged still counts as broken? no — we stop at first uncompleted day before today, today neither breaks nor extends streak). */
export const computeStreak = (
  habit: Habit,
  logsByDate: Map<string, number>,
  today: Date = new Date(),
): number => {
  let streak = 0;
  let cursor = today;
  // Walk backwards. If today has no log, start from yesterday so today's absence doesn't break the streak yet.
  const todayISO = toISODate(today);
  if (!logsByDate.has(todayISO)) cursor = addDays(today, -1);

  while (true) {
    const iso = toISODate(cursor);
    const v = logsByDate.get(iso);
    if (v === undefined) break;
    if (!isCompleted(habit, v)) break;
    streak++;
    cursor = addDays(cursor, -1);
    // sanity cap to avoid infinite loop
    if (streak > 3650) break;
  }
  return streak;
};

export const completionRate = (
  habit: Habit,
  logs: HabitLog[],
  days: number,
): number => {
  if (days <= 0) return 0;
  let done = 0;
  for (const l of logs) {
    if (isCompleted(habit, l.value)) done++;
  }
  return Math.round((done / days) * 100);
};
