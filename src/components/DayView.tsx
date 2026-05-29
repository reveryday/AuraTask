import { useEffect, useState } from "react";
import type { Task } from "../types";
import { clearMood, getMood, setMood } from "../db/database";
import { formatLongDate, isSameDay, toISODate } from "../utils/date";
import { useT } from "../i18n";
import TaskList from "./TaskList";
import MoodPicker from "./MoodPicker";
import TodayHabits from "./TodayHabits";

interface Props {
  date: Date;
  tasks: Task[];
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
  onEdit: (t: Task) => void;
  onReorder: (tasks: Task[]) => void;
}

export default function DayView({ date, tasks, onToggle, onDelete, onEdit, onReorder }: Props) {
  const { t, lang } = useT();
  const pending = tasks.filter((t) => !t.completed_at);
  const done = tasks.filter((t) => !!t.completed_at);
  const iso = toISODate(date);
  const [mood, setMoodState] = useState<string | null>(null);

  useEffect(() => {
    getMood(iso)
      .then((m) => setMoodState(m?.mood ?? null))
      .catch(console.error);
  }, [iso]);

  const pickMood = async (emoji: string, score: number) => {
    setMoodState(emoji);
    try {
      await setMood(iso, emoji, score);
    } catch (e) {
      console.error(e);
    }
  };

  const dropMood = async () => {
    setMoodState(null);
    try {
      await clearMood(iso);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <div className="day-header">
        <div className="day-title">{formatLongDate(date, lang)}</div>
        <div className="day-counts">
          {t(
            `${pending.length} 项待办 · ${done.length} 项完成`,
            `${pending.length} pending · ${done.length} done`,
          )}
        </div>
      </div>

      <MoodPicker value={mood} onPick={pickMood} onClear={dropMood} />

      <TodayHabits dateISO={iso} isToday={isSameDay(date, new Date())} />

      <div className="task-section">
        <div className="task-section-title">{t("待办", "To-do")}</div>
        {pending.length ? (
          <TaskList
            tasks={pending}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
            onReorder={onReorder}
          />
        ) : (
          <div className="empty">
            {t(
              "这一天暂时没有待办，是放松还是冲刺新计划？",
              "Nothing scheduled. Time to rest, or plan the next sprint?",
            )}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div className="task-section">
          <div className="task-section-title">{t("已完成", "Completed")}</div>
          <TaskList
            tasks={done}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
            onReorder={onReorder}
          />
        </div>
      )}
    </div>
  );
}
