import { MOOD_OPTIONS } from "../types";

interface Props {
  value: string | null;
  onPick: (emoji: string, score: number) => void;
  onClear: () => void;
}

export default function MoodPicker({ value, onPick, onClear }: Props) {
  return (
    <div className="mood-picker">
      <span className="mood-label">今天心情</span>
      <div className="mood-options">
        {MOOD_OPTIONS.map((m) => (
          <button
            key={m.emoji}
            className={`mood-btn ${value === m.emoji ? "selected" : ""}`}
            title={m.label}
            onClick={() => onPick(m.emoji, m.score)}
          >
            {m.emoji}
          </button>
        ))}
        {value && (
          <button className="mood-clear" onClick={onClear} title="清除">
            ×
          </button>
        )}
      </div>
    </div>
  );
}
