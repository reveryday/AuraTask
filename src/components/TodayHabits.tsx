import { useEffect, useState } from "react";
import {
  clearHabitLog,
  listActiveHabits,
  listAllLogsForDate,
  upsertHabitLog,
} from "../db/database";
import type { Habit } from "../types";
import { isCompleted } from "../utils/habits";

interface Props {
  dateISO: string;
  isToday: boolean;
}

export default function TodayHabits({ dateISO, isToday }: Props) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Map<number, number>>(new Map());

  const refresh = async () => {
    const [hs, ls] = await Promise.all([listActiveHabits(), listAllLogsForDate(dateISO)]);
    setHabits(hs);
    const m = new Map<number, number>();
    for (const l of ls) m.set(l.habit_id, l.value);
    setLogs(m);
  };

  useEffect(() => {
    refresh().catch(console.error);
  }, [dateISO]);

  const log = async (h: Habit, value: number) => {
    if (value === 0) await clearHabitLog(h.id, dateISO);
    else await upsertHabitLog(h.id, dateISO, value);
    await refresh();
  };

  if (habits.length === 0) return null;

  return (
    <div className="task-section">
      <div className="task-section-title">
        {isToday ? "今日习惯" : "当日习惯"}
      </div>
      <div className="task-list">
        {habits.map((h) => {
          const value = logs.get(h.id) ?? 0;
          const done = isCompleted(h, value);
          return (
            <div key={h.id} className="today-habit-strip">
              <span className="today-habit-emoji">{h.emoji}</span>
              <span className="today-habit-name">
                {h.name}
                {done && <span className="done-chk">✓</span>}
              </span>
              {h.kind === "binary" ? (
                <button
                  className={`today-habit-btn ${done ? "done" : ""}`}
                  onClick={() => log(h, done ? 0 : 1)}
                >
                  {done ? "已完成" : "标记完成"}
                </button>
              ) : (
                <>
                  <span className="today-habit-target">
                    / {h.target_value} {h.unit ?? ""}
                  </span>
                  <QuantInput
                    initial={value}
                    onChange={(v) => log(h, v)}
                    placeholder="0"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuantInput({
  initial,
  onChange,
  placeholder,
}: {
  initial: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  const [val, setVal] = useState(initial > 0 ? String(initial) : "");
  useEffect(() => {
    setVal(initial > 0 ? String(initial) : "");
  }, [initial]);
  const commit = () => {
    const n = Number(val);
    if (!isNaN(n) && n !== initial) onChange(n);
  };
  return (
    <input
      className="today-habit-input"
      type="number"
      step="0.1"
      min={0}
      placeholder={placeholder}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
