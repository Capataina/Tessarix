import { useEffect, useMemo, useState } from "react";
import { buildGraph, type Category, type GraphCategory } from "../../lib/graph";
import { applyCategoryTheme } from "../../lib/graph/themes";
import { LessonTree } from "./LessonTree";
import "./GraphNav.css";

interface GraphNavProps {
  onSelect: (slug: string) => void;
}

/**
 * The concept-graph front door, replacing the card grid. Two levels:
 *
 *   1. a category picker (Mathematics, Machine Learning, …)
 *   2. on selecting a category — the app recolours to that category's palette —
 *      an expandable topic ▸ lesson tree, lessons ordered by prerequisite (a
 *      topological sort), each showing the concepts it teaches.
 *
 * A genuine browse graph: it shows what to learn in what order and which concepts
 * each lesson owns, rather than a flat wall of cards. See
 * context/plans/curriculum-graph.md.
 */
export function GraphNav({ onSelect }: GraphNavProps) {
  const [graph, setGraph] = useState<GraphCategory[] | null>(null);
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    let live = true;
    void buildGraph().then((g) => {
      if (live) setGraph(g);
    });
    return () => {
      live = false;
    };
  }, []);

  // Recolour the app to the active category (or the house palette at the picker).
  useEffect(() => {
    applyCategoryTheme(category);
  }, [category]);

  const active = useMemo(
    () => graph?.find((c) => c.name === category) ?? null,
    [graph, category],
  );

  function openCategory(name: Category) {
    setCategory(name);
  }

  if (!graph) {
    return <div className="graphnav__loading">Mapping the curriculum…</div>;
  }

  if (!active) {
    return (
      <div className="graphnav" data-view="picker">
        <header className="graphnav__intro">
          <h1 className="graphnav__title">The map</h1>
          <p className="graphnav__lede">
            Pick a domain to open its concept graph — topics branch into lessons,
            in the order they build on each other.
          </p>
        </header>
        <div className="graphnav__categories">
          {graph.map((c) => (
            <button
              key={c.name}
              type="button"
              className="graphnav__category"
              data-category={c.name}
              onClick={() => openCategory(c.name)}
            >
              <span className="graphnav__category-name">{c.name}</span>
              <span className="graphnav__category-meta">
                {c.topics.length} {c.topics.length === 1 ? "topic" : "topics"} ·{" "}
                {c.lessonCount} {c.lessonCount === 1 ? "lesson" : "lessons"}
              </span>
              <span className="graphnav__category-topics">
                {c.topics.map((t) => t.name).join("  ·  ")}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="graphnav" data-view="tree" data-category={active.name}>
      <button
        type="button"
        className="graphnav__back"
        onClick={() => setCategory(null)}
      >
        ← all domains
      </button>
      <header className="graphnav__cat-head">
        <h1 className="graphnav__title">{active.name}</h1>
        <span className="graphnav__cat-count">{active.lessonCount} lessons</span>
      </header>

      <LessonTree
        lessons={active.topics.flatMap((t) => t.lessons)}
        onSelect={onSelect}
      />
    </div>
  );
}
