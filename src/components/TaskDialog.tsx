import { useEffect, useState } from "react";
import type { NewTask, Priority, Task, TimeSlot } from "../types";
import { TIME_SLOT_LABEL, TIME_SLOT_ORDER } from "../types";

interface Props {
  defaultDate: string;
  defaultNoDate?: boolean;
  existing?: Task | null;
  onCancel: () => void;
  onSubmit: (t: NewTask) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

export default function TaskDialog({
  defaultDate,
  defaultNoDate,
  existing,
  onCancel,
  onSubmit,
  onDelete,
}: Props) {
  const editing = !!existing;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [subject, setSubject] = useState(existing?.subject ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [noDate, setNoDate] = useState(
    existing ? existing.due_date === null : !!defaultNoDate,
  );
  const [date, setDate] = useState(existing?.due_date ?? defaultDate);
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 1);
  const [slot, setSlot] = useState<TimeSlot | null>(existing?.time_slot ?? null);
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
    if (!title.trim() || busy) return;
    setBusy(true);
    await onSubmit({
      title: title.trim(),
      subject: subject.trim() || null,
      notes: notes.trim() || null,
      priority,
      due_date: noDate ? null : date,
      time_slot: noDate ? null : slot,
    });
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!onDelete || busy) return;
    if (!confirm("确定删除这个任务？")) return;
    setBusy(true);
    await onDelete();
    setBusy(false);
  };

  return (
    <div className="scrim" onMouseDown={onCancel}>
      <form className="dialog" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{editing ? "编辑任务" : "新建任务"}</h2>
        <div className="field">
          <label>标题</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：完成论文初稿引言部分"
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={noDate}
              style={noDate ? { opacity: 0.5 } : undefined}
            />
          </div>
          <div className="field">
            <label>类型</label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as Priority)}
            >
              <option value={1}>主要</option>
              <option value={0}>延伸</option>
            </select>
          </div>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={noDate}
            onChange={(e) => setNoDate(e.target.checked)}
          />
          <span>暂不指定日期（放入「稍后」收件箱）</span>
        </label>

        {!noDate && (
          <div className="field">
            <label>时间段</label>
            <div className="segmented slot-seg">
              <button
                type="button"
                className={slot === null ? "active" : ""}
                onClick={() => setSlot(null)}
              >
                全天
              </button>
              {TIME_SLOT_ORDER.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`slot-${s} ${slot === s ? "active" : ""}`}
                  onClick={() => setSlot(s)}
                >
                  {TIME_SLOT_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <label>标签（可选）</label>
          <input
            value={subject ?? ""}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="论文、组会、阅读…"
          />
        </div>
        <div className="field">
          <label>备注（可选）</label>
          <textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="dialog-footer">
          {editing && onDelete && (
            <button
              type="button"
              className="ghost-btn danger"
              onClick={handleDelete}
              disabled={busy}
            >
              删除
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="ghost-btn" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="primary-btn" disabled={busy || !title.trim()}>
            {editing ? "保存" : "添加"}
          </button>
        </div>
      </form>
    </div>
  );
}
