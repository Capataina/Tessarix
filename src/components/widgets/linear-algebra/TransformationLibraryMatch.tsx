/**
 * TransformationLibraryMatch — drag-to-connect matching game.
 *
 * Used by:
 *   - linear-algebra-matrices
 *
 * THIS IS A MATCHING PUZZLE. The reader has six geometric transformation
 * names on the left ("Rotate 90°", "Scale x by 2", "Shear-x by 1", …)
 * and six matrices on the right. The reader's job is to draw a line
 * from each name to the matrix that produces that transformation.
 * Connections are made by clicking a name and then a matrix — the line
 * is drawn between the two endpoints on an SVG overlay. Each completed
 * pair is graded immediately: green if the named transformation is
 * the matrix on the right, red otherwise. A wrong pair can be removed
 * by clicking either endpoint again.
 *
 * The mechanic is new for this codebase:
 *   - Two-column matching with literal lines connecting the columns.
 *   - Each click toggles the "selected" endpoint on either side; once
 *     one endpoint from each column is selected, a pair is made.
 *   - SVG overlay layered above the columns so the lines feel attached
 *     to the buttons rather than floating.
 *
 * Pedagogically: this is the mapping from geometric names to matrix
 * entries — the most basic translation in the matrices toolkit. The
 * reader internalises "rotation by θ" as the matrix [[cos θ, -sin θ];
 * [sin θ, cos θ]], "shear-x by k" as [[1, k]; [0, 1]], etc. The drag-to-
 * connect mechanic forces a commitment — you cannot match by selecting
 * multiple-choice options, you have to PAIR things and then live with
 * the pairing until the next click.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./TransformationLibraryMatch.css";

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface NamedTransformation {
  id: string;
  label: string;
  /** Hint shown next to the name on hover — keeps the lesson honest about
   *  what the geometric description actually means. */
  hint: string;
  matrix: Matrix2;
}

const LIBRARY: NamedTransformation[] = [
  {
    id: "identity",
    label: "Identity",
    hint: "Leaves every point where it is.",
    matrix: { a: 1, b: 0, c: 0, d: 1 },
  },
  {
    id: "rot90",
    label: "Rotate 90° anticlockwise",
    hint: "θ = π/2: cos θ = 0, sin θ = 1.",
    matrix: { a: 0, b: -1, c: 1, d: 0 },
  },
  {
    id: "rot30",
    label: "Rotate 30° anticlockwise",
    hint: "θ = π/6: cos θ ≈ 0.866, sin θ = 0.5.",
    matrix: { a: 0.866, b: -0.5, c: 0.5, d: 0.866 },
  },
  {
    id: "scale2v",
    label: "Scale 2× vertically",
    hint: "x unchanged; y doubled.",
    matrix: { a: 1, b: 0, c: 0, d: 2 },
  },
  {
    id: "shearx1",
    label: "Shear-x by 1",
    hint: "Each point's x shifts by its own y.",
    matrix: { a: 1, b: 1, c: 0, d: 1 },
  },
  {
    id: "refl_x",
    label: "Reflect across the x-axis",
    hint: "x unchanged; y negated.",
    matrix: { a: 1, b: 0, c: 0, d: -1 },
  },
];

/**
 * Pre-shuffled order of the matrices column. Re-shuffling on every render
 * would jitter the right column on every state change — the reader needs a
 * stable layout to drag lines against. We re-shuffle only on "new round".
 */
function shuffleMatrixOrder(items: NamedTransformation[]): string[] {
  const ids = items.map((x) => x.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

function formatEntry(n: number): string {
  // Keep small integers integer-looking; show rotation entries to 3 dp.
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(3);
}

function matrixLabel(m: Matrix2): string {
  return `[[${formatEntry(m.a)}, ${formatEntry(m.b)}], [${formatEntry(m.c)}, ${formatEntry(m.d)}]]`;
}

interface MatchPair {
  /** id from the name column */
  nameId: string;
  /** id from the matrix column (same id space — the matrix column is a
   *  shuffled list of NamedTransformation entries, so its id matches the
   *  CORRECT pairing). */
  matrixId: string;
}

interface TransformationLibraryMatchProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function TransformationLibraryMatch({
  onStateChange,
}: TransformationLibraryMatchProps) {
  const { recordInteraction } = useWidgetTelemetry("TransformationLibraryMatch");

  // The order of the names column is fixed (it's the LIBRARY order). The
  // matrices column is shuffled at mount time and on "new round".
  const [matrixOrder, setMatrixOrder] = useState<string[]>(() =>
    shuffleMatrixOrder(LIBRARY),
  );
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedMatrix, setSelectedMatrix] = useState<string | null>(null);

  // Refs into the DOM so we can compute SVG line endpoints from the actual
  // rendered button positions. The container ref is the SVG's coordinate
  // space; the button refs anchor each line.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nameRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const matrixRefs = useRef<Map<string, HTMLElement | null>>(new Map());
  const [renderTick, setRenderTick] = useState(0);

  // When pairs or layout changes, force an SVG re-render so the lines
  // catch up to the current button positions.
  useEffect(() => {
    setRenderTick((t) => t + 1);
  }, [pairs, matrixOrder]);

  // Recompute lines on window resize too — the columns stack on narrow
  // viewports and the absolute coordinates need to follow.
  useEffect(() => {
    const onResize = () => setRenderTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const correctCount = pairs.filter((p) => p.nameId === p.matrixId).length;
  const wrongCount = pairs.length - correctCount;
  const totalPossible = LIBRARY.length;
  const isComplete = pairs.length === totalPossible;
  const isPerfect = isComplete && wrongCount === 0;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      pair_count: pairs.length,
      correct: correctCount,
      wrong: wrongCount,
      complete: isComplete ? 1 : 0,
      perfect: isPerfect ? 1 : 0,
      total: totalPossible,
    });
  }, [pairs.length, correctCount, wrongCount, isComplete, isPerfect, totalPossible, onStateChange]);

  const stateSummary = useMemo(() => {
    if (pairs.length === 0)
      return `Matching game open; no pairs made yet. Six transformations to match against six matrices.`;
    const lines = pairs.map((p) => {
      const name = LIBRARY.find((x) => x.id === p.nameId);
      const matrix = LIBRARY.find((x) => x.id === p.matrixId);
      const correct = p.nameId === p.matrixId;
      return `"${name?.label}" → ${matrix ? matrixLabel(matrix.matrix) : "?"} ${correct ? "✓" : "✗"}`;
    });
    const status = isComplete
      ? isPerfect
        ? `All six pairs correct.`
        : `All six pairs placed; ${wrongCount} are wrong.`
      : `${pairs.length} of ${totalPossible} placed; ${correctCount} correct so far.`;
    return `Matching: ${lines.join("; ")}. ${status}`;
  }, [pairs, correctCount, wrongCount, isComplete, isPerfect, totalPossible]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        pairs: pairs.map((p) => [p.nameId, p.matrixId]),
        complete: isComplete,
      }),
    [pairs, isComplete],
  );

  const handleSelectName = useCallback(
    (id: string) => {
      // If this name is already paired, remove the pair (toggle behaviour).
      const existing = pairs.find((p) => p.nameId === id);
      if (existing) {
        setPairs((prev) => prev.filter((p) => p.nameId !== id));
        recordInteraction("unpair", { from: "name", name_id: id });
        return;
      }
      // Otherwise: if a matrix is selected, complete the pair. Else select.
      if (selectedMatrix) {
        setPairs((prev) => [...prev, { nameId: id, matrixId: selectedMatrix }]);
        recordInteraction("pair", {
          name_id: id,
          matrix_id: selectedMatrix,
          correct: id === selectedMatrix,
        });
        setSelectedName(null);
        setSelectedMatrix(null);
        return;
      }
      setSelectedName(id === selectedName ? null : id);
    },
    [pairs, selectedMatrix, selectedName, recordInteraction],
  );

  const handleSelectMatrix = useCallback(
    (id: string) => {
      const existing = pairs.find((p) => p.matrixId === id);
      if (existing) {
        setPairs((prev) => prev.filter((p) => p.matrixId !== id));
        recordInteraction("unpair", { from: "matrix", matrix_id: id });
        return;
      }
      if (selectedName) {
        setPairs((prev) => [...prev, { nameId: selectedName, matrixId: id }]);
        recordInteraction("pair", {
          name_id: selectedName,
          matrix_id: id,
          correct: selectedName === id,
        });
        setSelectedName(null);
        setSelectedMatrix(null);
        return;
      }
      setSelectedMatrix(id === selectedMatrix ? null : id);
    },
    [pairs, selectedName, selectedMatrix, recordInteraction],
  );

  const handleNewRound = useCallback(() => {
    setMatrixOrder(shuffleMatrixOrder(LIBRARY));
    setPairs([]);
    setSelectedName(null);
    setSelectedMatrix(null);
    recordInteraction("new_round");
  }, [recordInteraction]);

  const handleReveal = useCallback(() => {
    // Fill in any missing pairs with the correct answer. Existing wrong
    // pairs are replaced with correct ones.
    setPairs(LIBRARY.map((x) => ({ nameId: x.id, matrixId: x.id })));
    setSelectedName(null);
    setSelectedMatrix(null);
    recordInteraction("reveal");
  }, [recordInteraction]);

  return (
    <div className={`tlm${isPerfect ? " tlm--perfect" : ""}`}>
      <header className="tlm__head">
        <div className="tlm__heading">
          <span className="tlm__heading-label">PAIRS</span>
          <span className="tlm__heading-value">
            {pairs.length} / {totalPossible}
          </span>
        </div>
        <div className="tlm__heading">
          <span className="tlm__heading-label">CORRECT</span>
          <span
            className={`tlm__heading-value${
              isComplete && isPerfect ? " tlm__heading-value--ok" : ""
            }${
              isComplete && !isPerfect ? " tlm__heading-value--warn" : ""
            }`}
          >
            {correctCount} / {pairs.length}
            {pairs.length > 0 &&
              ` · ${Math.round((correctCount / pairs.length) * 100)}%`}
          </span>
        </div>
        <div className="tlm__heading">
          <span className="tlm__heading-label">CONTROLS</span>
          <div className="tlm__heading-actions">
            <button
              type="button"
              className="tlm__action"
              onClick={handleReveal}
              disabled={isPerfect}
            >
              Reveal all
            </button>
            <button
              type="button"
              className="tlm__action tlm__action--primary"
              onClick={handleNewRound}
            >
              New round
            </button>
          </div>
        </div>
      </header>

      <div className="tlm__board" ref={containerRef}>
        <div className="tlm__column tlm__column--left">
          <div className="tlm__col-label">TRANSFORMATIONS</div>
          {LIBRARY.map((t) => {
            const pair = pairs.find((p) => p.nameId === t.id);
            const correct = pair && pair.nameId === pair.matrixId;
            const placed = !!pair;
            const selected = selectedName === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  nameRefs.current.set(t.id, el);
                }}
                type="button"
                className={`tlm__chip tlm__chip--name${
                  selected ? " tlm__chip--selected" : ""
                }${
                  placed
                    ? correct
                      ? " tlm__chip--correct"
                      : " tlm__chip--wrong"
                    : ""
                }`}
                onClick={() => handleSelectName(t.id)}
                title={t.hint}
              >
                <span className="tlm__chip-label">{t.label}</span>
                <span className="tlm__chip-port tlm__chip-port--right" />
              </button>
            );
          })}
        </div>

        <div className="tlm__column tlm__column--right">
          <div className="tlm__col-label">MATRICES</div>
          {matrixOrder.map((id) => {
            const item = LIBRARY.find((x) => x.id === id);
            if (!item) return null;
            const pair = pairs.find((p) => p.matrixId === id);
            const correct = pair && pair.nameId === pair.matrixId;
            const placed = !!pair;
            const selected = selectedMatrix === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  matrixRefs.current.set(id, el);
                }}
                type="button"
                className={`tlm__chip tlm__chip--matrix${
                  selected ? " tlm__chip--selected" : ""
                }${
                  placed
                    ? correct
                      ? " tlm__chip--correct"
                      : " tlm__chip--wrong"
                    : ""
                }`}
                onClick={() => handleSelectMatrix(id)}
              >
                <span className="tlm__chip-port tlm__chip-port--left" />
                <span className="tlm__matrix-grid">
                  <span>{formatEntry(item.matrix.a)}</span>
                  <span>{formatEntry(item.matrix.b)}</span>
                  <span>{formatEntry(item.matrix.c)}</span>
                  <span>{formatEntry(item.matrix.d)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <ConnectionOverlay
          containerRef={containerRef}
          nameRefs={nameRefs}
          matrixRefs={matrixRefs}
          pairs={pairs}
          renderTick={renderTick}
        />
      </div>

      <div
        className={`tlm__verdict tlm__verdict--${
          !isComplete ? "working" : isPerfect ? "perfect" : "review"
        }`}
      >
        <span className="tlm__verdict-label">Status</span>
        <span className="tlm__verdict-value">
          {!isComplete && !selectedName && !selectedMatrix &&
            "Click a transformation name on the left, then click the matrix on the right that produces it. The line will appear between them. Click either endpoint of a wrong pair to break it."}
          {!isComplete && selectedName &&
            `Selected: "${LIBRARY.find((x) => x.id === selectedName)?.label}". Now click the matrix on the right that produces it.`}
          {!isComplete && selectedMatrix &&
            `Selected a matrix. Now click the transformation name on the left that produces it.`}
          {isComplete && isPerfect &&
            `All six pairs correct. The columns of each matrix are exactly the images of the basis vectors î and ĵ under the named transformation — that's the reflex this game cements.`}
          {isComplete && !isPerfect &&
            `${wrongCount} of your pairs are wrong (marked red). Click either endpoint of a red line to break the pairing and try again.`}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Transformation library match — connect names to matrices"
        widgetDescription="A matching-game widget. The reader sees six named geometric transformations on the left column (Identity, Rotate 90°, Rotate 30°, Scale 2× vertically, Shear-x by 1, Reflect across x-axis) and the same six transformations' matrices shuffled into the right column. The reader pairs each name to its matrix by clicking a name then clicking a matrix; a coloured line is drawn between the two on an SVG overlay (green for correct, red for incorrect, evaluated instantly). The matrix entries are shown as a 2×2 grid; the named transformations' tooltips contain the geometric rationale (e.g. 'θ = π/2: cos θ = 0, sin θ = 1' for Rotate 90°). The pedagogical goal is rote translation between geometric description and matrix entries — the reflex that 'shear-x by k' has matrix [[1, k]; [0, 1]] and 'scale-y by s' has matrix [[1, 0]; [0, s]]. The widget reports pair count, correct count, and percentage accuracy."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

// ─── SVG overlay ─────────────────────────────────────────────────────────

interface ConnectionOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  nameRefs: React.RefObject<Map<string, HTMLElement | null>>;
  matrixRefs: React.RefObject<Map<string, HTMLElement | null>>;
  pairs: MatchPair[];
  renderTick: number;
}

function ConnectionOverlay({
  containerRef,
  nameRefs,
  matrixRefs,
  pairs,
  renderTick,
}: ConnectionOverlayProps) {
  // Compute line endpoints in the container's local coordinate space.
  // Re-runs whenever renderTick bumps (which happens on pair change and
  // window resize).
  const lines = useMemo(() => {
    const container = containerRef.current;
    if (!container) return [];
    const containerRect = container.getBoundingClientRect();
    const compute = (el: HTMLElement | null, side: "right" | "left") => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const x = side === "right" ? r.right : r.left;
      const y = r.top + r.height / 2;
      return { x: x - containerRect.left, y: y - containerRect.top };
    };
    return pairs.flatMap((p) => {
      const start = compute(nameRefs.current?.get(p.nameId) ?? null, "right");
      const end = compute(matrixRefs.current?.get(p.matrixId) ?? null, "left");
      if (!start || !end) return [];
      const correct = p.nameId === p.matrixId;
      return [{ key: `${p.nameId}-${p.matrixId}`, start, end, correct }];
    });
    // We intentionally include renderTick in deps so the lines re-derive
    // even when pairs identity didn't change (e.g. on resize).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs, renderTick, containerRef, nameRefs, matrixRefs]);

  return (
    <svg className="tlm__overlay" aria-hidden="true">
      {lines.map((l) => {
        // Bezier curve so the line bows nicely between columns rather than
        // taking a straight diagonal — easier to follow visually when many
        // pairs cross.
        const dx = l.end.x - l.start.x;
        const cx1 = l.start.x + dx * 0.45;
        const cx2 = l.start.x + dx * 0.55;
        const d = `M ${l.start.x} ${l.start.y} C ${cx1} ${l.start.y}, ${cx2} ${l.end.y}, ${l.end.x} ${l.end.y}`;
        return (
          <g key={l.key} className={l.correct ? "tlm__line--correct" : "tlm__line--wrong"}>
            <path d={d} className="tlm__line tlm__line--halo" />
            <path d={d} className="tlm__line" />
          </g>
        );
      })}
    </svg>
  );
}
