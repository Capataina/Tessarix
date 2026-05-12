/**
 * MatrixMultiplicationBuilder — drag-the-product algorithmic mini-game.
 *
 * Used by:
 *   - linear-algebra-matrix-operations
 *
 * THIS IS A CONSTRUCTION QUIZ. The reader is given two 2×2 matrices A and
 * B, and four empty slots for AB's entries. Each slot needs exactly TWO
 * things dragged into it to compute that entry: the correct ROW of A and
 * the correct COLUMN of B. The widget rejects mismatches (wrong row, or
 * wrong column for that slot's (i, j) index) and lights up correct slots
 * with their computed dot-product value.
 *
 * The pedagogical centerpiece: the row-times-column rule, by construction.
 * The reader cannot finish the matrix without performing the row-dot-column
 * computation FOR EACH ENTRY individually — i.e. they have to do four dot
 * products by hand, and the widget enforces the index pattern that says
 * "entry (i, j) of AB = row i of A · column j of B."
 *
 * UX:
 *   - A and B drawn as labelled matrices at the top. Each row of A is a
 *     pill-chip (e.g. "Row 1: (a, b)"); each column of B is a pill-chip
 *     ("Col 1: (e, g)").
 *   - The result matrix AB shown below as a 2×2 grid of slots. Each slot
 *     has two sub-targets: "row from A" and "column from B".
 *   - Click a chip to pick it up; then click a sub-target to drop. A
 *     chip placed in a sub-target whose (i, j) index doesn't match the
 *     chip's index is rejected with a brief red flash; the correct index
 *     pair sticks and (once both sub-targets are filled) the widget
 *     computes the dot product and shows the value in the slot, lit
 *     green.
 *   - When all four slots are correctly filled, the puzzle is solved.
 *     The reader can hit "New round" to draw fresh A, B from the deck.
 *
 * Design: click-to-pick + click-to-drop is more accessible than HTML5
 * drag-and-drop, works without pointer-capture quirks, and the click
 * targets are larger and friendlier on a Tauri desktop window.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveColor } from "../../../lib/theme";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./MatrixMultiplicationBuilder.css";

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** A "chip" placed in a slot is one of these. */
type ChipKind = "row" | "col";

interface SlotState {
  /** Index (1 or 2) of the row chip placed here, or null. */
  rowIdx: 1 | 2 | null;
  /** Index (1 or 2) of the column chip placed here, or null. */
  colIdx: 1 | 2 | null;
  /** Most-recent rejection animation key — flips on each rejection. */
  rejectKey: number;
}

const EMPTY_SLOT: SlotState = { rowIdx: null, colIdx: null, rejectKey: 0 };

interface Puzzle {
  label: string;
  A: Matrix2;
  B: Matrix2;
}

const PUZZLES: Puzzle[] = [
  {
    label: "Integers — warm-up",
    A: { a: 1, b: 2, c: 3, d: 4 },
    B: { a: 5, b: 6, c: 7, d: 8 },
  },
  {
    label: "Mixed signs",
    A: { a: 2, b: -1, c: 0, d: 3 },
    B: { a: 1, b: 4, c: -2, d: 1 },
  },
  {
    label: "Shear · rotate (geometric)",
    // A = shear-x, B = rotate-90; AB applies rotation first then shear.
    A: { a: 1, b: 1, c: 0, d: 1 },
    B: { a: 0, b: -1, c: 1, d: 0 },
  },
];

function multiply(A: Matrix2, B: Matrix2): Matrix2 {
  return {
    a: A.a * B.a + A.b * B.c,
    b: A.a * B.b + A.b * B.d,
    c: A.c * B.a + A.d * B.c,
    d: A.c * B.b + A.d * B.d,
  };
}

function rowOf(M: Matrix2, i: 1 | 2): [number, number] {
  return i === 1 ? [M.a, M.b] : [M.c, M.d];
}

function colOf(M: Matrix2, j: 1 | 2): [number, number] {
  return j === 1 ? [M.a, M.c] : [M.b, M.d];
}

/** Format a number for display: integer if integer, else two decimals. */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

type SlotKey = "p11" | "p12" | "p21" | "p22";

const SLOT_KEYS: SlotKey[] = ["p11", "p12", "p21", "p22"];

function slotIndices(k: SlotKey): { i: 1 | 2; j: 1 | 2 } {
  switch (k) {
    case "p11":
      return { i: 1, j: 1 };
    case "p12":
      return { i: 1, j: 2 };
    case "p21":
      return { i: 2, j: 1 };
    case "p22":
      return { i: 2, j: 2 };
  }
}

interface SelectedChip {
  kind: ChipKind;
  /** 1 or 2 — the row index (for row chips) or column index (for col chips). */
  idx: 1 | 2;
}

interface MatrixMultiplicationBuilderProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function MatrixMultiplicationBuilder({
  onStateChange,
}: MatrixMultiplicationBuilderProps) {
  const { recordInteraction } = useWidgetTelemetry("MatrixMultiplicationBuilder");
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [slots, setSlots] = useState<Record<SlotKey, SlotState>>({
    p11: { ...EMPTY_SLOT },
    p12: { ...EMPTY_SLOT },
    p21: { ...EMPTY_SLOT },
    p22: { ...EMPTY_SLOT },
  });
  const [selected, setSelected] = useState<SelectedChip | null>(null);
  const [rejectCount, setRejectCount] = useState(0);
  const [acceptCount, setAcceptCount] = useState(0);

  const puzzle = PUZZLES[puzzleIdx];
  const product = useMemo(() => multiply(puzzle.A, puzzle.B), [puzzle]);

  /** A slot is "complete" when both its row and column slots are correct. */
  const isSlotComplete = useCallback(
    (k: SlotKey): boolean => {
      const { i, j } = slotIndices(k);
      const s = slots[k];
      return s.rowIdx === i && s.colIdx === j;
    },
    [slots],
  );

  const allComplete = SLOT_KEYS.every((k) => isSlotComplete(k));

  useEffect(() => {
    if (!onStateChange) return;
    const completedCount = SLOT_KEYS.filter((k) => isSlotComplete(k)).length;
    onStateChange({
      puzzle_index: puzzleIdx,
      slots_completed: completedCount,
      accepts: acceptCount,
      rejects: rejectCount,
      solved: allComplete ? 1 : 0,
    });
  }, [puzzleIdx, isSlotComplete, acceptCount, rejectCount, allComplete, onStateChange]);

  const stateSummary = useMemo(() => {
    const completed = SLOT_KEYS.filter((k) => isSlotComplete(k)).length;
    const pieces = SLOT_KEYS.map((k) => {
      const { i, j } = slotIndices(k);
      const s = slots[k];
      const status = isSlotComplete(k)
        ? `done = ${fmt(productAt(product, i, j))}`
        : s.rowIdx === null && s.colIdx === null
        ? "empty"
        : `partial (row=${s.rowIdx ?? "?"}, col=${s.colIdx ?? "?"})`;
      return `(${i},${j}): ${status}`;
    }).join("; ");
    const A = puzzle.A;
    const B = puzzle.B;
    return `Puzzle "${puzzle.label}". A = [[${A.a}, ${A.b}], [${A.c}, ${A.d}]]; B = [[${B.a}, ${B.b}], [${B.c}, ${B.d}]]. Target AB = [[${fmt(product.a)}, ${fmt(product.b)}], [${fmt(product.c)}, ${fmt(product.d)}]]. ${completed}/4 entries built correctly. ${pieces}. ${rejectCount} rejections so far.${
      allComplete ? " Reader has finished the puzzle." : ""
    }`;
  }, [puzzle, product, slots, isSlotComplete, rejectCount, allComplete]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        puzzle: puzzleIdx,
        slots: SLOT_KEYS.map((k) => `${slots[k].rowIdx ?? "_"}${slots[k].colIdx ?? "_"}`).join(","),
        solved: allComplete,
      }),
    [puzzleIdx, slots, allComplete],
  );

  const handlePickChip = useCallback(
    (kind: ChipKind, idx: 1 | 2) => {
      // Re-clicking the same chip deselects.
      if (selected && selected.kind === kind && selected.idx === idx) {
        setSelected(null);
        return;
      }
      setSelected({ kind, idx });
      recordInteraction("pick_chip", { kind, idx });
    },
    [selected, recordInteraction],
  );

  const handleDropOnSlot = useCallback(
    (slotKey: SlotKey, target: ChipKind) => {
      if (!selected) return;
      if (selected.kind !== target) {
        // Wrong target type for this chip (e.g. dropped a row chip on the
        // column sub-target). Reject visually.
        setSlots((prev) => ({
          ...prev,
          [slotKey]: { ...prev[slotKey], rejectKey: prev[slotKey].rejectKey + 1 },
        }));
        setRejectCount((n) => n + 1);
        recordInteraction("reject_wrong_kind", {
          slot: slotKey,
          chip_kind: selected.kind,
          target_kind: target,
        });
        setSelected(null);
        return;
      }
      const { i, j } = slotIndices(slotKey);
      const correctIdx = target === "row" ? i : j;
      if (selected.idx !== correctIdx) {
        // Wrong index for this slot's (i, j). Reject.
        setSlots((prev) => ({
          ...prev,
          [slotKey]: { ...prev[slotKey], rejectKey: prev[slotKey].rejectKey + 1 },
        }));
        setRejectCount((n) => n + 1);
        recordInteraction("reject_wrong_index", {
          slot: slotKey,
          chip_idx: selected.idx,
          correct_idx: correctIdx,
        });
        setSelected(null);
        return;
      }
      // Accept.
      setSlots((prev) => {
        const cur = prev[slotKey];
        const next: SlotState = { ...cur };
        if (target === "row") next.rowIdx = selected.idx;
        else next.colIdx = selected.idx;
        return { ...prev, [slotKey]: next };
      });
      setAcceptCount((n) => n + 1);
      recordInteraction("accept_drop", {
        slot: slotKey,
        target,
        idx: selected.idx,
      });
      setSelected(null);
    },
    [selected, recordInteraction],
  );

  const handleClearSlot = useCallback(
    (slotKey: SlotKey) => {
      setSlots((prev) => ({
        ...prev,
        [slotKey]: { ...EMPTY_SLOT, rejectKey: prev[slotKey].rejectKey },
      }));
      recordInteraction("clear_slot", { slot: slotKey });
    },
    [recordInteraction],
  );

  const handleNewPuzzle = useCallback(
    (idx: number) => {
      setPuzzleIdx(idx);
      setSlots({
        p11: { ...EMPTY_SLOT },
        p12: { ...EMPTY_SLOT },
        p21: { ...EMPTY_SLOT },
        p22: { ...EMPTY_SLOT },
      });
      setSelected(null);
      setRejectCount(0);
      setAcceptCount(0);
      recordInteraction("new_puzzle", { puzzle: PUZZLES[idx].label });
    },
    [recordInteraction],
  );

  const handleReset = useCallback(() => {
    setSlots({
      p11: { ...EMPTY_SLOT },
      p12: { ...EMPTY_SLOT },
      p21: { ...EMPTY_SLOT },
      p22: { ...EMPTY_SLOT },
    });
    setSelected(null);
    recordInteraction("reset");
  }, [recordInteraction]);

  return (
    <div className={`mmb${allComplete ? " mmb--solved" : ""}`}>
      <header className="mmb__head">
        <div className="mmb__heading">
          <span className="mmb__heading-label">PUZZLE</span>
          <span className="mmb__heading-value">{puzzle.label}</span>
        </div>
        <div className="mmb__heading">
          <span className="mmb__heading-label">PROGRESS</span>
          <span className="mmb__heading-value">
            {SLOT_KEYS.filter((k) => isSlotComplete(k)).length} / 4
          </span>
        </div>
        <div className="mmb__heading">
          <span className="mmb__heading-label">REJECTS</span>
          <span className="mmb__heading-value">{rejectCount}</span>
        </div>
      </header>

      <div className="mmb__operands">
        <OperandPanel
          label="A"
          M={puzzle.A}
          mode="row"
          selected={selected}
          onPick={handlePickChip}
        />
        <div className="mmb__times">×</div>
        <OperandPanel
          label="B"
          M={puzzle.B}
          mode="col"
          selected={selected}
          onPick={handlePickChip}
        />
      </div>

      <div className="mmb__equals">=</div>

      <ProductGrid
        product={product}
        slots={slots}
        selected={selected}
        isSlotComplete={isSlotComplete}
        onDrop={handleDropOnSlot}
        onClear={handleClearSlot}
      />

      <div
        className={`mmb__verdict mmb__verdict--${
          allComplete ? "solved" : selected ? "armed" : "idle"
        }`}
      >
        <span className="mmb__verdict-label">{allComplete ? "Solved" : "Status"}</span>
        <span className="mmb__verdict-value">
          {allComplete
            ? `Built. AB = [[${fmt(product.a)}, ${fmt(product.b)}], [${fmt(product.c)}, ${fmt(product.d)}]]. You hit ${rejectCount} reject${
                rejectCount === 1 ? "" : "s"
              } on the way. Hit 'New round' to try a different pair.`
            : selected
            ? `Holding ${selected.kind === "row" ? "Row" : "Column"} ${selected.idx} of ${selected.kind === "row" ? "A" : "B"}. Click a "${
                selected.kind === "row" ? "row from A" : "column from B"
              }" slot of the entry it should go into.`
            : `Click a row of A or column of B to pick it up, then click the matching slot below. Entry (i, j) of AB needs Row i of A and Column j of B.`}
        </span>
      </div>

      <div className="mmb__actions">
        {PUZZLES.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`mmb__puzzle-pick${i === puzzleIdx ? " mmb__puzzle-pick--active" : ""}`}
            onClick={() => handleNewPuzzle(i)}
          >
            {p.label}
          </button>
        ))}
        <button type="button" className="mmb__reset" onClick={handleReset}>
          Reset slots
        </button>
      </div>

      <WidgetExplainer
        widgetName="Matrix multiplication builder — drag rows and columns to construct AB"
        widgetDescription="A construction-quiz widget for the row-times-column rule of matrix multiplication. The reader is shown two 2×2 matrices A and B, with each row of A presented as a clickable chip (Row 1, Row 2) and each column of B as a clickable chip (Col 1, Col 2). Below them, the four entries of AB are empty slots, each with two sub-targets labelled 'row from A' and 'col from B'. The reader clicks a chip to pick it up, then clicks a sub-target to drop it. The widget enforces the index pattern: entry (i, j) of AB requires exactly Row i of A and Column j of B — dropping the wrong row or wrong column triggers a red rejection flash. When a slot has both correct row and correct column, the dot product fires and the slot lights up green with the computed value. The pedagogical point is that the row-times-column rule isn't an arbitrary convention — it's an index-matching constraint, and the reader cannot finish the matrix without performing each dot product correctly. Three built-in puzzles of varying difficulty (integers, mixed-sign, geometric shear · rotate)."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

function productAt(P: Matrix2, i: 1 | 2, j: 1 | 2): number {
  if (i === 1 && j === 1) return P.a;
  if (i === 1 && j === 2) return P.b;
  if (i === 2 && j === 1) return P.c;
  return P.d;
}

interface OperandPanelProps {
  label: string;
  M: Matrix2;
  /** Which dimension this matrix donates chips for ("row" → 2 row chips). */
  mode: ChipKind;
  selected: SelectedChip | null;
  onPick: (kind: ChipKind, idx: 1 | 2) => void;
}

function OperandPanel({ label, M, mode, selected, onPick }: OperandPanelProps) {
  return (
    <div className="mmb__operand">
      <div className="mmb__operand-label">{label}</div>
      <MatrixDisplay M={M} highlight={mode} />
      <div className="mmb__chip-stack">
        <span className="mmb__chip-stack-label">
          {mode === "row" ? `Drag a row of ${label}` : `Drag a column of ${label}`}
        </span>
        {[1, 2].map((idx) => {
          const i = idx as 1 | 2;
          const vec = mode === "row" ? rowOf(M, i) : colOf(M, i);
          const isSelected =
            selected !== null && selected.kind === mode && selected.idx === i;
          return (
            <button
              key={i}
              type="button"
              className={`mmb__chip mmb__chip--${mode}${
                isSelected ? " mmb__chip--selected" : ""
              }`}
              onClick={() => onPick(mode, i)}
            >
              <span className="mmb__chip-name">
                {mode === "row" ? `Row ${i}` : `Col ${i}`}
              </span>
              <span className="mmb__chip-values">
                ({fmt(vec[0])}, {fmt(vec[1])})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MatrixDisplayProps {
  M: Matrix2;
  /** Style hint — highlight rows in a row-donor or cols in a col-donor. */
  highlight: ChipKind;
}

function MatrixDisplay({ M, highlight }: MatrixDisplayProps) {
  return (
    <div className={`mmb__matrix mmb__matrix--${highlight}`}>
      <span className="mmb__bracket mmb__bracket--left" />
      <div className="mmb__matrix-grid">
        <span className="mmb__entry">{fmt(M.a)}</span>
        <span className="mmb__entry">{fmt(M.b)}</span>
        <span className="mmb__entry">{fmt(M.c)}</span>
        <span className="mmb__entry">{fmt(M.d)}</span>
      </div>
      <span className="mmb__bracket mmb__bracket--right" />
    </div>
  );
}

interface ProductGridProps {
  product: Matrix2;
  slots: Record<SlotKey, SlotState>;
  selected: SelectedChip | null;
  isSlotComplete: (k: SlotKey) => boolean;
  onDrop: (slotKey: SlotKey, target: ChipKind) => void;
  onClear: (slotKey: SlotKey) => void;
}

function ProductGrid({
  product,
  slots,
  selected,
  isSlotComplete,
  onDrop,
  onClear,
}: ProductGridProps) {
  return (
    <div className="mmb__product">
      <div className="mmb__product-label">AB</div>
      <span className="mmb__bracket mmb__bracket--left mmb__bracket--big" />
      <div className="mmb__product-grid">
        {SLOT_KEYS.map((k) => (
          <SlotCell
            key={k}
            slotKey={k}
            product={product}
            state={slots[k]}
            selected={selected}
            complete={isSlotComplete(k)}
            onDrop={onDrop}
            onClear={onClear}
          />
        ))}
      </div>
      <span className="mmb__bracket mmb__bracket--right mmb__bracket--big" />
    </div>
  );
}

interface SlotCellProps {
  slotKey: SlotKey;
  product: Matrix2;
  state: SlotState;
  selected: SelectedChip | null;
  complete: boolean;
  onDrop: (slotKey: SlotKey, target: ChipKind) => void;
  onClear: (slotKey: SlotKey) => void;
}

function SlotCell({
  slotKey,
  product,
  state,
  selected,
  complete,
  onDrop,
  onClear,
}: SlotCellProps) {
  const { i, j } = slotIndices(slotKey);
  const value = productAt(product, i, j);

  // Resolve once for the rejection animation accent.
  const dangerColor = resolveColor("var(--widget-danger)");

  return (
    <div
      className={`mmb__slot${complete ? " mmb__slot--done" : ""}`}
      // The rejectKey lives in state. Re-rendering with a different rejectKey
      // re-runs the CSS animation by keying off the inline style timestamp.
      style={complete ? undefined : { ["--reject-pulse" as string]: `${state.rejectKey}` }}
    >
      <div className="mmb__slot-label">
        ({i}, {j})
      </div>
      {complete ? (
        <button
          type="button"
          className="mmb__slot-done-btn"
          onClick={() => onClear(slotKey)}
          title="Click to clear this entry"
        >
          <span className="mmb__slot-done-value">{fmt(value)}</span>
          <span className="mmb__slot-done-formula">
            R{i}·C{j}
          </span>
        </button>
      ) : (
        <div className="mmb__slot-targets">
          <SubTarget
            slotKey={slotKey}
            target="row"
            currentIdx={state.rowIdx}
            selected={selected}
            rejectKey={state.rejectKey}
            dangerColor={dangerColor}
            onDrop={onDrop}
          />
          <span className="mmb__slot-dot">·</span>
          <SubTarget
            slotKey={slotKey}
            target="col"
            currentIdx={state.colIdx}
            selected={selected}
            rejectKey={state.rejectKey}
            dangerColor={dangerColor}
            onDrop={onDrop}
          />
        </div>
      )}
    </div>
  );
}

interface SubTargetProps {
  slotKey: SlotKey;
  target: ChipKind;
  currentIdx: 1 | 2 | null;
  selected: SelectedChip | null;
  rejectKey: number;
  dangerColor: string;
  onDrop: (slotKey: SlotKey, target: ChipKind) => void;
}

function SubTarget({
  slotKey,
  target,
  currentIdx,
  selected,
  rejectKey,
  onDrop,
}: SubTargetProps) {
  const armed = selected !== null && selected.kind === target;
  const label = target === "row" ? "Row from A" : "Col from B";
  return (
    <button
      type="button"
      key={rejectKey}
      className={`mmb__subtarget mmb__subtarget--${target}${
        armed ? " mmb__subtarget--armed" : ""
      }${currentIdx !== null ? " mmb__subtarget--filled" : ""}`}
      onClick={() => onDrop(slotKey, target)}
      disabled={!armed && currentIdx === null}
    >
      {currentIdx !== null ? (
        <>
          <span className="mmb__subtarget-name">
            {target === "row" ? `R${currentIdx}` : `C${currentIdx}`}
          </span>
          <span className="mmb__subtarget-status">placed</span>
        </>
      ) : (
        <>
          <span className="mmb__subtarget-name">{label}</span>
          <span className="mmb__subtarget-status">
            {armed ? "drop here" : "empty"}
          </span>
        </>
      )}
    </button>
  );
}
