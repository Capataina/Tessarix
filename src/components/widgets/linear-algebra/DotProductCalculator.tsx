/**
 * DotProductCalculator — build-the-sum tile game.
 *
 * Used by:
 *   - linear-algebra-dot-product
 *
 * THIS IS AN ALGORITHM-EXECUTION QUIZ. Two vectors a and b are shown.
 * The dot product formula a₁b₁ + a₂b₂ is presented as a set of
 * CANDIDATE PRODUCT TILES — including the right products (a₁·b₁ and
 * a₂·b₂) AND wrong cross-pair products (a₁·b₂, a₂·b₁) AND nonsensical
 * same-vector products (a₁·a₂, b₁·b₂) to act as distractors.
 *
 * The reader must click only the CORRECT product tiles to send them
 * into the "sum bar". Clicking a distractor flashes red and the tile
 * shakes — it CANNOT be added to the sum. Clicking a correct product
 * adds it; the running sum is displayed. Once both correct products
 * are added, the round is solved and the reader can advance.
 *
 * Pedagogically: the mechanical algorithm for computing dot products,
 * with no shortcut. Component pairs go together by INDEX (a_i with
 * b_i); you can't mix a₁ with b₂. That's the trap the cross-pair
 * distractors are aiming at — a common error when readers compute by
 * hand under time pressure.
 *
 * Mechanic detail:
 *   - Tiles are clickable cards (drag-on-mobile is harder to support
 *     in a Tauri desktop context; the click model is more robust and
 *     equivalent in pedagogical effect).
 *   - Wrong-product tiles fire a shake animation + telemetry event so
 *     repeated wrong-pair mistakes can be surfaced in future analysis.
 *   - Five rounds with progressively trickier vectors (negative entries
 *     in round 3+ to surface sign-handling, zeros in round 4 to surface
 *     "any zero in a product kills it").
 *
 * Implements metaphor library §1 (iterated operation) — the operation
 * is BUILT BY the reader, not displayed FOR them.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./DotProductCalculator.css";

interface Vec2Pair {
  a: [number, number];
  b: [number, number];
  label: string;
}

const ROUNDS: Vec2Pair[] = [
  { a: [3, 4], b: [2, 1], label: "Round 1 — small positive integers" },
  { a: [5, 2], b: [3, 6], label: "Round 2 — medium positive integers" },
  { a: [-2, 4], b: [3, -1], label: "Round 3 — mixed signs" },
  { a: [0, 5], b: [4, 0], label: "Round 4 — perpendicular (one zero each)" },
  { a: [4, -3], b: [3, 4], label: "Round 5 — perpendicular, mixed signs" },
];

/**
 * A tile is one of:
 *   - "correct"      : a_i · b_i, contributes to the dot product
 *   - "cross"        : a_i · b_j (i ≠ j), the index-mix trap
 *   - "self_a"       : a_1 · a_2, a self-pair distractor
 *   - "self_b"       : b_1 · b_2
 */
type TileKind = "correct" | "cross" | "self_a" | "self_b";

interface Tile {
  id: string;
  label: string;
  value: number;
  kind: TileKind;
  /** Index this tile applies to in the dot product (only meaningful for "correct"). */
  index?: 1 | 2;
}

function buildTiles(pair: Vec2Pair): Tile[] {
  const [a1, a2] = pair.a;
  const [b1, b2] = pair.b;
  return [
    {
      id: "a1b1",
      label: `a₁·b₁ = ${a1} · ${b1}`,
      value: a1 * b1,
      kind: "correct",
      index: 1,
    },
    {
      id: "a2b2",
      label: `a₂·b₂ = ${a2} · ${b2}`,
      value: a2 * b2,
      kind: "correct",
      index: 2,
    },
    {
      id: "a1b2",
      label: `a₁·b₂ = ${a1} · ${b2}`,
      value: a1 * b2,
      kind: "cross",
    },
    {
      id: "a2b1",
      label: `a₂·b₁ = ${a2} · ${b1}`,
      value: a2 * b1,
      kind: "cross",
    },
    {
      id: "a1a2",
      label: `a₁·a₂ = ${a1} · ${a2}`,
      value: a1 * a2,
      kind: "self_a",
    },
    {
      id: "b1b2",
      label: `b₁·b₂ = ${b1} · ${b2}`,
      value: b1 * b2,
      kind: "self_b",
    },
  ];
}

interface DotProductCalculatorProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function DotProductCalculator({
  onStateChange,
}: DotProductCalculatorProps) {
  const { recordInteraction } = useWidgetTelemetry("DotProductCalculator");
  const [roundIdx, setRoundIdx] = useState(0);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<number>(0);
  const [score, setScore] = useState<{ solved: number; errors: number }>({
    solved: 0,
    errors: 0,
  });
  const [recentlyRejected, setRecentlyRejected] = useState<string | null>(null);

  const round = ROUNDS[roundIdx];
  const tiles = useMemo(() => buildTiles(round), [round]);
  const expected = round.a[0] * round.b[0] + round.a[1] * round.b[1];

  const placedSet = useMemo(() => new Set(placedIds), [placedIds]);
  const runningSum = useMemo(
    () =>
      tiles
        .filter((t) => placedSet.has(t.id))
        .reduce((acc, t) => acc + t.value, 0),
    [tiles, placedSet],
  );

  // Solved iff both correct tiles have been placed (and no distractors —
  // distractors can never reach the sum bar by construction).
  const correctPlaced = tiles
    .filter((t) => t.kind === "correct" && placedSet.has(t.id))
    .length;
  const isSolved = correctPlaced === 2;

  // On transition to solved, record the win exactly once.
  useEffect(() => {
    if (isSolved) {
      setScore((prev) => ({
        solved: prev.solved + 1,
        errors: prev.errors + errors,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSolved]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      round: roundIdx + 1,
      placed: placedIds.length,
      correct_placed: correctPlaced,
      errors,
      sum: Number(runningSum.toFixed(3)),
      expected,
      solved: isSolved ? 1 : 0,
      total_solved: score.solved,
    });
  }, [
    roundIdx,
    placedIds.length,
    correctPlaced,
    errors,
    runningSum,
    expected,
    isSolved,
    score.solved,
    onStateChange,
  ]);

  const handleClickTile = useCallback(
    (tile: Tile) => {
      if (isSolved) return;
      if (placedSet.has(tile.id)) {
        // Remove from sum bar (only allowed for correct tiles already placed).
        setPlacedIds((prev) => prev.filter((id) => id !== tile.id));
        recordInteraction("remove_tile", { id: tile.id, kind: tile.kind });
        return;
      }
      if (tile.kind === "correct") {
        setPlacedIds((prev) => [...prev, tile.id]);
        recordInteraction("place_tile", {
          id: tile.id,
          index: tile.index ?? 0,
          kind: tile.kind,
        });
      } else {
        // Reject — flash and increment error count.
        setErrors((e) => e + 1);
        setRecentlyRejected(tile.id);
        recordInteraction("reject_tile", {
          id: tile.id,
          kind: tile.kind,
        });
        // Clear the recent-reject flag after the shake animation runs.
        window.setTimeout(() => setRecentlyRejected(null), 600);
      }
    },
    [isSolved, placedSet, recordInteraction],
  );

  const handleNextRound = useCallback(() => {
    const next = (roundIdx + 1) % ROUNDS.length;
    setRoundIdx(next);
    setPlacedIds([]);
    setErrors(0);
    setRecentlyRejected(null);
    recordInteraction("next_round", { next: next + 1 });
  }, [roundIdx, recordInteraction]);

  const handleReset = useCallback(() => {
    setPlacedIds([]);
    setErrors(0);
    setRecentlyRejected(null);
    recordInteraction("reset_round");
  }, [recordInteraction]);

  const handleResetGame = useCallback(() => {
    setRoundIdx(0);
    setPlacedIds([]);
    setErrors(0);
    setRecentlyRejected(null);
    setScore({ solved: 0, errors: 0 });
    recordInteraction("reset_game");
  }, [recordInteraction]);

  const stateSummary = useMemo(() => {
    const aStr = `a = (${round.a[0]}, ${round.a[1]})`;
    const bStr = `b = (${round.b[0]}, ${round.b[1]})`;
    const placedLabels =
      placedIds.length === 0
        ? "(none)"
        : placedIds
            .map((id) => tiles.find((t) => t.id === id)?.label ?? id)
            .join(" + ");
    const status = isSolved
      ? `SOLVED — a · b = ${expected}.`
      : `${correctPlaced}/2 correct tiles placed; running sum = ${runningSum}. ${errors} wrong-tile attempt(s) this round.`;
    return `Dot product calculator, round ${roundIdx + 1}/${ROUNDS.length}. ${aStr}; ${bStr}. Expected a · b = ${expected}. Tiles placed: ${placedLabels}. ${status}`;
  }, [
    round,
    placedIds,
    tiles,
    isSolved,
    expected,
    correctPlaced,
    runningSum,
    errors,
    roundIdx,
  ]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        round: roundIdx,
        placed: [...placedIds].sort(),
        errors,
        solved: isSolved,
      }),
    [roundIdx, placedIds, errors, isSolved],
  );

  return (
    <div className={`dpc${isSolved ? " dpc--solved" : ""}`}>
      <header className="dpc__head">
        <div className="dpc__heading">
          <span className="dpc__heading-label">ROUND</span>
          <span className="dpc__heading-value">
            {roundIdx + 1} / {ROUNDS.length}
          </span>
        </div>
        <div className="dpc__heading">
          <span className="dpc__heading-label">VECTORS</span>
          <span className="dpc__heading-value dpc__heading-mono">
            a = ({round.a[0]}, {round.a[1]}); b = ({round.b[0]}, {round.b[1]})
          </span>
        </div>
        <div className="dpc__heading">
          <span className="dpc__heading-label">REJECTS</span>
          <span
            className={`dpc__heading-value${
              errors > 0 ? " dpc__heading-value--bad" : ""
            }`}
          >
            {errors}
          </span>
        </div>
        <div className="dpc__heading">
          <span className="dpc__heading-label">WINS</span>
          <span className="dpc__heading-value">{score.solved}</span>
        </div>
      </header>

      <div className="dpc__formula">
        <span className="dpc__formula-label">Build the sum:</span>
        <span className="dpc__formula-expr">
          a · b ={" "}
          <span className="dpc__formula-slot">
            {placedIds.length >= 1
              ? tiles.find((t) => t.id === placedIds[0])?.label ?? "?"
              : "?"}
          </span>
          {" + "}
          <span className="dpc__formula-slot">
            {placedIds.length >= 2
              ? tiles.find((t) => t.id === placedIds[1])?.label ?? "?"
              : "?"}
          </span>
        </span>
      </div>

      <div className="dpc__sum-bar">
        <span className="dpc__sum-label">SUM</span>
        <div className="dpc__sum-tiles">
          {placedIds.length === 0 && (
            <span className="dpc__sum-empty">
              Click a correct product tile below to add it here.
            </span>
          )}
          {placedIds.map((id) => {
            const t = tiles.find((x) => x.id === id);
            if (!t) return null;
            return (
              <button
                key={id}
                type="button"
                className="dpc__sum-tile"
                onClick={() => handleClickTile(t)}
                title="Click to remove from sum"
              >
                {t.label} = {t.value}
                <span className="dpc__sum-tile-x">×</span>
              </button>
            );
          })}
        </div>
        <span
          className={`dpc__sum-value${isSolved ? " dpc__sum-value--ok" : ""}`}
        >
          = {runningSum}
        </span>
      </div>

      <div className="dpc__palette">
        <span className="dpc__palette-label">
          PRODUCT TILES — click correct ones to add them to the sum
        </span>
        <div className="dpc__palette-row">
          {tiles.map((t) => {
            const placed = placedSet.has(t.id);
            const isRejected = recentlyRejected === t.id;
            const classes = [
              "dpc__tile",
              `dpc__tile--${t.kind}`,
              placed ? "dpc__tile--placed" : "",
              isRejected ? "dpc__tile--rejected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={t.id}
                type="button"
                className={classes}
                onClick={() => handleClickTile(t)}
                disabled={isSolved && t.kind !== "correct"}
              >
                <span className="dpc__tile-label">{t.label}</span>
                <span className="dpc__tile-value">= {t.value}</span>
                {placed && <span className="dpc__tile-pin">in sum</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`dpc__verdict dpc__verdict--${
          isSolved ? "solved" : errors > 0 ? "warn" : "idle"
        }`}
      >
        <span className="dpc__verdict-label">
          {isSolved ? "Solved ✓" : errors > 0 ? "Try again" : "Working"}
        </span>
        <span className="dpc__verdict-value">
          {isSolved
            ? `a · b = ${expected}. The formula picks ONE product per index: a₁·b₁ + a₂·b₂. Cross-products like a₁·b₂ never appear — that's the trap the rejected tiles surface.`
            : errors > 0
              ? `Cross-products (a₁·b₂, a₂·b₁) and same-vector products (a₁·a₂, b₁·b₂) are NOT part of a · b. The dot product pairs components by INDEX — a_i with b_i.`
              : `Pick the two tiles where the indices match — a_i · b_i for i = 1 and i = 2. Distractors get rejected with a flash.`}
        </span>
      </div>

      <div className="dpc__controls">
        <button
          type="button"
          className="dpc__btn dpc__btn--primary"
          onClick={handleNextRound}
          disabled={!isSolved}
        >
          {roundIdx === ROUNDS.length - 1
            ? "Loop back to round 1 →"
            : "Next round →"}
        </button>
        <button type="button" className="dpc__btn" onClick={handleReset}>
          Reset round
        </button>
        <button type="button" className="dpc__btn" onClick={handleResetGame}>
          Reset game
        </button>
      </div>

      <WidgetExplainer
        widgetName="Dot product calculator — build the sum"
        widgetDescription="An algorithm-execution quiz for the dot product formula. Two vectors a and b are shown. Six product tiles appear: the two correct products (a₁·b₁ and a₂·b₂), two CROSS-pair distractors (a₁·b₂ and a₂·b₁) that trap the common 'wrong index pairing' mistake, and two SAME-VECTOR distractors (a₁·a₂ and b₁·b₂) for completeness. The reader clicks correct tiles to push them into a 'sum bar'; distractors get rejected with a shake animation and increment an error counter. The widget grades on outcome: round is solved when both correct tiles are placed. Five rounds with progressive trickiness — round 3 introduces negative entries (sign-handling), round 4 has perpendicular vectors with zero entries (a·b = 0 even though neither vector is zero), round 5 has perpendicular mixed-sign vectors. The pedagogical centerpiece is that the dot product pairs components BY INDEX (a_i with b_i, never a_i with b_j for i≠j) — having the cross-pair tiles physically reject reinforces the rule by negative example."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}
