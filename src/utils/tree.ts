import type { MindmapNode } from "../types";

export interface PositionedNode {
  id: number;
  parent_id: number | null;
  text: string;
  task_id: number | null;
  depth: number;
  x: number;
  y: number;
}

const COL_WIDTH = 220;
const ROW_HEIGHT = 56;

/** Horizontal left-to-right tree layout. Root sits on the left, descendants extend to the right. */
export function buildTreeLayout(nodes: MindmapNode[]): PositionedNode[] {
  if (nodes.length === 0) return [];

  const childrenOf = new Map<number | null, MindmapNode[]>();
  for (const n of nodes) {
    const k = n.parent_id;
    const arr = childrenOf.get(k) ?? [];
    arr.push(n);
    childrenOf.set(k, arr);
  }
  for (const arr of childrenOf.values()) {
    arr.sort((a, b) => a.position - b.position || a.id - b.id);
  }

  const roots = childrenOf.get(null) ?? [];
  if (roots.length === 0) return [];
  const root = roots[0];

  const out: PositionedNode[] = [];

  // Returns the total vertical span (in row units) the subtree occupies.
  const assign = (n: MindmapNode, depth: number, startY: number): number => {
    const children = childrenOf.get(n.id) ?? [];
    if (children.length === 0) {
      out.push({
        id: n.id,
        parent_id: n.parent_id,
        text: n.text,
        task_id: n.task_id,
        depth,
        x: depth * COL_WIDTH,
        y: startY * ROW_HEIGHT,
      });
      return 1;
    }
    let consumed = 0;
    let firstChildCenter = 0;
    let lastChildCenter = 0;
    for (let i = 0; i < children.length; i++) {
      const childStart = startY + consumed;
      const childSpan = assign(children[i], depth + 1, childStart);
      const childCenter = childStart + (childSpan - 1) / 2;
      if (i === 0) firstChildCenter = childCenter;
      if (i === children.length - 1) lastChildCenter = childCenter;
      consumed += childSpan;
    }
    const myCenter = (firstChildCenter + lastChildCenter) / 2;
    out.push({
      id: n.id,
      parent_id: n.parent_id,
      text: n.text,
      task_id: n.task_id,
      depth,
      x: depth * COL_WIDTH,
      y: myCenter * ROW_HEIGHT,
    });
    return Math.max(consumed, 1);
  };

  assign(root, 0, 0);
  return out;
}
