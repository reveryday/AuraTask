import type { Task } from "../types";
import TaskItem from "./TaskItem";

interface Props {
  tasks: Task[];
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
  onEdit: (t: Task) => void;
  onAddClick: () => void;
}

export default function InboxView({
  tasks,
  onToggle,
  onDelete,
  onEdit,
  onAddClick,
}: Props) {
  const pending = tasks.filter((t) => !t.completed_at);
  const done = tasks.filter((t) => !!t.completed_at);

  return (
    <div>
      <div className="day-header">
        <div className="day-counts" style={{ marginLeft: "auto" }}>
          {pending.length} 项待办 · {done.length} 项完成
        </div>
      </div>

      <div className="task-section">
        <div className="task-section-title">待办</div>
        {pending.length ? (
          <div className="task-list">
            {pending.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            收件箱是空的。
            <button className="link-btn" onClick={onAddClick}>
              添加一个没有日期的任务
            </button>
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div className="task-section">
          <div className="task-section-title">已完成</div>
          <div className="task-list">
            {done.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
