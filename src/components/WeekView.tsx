import type { Task, TimeSlot } from "../types";
import { TIME_SLOT_ORDER } from "../types";
import { toISODate, weekDays, weekdayLabel } from "../utils/date";
import { useSettings } from "../settings";

interface Props {
  anchor: Date;
  tasks: Task[];
  moods: Record<string, string>;
  onPickDay: (d: Date) => void;
  onToggle: (t: Task) => void;
}

export default function WeekView({
  anchor,
  tasks,
  moods,
  onPickDay,
  onToggle,
}: Props) {
  const days = weekDays(anchor);
  const { isToday } = useSettings();

  // group by day, then by slot ("all-day" key for nullable slot)
  type DayBuckets = { all: Task[]; bySlot: Record<TimeSlot, Task[]> };
  const byDay = new Map<string, DayBuckets>();
  const empty = (): DayBuckets => ({
    all: [],
    bySlot: { morning: [], afternoon: [], evening: [] },
  });
  for (const t of tasks) {
    if (!t.due_date) continue;
    const bucket = byDay.get(t.due_date) ?? empty();
    if (t.time_slot) bucket.bySlot[t.time_slot].push(t);
    else bucket.all.push(t);
    byDay.set(t.due_date, bucket);
  }

  return (
    <div className="week-grid">
      {days.map((d) => {
        const key = toISODate(d);
        const bucket = byDay.get(key) ?? empty();
        return (
          <div
            key={key}
            className={`week-col ${isToday(d) ? "today" : ""}`}
            onClick={() => onPickDay(d)}
          >
            <div className="week-col-head">
              <span className="week-col-day">{d.getDate()}</span>
              <span className="week-col-label">{weekdayLabel(d)}</span>
              {moods[key] && <span className="mood-badge">{moods[key]}</span>}
            </div>

            {bucket.all.length > 0 && (
              <div className="slot-band slot-all">
                {bucket.all.map((t) => (
                  <WeekTask key={t.id} t={t} onToggle={onToggle} />
                ))}
              </div>
            )}

            {TIME_SLOT_ORDER.map((s) => (
              <div key={s} className={`slot-band slot-${s}`}>
                {bucket.bySlot[s].map((t) => (
                  <WeekTask key={t.id} t={t} onToggle={onToggle} />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function WeekTask({ t, onToggle }: { t: Task; onToggle: (t: Task) => void }) {
  return (
    <div
      className={`week-task ${t.completed_at ? "done" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(t);
      }}
      title="点击切换完成状态"
    >
      <span className={`priority-dot ${t.priority >= 1 ? "p1" : "p0"}`} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
    </div>
  );
}
