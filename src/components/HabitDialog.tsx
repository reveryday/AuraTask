import { useEffect, useState } from "react";
import type { Habit, HabitKind, NewHabit } from "../types";

const EMOJI_PRESETS = ["⭐", "📚", "🏃", "💪", "💧", "🧘", "📝", "🌙", "☀️", "🎯"];

interface Props {
  existing?: Habit | null;
  onCancel: () => void;
  onSubmit: (h: NewHabit) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onArchiveToggle?: () => Promise<void> | void;
}

export default function HabitDialog({
  existing,
  onCancel,
  onSubmit,
  onDelete,
  onArchiveToggle,
}: Props) {
  const editing = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? "⭐");
  const [kind, setKind] = useState<HabitKind>(existing?.kind ?? "binary");
  const [target, setTarget] = useState<string>(
    existing?.target_value != null ? String(existing.target_value) : "1",
  );
  const [unit, setUnit] = useState(existing?.unit ?? "小时");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await onSubmit({
      name: name.trim(),
      emoji,
      kind,
      target_value: kind === "quantity" ? Number(target) || 1 : null,
      unit: kind === "quantity" ? unit.trim() || null : null,
    });
    setBusy(false);
  };

  return (
    <div className="scrim" onMouseDown={onCancel}>
      <form className="dialog" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{editing ? "编辑习惯" : "新建习惯"}</h2>

        <div className="field-row">
          <div className="field">
            <label>名称</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="每天阅读、晨练、冥想…"
            />
          </div>
          <div className="field" style={{ maxWidth: 120 }}>
            <label>图标</label>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
          </div>
        </div>

        <div className="emoji-presets">
          {EMOJI_PRESETS.map((e) => (
            <button
              type="button"
              key={e}
              className={`emoji-preset ${emoji === e ? "active" : ""}`}
              onClick={() => setEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="field">
          <label>类型</label>
          <div className="segmented">
            <button
              type="button"
              className={kind === "binary" ? "active" : ""}
              onClick={() => setKind("binary")}
            >
              二元 · 做没做
            </button>
            <button
              type="button"
              className={kind === "quantity" ? "active" : ""}
              onClick={() => setKind("quantity")}
            >
              量化 · 看达标
            </button>
          </div>
        </div>

        {kind === "quantity" && (
          <div className="field-row">
            <div className="field">
              <label>目标值</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="field">
              <label>单位</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="小时、页、公里…"
              />
            </div>
          </div>
        )}

        <div className="dialog-footer">
          {editing && onDelete && (
            <button
              type="button"
              className="ghost-btn danger"
              onClick={async () => {
                if (!confirm("删除这个习惯？所有打卡记录将一并清除。")) return;
                setBusy(true);
                await onDelete();
                setBusy(false);
              }}
              disabled={busy}
            >
              删除
            </button>
          )}
          {editing && onArchiveToggle && (
            <button
              type="button"
              className="ghost-btn"
              onClick={async () => {
                setBusy(true);
                await onArchiveToggle();
                setBusy(false);
              }}
              disabled={busy}
            >
              {existing?.archived_at ? "恢复" : "归档"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="ghost-btn" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="primary-btn" disabled={busy || !name.trim()}>
            {editing ? "保存" : "添加"}
          </button>
        </div>
      </form>
    </div>
  );
}
