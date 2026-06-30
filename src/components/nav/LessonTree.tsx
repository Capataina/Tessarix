import { useMemo } from "react";
import type { GraphLesson } from "../../lib/graph";
import "./LessonTree.css";

interface LessonTreeProps {
  lessons: GraphLesson[];
  onSelect: (slug: string) => void;
}

const NODE_W = 232;
const NODE_H = 96;
const GAP_X = 44;
const GAP_Y = 64;

interface Pos {
  x: number;
  y: number;
}

interface Layout {
  pos: Map<string, Pos>;
  edges: Array<{ from: Pos; to: Pos }>;
  width: number;
  height: number;
}

/**
 * Lay the lessons out as a layered prerequisite DAG (a NeetCode-style tree):
 * each lesson's row = the longest prerequisite chain that reaches it, so roots
 * sit at the top and dependents fan down; edges connect each prerequisite to its
 * dependent. Prerequisites that aren't lessons in this set (e.g. widget names
 * that share the frontmatter field) are filtered out.
 */
function computeLayout(lessons: GraphLesson[]): Layout {
  const bySlug = new Map(lessons.map((l) => [l.slug, l]));
  const realPrereqs = (l: GraphLesson) => l.prerequisites.filter((p) => bySlug.has(p));

  const layerOf = new Map<string, number>();
  const resolve = (slug: string, stack: Set<string>): number => {
    if (layerOf.has(slug)) return layerOf.get(slug)!;
    if (stack.has(slug)) return 0; // cycle guard
    stack.add(slug);
    const l = bySlug.get(slug)!;
    const pres = realPrereqs(l);
    const v = pres.length === 0 ? 0 : 1 + Math.max(...pres.map((p) => resolve(p, stack)));
    stack.delete(slug);
    layerOf.set(slug, v);
    return v;
  };
  for (const l of lessons) resolve(l.slug, new Set());

  const byLayer = new Map<number, GraphLesson[]>();
  for (const l of lessons) {
    const ly = layerOf.get(l.slug)!;
    if (!byLayer.has(ly)) byLayer.set(ly, []);
    byLayer.get(ly)!.push(l);
  }

  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  const maxRow = Math.max(...[...byLayer.values()].map((a) => a.length));
  const width = maxRow * (NODE_W + GAP_X) - GAP_X;

  const pos = new Map<string, Pos>();
  layers.forEach((ly, rowIdx) => {
    const row = byLayer.get(ly)!;
    const rowWidth = row.length * (NODE_W + GAP_X) - GAP_X;
    const offsetX = (width - rowWidth) / 2;
    row.forEach((l, i) => {
      pos.set(l.slug, {
        x: offsetX + i * (NODE_W + GAP_X),
        y: rowIdx * (NODE_H + GAP_Y),
      });
    });
  });

  const edges: Array<{ from: Pos; to: Pos }> = [];
  for (const l of lessons) {
    for (const p of realPrereqs(l)) {
      const from = pos.get(p);
      const to = pos.get(l.slug);
      if (from && to) edges.push({ from, to });
    }
  }

  const height = layers.length * (NODE_H + GAP_Y) - GAP_Y;
  return { pos, edges, width: Math.max(width, NODE_W), height };
}

function edgePath(from: Pos, to: Pos): string {
  // bottom-centre of the prerequisite → top-centre of the dependent, S-curve.
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y;
  const dy = (y2 - y1) / 2;
  return `M ${x1} ${y1} C ${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;
}

export function LessonTree({ lessons, onSelect }: LessonTreeProps) {
  const layout = useMemo(() => computeLayout(lessons), [lessons]);

  return (
    <div className="lesson-tree">
      <div
        className="lesson-tree__canvas"
        style={{ width: layout.width, height: layout.height }}
      >
        <svg
          className="lesson-tree__edges"
          width={layout.width}
          height={layout.height}
          aria-hidden
        >
          {layout.edges.map((e, i) => (
            <path key={i} className="lesson-tree__edge" d={edgePath(e.from, e.to)} />
          ))}
        </svg>

        {lessons.map((l) => {
          const p = layout.pos.get(l.slug)!;
          return (
            <button
              key={l.slug}
              type="button"
              className="lesson-tree__node"
              style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
              onClick={() => onSelect(l.slug)}
            >
              <span className="lesson-tree__node-title">{l.title}</span>
              {l.teaches.length > 0 && (
                <span className="lesson-tree__node-teaches">
                  {l.teaches.slice(0, 3).join(" · ")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
