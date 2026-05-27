import type { Task } from "../types";
import { isSameDay, monthGrid, toISODate } from "../utils/date";

interface Props {
  anchor: Date;
  tasks: Task[];
  moods: Record<string, string>;
  onPickDay: (d: Date) => void;
}

const HEAD = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function MonthView({ anchor, tasks, moods, onPickDay }: Props) {
  const cells = monthGrid(anchor);
  const today = new Date();
  const byDay = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.due_date) continue;
    const arr = byDay.get(t.due_date) ?? [];
    arr.push(t);
    byDay.set(t.due_date, arr);
  }

  return (
    <div className="month-grid">
      {HEAD.map((h) => (
        <div key={h} className="month-head-cell">
          {h}
        </div>
      ))}
      {cells.map((d) => {
        const key = toISODate(d);
        const list = byDay.get(key) ?? [];
        const inMonth = d.getMonth() === anchor.getMonth();
        const isToday = isSameDay(d, today);
        return (
          <div
            key={key}
            className={`month-cell ${inMonth ? "" : "other-month"} ${isToday ? "today" : ""}`}
            onClick={() => onPickDay(d)}
          >
            <div className="month-cell-head">
              <span className="month-cell-date">{d.getDate()}</span>
              {moods[key] && <span className="mood-badge">{moods[key]}</span>}
            </div>
            {list.slice(0, 3).map((t) => (
              <div key={t.id} className={`month-task ${t.completed_at ? "done" : ""}`}>
                {t.title}
              </div>
            ))}
            {list.length > 3 && <div className="month-more">+{list.length - 3} 项</div>}
          </div>
        );
      })}
    </div>
  );
}
