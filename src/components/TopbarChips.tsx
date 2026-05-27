import type { FocusTimer } from "../hooks/useFocusTimer";
import { useT } from "../i18n";

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
  const { t } = useT();
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
          title={t("跳到专注计时", "Jump to focus timer")}
        >
          <span>{timer.kind === "focus" ? "🍅" : "☕"}</span>
          <span className="chip-time">
            {mm}:{ss}
          </span>
        </button>
      )}
      {total > 0 && (
        <button
          className="chip chip-today"
          onClick={onJumpDay}
          title={t("跳到今日", "Jump to today")}
        >
          <span>⏳</span>
          {todayPending > 0 ? (
            <span>
              {t(
                `今日剩 ${todayPending} 项 · ${pct}%`,
                `${todayPending} left today · ${pct}%`,
              )}
            </span>
          ) : (
            <span>{t("今日已完成 ✨", "All done today ✨")}</span>
          )}
        </button>
      )}
    </div>
  );
}
