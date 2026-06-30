import { useEffect, useMemo, useState } from "react";
import { buildGraph, type Category, type GraphCategory } from "../../lib/graph";
import { applyCategoryTheme } from "../../lib/graph/themes";
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  function openCategory(name: Category, topics: string[]) {
    setCategory(name);
    setExpanded(new Set(topics)); // expand all topics by default — show the lessons
  }

  function toggleTopic(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
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
              onClick={() => openCategory(c.name, c.topics.map((t) => t.name))}
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

      <div className="graphnav__tree">
        {active.topics.map((topic) => {
          const open = expanded.has(topic.name);
          return (
            <div className="graphnav__topic" key={topic.name} data-open={open}>
              <button
                type="button"
                className="graphnav__topic-head"
                aria-expanded={open}
                onClick={() => toggleTopic(topic.name)}
              >
                <span className="graphnav__caret" data-open={open}>
                  ▸
                </span>
                <span className="graphnav__topic-name">{topic.name}</span>
                <span className="graphnav__topic-count">
                  {topic.lessons.length}
                </span>
              </button>

              {open && (
                <ol className="graphnav__lessons">
                  {topic.lessons.map((l, i) => (
                    <li key={l.slug} className="graphnav__lesson">
                      <button
                        type="button"
                        className="graphnav__lesson-btn"
                        onClick={() => onSelect(l.slug)}
                      >
                        <span className="graphnav__lesson-idx">{i + 1}</span>
                        <span className="graphnav__lesson-main">
                          <span className="graphnav__lesson-title">{l.title}</span>
                          <span className="graphnav__lesson-summary">
                            {l.summary}
                          </span>
                          {l.teaches.length > 0 && (
                            <span className="graphnav__lesson-teaches">
                              {l.teaches.slice(0, 5).join("  ·  ")}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
