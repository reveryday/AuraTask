import type { FocusTimer } from "../hooks/useFocusTimer";

interface Props {
  todayPending: number;
  todayDone: number;
  timer: FocusTimer;
  onJumpDay: () => void;
  onJumpFocus: () => void;
}

export default function TopbarChips({
  todayPending,
  todayDone,
  timer,
  onJumpDay,
  onJumpFocus,
}: Props) {
  const total = todayPending + todayDone;
  const pct = total === 0 ? 0 : Math.round((todayDone / total) * 100);

  const mm = String(Math.floor(timer.remaining / 60)).padStart(2, "0");
  const ss = String(timer.remaining % 60).padStart(2, "0");

  return (
    <div className="topbar-chips">
      {timer.running && (
        <button
          className={`chip chip-focus ${timer.kind === "break" ? "is-break" : ""}`}
          onClick={onJumpFocus}
          title="跳到专注计时"
        >
          <span>{timer.kind === "focus" ? "🍅" : "☕"}</span>
          <span className="chip-time">
            {mm}:{ss}
          </span>
        </button>
      )}
      {total > 0 && (
        <button className="chip chip-today" onClick={onJumpDay} title="跳到今日">
          <span>⏳</span>
          {todayPending > 0 ? (
            <span>
              今日剩 {todayPending} 项 · {pct}%
            </span>
          ) : (
            <span>今日已完成 ✨</span>
          )}
        </button>
      )}
    </div>
  );
}
