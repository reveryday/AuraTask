import { useCallback, useEffect, useMemo, useState } from "react";
import TaskDialog from "./components/TaskDialog";
import DayView from "./components/DayView";
import WeekView from "./components/WeekView";
import MonthView from "./components/MonthView";
import FocusView from "./components/FocusView";
import StatsView from "./components/StatsView";
import InboxView from "./components/InboxView";
import HabitsView from "./components/HabitsView";
import MindmapsView from "./components/MindmapsView";
import ThemeToggle from "./components/ThemeToggle";
import BackupActions from "./components/BackupActions";
import WindowControls from "./components/WindowControls";
import TopbarChips from "./components/TopbarChips";
import { useFocusTimer } from "./hooks/useFocusTimer";
import {
  createTask,
  deleteTask,
  listInboxTasks,
  listMoodsInRange,
  listTasksInRange,
  toggleTask,
  updateTask,
} from "./db/database";
import { notify } from "./utils/notify";
import type { NewTask, Task, ViewMode } from "./types";
import {
  addDays,
  endOfMonth,
  formatMonth,
  startOfMonth,
  startOfWeek,
  toISODate,
} from "./utils/date";

function rangeFor(view: ViewMode, anchor: Date): [string, string] {
  if (view === "day") {
    const s = toISODate(anchor);
    return [s, s];
  }
  if (view === "week") {
    const s = startOfWeek(anchor);
    return [toISODate(s), toISODate(addDays(s, 6))];
  }
  const first = startOfMonth(anchor);
  const last = endOfMonth(anchor);
  const gridStart = startOfWeek(first);
  const gridEnd = addDays(gridStart, 41);
  return [
    toISODate(gridStart < first ? gridStart : first),
    toISODate(gridEnd > last ? gridEnd : last),
  ];
}

function headerLabel(view: ViewMode, anchor: Date): string {
  if (view === "month") return formatMonth(anchor);
  if (view === "week") {
    const s = startOfWeek(anchor);
    const e = addDays(s, 6);
    return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
  }
  return `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(anchor.getDate()).padStart(2, "0")}`;
}

export default function App() {
  const [view, setView] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("auratask.lastCalendarView");
    return saved === "week" || saved === "month" ? (saved as ViewMode) : "day";
  });
  const [anchor, setAnchor] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [moods, setMoods] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [lastCalendarView, setLastCalendarView] = useState<"day" | "week" | "month">(
    () => {
      const saved = localStorage.getItem("auratask.lastCalendarView");
      return saved === "week" || saved === "month" ? (saved as "week" | "month") : "day";
    },
  );

  useEffect(() => {
    if (view === "day" || view === "week" || view === "month") {
      setLastCalendarView(view);
      localStorage.setItem("auratask.lastCalendarView", view);
    }
  }, [view]);

  const isCalendarView = view === "day" || view === "week" || view === "month";

  const timer = useFocusTimer();
  const [todayCounts, setTodayCounts] = useState({ pending: 0, done: 0 });

  const refreshTodayCounts = useCallback(async () => {
    const today = toISODate(new Date());
    try {
      const rows = await listTasksInRange(today, today);
      setTodayCounts({
        pending: rows.filter((t) => !t.completed_at).length,
        done: rows.filter((t) => !!t.completed_at).length,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshTodayCounts();
  }, [refreshTodayCounts]);

  const [sidebarHidden, setSidebarHidden] = useState(
    () => localStorage.getItem("auratask.sidebar.hidden") === "1",
  );

  const toggleSidebar = () => {
    setSidebarHidden((h) => {
      const next = !h;
      localStorage.setItem("auratask.sidebar.hidden", next ? "1" : "0");
      return next;
    });
  };

  const refresh = useCallback(async () => {
    if (
      view === "focus" ||
      view === "stats" ||
      view === "habits" ||
      view === "mindmaps"
    )
      return;
    try {
      if (view === "inbox") {
        setTasks(await listInboxTasks());
        setMoods({});
      } else {
        const [s, e] = rangeFor(view, anchor);
        const [taskRows, moodRows] = await Promise.all([
          listTasksInRange(s, e),
          view === "week" || view === "month" ? listMoodsInRange(s, e) : Promise.resolve([]),
        ]);
        setTasks(taskRows);
        const map: Record<string, string> = {};
        for (const m of moodRows) map[m.date] = m.mood;
        setMoods(map);
      }
      refreshTodayCounts();
    } catch (err) {
      console.error("Failed to load tasks", err);
    }
  }, [view, anchor, refreshTodayCounts]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (inField) return;
      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setShowAdd(true);
        return;
      }
      // Ctrl+1..5 switch primary nav
      const map: Record<string, ViewMode> = {
        "1": lastCalendarView,
        "2": "inbox",
        "3": "habits",
        "4": "mindmaps",
        "5": "focus",
        "6": "stats",
      };
      if (map[e.key]) {
        e.preventDefault();
        setView(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastCalendarView]);

  // Once-per-session daily summary on startup
  useEffect(() => {
    const today = toISODate(new Date());
    const stamp = sessionStorage.getItem("auratask.dailyNotifiedFor");
    if (stamp === today) return;
    sessionStorage.setItem("auratask.dailyNotifiedFor", today);
    listTasksInRange(today, today)
      .then((rows) => {
        const pending = rows.filter((t) => !t.completed_at).length;
        if (pending > 0) {
          notify("今日待办", `今天还有 ${pending} 项任务等你处理。`);
        }
      })
      .catch(() => {});
  }, []);

  const navigate = (dir: -1 | 1) => {
    if (view === "day") setAnchor((a) => addDays(a, dir));
    else if (view === "week") setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
  };

  const onAdd = async (t: NewTask) => {
    await createTask(t);
    setShowAdd(false);
    await refresh();
  };

  const onSaveEdit = async (t: NewTask) => {
    if (!editingTask) return;
    await updateTask(editingTask.id, t);
    setEditingTask(null);
    await refresh();
  };

  const onDeleteEdit = async () => {
    if (!editingTask) return;
    await deleteTask(editingTask.id);
    setEditingTask(null);
    await refresh();
  };

  const onToggle = async (t: Task) => {
    await toggleTask(t.id, !t.completed_at);
    await refresh();
  };
  const onDelete = async (t: Task) => {
    await deleteTask(t.id);
    await refresh();
  };

  const defaultDateForAdd = useMemo(() => toISODate(anchor), [anchor]);

  return (
    <div className={`app ${sidebarHidden ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-dot" />
          <span className="brand-name">AuraTask</span>
          <button
            className="icon-btn sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="隐藏侧边栏"
            title="隐藏侧边栏"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3l-5 5 5 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <button
          className={`nav-item ${isCalendarView ? "active" : ""}`}
          onClick={() => setView(lastCalendarView)}
        >
          <span>📅</span>
          <span>日历</span>
        </button>
        <button
          className={`nav-item ${view === "inbox" ? "active" : ""}`}
          onClick={() => setView("inbox")}
        >
          <span>📥</span>
          <span>稍后</span>
        </button>
        <button
          className={`nav-item ${view === "habits" ? "active" : ""}`}
          onClick={() => setView("habits")}
        >
          <span>💪</span>
          <span>习惯</span>
        </button>
        <button
          className={`nav-item ${view === "mindmaps" ? "active" : ""}`}
          onClick={() => setView("mindmaps")}
        >
          <span>🧠</span>
          <span>思维导图</span>
        </button>
        <button
          className={`nav-item ${view === "focus" ? "active" : ""}`}
          onClick={() => setView("focus")}
        >
          <span>🍅</span>
          <span>专注计时</span>
        </button>
        <button
          className={`nav-item ${view === "stats" ? "active" : ""}`}
          onClick={() => setView("stats")}
        >
          <span>📊</span>
          <span>学习统计</span>
        </button>
        <div style={{ marginTop: "auto" }} />
        <BackupActions onChanged={refresh} />
        <ThemeToggle />
      </aside>

      <main className="main">
        <div className="topbar" data-tauri-drag-region>
          {sidebarHidden && (
            <button
              className="icon-btn"
              onClick={toggleSidebar}
              aria-label="显示侧边栏"
              title="显示侧边栏"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2.5 4h11M2.5 8h11M2.5 12h11"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          {view === "focus" ? (
            <>
              <h1>🍅 专注计时</h1>
              <div className="topbar-spacer" />
            </>
          ) : view === "stats" ? (
            <>
              <h1>📊 学习统计</h1>
              <div className="topbar-spacer" />
            </>
          ) : view === "inbox" ? (
            <>
              <h1>📥 稍后</h1>
              <div className="topbar-spacer" />
              <button className="primary-btn" onClick={() => setShowAdd(true)}>
                + 新建任务
              </button>
            </>
          ) : view === "habits" ? (
            <>
              <h1>💪 习惯养成</h1>
              <div className="topbar-spacer" />
            </>
          ) : view === "mindmaps" ? (
            <>
              <h1>🧠 思维导图</h1>
              <div className="topbar-spacer" />
            </>
          ) : (
            <>
              <button className="icon-btn" onClick={() => navigate(-1)} aria-label="上一个">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 3l-5 5 5 5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <h1>{headerLabel(view, anchor)}</h1>
              <button className="icon-btn" onClick={() => navigate(1)} aria-label="下一个">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button className="today-btn" onClick={() => setAnchor(new Date())}>
                今天
              </button>

              <div className="topbar-spacer" />

              <div className="segmented">
                <button className={view === "day" ? "active" : ""} onClick={() => setView("day")}>
                  日
                </button>
                <button className={view === "week" ? "active" : ""} onClick={() => setView("week")}>
                  周
                </button>
                <button
                  className={view === "month" ? "active" : ""}
                  onClick={() => setView("month")}
                >
                  月
                </button>
              </div>
              <button className="primary-btn" onClick={() => setShowAdd(true)}>
                + 新建任务
              </button>
            </>
          )}

          <div className="topbar-trailing" data-tauri-drag-region={false}>
            <TopbarChips
              todayPending={todayCounts.pending}
              todayDone={todayCounts.done}
              timer={timer}
              onJumpDay={() => {
                setAnchor(new Date());
                setView("day");
              }}
              onJumpFocus={() => setView("focus")}
            />
            <WindowControls />
          </div>
        </div>

        <div className="content">
          {view === "day" && (
            <DayView
              date={anchor}
              tasks={tasks}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={setEditingTask}
            />
          )}
          {view === "week" && (
            <WeekView
              anchor={anchor}
              tasks={tasks}
              moods={moods}
              onPickDay={(d) => {
                setAnchor(d);
                setView("day");
              }}
              onToggle={onToggle}
            />
          )}
          {view === "month" && (
            <MonthView
              anchor={anchor}
              tasks={tasks}
              moods={moods}
              onPickDay={(d) => {
                setAnchor(d);
                setView("day");
              }}
            />
          )}
          {view === "focus" && <FocusView timer={timer} />}
          {view === "stats" && <StatsView />}
          {view === "habits" && <HabitsView />}
          {view === "mindmaps" && <MindmapsView />}
          {view === "inbox" && (
            <InboxView
              tasks={tasks}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={setEditingTask}
              onAddClick={() => setShowAdd(true)}
            />
          )}
        </div>
      </main>

      {showAdd && (
        <TaskDialog
          defaultDate={defaultDateForAdd}
          defaultNoDate={view === "inbox"}
          onCancel={() => setShowAdd(false)}
          onSubmit={onAdd}
        />
      )}
      {editingTask && (
        <TaskDialog
          defaultDate={editingTask.due_date ?? toISODate(new Date())}
          existing={editingTask}
          onCancel={() => setEditingTask(null)}
          onSubmit={onSaveEdit}
          onDelete={onDeleteEdit}
        />
      )}
    </div>
  );
}
