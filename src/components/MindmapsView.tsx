import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createMindmap,
  createMindmapNode,
  deleteMindmap,
  deleteMindmapNode,
  listMindmapNodes,
  listMindmaps,
  listOpenTasks,
  renameMindmap,
  touchMindmap,
  updateMindmapNode,
} from "../db/database";
import type { Mindmap, MindmapNode, Task } from "../types";
import { buildTreeLayout, type PositionedNode } from "../utils/tree";

export default function MindmapsView() {
  const [maps, setMaps] = useState<Mindmap[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [nodes, setNodes] = useState<MindmapNode[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftText, setDraftText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const refreshMaps = useCallback(async () => {
    const list = await listMindmaps();
    setMaps(list);
    if (currentId == null && list.length > 0) setCurrentId(list[0].id);
    if (currentId != null && !list.find((m) => m.id === currentId)) {
      setCurrentId(list[0]?.id ?? null);
    }
  }, [currentId]);

  const refreshNodes = useCallback(async () => {
    if (currentId == null) {
      setNodes([]);
      return;
    }
    const list = await listMindmapNodes(currentId);
    setNodes(list);
    setSelectedId((cur) => {
      if (cur != null && list.find((n) => n.id === cur)) return cur;
      const root = list.find((n) => n.parent_id == null);
      return root?.id ?? null;
    });
  }, [currentId]);

  useEffect(() => {
    refreshMaps().catch(console.error);
    listOpenTasks().then(setTasks).catch(console.error);
  }, [refreshMaps]);

  useEffect(() => {
    refreshNodes().catch(console.error);
  }, [refreshNodes]);

  const positioned = useMemo(() => buildTreeLayout(nodes), [nodes]);
  const posById = useMemo(() => {
    const m = new Map<number, PositionedNode>();
    for (const p of positioned) m.set(p.id, p);
    return m;
  }, [positioned]);

  const taskById = useMemo(() => {
    const m = new Map<number, Task>();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  const onCreateMap = async () => {
    const title = prompt("新导图名称", "未命名");
    if (!title) return;
    const id = await createMindmap(title);
    setCurrentId(id);
    await refreshMaps();
  };

  const onRenameMap = async () => {
    if (currentId == null) return;
    const cur = maps.find((m) => m.id === currentId);
    const t = prompt("重命名", cur?.title ?? "");
    if (!t) return;
    await renameMindmap(currentId, t);
    await refreshMaps();
  };

  const onDeleteMap = async () => {
    if (currentId == null) return;
    if (!confirm("删除整张导图？所有节点都会丢失。")) return;
    await deleteMindmap(currentId);
    setCurrentId(null);
    await refreshMaps();
  };

  const startEdit = (n: MindmapNode | PositionedNode) => {
    setSelectedId(n.id);
    setEditingId(n.id);
    setDraftText(n.text);
  };

  const commitEdit = async () => {
    if (editingId == null) return;
    await updateMindmapNode(editingId, { text: draftText });
    if (currentId != null) await touchMindmap(currentId);
    setEditingId(null);
    await refreshNodes();
  };

  const addChild = async (parentId: number, andEdit = true) => {
    if (currentId == null) return;
    const sibs = nodes.filter((n) => n.parent_id === parentId);
    const pos = sibs.length;
    const id = await createMindmapNode(currentId, parentId, "新节点", pos);
    await refreshNodes();
    setSelectedId(id);
    if (andEdit) {
      setEditingId(id);
      setDraftText("新节点");
    }
  };

  const addSibling = async (afterId: number) => {
    const cur = nodes.find((n) => n.id === afterId);
    if (!cur || cur.parent_id == null || currentId == null) return;
    const sibs = nodes
      .filter((n) => n.parent_id === cur.parent_id)
      .sort((a, b) => a.position - b.position);
    const idx = sibs.findIndex((s) => s.id === afterId);
    const newPos = idx >= 0 ? idx + 1 : sibs.length;
    const id = await createMindmapNode(currentId, cur.parent_id, "新节点", newPos);
    await refreshNodes();
    setSelectedId(id);
    setEditingId(id);
    setDraftText("新节点");
  };

  const removeNode = async (id: number, ask = true) => {
    if (ask && !confirm("删除这个节点和它的所有子节点？")) return;
    const cur = nodes.find((n) => n.id === id);
    await deleteMindmapNode(id);
    if (currentId != null) await touchMindmap(currentId);
    await refreshNodes();
    if (cur?.parent_id != null) setSelectedId(cur.parent_id);
  };

  const linkTask = async (nodeId: number, taskId: number | null) => {
    await updateMindmapNode(nodeId, { task_id: taskId });
    setLinkingId(null);
    await refreshNodes();
  };

  // Keyboard shortcuts on the canvas (when not editing in an input)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (inInput) return;
      if (selectedId == null || currentId == null) return;

      if (e.key === "Tab") {
        e.preventDefault();
        addChild(selectedId);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cur = nodes.find((n) => n.id === selectedId);
        if (!cur) return;
        if (cur.parent_id == null) {
          // Root: enter adds a first-level child
          addChild(selectedId);
        } else {
          addSibling(selectedId);
        }
      } else if (e.key === "F2") {
        e.preventDefault();
        const cur = nodes.find((n) => n.id === selectedId);
        if (cur) startEdit(cur);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const cur = nodes.find((n) => n.id === selectedId);
        if (cur && cur.parent_id != null) {
          e.preventDefault();
          removeNode(selectedId);
        }
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, nodes, currentId]);

  const bounds = useMemo(() => {
    if (positioned.length === 0) return { minX: 0, maxX: 600, minY: 0, maxY: 400 };
    const padX = 240;
    const padY = 80;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of positioned) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
  }, [positioned]);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const ox = -bounds.minX;
  const oy = -bounds.minY;

  return (
    <div className="mindmap-wrap">
      <aside className="mindmap-rail">
        <div className="mindmap-rail-head">
          <span>我的导图</span>
          <button className="icon-btn" onClick={onCreateMap} title="新建导图">
            +
          </button>
        </div>
        {maps.length === 0 && (
          <div className="empty-small">
            还没有导图。
            <button className="link-btn" onClick={onCreateMap}>
              新建一个
            </button>
          </div>
        )}
        {maps.map((m) => (
          <button
            key={m.id}
            className={`mindmap-rail-item ${m.id === currentId ? "active" : ""}`}
            onClick={() => setCurrentId(m.id)}
          >
            {m.title}
          </button>
        ))}
      </aside>

      <div className="mindmap-canvas-wrap">
        {currentId == null ? (
          <div className="empty">选择或新建一张导图开始整理思路。</div>
        ) : (
          <>
            <div className="mindmap-toolbar">
              <button className="ghost-btn" onClick={onRenameMap}>
                重命名
              </button>
              <button className="ghost-btn danger" onClick={onDeleteMap}>
                删除
              </button>
              <span className="mindmap-hint">
                <kbd>Tab</kbd> 子主题 · <kbd>Enter</kbd> 同级 · <kbd>F2</kbd> 重命名 ·{" "}
                <kbd>Del</kbd> 删除 · 双击编辑
              </span>
            </div>
            <div
              className="mindmap-canvas-scroll"
              ref={canvasRef}
              tabIndex={0}
              onClick={() => setLinkingId(null)}
            >
              <div className="mindmap-canvas" style={{ width, height }}>
                <svg
                  className="mindmap-svg"
                  width={width}
                  height={height}
                  style={{ position: "absolute", left: 0, top: 0 }}
                >
                  {positioned.map((p) => {
                    if (p.parent_id == null) return null;
                    const par = posById.get(p.parent_id);
                    if (!par) return null;
                    // Draw from parent anchor to child anchor; the parent's box (higher z-index) hides
                    // the in-box portion, so the line visually emerges from the parent's right edge.
                    const x1 = par.x + ox;
                    const y1 = par.y + oy;
                    const x2 = p.x + ox;
                    const y2 = p.y + oy;
                    const mx = (x1 + x2) / 2;
                    return (
                      <path
                        key={`l${p.id}`}
                        d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                        stroke="var(--border-strong)"
                        strokeWidth={1.5}
                        fill="none"
                      />
                    );
                  })}
                </svg>

                {positioned.map((p) => {
                  const isEditing = editingId === p.id;
                  const isSelected = selectedId === p.id;
                  const linked = p.task_id ? taskById.get(p.task_id) : null;
                  return (
                    <div
                      key={p.id}
                      className={`mind-node depth-${Math.min(p.depth, 3)} ${
                        p.parent_id == null ? "is-root" : ""
                      } ${isSelected ? "is-selected" : ""}`}
                      style={{
                        left: p.x + ox,
                        top: p.y + oy,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(p.id);
                        canvasRef.current?.focus();
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEdit(p);
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.target as HTMLInputElement).blur();
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                            } else if (e.key === "Tab") {
                              e.preventDefault();
                              commitEdit().then(() => addChild(p.id));
                            }
                          }}
                        />
                      ) : (
                        <span className="mind-text">{p.text || "（空）"}</span>
                      )}
                      {linked && (
                        <span
                          className={`mind-task-chip ${linked.completed_at ? "done" : ""}`}
                          title={linked.title}
                        >
                          {linked.completed_at ? "✓" : "○"} {linked.title}
                        </span>
                      )}
                      <div className="mind-actions">
                        <button
                          className="icon-btn tiny"
                          title="添加子节点 (Tab)"
                          onClick={(e) => {
                            e.stopPropagation();
                            addChild(p.id);
                          }}
                        >
                          +
                        </button>
                        <button
                          className="icon-btn tiny"
                          title={linked ? "解除关联" : "关联任务"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (linked) linkTask(p.id, null);
                            else setLinkingId(linkingId === p.id ? null : p.id);
                          }}
                        >
                          ⛓
                        </button>
                        {p.parent_id != null && (
                          <button
                            className="icon-btn tiny danger"
                            title="删除 (Del)"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNode(p.id);
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {linkingId === p.id && (
                        <div className="mind-task-picker" onClick={(e) => e.stopPropagation()}>
                          {tasks.length === 0 ? (
                            <div className="empty-small">没有未完成的任务</div>
                          ) : (
                            tasks.slice(0, 12).map((t) => (
                              <button
                                key={t.id}
                                className="task-pick-row"
                                onClick={() => linkTask(p.id, t.id)}
                              >
                                <span
                                  className={`priority-dot ${t.priority >= 1 ? "p1" : "p0"}`}
                                />
                                <span className="ellipsis">{t.title}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
