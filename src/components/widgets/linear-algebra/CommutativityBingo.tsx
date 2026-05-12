/**
 * CommutativityBingo — speed-judgement grid game for matrix non-commutativity.
 *
 * Used by:
 *   - linear-algebra-matrix-operations
 *
 * THIS IS A 4×4 BINGO GRID. Each cell holds a pair of 2×2 matrices (A, B).
 * The reader's job is to mark each cell with their judgement: "commute"
 * (AB = BA, green), "don't commute" (AB ≠ BA, red), or leave it "?".
 * Submitting grades all 16 cells at once. Correct marks score; wrong
 * marks are revealed with the truth.
 *
 * The cells are not random — they're a curated mix of:
 *   - Pairs that commute (rotations around the same axis; scalar multiples
 *     of identity with anything; pairs of diagonal matrices; a matrix
 *     paired with itself; pairs sharing the same eigenvectors).
 *   - Pairs that look like they should commute but don't (rotation +
 *     shear; reflection + rotation; two random matrices that happen to
 *     have a non-trivial AB - BA).
 *   - Visually deceptive pairs (both matrices integer, both shapes
 *     symmetric, all the visual cues say "yes" but the algebra says "no").
 *
 * Pedagogy: non-commutativity is the RULE, commutativity is the
 * exception. Forcing the reader to commit to 16 judgements in one pass
 * surfaces both their gut intuition and the systematic ways it fails.
 *
 * UX:
 *   - 4×4 grid of cells, each showing A and B as small 2×2 matrices and a
 *     three-state toggle (= | ≠ | ?).
 *   - Click cell-cycle button to cycle: ? → = → ≠ → ?.
 *   - "Submit" button grades all 16; correct gets a green ring, wrong
 *     gets a red ring with the truth revealed.
 *   - Score reported as N / 16.
 *   - "Reset" returns the board to all-?.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./CommutativityBingo.css";

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

type Mark = "?" | "=" | "!=";

interface CellSpec {
  A: Matrix2;
  B: Matrix2;
  /** Author-anchored explanation for the reveal. One sentence. */
  hint: string;
}

function mul(M: Matrix2, N: Matrix2): Matrix2 {
  return {
    a: M.a * N.a + M.b * N.c,
    b: M.a * N.b + M.b * N.d,
    c: M.c * N.a + M.d * N.c,
    d: M.c * N.b + M.d * N.d,
  };
}

function dist(M: Matrix2, N: Matrix2): number {
  return (
    Math.abs(M.a - N.a) + Math.abs(M.b - N.b) + Math.abs(M.c - N.c) + Math.abs(M.d - N.d)
  );
}

const COMMUTE_EPS = 0.01;

function trueAnswer(c: CellSpec): "=" | "!=" {
  const AB = mul(c.A, c.B);
  const BA = mul(c.B, c.A);
  return dist(AB, BA) < COMMUTE_EPS ? "=" : "!=";
}

const fmt = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(2);

const I: Matrix2 = { a: 1, b: 0, c: 0, d: 1 };
const ROT90: Matrix2 = { a: 0, b: -1, c: 1, d: 0 };
const ROT180: Matrix2 = { a: -1, b: 0, c: 0, d: -1 };
const SHEAR_X: Matrix2 = { a: 1, b: 1, c: 0, d: 1 };
const SCALE_2: Matrix2 = { a: 2, b: 0, c: 0, d: 2 };
const REFL_Y: Matrix2 = { a: -1, b: 0, c: 0, d: 1 };
const DIAG_2_3: Matrix2 = { a: 2, b: 0, c: 0, d: 3 };
const DIAG_M1_4: Matrix2 = { a: -1, b: 0, c: 0, d: 4 };

/**
 * Hand-curated cells. 16 pairs chosen so the board has roughly half
 * commute, half not, with the visually-deceptive pairs salted in.
 */
const CELLS: CellSpec[] = [
  // Row 1 — the obvious ones.
  {
    A: I,
    B: { a: 3, b: 1, c: -2, d: 5 },
    hint: "Identity commutes with everything: I·X = X = X·I, by definition.",
  },
  {
    A: ROT90,
    B: SHEAR_X,
    hint: "Rotation and shear don't commute — shear-then-rotate ≠ rotate-then-shear (classic counter-example).",
  },
  {
    A: SCALE_2,
    B: { a: 4, b: -1, c: 2, d: 3 },
    hint: "Scale_2 = 2·I — a scalar multiple of identity commutes with every matrix.",
  },
  {
    A: DIAG_2_3,
    B: DIAG_M1_4,
    hint: "Diagonal matrices commute with other diagonal matrices: diag(a, d) · diag(p, q) = diag(ap, dq) either way.",
  },

  // Row 2 — rotation family + the trap.
  {
    A: ROT90,
    B: ROT180,
    hint: "Two rotations around the same axis commute: applying θ then φ = applying φ then θ (rotation angles just add).",
  },
  {
    A: REFL_Y,
    B: ROT90,
    hint: "Reflection and rotation don't commute in general — reflect-then-rotate ends up in a different orientation than rotate-then-reflect.",
  },
  {
    A: { a: 1, b: 2, c: 0, d: 1 },
    B: { a: 1, b: 5, c: 0, d: 1 },
    hint: "Two shears along the same axis commute: shear-by-2 then shear-by-5 = shear-by-7, either order.",
  },
  {
    A: { a: 2, b: 3, c: 1, d: 4 },
    B: { a: 5, b: -1, c: 2, d: 0 },
    hint: "Two random non-trivial matrices — almost certainly don't commute. AB and BA differ in every entry.",
  },

  // Row 3 — same-matrix + powers + transpose interactions.
  {
    A: { a: 1, b: 2, c: 3, d: 4 },
    B: { a: 1, b: 2, c: 3, d: 4 },
    hint: "Any matrix commutes with itself: A·A = A² = A·A.",
  },
  {
    A: { a: 1, b: 2, c: 3, d: 4 },
    B: { a: 7, b: 10, c: 15, d: 22 }, // = A^2
    hint: "A and A² commute — any power of A commutes with A. (B here is A·A.)",
  },
  {
    A: { a: 2, b: 0, c: 0, d: 2 },
    B: ROT90,
    hint: "2·I = scalar multiple of identity. It commutes with rotation (and everything else).",
  },
  {
    A: { a: 0, b: 1, c: 1, d: 0 },
    B: { a: 1, b: 0, c: 0, d: -1 },
    hint: "Anti-diagonal swap and a sign-flip-on-y don't commute — try multiplying both orders to see they differ.",
  },

  // Row 4 — visually-deceptive endings.
  {
    A: { a: 3, b: 0, c: 0, d: 5 },
    B: { a: -2, b: 0, c: 0, d: 7 },
    hint: "Two diagonal matrices — commute (same reason as cell 4).",
  },
  {
    A: { a: 1, b: 1, c: 1, d: 1 },
    B: { a: 2, b: 2, c: 2, d: 2 },
    hint: "B = 2A. Any matrix commutes with a scalar multiple of itself.",
  },
  {
    A: { a: 1, b: 1, c: 0, d: 2 },
    B: { a: 2, b: 0, c: 1, d: 1 },
    hint: "Upper-triangular times lower-triangular — these almost never commute, despite looking similar in shape.",
  },
  {
    A: { a: 2, b: 1, c: 0, d: 2 },
    B: { a: 3, b: 4, c: 0, d: 3 },
    hint: "Both upper-triangular with EQUAL diagonal entries (A has 2 on the diagonal, B has 3) — these DO commute because they're both (scalar·I + nilpotent), and those nilpotents are scalar multiples of the same thing.",
  },
];

interface CommutativityBingoProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function CommutativityBingo({ onStateChange }: CommutativityBingoProps) {
  const { recordInteraction } = useWidgetTelemetry("CommutativityBingo");
  const [marks, setMarks] = useState<Mark[]>(() => CELLS.map(() => "?"));
  const [submitted, setSubmitted] = useState(false);

  const truths = useMemo(() => CELLS.map(trueAnswer), []);

  const score = useMemo(() => {
    if (!submitted) return null;
    let correct = 0;
    let attempted = 0;
    for (let i = 0; i < CELLS.length; i++) {
      if (marks[i] !== "?") {
        attempted += 1;
        if (marks[i] === truths[i]) correct += 1;
      }
    }
    return { correct, attempted };
  }, [marks, submitted, truths]);

  const markedCount = marks.filter((m) => m !== "?").length;

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      marked: markedCount,
      submitted: submitted ? 1 : 0,
      correct: score?.correct ?? 0,
      attempted: score?.attempted ?? 0,
    });
  }, [markedCount, submitted, score, onStateChange]);

  const handleCycle = useCallback(
    (idx: number) => {
      if (submitted) return;
      setMarks((prev) => {
        const next = [...prev];
        const order: Mark[] = ["?", "=", "!="];
        const curIdx = order.indexOf(prev[idx]);
        next[idx] = order[(curIdx + 1) % 3];
        return next;
      });
      recordInteraction("cycle", { cell: idx });
    },
    [submitted, recordInteraction],
  );

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    let correct = 0;
    for (let i = 0; i < CELLS.length; i++) {
      if (marks[i] !== "?" && marks[i] === truths[i]) correct += 1;
    }
    recordInteraction("submit", {
      correct,
      attempted: marks.filter((m) => m !== "?").length,
    });
  }, [marks, truths, recordInteraction]);

  const handleReset = useCallback(() => {
    setMarks(CELLS.map(() => "?"));
    setSubmitted(false);
    recordInteraction("reset");
  }, [recordInteraction]);

  const stateSummary = useMemo(() => {
    if (!submitted) {
      return `Commutativity Bingo — reader has marked ${markedCount}/16 cells, not yet submitted.`;
    }
    if (!score) return "Submitted but score not computed.";
    const wrongCells = marks
      .map((m, i) => ({ i, m, t: truths[i], hint: CELLS[i].hint }))
      .filter((x) => x.m !== "?" && x.m !== x.t);
    const wrongSummary = wrongCells
      .slice(0, 3)
      .map(
        (w) =>
          `Cell ${w.i + 1}: reader said ${w.m === "=" ? "commute" : "don't"}, truth is ${w.t === "=" ? "commute" : "don't"} — ${w.hint}`,
      )
      .join(" | ");
    return `Commutativity Bingo — submitted. Score ${score.correct}/${score.attempted} (out of 16 total cells). ${wrongCells.length === 0 ? "All marked cells correct." : `Wrong cells: ${wrongSummary}${wrongCells.length > 3 ? "… (and more)" : ""}`}.`;
  }, [submitted, score, marks, truths, markedCount]);

  const stateKey = useMemo(
    () => JSON.stringify({ marks, submitted }),
    [marks, submitted],
  );

  return (
    <div className="cb">
      <header className="cb__head">
        <div className="cb__heading">
          <span className="cb__heading-label">PROGRESS</span>
          <span className="cb__heading-value">
            {markedCount} / 16 marked
          </span>
        </div>
        <div className="cb__heading">
          <span className="cb__heading-label">SCORE</span>
          <span className="cb__heading-value">
            {submitted && score
              ? `${score.correct} / ${score.attempted} correct`
              : "—"}
          </span>
        </div>
        <div className="cb__heading">
          <span className="cb__heading-label">REALITY</span>
          <span className="cb__heading-value">
            {truths.filter((t) => t === "=").length} commute · {truths.filter((t) => t === "!=").length} don&apos;t
          </span>
        </div>
      </header>

      <div className="cb__legend">
        <span className="cb__legend-label">Click a cell to cycle: </span>
        <span className="cb__legend-chip cb__legend-chip--unset">?</span>
        →
        <span className="cb__legend-chip cb__legend-chip--commute">AB = BA</span>
        →
        <span className="cb__legend-chip cb__legend-chip--nope">AB ≠ BA</span>
      </div>

      <div className="cb__grid">
        {CELLS.map((cell, i) => (
          <BingoCell
            key={i}
            index={i}
            cell={cell}
            mark={marks[i]}
            truth={truths[i]}
            submitted={submitted}
            onCycle={handleCycle}
          />
        ))}
      </div>

      <div className="cb__actions">
        <button
          type="button"
          className="cb__submit"
          onClick={handleSubmit}
          disabled={submitted}
        >
          Submit board
        </button>
        <button type="button" className="cb__reset" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div
        className={`cb__verdict cb__verdict--${
          !submitted ? "idle" : score && score.attempted > 0 && score.correct === score.attempted ? "win" : "mixed"
        }`}
      >
        <span className="cb__verdict-label">Result</span>
        <span className="cb__verdict-value">
          {!submitted &&
            "Mark every cell with your best judgement, then submit. The point isn't only to get them right — it's to feel which pairs your intuition flags as 'obviously commute' that actually don't."}
          {submitted &&
            score &&
            score.attempted === 0 &&
            "You submitted without marking any cells. Try again."}
          {submitted &&
            score &&
            score.attempted > 0 &&
            score.correct === score.attempted &&
            `Perfect — ${score.correct}/${score.attempted}. The commuting cells fall into a few recognisable patterns: identity, scalar-multiples of identity, diagonal-with-diagonal, two-rotations, two-shears-along-the-same-axis, A with A^k, and (cell 16) the upper-triangular-with-equal-diagonals trick. Everything else doesn't commute.`}
          {submitted &&
            score &&
            score.attempted > 0 &&
            score.correct < score.attempted &&
            `${score.correct}/${score.attempted} correct. The wrong cells are highlighted below in red — hover or read the per-cell hints to see why. Common traps: assuming two upper-triangular matrices commute (they don't, unless their diagonals are scalar multiples of identity), or assuming two matrices that "look symmetric" commute.`}
        </span>
      </div>

      <WidgetExplainer
        widgetName="Commutativity Bingo — 4×4 judgement grid"
        widgetDescription="A speed-judgement grid widget for matrix commutativity. The reader sees 16 hand-curated pairs of 2×2 matrices (A, B), arranged in a 4×4 grid. For each cell the reader must mark either 'AB = BA' (commute), 'AB ≠ BA' (don't commute), or leave it as '?'. Clicking a cell cycles through the three states. Submitting grades all 16 — correct marks get a green ring, wrong marks get a red ring and reveal an author-anchored hint explaining why the pair does or doesn't commute. The cells are chosen to cover the canonical commuting patterns (identity, scalar-multiples of identity, diagonal-with-diagonal, same-axis rotations, same-axis shears, A with A^k, upper-triangular-with-equal-diagonals via shared nilpotent structure) AND visually-deceptive non-commuting pairs that look similar to the commuting ones (rotation + shear, reflection + rotation, two arbitrary upper-triangulars with different diagonals). The pedagogical point: non-commutativity is the rule, commutativity is the exception — and the exceptions fall into a small number of recognisable patterns."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface BingoCellProps {
  index: number;
  cell: CellSpec;
  mark: Mark;
  truth: "=" | "!=";
  submitted: boolean;
  onCycle: (idx: number) => void;
}

function BingoCell({ index, cell, mark, truth, submitted, onCycle }: BingoCellProps) {
  const correct = submitted && mark === truth;
  const wrong = submitted && mark !== "?" && mark !== truth;
  const revealed = submitted;

  const stateClass = correct
    ? "cb__cell--correct"
    : wrong
    ? "cb__cell--wrong"
    : mark === "="
    ? "cb__cell--commute"
    : mark === "!="
    ? "cb__cell--nope"
    : "cb__cell--unset";

  return (
    <button
      type="button"
      className={`cb__cell ${stateClass}`}
      onClick={() => onCycle(index)}
      title={revealed ? cell.hint : undefined}
    >
      <div className="cb__cell-head">
        <span className="cb__cell-no">#{index + 1}</span>
        <span className={`cb__cell-mark cb__cell-mark--${mark === "=" ? "commute" : mark === "!=" ? "nope" : "unset"}`}>
          {mark === "?" ? "?" : mark === "=" ? "AB = BA" : "AB ≠ BA"}
        </span>
      </div>
      <div className="cb__cell-pair">
        <MiniMatrix M={cell.A} label="A" />
        <MiniMatrix M={cell.B} label="B" />
      </div>
      {revealed && (
        <div
          className={`cb__cell-reveal cb__cell-reveal--${truth === "=" ? "commute" : "nope"}`}
        >
          truth: {truth === "=" ? "commute" : "≠"}
        </div>
      )}
    </button>
  );
}

interface MiniMatrixProps {
  M: Matrix2;
  label: string;
}

function MiniMatrix({ M, label }: MiniMatrixProps) {
  return (
    <div className="cb__mini">
      <div className="cb__mini-label">{label}</div>
      <div className="cb__mini-grid">
        <span>{fmt(M.a)}</span>
        <span>{fmt(M.b)}</span>
        <span>{fmt(M.c)}</span>
        <span>{fmt(M.d)}</span>
      </div>
    </div>
  );
}
