import { useCallback, useEffect, useRef, useState } from "react";
import { createFocusSession } from "../db/database";
import type { SessionKind } from "../types";
import { notify } from "../utils/notify";

const SETTINGS_KEY = "auratask.focus.settings.v1";
const DEFAULT_FOCUS = 25;
const DEFAULT_BREAK = 5;

export interface FocusSettings {
  focusMin: number;
  breakMin: number;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function loadSettings(): FocusSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { focusMin: DEFAULT_FOCUS, breakMin: DEFAULT_BREAK };
    const p = JSON.parse(raw);
    return {
      focusMin: clamp(Number(p.focusMin) || DEFAULT_FOCUS, 1, 180),
      breakMin: clamp(Number(p.breakMin) || DEFAULT_BREAK, 1, 60),
    };
  } catch {
    return { focusMin: DEFAULT_FOCUS, breakMin: DEFAULT_BREAK };
  }
}

export interface FocusTimer {
  settings: FocusSettings;
  kind: SessionKind;
  running: boolean;
  remaining: number;
  totalSec: number;
  taskId: number | "";
  setTaskId: (id: number | "") => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  switchKind: (k: SessionKind) => void;
  skipToEnd: () => void;
  saveSettings: (next: FocusSettings) => void;
  onSessionRecorded?: () => void;
  setOnSessionRecorded: (fn: (() => void) | undefined) => void;
}

export function useFocusTimer(): FocusTimer {
  const [settings, setSettings] = useState<FocusSettings>(() => loadSettings());
  const [kind, setKind] = useState<SessionKind>("focus");
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<number | "">("");
  const startedRef = useRef<string | null>(null);
  const onRecordedRef = useRef<(() => void) | undefined>(undefined);

  const totalSec = kind === "focus" ? settings.focusMin * 60 : settings.breakMin * 60;
  const [remaining, setRemaining] = useState(totalSec);

  useEffect(() => {
    if (running) return;
    setRemaining(totalSec);
  }, [totalSec, running]);

  const finishSession = useCallback(async () => {
    const started = startedRef.current ?? new Date().toISOString();
    const ended = new Date().toISOString();
    const currentKind = kind;
    const currentTotal = totalSec;
    try {
      await createFocusSession({
        task_id: currentKind === "focus" && taskId !== "" ? Number(taskId) : null,
        kind: currentKind,
        duration_sec: currentTotal,
        started_at: started,
        ended_at: ended,
      });
      onRecordedRef.current?.();
    } catch (e) {
      console.error(e);
    }
    startedRef.current = null;
    setRunning(false);
    const nextKind: SessionKind = currentKind === "focus" ? "break" : "focus";
    setKind(nextKind);
    setRemaining(
      nextKind === "focus" ? settings.focusMin * 60 : settings.breakMin * 60,
    );
    if (currentKind === "focus") {
      notify("专注完成 🍅", `${settings.focusMin} 分钟到了，去休息一下吧。`);
    } else {
      notify("休息结束 ☕", "回来继续专注吧。");
    }
  }, [kind, taskId, totalSec, settings.focusMin, settings.breakMin]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        clearInterval(id);
        finishSession();
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, finishSession]);

  const start = useCallback(() => {
    if (!startedRef.current) startedRef.current = new Date().toISOString();
    setRunning(true);
  }, []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(totalSec);
    startedRef.current = null;
  }, [totalSec]);

  const switchKind = useCallback(
    (k: SessionKind) => {
      setKind(k);
      setRunning(false);
      setRemaining(k === "focus" ? settings.focusMin * 60 : settings.breakMin * 60);
      startedRef.current = null;
    },
    [settings.focusMin, settings.breakMin],
  );

  const skipToEnd = useCallback(() => {
    if (!startedRef.current) startedRef.current = new Date().toISOString();
    void finishSession();
  }, [finishSession]);

  const saveSettings = useCallback((next: FocusSettings) => {
    const clamped: FocusSettings = {
      focusMin: clamp(next.focusMin, 1, 180),
      breakMin: clamp(next.breakMin, 1, 60),
    };
    setSettings(clamped);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(clamped));
  }, []);

  const setOnSessionRecorded = useCallback((fn: (() => void) | undefined) => {
    onRecordedRef.current = fn;
  }, []);

  return {
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
  };
}
