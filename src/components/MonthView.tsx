import type { Task } from "../types";
import { monthGrid, toISODate } from "../utils/date";
import { useT } from "../i18n";
import { useSettings } from "../settings";

interface Props {
  anchor: Date;
  tasks: Task[];
  moods: Record<string, string>;
  onPickDay: (d: Date) => void;
}

const HEAD_ZH = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const HEAD_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthView({ anchor, tasks, moods, onPickDay }: Props) {
  const { lang } = useT();
  const { isToday } = useSettings();
  const HEAD = lang === "zh" ? HEAD_ZH : HEAD_EN;
  const cells = monthGrid(anchor);
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
        return (
          <div
            key={key}
            className={`month-cell ${inMonth ? "" : "other-month"} ${isToday(d) ? "today" : ""}`}
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
