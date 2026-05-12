/**
 * ElementaryMatrixCardGame — build A⁻¹ by playing row-operation cards.
 *
 * Used by:
 *   - linear-algebra-matrix-inverse
 *
 * THIS IS A BUILD-THE-INVERSE CARD GAME. A 2×2 matrix A is shown. The
 * reader is dealt a deck of elementary-row-operation cards (swap rows,
 * scale a row, add k×row j to row i). Each card the reader plays
 * multiplies the *current* matrix on the LEFT by the card's elementary
 * matrix. Goal: reduce A to the identity. The PRODUCT of every card
 * played (in order) is A⁻¹ by construction — the widget keeps that
 * running product visible at all times.
 *
 * Pedagogy: the lesson's deepest claim is that A⁻¹ is just a product
 * of elementary matrices. The [A | I] trick is the same statement
 * dressed differently — the right block ends up as A⁻¹ because
 * "the operations that turn A into I, applied to I, produce A⁻¹".
 * This widget MAKES that statement happen, step by step, with the
 * running-product display turning an abstract algebraic identity
 * into a directly-observed fact: every elementary operation contributes
 * one factor to A⁻¹, and when the elimination finishes, the product
 * of all those factors IS the inverse.
 *
 * Three card types, matching the three elementary row operations:
 *   - SWAP(i, j)            — elementary matrix E_swap
 *   - SCALE(i, k)           — elementary matrix E_scale(k on row i)
 *   - ADD(i, j, k)          — elementary matrix that adds k·row_j to row_i
 *
 * The reader configures each card before playing (pick i, j, k from
 * small dropdowns; only legal values are exposed). The card's
 * elementary matrix is shown on the card face before it's played.
 *
 * Win state: current matrix is I (within tolerance). Score is the
 * number of cards played to win — lower is better; the widget tracks
 * a personal best per matrix.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./ElementaryMatrixCardGame.css";

type Matrix2 = [[number, number], [number, number]];

const SOLVED_EPS = 1e-6;
const IDENTITY: Matrix2 = [
  [1, 0],
  [0, 1],
];

type CardKind = "swap" | "scale" | "add";

interface SwapCard {
  kind: "swap";
}
interface ScaleCard {
  kind: "scale";
  row: 0 | 1;
  k: number;
}
interface AddCard {
  kind: "add";
  rowI: 0 | 1; // target row
  rowJ: 0 | 1; // source row
  k: number; // multiplier
}
type Card = SwapCard | ScaleCard | AddCard;

interface Puzzle {
  label: string;
  A: Matrix2;
  ideal: number; // ideal step count to motivate "fewer = better"
}

const PUZZLES: Puzzle[] = [
  {
    label: "Warm-up: 2 on the diagonal",
    A: [
      [2, 0],
      [0, 2],
    ],
    ideal: 2,
  },
  {
    label: "Upper triangular",
    A: [
      [1, 2],
      [0, 1],
    ],
    ideal: 1,
  },
  {
    label: "Swap is needed",
    A: [
      [0, 1],
      [1, 0],
    ],
    ideal: 1,
  },
  {
    label: "Both rows mixed",
    A: [
      [2, 1],
      [1, 1],
    ],
    ideal: 3,
  },
  {
    label: "Negative entries",
    A: [
      [3, -1],
      [-1, 1],
    ],
    ideal: 3,
  },
];

function cloneMatrix(M: Matrix2): Matrix2 {
  return [
    [M[0][0], M[0][1]],
    [M[1][0], M[1][1]],
  ];
}

function multiply(L: Matrix2, R: Matrix2): Matrix2 {
  return [
    [
      L[0][0] * R[0][0] + L[0][1] * R[1][0],
      L[0][0] * R[0][1] + L[0][1] * R[1][1],
    ],
    [
      L[1][0] * R[0][0] + L[1][1] * R[1][0],
      L[1][0] * R[0][1] + L[1][1] * R[1][1],
    ],
  ];
}

function elementaryMatrix(card: Card): Matrix2 {
  if (card.kind === "swap") {
    return [
      [0, 1],
      [1, 0],
    ];
  }
  if (card.kind === "scale") {
    const E = cloneMatrix(IDENTITY);
    E[card.row][card.row] = card.k;
    return E;
  }
  // add: E = I + k · e_{rowI rowJ}
  const E = cloneMatrix(IDENTITY);
  E[card.rowI][card.rowJ] = card.k;
  return E;
}

function isIdentity(M: Matrix2): boolean {
  return (
    Math.abs(M[0][0] - 1) < SOLVED_EPS &&
    Math.abs(M[0][1]) < SOLVED_EPS &&
    Math.abs(M[1][0]) < SOLVED_EPS &&
    Math.abs(M[1][1] - 1) < SOLVED_EPS
  );
}

function fmt(x: number): string {
  if (Math.abs(x) < 1e-9) return "0";
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  for (const den of [2, 3, 4, 5, 6]) {
    const num = x * den;
    if (Math.abs(num - Math.round(num)) < 1e-9) {
      const n = Math.round(num);
      return `${n}/${den}`;
    }
  }
  return x.toFixed(2);
}

function cardLabel(card: Card): string {
  if (card.kind === "swap") return "Swap R₁ ↔ R₂";
  if (card.kind === "scale")
    return `R${card.row + 1} ← (${fmt(card.k)})·R${card.row + 1}`;
  return `R${card.rowI + 1} ← R${card.rowI + 1} + (${fmt(card.k)})·R${card.rowJ + 1}`;
}

interface ElementaryMatrixCardGameProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function ElementaryMatrixCardGame({
  onStateChange,
}: ElementaryMatrixCardGameProps) {
  const { recordInteraction } = useWidgetTelemetry("ElementaryMatrixCardGame");
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const puzzle = PUZZLES[puzzleIdx];

  // Card draft state — which kind of card the reader is configuring next.
  const [draftKind, setDraftKind] = useState<CardKind>("add");
  const [draftScaleRow, setDraftScaleRow] = useState<0 | 1>(0);
  const [draftScaleK, setDraftScaleK] = useState<number>(2);
  const [draftAddI, setDraftAddI] = useState<0 | 1>(1);
  const [draftAddJ, setDraftAddJ] = useState<0 | 1>(0);
  const [draftAddK, setDraftAddK] = useState<number>(-1);

  // History of played cards (in order).
  const [played, setPlayed] = useState<Card[]>([]);

  // Personal-best tracker (cards per puzzle).
  const [best, setBest] = useState<Record<number, number>>({});

  const current: Matrix2 = useMemo(() => {
    let m = cloneMatrix(puzzle.A);
    for (const c of played) {
      m = multiply(elementaryMatrix(c), m);
    }
    return m;
  }, [puzzle.A, played]);

  const runningProduct: Matrix2 = useMemo(() => {
    // The product of elementary matrices is A⁻¹ when applied to A gives I.
    // We apply them left-to-right onto the identity.
    let p = cloneMatrix(IDENTITY);
    for (const c of played) {
      p = multiply(elementaryMatrix(c), p);
    }
    return p;
  }, [played]);

  const solved = isIdentity(current);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      puzzle_index: puzzleIdx,
      cards_played: played.length,
      solved: solved ? 1 : 0,
      ideal: puzzle.ideal,
      best: best[puzzleIdx] ?? 0,
    });
  }, [puzzleIdx, played.length, solved, puzzle.ideal, best, onStateChange]);

  // When solved, update best.
  useEffect(() => {
    if (!solved) return;
    setBest((prev) => {
      const prior = prev[puzzleIdx];
      if (prior !== undefined && prior <= played.length) return prev;
      return { ...prev, [puzzleIdx]: played.length };
    });
  }, [solved, puzzleIdx, played.length]);

  const buildDraft = (): Card => {
    if (draftKind === "swap") return { kind: "swap" };
    if (draftKind === "scale")
      return { kind: "scale", row: draftScaleRow, k: draftScaleK };
    return {
      kind: "add",
      rowI: draftAddI,
      rowJ: draftAddJ,
      k: draftAddK,
    };
  };

  const handlePlay = useCallback(() => {
    const card = buildDraft();
    // Defensive: scale by zero would make the matrix non-invertible, block it.
    if (card.kind === "scale" && Math.abs(card.k) < 1e-9) return;
    if (card.kind === "add" && card.rowI === card.rowJ) return; // illegal
    setPlayed((prev) => [...prev, card]);
    recordInteraction("play_card", {
      kind: card.kind,
      detail: cardLabel(card),
    });
  }, [
    draftKind,
    draftScaleRow,
    draftScaleK,
    draftAddI,
    draftAddJ,
    draftAddK,
    recordInteraction,
  ]);

  const handleUndo = useCallback(() => {
    setPlayed((prev) => prev.slice(0, -1));
    recordInteraction("undo");
  }, [recordInteraction]);

  const handleReset = useCallback(() => {
    setPlayed([]);
    recordInteraction("reset");
  }, [recordInteraction]);

  const handlePuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      setPlayed([]);
      recordInteraction("puzzle", { puzzle: PUZZLES[idx].label });
    },
    [recordInteraction],
  );

  const stateSummary = useMemo(() => {
    const cardsStr =
      played.length === 0
        ? "no cards played"
        : played.map(cardLabel).join(" · ");
    const currStr = `current matrix = [[${fmt(current[0][0])}, ${fmt(current[0][1])}], [${fmt(current[1][0])}, ${fmt(current[1][1])}]]`;
    const prodStr = `running product = [[${fmt(runningProduct[0][0])}, ${fmt(runningProduct[0][1])}], [${fmt(runningProduct[1][0])}, ${fmt(runningProduct[1][1])}]]`;
    const status = solved
      ? `SOLVED in ${played.length} card${played.length === 1 ? "" : "s"} (ideal ${puzzle.ideal}). Running product IS A⁻¹.`
      : `Not yet at identity. ${currStr}.`;
    return `Elementary Card Game — puzzle "${puzzle.label}", A = [[${fmt(puzzle.A[0][0])}, ${fmt(puzzle.A[0][1])}], [${fmt(puzzle.A[1][0])}, ${fmt(puzzle.A[1][1])}]]. Cards played: ${cardsStr}. ${prodStr}. ${status}`;
  }, [played, current, runningProduct, solved, puzzle]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        played: played.length,
        solved,
      }),
    [puzzleIdx, played.length, solved],
  );

  const scaleKChoices = [-2, -1, 0.5, 2, 3];
  const addKChoices = [-3, -2, -1, 1, 2, 3];

  return (
    <div className={`emcg${solved ? " emcg--solved" : ""}`}>
      <header className="emcg__head">
        <div className="emcg__heading">
          <span className="emcg__heading-label">PUZZLE</span>
          <span className="emcg__heading-value">{puzzle.label}</span>
        </div>
        <div className="emcg__heading">
          <span className="emcg__heading-label">CARDS</span>
          <span
            className={`emcg__heading-value${solved ? " emcg__heading-value--ok" : ""}`}
          >
            {played.length}
            {best[puzzleIdx] !== undefined && ` · best ${best[puzzleIdx]}`}
            {` · ideal ${puzzle.ideal}`}
          </span>
        </div>
      </header>

      <div className="emcg__panels">
        <div className="emcg__panel">
          <span className="emcg__panel-label">CURRENT — start: A, target: I</span>
          <MatrixDisplay
            M={current}
            highlight={solved ? "ok" : "neutral"}
            target={IDENTITY}
            showTarget={!solved}
          />
        </div>
        <div className="emcg__panel">
          <span className="emcg__panel-label">
            RUNNING PRODUCT — equals A⁻¹ when current = I
          </span>
          <MatrixDisplay
            M={runningProduct}
            highlight={solved ? "ok" : "neutral"}
          />
        </div>
      </div>

      <div className="emcg__history">
        <span className="emcg__history-label">
          PLAYED CARDS (applied left-to-right):
        </span>
        {played.length === 0 ? (
          <span className="emcg__history-empty">
            No cards yet. Configure a card below and hit "Play card" to apply it.
          </span>
        ) : (
          <div className="emcg__history-row">
            {played.map((c, i) => (
              <span
                key={i}
                className={`emcg__history-card emcg__history-card--${c.kind}`}
              >
                {i + 1}. {cardLabel(c)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="emcg__deck">
        <span className="emcg__deck-label">CARD TO PLAY</span>
        <div className="emcg__deck-tabs">
          {(["swap", "scale", "add"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`emcg__deck-tab${k === draftKind ? " emcg__deck-tab--active" : ""}`}
              onClick={() => setDraftKind(k)}
            >
              {k === "swap"
                ? "Swap"
                : k === "scale"
                  ? "Scale row"
                  : "Add multiple"}
            </button>
          ))}
        </div>

        <div className="emcg__draft">
          {draftKind === "swap" && (
            <div className="emcg__draft-body">
              <span className="emcg__draft-formula">Swap R₁ ↔ R₂</span>
              <span className="emcg__draft-hint">
                Elementary matrix: <code>[[0, 1], [1, 0]]</code>. Useful when
                you need a non-zero pivot in row 1.
              </span>
            </div>
          )}
          {draftKind === "scale" && (
            <div className="emcg__draft-body">
              <div className="emcg__draft-row">
                <label>Row:</label>
                <select
                  value={draftScaleRow}
                  onChange={(e) =>
                    setDraftScaleRow(Number(e.target.value) as 0 | 1)
                  }
                >
                  <option value={0}>R₁</option>
                  <option value={1}>R₂</option>
                </select>
                <label>k:</label>
                <select
                  value={draftScaleK}
                  onChange={(e) => setDraftScaleK(Number(e.target.value))}
                >
                  {scaleKChoices.map((k) => (
                    <option key={k} value={k}>
                      {fmt(k)}
                    </option>
                  ))}
                </select>
              </div>
              <span className="emcg__draft-formula">
                R{draftScaleRow + 1} ← ({fmt(draftScaleK)})·R{draftScaleRow + 1}
              </span>
              <span className="emcg__draft-hint">
                Scales row {draftScaleRow + 1} by {fmt(draftScaleK)}. Use to
                turn a pivot into 1.
              </span>
            </div>
          )}
          {draftKind === "add" && (
            <div className="emcg__draft-body">
              <div className="emcg__draft-row">
                <label>Target row:</label>
                <select
                  value={draftAddI}
                  onChange={(e) =>
                    setDraftAddI(Number(e.target.value) as 0 | 1)
                  }
                >
                  <option value={0}>R₁</option>
                  <option value={1}>R₂</option>
                </select>
                <label>k:</label>
                <select
                  value={draftAddK}
                  onChange={(e) => setDraftAddK(Number(e.target.value))}
                >
                  {addKChoices.map((k) => (
                    <option key={k} value={k}>
                      {fmt(k)}
                    </option>
                  ))}
                </select>
                <label>Source row:</label>
                <select
                  value={draftAddJ}
                  onChange={(e) =>
                    setDraftAddJ(Number(e.target.value) as 0 | 1)
                  }
                >
                  <option value={0}>R₁</option>
                  <option value={1}>R₂</option>
                </select>
              </div>
              <span className="emcg__draft-formula">
                R{draftAddI + 1} ← R{draftAddI + 1} + ({fmt(draftAddK)})·R
                {draftAddJ + 1}
              </span>
              <span className="emcg__draft-hint">
                {draftAddI === draftAddJ
                  ? "Target and source row must be different — pick another."
                  : "Adds a multiple of the source row to the target row. The workhorse of elimination."}
              </span>
            </div>
          )}
        </div>

        <div className="emcg__deck-actions">
          <button
            type="button"
            className="emcg__play"
            onClick={handlePlay}
            disabled={
              solved ||
              (draftKind === "add" && draftAddI === draftAddJ) ||
              (draftKind === "scale" && Math.abs(draftScaleK) < 1e-9)
            }
          >
            Play card
          </button>
          <button
            type="button"
            className="emcg__action"
            onClick={handleUndo}
            disabled={played.length === 0}
          >
            Undo
          </button>
          <button
            type="button"
            className="emcg__action"
            onClick={handleReset}
            disabled={played.length === 0}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        className={`emcg__verdict emcg__verdict--${solved ? "solved" : "working"}`}
      >
        <span className="emcg__verdict-label">Status</span>
        <span className="emcg__verdict-value">
          {solved ? (
            <>
              ✓ Solved in {played.length} card{played.length === 1 ? "" : "s"}.
              The running product is{" "}
              <strong>
                A⁻¹ = [[{fmt(runningProduct[0][0])}, {fmt(runningProduct[0][1])}],
                [{fmt(runningProduct[1][0])}, {fmt(runningProduct[1][1])}]]
              </strong>
              . You just built the inverse one elementary factor at a time.
            </>
          ) : (
            <>
              Reduce A to the identity. Each card multiplies the current matrix
              on the left by its elementary matrix; the running product of all
              played cards equals A⁻¹ by construction.
            </>
          )}
        </span>
      </div>

      <div className="emcg__puzzle-row">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`emcg__puzzle-pick${i === puzzleIdx ? " emcg__puzzle-pick--active" : ""}`}
            onClick={() => handlePuzzle(i)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <WidgetExplainer
        widgetName="Elementary card game — build A⁻¹ from row-op cards"
        widgetDescription="A build-the-inverse card game. The reader is given a 2×2 matrix A. A deck of three card types — Swap (rows), Scale (a row by k), Add (k times row j to row i) — is available; the reader configures each card (which row, what scalar) and plays it. Each card multiplies the current matrix on the left by its elementary matrix; the goal is to reduce the matrix to the identity. The widget shows two panels: the CURRENT matrix (starts at A, target is I), and the RUNNING PRODUCT of every played card (starts at I, ends at A⁻¹ by construction). The puzzle is solved when the current matrix is the identity; at that moment the running product IS the inverse, by the [A | I] → [I | A⁻¹] reasoning the lesson teaches. Score is the number of cards played (lower is better; ideal counts and personal bests are tracked per puzzle). Five puzzles of increasing difficulty: a clean diagonal, an upper-triangular shear, a swap-required matrix, a mixed-row matrix, and a negative-entry matrix. The pedagogical point is direct: A⁻¹ is a product of elementary matrices, and that fact is normally proved algebraically. This widget makes the reader BUILD that product, one card at a time, while seeing each factor appear in the running-product panel."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface MatrixDisplayProps {
  M: Matrix2;
  highlight: "neutral" | "ok";
  target?: Matrix2;
  showTarget?: boolean;
}

function MatrixDisplay({ M, highlight, target, showTarget }: MatrixDisplayProps) {
  const cellClass = (i: number, j: number) => {
    if (!target || !showTarget) return "emcg__cell";
    const isMatch = Math.abs(M[i][j] - target[i][j]) < SOLVED_EPS;
    return isMatch ? "emcg__cell emcg__cell--match" : "emcg__cell";
  };
  return (
    <div
      className={`emcg__matrix emcg__matrix--${highlight}`}
      role="img"
      aria-label="Matrix"
    >
      <div className="emcg__matrix-bracket emcg__matrix-bracket--left" />
      <div className="emcg__matrix-grid">
        <span className={cellClass(0, 0)}>{fmt(M[0][0])}</span>
        <span className={cellClass(0, 1)}>{fmt(M[0][1])}</span>
        <span className={cellClass(1, 0)}>{fmt(M[1][0])}</span>
        <span className={cellClass(1, 1)}>{fmt(M[1][1])}</span>
      </div>
      <div className="emcg__matrix-bracket emcg__matrix-bracket--right" />
    </div>
  );
}
