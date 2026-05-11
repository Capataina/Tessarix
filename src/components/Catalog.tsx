import { useCallback, useEffect, useMemo, useState } from "react";
import { LESSONS, type LessonRegistryEntry, type LessonFrontmatter } from "../lessons/registry";
import { useLLMStream } from "../lib/llm/hooks";
import { PERSONA } from "../lib/llm/prompts";
import { emit as emitTelemetry } from "../lib/telemetry";
import { RichText } from "./RichText";
import "./Catalog.css";

interface CatalogProps {
  onSelect: (slug: string) => void;
}

interface ResolvedLesson extends LessonRegistryEntry {
  fm: LessonFrontmatter | null;
}

export function Catalog({ onSelect }: CatalogProps) {
  const [resolved, setResolved] = useState<ResolvedLesson[]>(
    LESSONS.map((l) => ({ ...l, fm: null })),
  );
  const [query, setQuery] = useState("");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Resolve frontmatter once at mount.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      LESSONS.map(async (l) => ({ ...l, fm: await l.frontmatter })),
    ).then((rs) => {
      if (!cancelled) setResolved(rs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build the filter facets from the resolved frontmatter.
  const domains = useMemo(() => {
    const set = new Set<string>();
    resolved.forEach((l) => set.add(l.domain));
    return Array.from(set).sort();
  }, [resolved]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    resolved.forEach((l) => {
      (l.fm?.tags ?? []).forEach((t) => {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  }, [resolved]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resolved.filter((l) => {
      if (activeDomain && l.domain !== activeDomain) return false;
      if (activeTag && !(l.fm?.tags ?? []).includes(activeTag)) return false;
      if (q.length > 0) {
        const hay = [
          l.fm?.title ?? "",
          l.fm?.tag ?? "",
          l.summary,
          ...(l.fm?.tags ?? []),
          l.domain,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [resolved, query, activeDomain, activeTag]);

  return (
    <div className="catalog">
      <header className="catalog__head">
        <h1 className="catalog__title">Lesson Library</h1>
        <p className="catalog__subtitle">
          Pick a lesson, or ask the assistant below what to learn next.
        </p>
      </header>

      <Recommender resolved={resolved} onSelect={onSelect} />

      <div className="catalog__main">
        <aside className="catalog__filters" aria-label="Catalog filters">
          <div className="catalog__filter-group">
            <span className="catalog__filter-label">Search</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="title, topic, tag…"
              className="catalog__search"
            />
          </div>

          <div className="catalog__filter-group">
            <span className="catalog__filter-label">Domain</span>
            <div className="catalog__chips">
              <button
                type="button"
                className={`catalog__chip ${activeDomain === null ? "catalog__chip--active" : ""}`}
                onClick={() => setActiveDomain(null)}
              >
                All
              </button>
              {domains.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`catalog__chip ${activeDomain === d ? "catalog__chip--active" : ""}`}
                  onClick={() => setActiveDomain(activeDomain === d ? null : d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="catalog__filter-group">
            <span className="catalog__filter-label">Tags</span>
            <div className="catalog__chips">
              {tags.map(([t, n]) => (
                <button
                  key={t}
                  type="button"
                  className={`catalog__chip catalog__chip--tag ${activeTag === t ? "catalog__chip--active" : ""}`}
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                >
                  {t}
                  <span className="catalog__chip-count">{n}</span>
                </button>
              ))}
            </div>
          </div>

          {(activeDomain || activeTag || query) && (
            <button
              type="button"
              className="catalog__clear"
              onClick={() => {
                setActiveDomain(null);
                setActiveTag(null);
                setQuery("");
              }}
            >
              Clear filters
            </button>
          )}
        </aside>

        <section className="catalog__results">
          <div className="catalog__results-meta">
            {filtered.length} {filtered.length === 1 ? "lesson" : "lessons"}
          </div>

          <div className="catalog__cards">
            {filtered.map((l) => (
              <CatalogCard key={l.slug} lesson={l} onSelect={onSelect} />
            ))}
            {filtered.length === 0 && (
              <div className="catalog__empty">
                Nothing matches the current filters. Try clearing one.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

interface CatalogCardProps {
  lesson: ResolvedLesson;
  onSelect: (slug: string) => void;
}

function CatalogCard({ lesson, onSelect }: CatalogCardProps) {
  const fm = lesson.fm;
  return (
    <button
      type="button"
      className="catalog-card"
      onClick={() => onSelect(lesson.slug)}
    >
      <div className="catalog-card__domain">{lesson.domain}</div>
      <h3 className="catalog-card__title">{fm?.title ?? lesson.slug}</h3>
      <p className="catalog-card__summary">{lesson.summary}</p>
      <div className="catalog-card__meta">
        {fm?.estimated_time && (
          <span className="catalog-card__chip">{fm.estimated_time}</span>
        )}
        {fm?.last_updated && (
          <span className="catalog-card__chip catalog-card__chip--muted">
            updated {fm.last_updated}
          </span>
        )}
      </div>
      {fm?.tags && fm.tags.length > 0 && (
        <div className="catalog-card__tags">
          {fm.tags.slice(0, 4).map((t) => (
            <span key={t} className="catalog-card__tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommender — the AI panel that suggests lessons given a free-text query
// ─────────────────────────────────────────────────────────────────────────────

interface RecommenderProps {
  resolved: ResolvedLesson[];
  onSelect: (slug: string) => void;
}

function Recommender({ resolved, onSelect }: RecommenderProps) {
  const { text, isStreaming, error, stream, reset } = useLLMStream();
  const [input, setInput] = useState("");

  const catalogSummary = useMemo(() => {
    return resolved
      .map(
        (l) =>
          `slug: ${l.slug}\n  domain: ${l.domain}\n  title: ${l.fm?.title ?? ""}\n  tags: ${(l.fm?.tags ?? []).join(", ")}\n  summary: ${l.summary}`,
      )
      .join("\n\n");
  }, [resolved]);

  const handleAsk = useCallback(async () => {
    const q = input.trim();
    if (!q || isStreaming) return;
    emitTelemetry({
      kind: "click",
      data: {
        widget: "catalog_recommender",
        target_role: "ask",
        target_label: q,
      },
    });
    const system = `${PERSONA}

You are a Tessarix lesson recommender. The reader will tell you what they want to learn. You will respond with a short recommendation from the AVAILABLE LESSONS list below.

Rules:
1. Recommend at most 3 lessons, in order of relevance. Most queries should recommend 1 lesson; only branch to 2 or 3 when the topic genuinely spans multiple lessons.
2. For each recommendation, write 1-2 sentences explaining WHY this lesson matches the reader's interest. Reference what the lesson covers (from its summary).
3. After the recommendations, write one short sentence about what's NOT in the library that the reader might also want — be honest about gaps.
4. Reference each lesson by its title, NOT its slug.
5. If nothing in the library matches the reader's request, say so plainly and suggest a related lesson if one exists, or recommend external resources only when the gap is total.
6. Stay under 6 sentences total. No markdown headings.`;

    const userMsg = `AVAILABLE LESSONS:

${catalogSummary}

READER'S REQUEST: ${q}

Recommend.`;

    await stream(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      {
        temperature: 0.3,
        maxTokens: 350,
        telemetryFeature: "chatbot",
      },
    );
  }, [input, isStreaming, stream, catalogSummary]);

  return (
    <section className="catalog-recommender" aria-label="AI lesson recommender">
      <header className="catalog-recommender__head">
        <span className="catalog-recommender__label">Ask the assistant</span>
        <span className="catalog-recommender__hint">
          Describe what you want to learn — the assistant will suggest a lesson
          from the library.
        </span>
      </header>

      <div className="catalog-recommender__input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAsk();
            }
          }}
          placeholder="e.g. 'I want to understand how matrices transform space'"
          className="catalog-recommender__input"
        />
        <button
          type="button"
          className="catalog-recommender__send"
          onClick={() => void handleAsk()}
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? "Thinking…" : "Recommend"}
        </button>
        {text && (
          <button
            type="button"
            className="catalog-recommender__reset"
            onClick={() => reset()}
          >
            Clear
          </button>
        )}
      </div>

      {(text || isStreaming || error) && (
        <div className="catalog-recommender__output">
          <RichText text={text || (isStreaming ? "Thinking…" : "")} />
          {error && (
            <div className="catalog-recommender__error">
              Couldn't get a recommendation ({error}). Browse the cards
              directly while we sort this out.
            </div>
          )}
          {!isStreaming && text && (
            <RecommendationQuickLinks
              text={text}
              resolved={resolved}
              onSelect={onSelect}
            />
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Extract candidate lesson titles from the recommender's prose and surface
 * them as one-click chips. The LLM might mention a lesson title verbatim or
 * paraphrase it; we match each lesson's title and a few key tags against the
 * output text.
 */
function RecommendationQuickLinks({
  text,
  resolved,
  onSelect,
}: {
  text: string;
  resolved: ResolvedLesson[];
  onSelect: (slug: string) => void;
}) {
  const matches = useMemo(() => {
    const lower = text.toLowerCase();
    return resolved.filter((l) => {
      const title = (l.fm?.title ?? "").toLowerCase();
      if (title && lower.includes(title)) return true;
      const tag = (l.fm?.tag ?? "").toLowerCase();
      if (tag && lower.includes(tag)) return true;
      // Match the domain too — "image quality", "mathematics"
      if (lower.includes(l.domain.toLowerCase())) return true;
      return false;
    });
  }, [text, resolved]);

  if (matches.length === 0) return null;

  return (
    <div className="catalog-recommender__quicklinks">
      <span className="catalog-recommender__quicklinks-label">Jump to:</span>
      {matches.map((l) => (
        <button
          key={l.slug}
          type="button"
          className="catalog-recommender__quicklink"
          onClick={() => onSelect(l.slug)}
        >
          {l.fm?.title ?? l.slug} →
        </button>
      ))}
    </div>
  );
}
