import type { Task } from "../types";
import { useT } from "../i18n";
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
  const { t } = useT();
  const pending = tasks.filter((task) => !task.completed_at);
  const done = tasks.filter((task) => !!task.completed_at);

  return (
    <div>
      <div className="day-header">
        <div className="day-counts" style={{ marginLeft: "auto" }}>
          {t(
            `${pending.length} 项待办 · ${done.length} 项完成`,
            `${pending.length} pending · ${done.length} done`,
          )}
        </div>
      </div>

      <div className="task-section">
        <div className="task-section-title">{t("待办", "To-do")}</div>
        {pending.length ? (
          <div className="task-list">
            {pending.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        ) : (
          <div className="empty">
            {t("收件箱是空的。", "Inbox is empty.")}
            <button className="link-btn" onClick={onAddClick}>
              {t("添加一个没有日期的任务", "Add an undated task")}
            </button>
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div className="task-section">
          <div className="task-section-title">{t("已完成", "Completed")}</div>
          <div className="task-list">
            {done.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
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
