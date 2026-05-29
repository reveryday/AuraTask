export type Priority = 0 | 1; // 0 = 延伸, 1 = 主要

export type TimeSlot = "morning" | "afternoon" | "evening";

export const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
};
const TIME_SLOT_LABEL_EN: Record<TimeSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};
export const TIME_SLOT_ORDER: TimeSlot[] = ["morning", "afternoon", "evening"];
export const timeSlotLabel = (s: TimeSlot, lang: "zh" | "en" = "zh") =>
  (lang === "zh" ? TIME_SLOT_LABEL : TIME_SLOT_LABEL_EN)[s];

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  subject: string | null;
  priority: Priority;
  due_date: string | null; // YYYY-MM-DD or null for inbox
  completed_at: string | null;
  created_at: string;
  time_slot: TimeSlot | null;
  position: number;
}

export interface NewTask {
  title: string;
  notes?: string | null;
  subject?: string | null;
  priority?: Priority;
  due_date: string | null;
  time_slot?: TimeSlot | null;
}

export type ViewMode =
  | "day"
  | "week"
  | "month"
  | "focus"
  | "stats"
  | "inbox"
  | "habits"
  | "mindmaps";

export interface Mindmap {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MindmapNode {
  id: number;
  mindmap_id: number;
  parent_id: number | null;
  text: string;
  task_id: number | null;
  position: number;
}

export type HabitKind = "binary" | "quantity";

export interface Habit {
  id: number;
  name: string;
  emoji: string;
  kind: HabitKind;
  target_value: number | null;
  unit: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface NewHabit {
  name: string;
  emoji: string;
  kind: HabitKind;
  target_value: number | null;
  unit: string | null;
}

export interface HabitLog {
  habit_id: number;
  date: string;
  value: number;
}

export type SessionKind = "focus" | "break";

export interface FocusSession {
  id: number;
  task_id: number | null;
  kind: SessionKind;
  duration_sec: number;
  session_date: string;
  started_at: string;
  ended_at: string;
}

export interface NewFocusSession {
  task_id: number | null;
  kind: SessionKind;
  duration_sec: number;
  started_at: string;
  ended_at: string;
}

export interface DayMetric {
  date: string;
  focus_min: number;
  done: number;
  planned: number;
}

export interface SubjectMetric {
  subject: string;
  focus_min: number;
  task_count: number;
}

export interface DailyMood {
  date: string;
  mood: string; // emoji
  score: number; // 1..5
}

export interface DailyNote {
  date: string;
  text: string;
}

export const MOOD_OPTIONS: { emoji: string; score: number; label: string; labelEn: string }[] = [
  { emoji: "😄", score: 5, label: "很好", labelEn: "Great" },
  { emoji: "🙂", score: 4, label: "不错", labelEn: "Good" },
  { emoji: "😐", score: 3, label: "一般", labelEn: "Okay" },
  { emoji: "😕", score: 2, label: "不太好", labelEn: "Meh" },
  { emoji: "😭", score: 1, label: "糟糕", labelEn: "Bad" },
];
