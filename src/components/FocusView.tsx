import { useEffect, useMemo, useState } from "react";
import {
  listOpenTasks,
  recentFocusSessions,
  todayFocusStats,
} from "../db/database";
import type { FocusSession, Task } from "../types";
import { toISODate } from "../utils/date";
import type { FocusTimer } from "../hooks/useFocusTimer";

interface Stats {
  sessions: number;
  totalMinutes: number;
}

interface Props {
  timer: FocusTimer;
}

export default function FocusView({ timer }: Props) {
  const {
    settings,
    kind,
    running,
    remaining,
    totalSec,
    taskId,
    setTaskId,
    start,
    pause,
    reset,
    switchKind,
    skipToEnd,
    saveSettings,
    setOnSessionRecorded,
  } = timer;

  const [showSettings, setShowSettings] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({ sessions: 0, totalMinutes: 0 });
  const [recent, setRecent] = useState<FocusSession[]>([]);

  const refreshStats = async () => {
    const today = toISODate(new Date());
    const [s, r] = await Promise.all([todayFocusStats(today), recentFocusSessions(6)]);
    setStats(s);
    setRecent(r);
  };

  useEffect(() => {
    listOpenTasks().then(setTasks).catch(console.error);
    refreshStats().catch(console.error);
  }, []);

  useEffect(() => {
    setOnSessionRecorded(() => {
      refreshStats().catch(console.error);
    });
    return () => setOnSessionRecorded(undefined);
  }, [setOnSessionRecorded]);

  const progress = useMemo(() => 1 - remaining / totalSec, [remaining, totalSec]);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const RADIUS = 110;
  const CIRC = 2 * Math.PI * RADIUS;

  return (
    <div className="focus-wrap">
      <div className="focus-card">
        <div className="focus-card-head">
          <div className="focus-tabs">
            <button
              className={kind === "focus" ? "active" : ""}
              onClick={() => switchKind("focus")}
            >
              专注 · {settings.focusMin} 分钟
            </button>
            <button
              className={kind === "break" ? "active" : ""}
              onClick={() => switchKind("break")}
            >
              休息 · {settings.breakMin} 分钟
            </button>
          </div>
          <button
            className="icon-btn"
            onClick={() => setShowSettings((s) => !s)}
            aria-label="时长设置"
            title="自定义时长"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {showSettings && (
          <div className="focus-settings">
            <div className="field">
              <label>专注时长（分钟）</label>
              <input
                type="number"
                min={1}
                max={180}
                value={settings.focusMin}
                onChange={(e) =>
                  saveSettings({ ...settings, focusMin: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div className="field">
              <label>休息时长（分钟）</label>
              <input
                type="number"
                min={1}
                max={60}
                value={settings.breakMin}
                onChange={(e) =>
                  saveSettings({ ...settings, breakMin: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div className="focus-settings-presets">
              <span>预设：</span>
              <button
                type="button"
                onClick={() => saveSettings({ focusMin: 25, breakMin: 5 })}
              >
                25/5
              </button>
              <button
                type="button"
                onClick={() => saveSettings({ focusMin: 50, breakMin: 10 })}
              >
                50/10
              </button>
              <button
                type="button"
                onClick={() => saveSettings({ focusMin: 90, breakMin: 20 })}
              >
                90/20
              </button>
            </div>
          </div>
        )}

        <div className="ring-wrap">
          <svg width="260" height="260" viewBox="0 0 260 260">
            <circle
              cx="130"
              cy="130"
              r={RADIUS}
              stroke="var(--border)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="130"
              cy="130"
              r={RADIUS}
              stroke={kind === "focus" ? "var(--accent)" : "#10b981"}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
              transform="rotate(-90 130 130)"
              style={{ transition: "stroke-dashoffset 0.4s linear" }}
            />
          </svg>
          <div className="ring-label">
            <div className="time">
              {mm}:{ss}
            </div>
            <div className="kind-label">{kind === "focus" ? "保持专注" : "短暂休息"}</div>
          </div>
        </div>

        {kind === "focus" && (
          <div className="task-picker">
            <label>正在专注于</label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : "")}
              disabled={running}
            >
              <option value="">— 自由专注 —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.subject ? `[${t.subject}] ` : ""}
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="focus-actions">
          {!running ? (
            <button className="primary-btn big" onClick={start}>
              开始
            </button>
          ) : (
            <button className="primary-btn big" onClick={pause}>
              暂停
            </button>
          )}
          <button className="ghost-btn big" onClick={reset}>
            重置
          </button>
          <button className="ghost-btn big" onClick={skipToEnd} title="提前结束并记录">
            跳过
          </button>
        </div>
      </div>

      <div className="focus-side">
        <div className="stat-card">
          <div className="stat-label">今日专注</div>
          <div className="stat-value">
            {stats.totalMinutes}
            <span>分钟</span>
          </div>
          <div className="stat-sub">{stats.sessions} 个番茄钟</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">最近会话</div>
          {recent.length === 0 ? (
            <div className="empty-small">还没有专注记录</div>
          ) : (
            <ul className="session-list">
              {recent.map((s) => (
                <li key={s.id}>
                  <span className="dot" />
                  <span className="time-small">
                    {new Date(s.started_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="dur">{Math.round(s.duration_sec / 60)} 分</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
