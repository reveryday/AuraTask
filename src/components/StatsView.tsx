import { useEffect, useMemo, useState } from "react";
import {
  dailyMetricsInRange,
  listActiveHabits,
  listAllLogsInRange,
  listMoodsInRange,
  subjectBreakdown,
} from "../db/database";
import type { DayMetric, Habit, HabitLog, SubjectMetric } from "../types";
import { addDays, startOfWeek, toISODate, weekdayLabel } from "../utils/date";
import { completionRate, computeStreak } from "../utils/habits";

type Range = "week" | "month";

interface DayCell {
  date: Date;
  iso: string;
  focus_min: number;
  done: number;
  planned: number;
  mood: string | null;
  mood_score: number | null;
}

function buildCells(range: Range, anchor: Date): DayCell[] {
  if (range === "week") {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      return {
        date: d,
        iso: toISODate(d),
        focus_min: 0,
        done: 0,
        planned: 0,
        mood: null,
        mood_score: null,
      };
    });
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const n = last.getDate();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(first.getFullYear(), first.getMonth(), i + 1);
    return {
      date: d,
      iso: toISODate(d),
      focus_min: 0,
      done: 0,
      planned: 0,
      mood: null,
      mood_score: null,
    };
  });
}

export default function StatsView() {
  const [range, setRange] = useState<Range>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [cells, setCells] = useState<DayCell[]>([]);
  const [subjects, setSubjects] = useState<SubjectMetric[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);

  useEffect(() => {
    const base = buildCells(range, anchor);
    if (base.length === 0) return;
    const startISO = base[0].iso;
    const endISO = base[base.length - 1].iso;
    Promise.all([
      dailyMetricsInRange(startISO, endISO),
      subjectBreakdown(startISO, endISO),
      listMoodsInRange(startISO, endISO),
      listActiveHabits(),
      listAllLogsInRange(startISO, endISO),
    ])
      .then(([metrics, subj, moods, hs, logs]) => {
        setHabits(hs);
        setHabitLogs(logs);
        const idx = new Map<string, DayMetric>();
        metrics.forEach((m) => idx.set(m.date, m));
        const moodIdx = new Map<string, { mood: string; score: number }>();
        moods.forEach((m) => moodIdx.set(m.date, { mood: m.mood, score: m.score }));
        setCells(
          base.map((c) => {
            const m = idx.get(c.iso);
            const mo = moodIdx.get(c.iso);
            return {
              ...c,
              focus_min: m ? m.focus_min : 0,
              done: m ? m.done : 0,
              planned: m ? m.planned : 0,
              mood: mo ? mo.mood : null,
              mood_score: mo ? mo.score : null,
            };
          }),
        );
        setSubjects(subj);
      })
      .catch(console.error);
  }, [range, anchor]);

  const totals = useMemo(() => {
    let mins = 0;
    let done = 0;
    let planned = 0;
    let activeDays = 0;
    for (const c of cells) {
      mins += c.focus_min;
      done += c.done;
      planned += c.planned;
      if (c.focus_min > 0 || c.done > 0) activeDays++;
    }
    const rate = planned === 0 ? 0 : Math.round((done / planned) * 100);
    return { mins, done, planned, activeDays, rate };
  }, [cells]);

  const maxFocus = Math.max(60, ...cells.map((c) => c.focus_min));
  const totalSubjFocus = subjects.reduce((s, x) => s + x.focus_min, 0);

  const shift = (dir: -1 | 1) => {
    if (range === "week") setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
  };

  const rangeLabel =
    range === "week"
      ? (() => {
          const s = startOfWeek(anchor);
          const e = addDays(s, 6);
          return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
        })()
      : `${anchor.getFullYear()} 年 ${anchor.getMonth() + 1} 月`;

  const PALETTE = ["#4f46e5", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#a855f7", "#94a3b8"];

  return (
    <div className="stats-wrap">
      <div className="stats-toolbar">
        <div className="segmented">
          <button
            className={range === "week" ? "active" : ""}
            onClick={() => setRange("week")}
          >
            本周
          </button>
          <button
            className={range === "month" ? "active" : ""}
            onClick={() => setRange("month")}
          >
            本月
          </button>
        </div>
        <div className="stats-nav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="上一段">
            ‹
          </button>
          <span className="stats-nav-label">{rangeLabel}</span>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="下一段">
            ›
          </button>
          <button className="today-btn" onClick={() => setAnchor(new Date())}>
            回到今天
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <Kpi label="专注总时长" value={totals.mins} unit="分钟" accent="#4f46e5" />
        <Kpi label="完成任务" value={totals.done} unit={`/ ${totals.planned} 项`} accent="#10b981" />
        <Kpi label="完成率" value={totals.rate} unit="%" accent="#f59e0b" />
        <Kpi label="活跃天数" value={totals.activeDays} unit={`/ ${cells.length} 天`} accent="#ec4899" />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>专注分钟数</h3>
          <span className="panel-sub">每日累计</span>
        </div>
        <div className={`bar-chart ${range === "month" ? "dense" : ""}`}>
          {cells.map((c) => {
            const h = c.focus_min === 0 ? 2 : Math.max(6, (c.focus_min / maxFocus) * 160);
            const label =
              range === "week" ? weekdayLabel(c.date) : String(c.date.getDate());
            return (
              <div key={c.iso} className="bar-col" title={`${c.iso}: ${c.focus_min} 分钟`}>
                <div className="bar-value">{c.focus_min || ""}</div>
                <div className="bar" style={{ height: `${h}px` }} />
                <div className="bar-x">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>心情走势</h3>
          <span className="panel-sub">5 最好 · 1 糟糕</span>
        </div>
        {cells.every((c) => c.mood_score === null) ? (
          <div className="empty">这段时间还没记录心情。</div>
        ) : (
          <div className={`mood-track ${range === "month" ? "dense" : ""}`}>
            {cells.map((c) => {
              const score = c.mood_score ?? 0;
              const h = score === 0 ? 4 : 8 + (score - 1) * 36;
              const label =
                range === "week" ? weekdayLabel(c.date) : String(c.date.getDate());
              return (
                <div
                  key={c.iso}
                  className="mood-col"
                  title={`${c.iso}: ${c.mood ?? "未记录"}`}
                >
                  <div className="mood-emoji">{c.mood ?? ""}</div>
                  <div
                    className={`mood-bar score-${score}`}
                    style={{ height: `${h}px` }}
                  />
                  <div className="bar-x">{label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {habits.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h3>习惯坚持</h3>
            <span className="panel-sub">{range === "week" ? "本周" : "本月"}完成率</span>
          </div>
          <div className="habit-summary-list">
            {habits.map((h) => {
              const myLogs = habitLogs.filter((l) => l.habit_id === h.id);
              const logMap = new Map<string, number>();
              for (const l of myLogs) logMap.set(l.date, l.value);
              const streak = computeStreak(h, logMap);
              const rate = completionRate(h, myLogs, cells.length);
              return (
                <div key={h.id} className="habit-summary-row">
                  <span className="habit-emoji">{h.emoji}</span>
                  <span className="habit-summary-name">{h.name}</span>
                  <span className="habit-summary-streak">🔥 {streak} 天</span>
                  <div className="subject-bar" style={{ flex: 1 }}>
                    <div
                      className="subject-fill"
                      style={{
                        width: `${Math.max(2, rate)}%`,
                        background: "var(--accent)",
                      }}
                    />
                  </div>
                  <span className="habit-summary-rate">{rate}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h3>任务完成情况</h3>
          <span className="panel-sub">绿色为已完成</span>
        </div>
        <div className={`bar-chart ${range === "month" ? "dense" : ""}`}>
          {cells.map((c) => {
            const max = Math.max(3, ...cells.map((x) => x.planned));
            const totalH = c.planned === 0 ? 2 : Math.max(6, (c.planned / max) * 160);
            const doneH = c.planned === 0 ? 0 : (c.done / max) * 160;
            const label =
              range === "week" ? weekdayLabel(c.date) : String(c.date.getDate());
            return (
              <div key={c.iso} className="bar-col" title={`${c.iso}: ${c.done}/${c.planned}`}>
                <div className="bar-value">{c.planned ? `${c.done}/${c.planned}` : ""}</div>
                <div className="stack" style={{ height: `${totalH}px` }}>
                  <div
                    className="stack-done"
                    style={{ height: `${doneH}px` }}
                  />
                </div>
                <div className="bar-x">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>标签分布</h3>
          <span className="panel-sub">按专注时长</span>
        </div>
        {subjects.length === 0 ? (
          <div className="empty">这段时间还没有任务记录。</div>
        ) : (
          <div className="subject-list">
            {subjects.map((s, i) => {
              const pct =
                totalSubjFocus === 0 ? 0 : Math.round((s.focus_min / totalSubjFocus) * 100);
              const color = PALETTE[i % PALETTE.length];
              return (
                <div key={s.subject} className="subject-row">
                  <div className="subject-name">
                    <span className="subject-swatch" style={{ background: color }} />
                    {s.subject}
                  </div>
                  <div className="subject-bar">
                    <div
                      className="subject-fill"
                      style={{ width: `${Math.max(2, pct)}%`, background: color }}
                    />
                  </div>
                  <div className="subject-meta">
                    {s.focus_min} 分钟 · {s.task_count} 任务
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: accent }}>
        {value}
        <span>{unit}</span>
      </div>
    </div>
  );
}
