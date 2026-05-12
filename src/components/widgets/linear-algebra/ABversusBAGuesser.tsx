/**
 * ABversusBAGuesser — predict-one-entry-of-each-product game.
 *
 * Used by:
 *   - linear-algebra-matrix-operations
 *
 * THIS IS A PREDICTION QUIZ. Two 2×2 matrices A and B are shown. The
 * reader picks one entry of AB and one entry of BA, types their guess
 * for each, then hits "Reveal" to see the actual AB and BA. The widget
 * scores both guesses by closeness; the round score is the BETTER of
 * the two — i.e. the reader is rewarded for their best dot-product
 * estimate per round, not punished for whichever entry they guessed
 * worse.
 *
 * Cross-round tracking: a "perfect" round is one where the closer
 * guess is within ε of the truth. The widget reports cumulative
 * accuracy and a running history of the gap between AB and BA per
 * round, so the reader sees that AB ≠ BA is the norm and that the gap
 * is rarely small.
 *
 * Pedagogy: predict-then-verify with cognitive load tightened down to
 * ONE scalar per matrix. Most ABversusBA widgets ask for the whole
 * matrix; that's four computations, and the reader bails. Asking for
 * one entry of each forces the row-dot-column computation twice per
 * round (once for the chosen entry of AB, once for the chosen entry
 * of BA) and surfaces the asymmetry quantitatively. Multiple rounds
 * build the intuition that the difference is rarely small.
 *
 * UX:
 *   - A and B displayed as compact 2×2 matrices at the top.
 *   - Two prediction panels below — "Predict AB" and "Predict BA". Each
 *     has a 2×2 cell selector; the reader clicks a cell to pick the
 *     entry to predict, then types a number in the input that appears.
 *   - "Reveal" button — disabled until both predictions exist. On
 *     click, the actual AB and BA are computed and shown, with the
 *     reader's two chosen cells highlighted. The closer guess is
 *     starred. Cumulative score tallied across rounds.
 *   - "New round" reshuffles A and B from a curated deck.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWidgetTelemetry } from "../../../lib/telemetry";
import { WidgetExplainer } from "../shared/WidgetExplainer";
import "./ABversusBAGuesser.css";

interface Matrix2 {
  a: number;
  b: number;
  c: number;
  d: number;
}

function mul(M: Matrix2, N: Matrix2): Matrix2 {
  return {
    a: M.a * N.a + M.b * N.c,
    b: M.a * N.b + M.b * N.d,
    c: M.c * N.a + M.d * N.c,
    d: M.c * N.b + M.d * N.d,
  };
}

function entryAt(M: Matrix2, i: 1 | 2, j: 1 | 2): number {
  if (i === 1 && j === 1) return M.a;
  if (i === 1 && j === 2) return M.b;
  if (i === 2 && j === 1) return M.c;
  return M.d;
}

const fmt = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(2);

const ROUNDS: { A: Matrix2; B: Matrix2 }[] = [
  // Small-integer pairs where AB and BA differ in obvious ways.
  { A: { a: 1, b: 2, c: 3, d: 4 }, B: { a: 5, b: 6, c: 7, d: 8 } },
  { A: { a: 2, b: -1, c: 0, d: 3 }, B: { a: 1, b: 4, c: -2, d: 1 } },
  { A: { a: 1, b: 1, c: 0, d: 1 }, B: { a: 0, b: -1, c: 1, d: 0 } },
  { A: { a: -1, b: 0, c: 0, d: 1 }, B: { a: 2, b: 3, c: 1, d: -1 } },
  { A: { a: 3, b: 2, c: -1, d: 4 }, B: { a: 0, b: 5, c: 2, d: -3 } },
  // A commuting case — A is a scalar multiple of identity. Surprise reveal.
  { A: { a: 2, b: 0, c: 0, d: 2 }, B: { a: 1, b: 7, c: -3, d: 5 } },
];

type CellRef = { i: 1 | 2; j: 1 | 2 };

const CELLS: CellRef[] = [
  { i: 1, j: 1 },
  { i: 1, j: 2 },
  { i: 2, j: 1 },
  { i: 2, j: 2 },
];

interface Prediction {
  cell: CellRef;
  guess: string;
}

/** Score = 1 if exact, decays as the absolute error grows relative to truth. */
function score(guessStr: string, truth: number): { value: number; valid: boolean } {
  const trimmed = guessStr.trim();
  if (trimmed === "") return { value: 0, valid: false };
  const g = Number(trimmed);
  if (Number.isNaN(g)) return { value: 0, valid: false };
  const denom = Math.max(Math.abs(truth), Math.abs(g), 1);
  const raw = 1 - Math.abs(g - truth) / denom;
  return { value: Math.max(0, raw), valid: true };
}

interface RoundResult {
  /** Did the reader's closer guess fall within "good" (≥ 0.85)? */
  good: boolean;
  /** Score of the better of the two guesses, 0–1. */
  bestScore: number;
  /** Which side was closer to truth: AB or BA. */
  bestSide: "AB" | "BA" | "tie";
  /** Norm of (AB - BA) summed across all four entries — how far apart the products are. */
  abBaGap: number;
}

interface ABversusBAGuesserProps {
  onStateChange?: (state: Record<string, number>) => void;
}

export function ABversusBAGuesser({ onStateChange }: ABversusBAGuesserProps) {
  const { recordInteraction } = useWidgetTelemetry("ABversusBAGuesser");
  const [roundIdx, setRoundIdx] = useState(0);
  const [predAB, setPredAB] = useState<Prediction | null>(null);
  const [predBA, setPredBA] = useState<Prediction | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useState<RoundResult[]>([]);

  const round = ROUNDS[roundIdx];
  const AB = useMemo(() => mul(round.A, round.B), [round]);
  const BA = useMemo(() => mul(round.B, round.A), [round]);

  const truthAB = predAB ? entryAt(AB, predAB.cell.i, predAB.cell.j) : null;
  const truthBA = predBA ? entryAt(BA, predBA.cell.i, predBA.cell.j) : null;

  const scoreAB =
    predAB && truthAB !== null ? score(predAB.guess, truthAB) : { value: 0, valid: false };
  const scoreBA =
    predBA && truthBA !== null ? score(predBA.guess, truthBA) : { value: 0, valid: false };

  const bothValid = revealed && scoreAB.valid && scoreBA.valid;
  const bestScore = Math.max(scoreAB.value, scoreBA.value);
  const bestSide: "AB" | "BA" | "tie" =
    scoreAB.value > scoreBA.value
      ? "AB"
      : scoreBA.value > scoreAB.value
      ? "BA"
      : "tie";

  const abBaGap = useMemo(
    () =>
      Math.abs(AB.a - BA.a) +
      Math.abs(AB.b - BA.b) +
      Math.abs(AB.c - BA.c) +
      Math.abs(AB.d - BA.d),
    [AB, BA],
  );

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      round: roundIdx,
      revealed: revealed ? 1 : 0,
      score_ab: Number(scoreAB.value.toFixed(3)),
      score_ba: Number(scoreBA.value.toFixed(3)),
      best_score: Number(bestScore.toFixed(3)),
      ab_ba_gap: Number(abBaGap.toFixed(3)),
      rounds_played: history.length,
    });
  }, [roundIdx, revealed, scoreAB, scoreBA, bestScore, abBaGap, history.length, onStateChange]);

  const handlePickCell = useCallback(
    (side: "AB" | "BA", cell: CellRef) => {
      if (revealed) return;
      if (side === "AB") {
        setPredAB((prev) => ({ cell, guess: prev?.cell.i === cell.i && prev.cell.j === cell.j ? prev.guess : "" }));
      } else {
        setPredBA((prev) => ({ cell, guess: prev?.cell.i === cell.i && prev.cell.j === cell.j ? prev.guess : "" }));
      }
      recordInteraction("pick_cell", { side, i: cell.i, j: cell.j });
    },
    [revealed, recordInteraction],
  );

  const handleGuessChange = useCallback(
    (side: "AB" | "BA", g: string) => {
      if (revealed) return;
      if (side === "AB") {
        setPredAB((prev) => (prev ? { ...prev, guess: g } : prev));
      } else {
        setPredBA((prev) => (prev ? { ...prev, guess: g } : prev));
      }
    },
    [revealed],
  );

  const canReveal =
    !revealed &&
    predAB !== null &&
    predBA !== null &&
    predAB.guess.trim() !== "" &&
    predBA.guess.trim() !== "" &&
    !Number.isNaN(Number(predAB.guess.trim())) &&
    !Number.isNaN(Number(predBA.guess.trim()));

  const handleReveal = useCallback(() => {
    if (!canReveal) return;
    setRevealed(true);
    if (truthAB !== null && truthBA !== null && predAB && predBA) {
      const sAB = score(predAB.guess, truthAB);
      const sBA = score(predBA.guess, truthBA);
      const best = Math.max(sAB.value, sBA.value);
      const result: RoundResult = {
        good: best >= 0.85,
        bestScore: best,
        bestSide:
          sAB.value > sBA.value ? "AB" : sBA.value > sAB.value ? "BA" : "tie",
        abBaGap:
          Math.abs(AB.a - BA.a) +
          Math.abs(AB.b - BA.b) +
          Math.abs(AB.c - BA.c) +
          Math.abs(AB.d - BA.d),
      };
      setHistory((h) => [...h, result]);
      recordInteraction("reveal", {
        score_ab: Number(sAB.value.toFixed(3)),
        score_ba: Number(sBA.value.toFixed(3)),
        gap: Number(result.abBaGap.toFixed(3)),
      });
    }
  }, [canReveal, predAB, predBA, truthAB, truthBA, AB, BA, recordInteraction]);

  const handleNewRound = useCallback(() => {
    setRoundIdx((i) => (i + 1) % ROUNDS.length);
    setPredAB(null);
    setPredBA(null);
    setRevealed(false);
    recordInteraction("new_round");
  }, [recordInteraction]);

  const handleReset = useCallback(() => {
    setPredAB(null);
    setPredBA(null);
    setRevealed(false);
    recordInteraction("reset");
  }, [recordInteraction]);

  const stateSummary = useMemo(() => {
    const aStr = `A = [[${fmt(round.A.a)}, ${fmt(round.A.b)}], [${fmt(round.A.c)}, ${fmt(round.A.d)}]]`;
    const bStr = `B = [[${fmt(round.B.a)}, ${fmt(round.B.b)}], [${fmt(round.B.c)}, ${fmt(round.B.d)}]]`;
    if (!revealed) {
      const picks = `Reader has picked: AB cell ${predAB ? `(${predAB.cell.i}, ${predAB.cell.j}) guess=${predAB.guess || "(none yet)"}` : "(not yet)"}; BA cell ${predBA ? `(${predBA.cell.i}, ${predBA.cell.j}) guess=${predBA.guess || "(none yet)"}` : "(not yet)"}.`;
      return `AB vs BA Guesser — round ${roundIdx + 1}/${ROUNDS.length}. ${aStr}, ${bStr}. ${picks}`;
    }
    const abStr = `AB = [[${fmt(AB.a)}, ${fmt(AB.b)}], [${fmt(AB.c)}, ${fmt(AB.d)}]]`;
    const baStr = `BA = [[${fmt(BA.a)}, ${fmt(BA.b)}], [${fmt(BA.c)}, ${fmt(BA.d)}]]`;
    const result = bothValid
      ? `Reader guessed AB[${predAB!.cell.i}, ${predAB!.cell.j}] = ${predAB!.guess} (truth ${fmt(truthAB!)}) — score ${scoreAB.value.toFixed(2)}; BA[${predBA!.cell.i}, ${predBA!.cell.j}] = ${predBA!.guess} (truth ${fmt(truthBA!)}) — score ${scoreBA.value.toFixed(2)}. Best of the two: ${bestScore.toFixed(2)} on the ${bestSide} side.`
      : "Reveal computed but guesses invalid.";
    return `AB vs BA Guesser — round ${roundIdx + 1}/${ROUNDS.length}. ${aStr}, ${bStr}. Truth: ${abStr}, ${baStr}. Gap ||AB - BA||₁ = ${fmt(abBaGap)}. ${result}`;
  }, [
    round,
    revealed,
    predAB,
    predBA,
    AB,
    BA,
    bothValid,
    truthAB,
    truthBA,
    scoreAB.value,
    scoreBA.value,
    bestScore,
    bestSide,
    abBaGap,
    roundIdx,
  ]);

  const stateKey = useMemo(
    () =>
      JSON.stringify({
        round: roundIdx,
        predAB: predAB ? { ...predAB.cell, g: predAB.guess } : null,
        predBA: predBA ? { ...predBA.cell, g: predBA.guess } : null,
        revealed,
      }),
    [roundIdx, predAB, predBA, revealed],
  );

  const totalScore = history.reduce((acc, h) => acc + h.bestScore, 0);
  const meanGap =
    history.length === 0
      ? 0
      : history.reduce((acc, h) => acc + h.abBaGap, 0) / history.length;
  const goodRounds = history.filter((h) => h.good).length;

  return (
    <div
      className={`abba${
        revealed ? (bestScore >= 0.85 ? " abba--good" : " abba--off") : ""
      }`}
    >
      <header className="abba__head">
        <div className="abba__heading">
          <span className="abba__heading-label">ROUND</span>
          <span className="abba__heading-value">
            {roundIdx + 1} / {ROUNDS.length}
          </span>
        </div>
        <div className="abba__heading">
          <span className="abba__heading-label">HISTORY</span>
          <span className="abba__heading-value">
            {goodRounds}/{history.length} good
            {history.length > 0
              ? ` · mean ${(totalScore / history.length).toFixed(2)}`
              : ""}
          </span>
        </div>
        <div className="abba__heading">
          <span className="abba__heading-label">||AB − BA||₁ (mean)</span>
          <span className="abba__heading-value">
            {history.length === 0 ? "—" : fmt(meanGap)}
          </span>
        </div>
      </header>

      <div className="abba__operands">
        <OperandBlock label="A" M={round.A} />
        <div className="abba__op">×</div>
        <OperandBlock label="B" M={round.B} />
      </div>

      <div className="abba__predictions">
        <PredictionPanel
          side="AB"
          formula="AB"
          truth={revealed ? AB : null}
          pred={predAB}
          onPickCell={(cell) => handlePickCell("AB", cell)}
          onGuessChange={(g) => handleGuessChange("AB", g)}
          revealed={revealed}
          truthValue={truthAB}
          scoreValue={scoreAB.value}
          starred={revealed && bestSide === "AB" && bothValid}
        />
        <PredictionPanel
          side="BA"
          formula="BA"
          truth={revealed ? BA : null}
          pred={predBA}
          onPickCell={(cell) => handlePickCell("BA", cell)}
          onGuessChange={(g) => handleGuessChange("BA", g)}
          revealed={revealed}
          truthValue={truthBA}
          scoreValue={scoreBA.value}
          starred={revealed && bestSide === "BA" && bothValid}
        />
      </div>

      <div className="abba__actions">
        <button
          type="button"
          className="abba__reveal"
          onClick={handleReveal}
          disabled={!canReveal}
        >
          Reveal AB and BA
        </button>
        <button
          type="button"
          className="abba__action"
          onClick={handleNewRound}
        >
          New round
        </button>
        <button type="button" className="abba__reset" onClick={handleReset}>
          Reset this round
        </button>
      </div>

      <div
        className={`abba__verdict abba__verdict--${
          !revealed
            ? "idle"
            : bestScore >= 0.85
            ? "good"
            : bestScore >= 0.5
            ? "ok"
            : "off"
        }`}
      >
        <span className="abba__verdict-label">Result</span>
        <span className="abba__verdict-value">
          {!revealed &&
            "Pick one cell of AB and one cell of BA. Predict each by typing a single number. Your round score is the BETTER of your two predictions — you're rewarded for whichever dot product you got closer to."}
          {revealed && bothValid && bestScore >= 0.85 &&
            `Strong round. Your ${bestSide} guess (${
              bestSide === "AB" ? predAB?.guess : predBA?.guess
            }) was off by only ${(
              1 - bestScore
            ).toFixed(2)} relative to the truth (${fmt(
              bestSide === "AB" ? truthAB! : truthBA!,
            )}). AB and BA differ here by ||AB − BA||₁ = ${fmt(
              abBaGap,
            )} — the two products are ${
              abBaGap < 0.01 ? "actually equal (commuting pair!)" : "visibly different"
            }.`}
          {revealed && bothValid && bestScore < 0.85 && bestScore >= 0.5 &&
            `Close-ish on your ${bestSide} guess. The truth was ${fmt(
              bestSide === "AB" ? truthAB! : truthBA!,
            )}; you said ${
              bestSide === "AB" ? predAB?.guess : predBA?.guess
            }. AB and BA differ by ${fmt(abBaGap)} — the rest of the entries probably tell the same story.`}
          {revealed && bothValid && bestScore < 0.5 &&
            `Off this round. Both guesses missed by more than half. The dot-product rule is the only safe path — for entry (i, j) of AB, dot row i of A with column j of B. Try a new round.`}
          {revealed && !bothValid &&
            "Reveal computed but at least one guess wasn't a number. Hit reset and re-enter."}
        </span>
      </div>

      <WidgetExplainer
        widgetName="AB vs BA Guesser — predict one entry of each"
        widgetDescription="A prediction quiz that surfaces the asymmetry of AB vs BA by asking the reader to guess one entry of each. The reader sees two 2×2 matrices A and B at the top, then picks one cell (i, j) of AB and one cell (i', j') of BA, typing a numerical guess for each. Hitting 'Reveal' computes both AB and BA, scores the two guesses by relative closeness (score = 1 − |error| / max(|guess|, |truth|, 1)), highlights the reader's picks in the revealed matrices, and reports the better of the two guesses as the round score. Across rounds the widget tracks how often the reader scored ≥ 0.85 (a 'good' round) and the mean ||AB − BA||₁ — making it tactile that the gap between AB and BA is usually NOT small. One round (round 6) is a scalar-multiple-of-identity case where the reader will be surprised to find AB = BA exactly. The pedagogical point is that AB and BA are not interchangeable, the difference is rarely small, and the reader develops a quantitative feel for both the magnitudes of typical dot products and the spread between AB and BA across many cases."
        stateSummary={stateSummary}
        stateKey={stateKey}
      />
    </div>
  );
}

interface OperandBlockProps {
  label: string;
  M: Matrix2;
}

function OperandBlock({ label, M }: OperandBlockProps) {
  return (
    <div className="abba__operand">
      <div className="abba__operand-label">{label}</div>
      <div className="abba__operand-matrix">
        <span className="abba__bracket abba__bracket--left" />
        <div className="abba__operand-grid">
          <span>{fmt(M.a)}</span>
          <span>{fmt(M.b)}</span>
          <span>{fmt(M.c)}</span>
          <span>{fmt(M.d)}</span>
        </div>
        <span className="abba__bracket abba__bracket--right" />
      </div>
    </div>
  );
}

interface PredictionPanelProps {
  side: "AB" | "BA";
  formula: string;
  /** Truth matrix once revealed, else null. */
  truth: Matrix2 | null;
  pred: Prediction | null;
  onPickCell: (cell: CellRef) => void;
  onGuessChange: (g: string) => void;
  revealed: boolean;
  truthValue: number | null;
  scoreValue: number;
  starred: boolean;
}

function PredictionPanel({
  side,
  formula,
  truth,
  pred,
  onPickCell,
  onGuessChange,
  revealed,
  truthValue,
  scoreValue,
  starred,
}: PredictionPanelProps) {
  return (
    <div className={`abba__panel${starred ? " abba__panel--starred" : ""}`}>
      <div className="abba__panel-head">
        <span className="abba__panel-side">{side}</span>
        <span className="abba__panel-formula">{formula}</span>
        {starred && <span className="abba__panel-star">★ best</span>}
      </div>
      <div className="abba__cell-grid">
        {CELLS.map((c) => {
          const isPicked = pred && pred.cell.i === c.i && pred.cell.j === c.j;
          return (
            <button
              key={`${c.i}-${c.j}`}
              type="button"
              className={`abba__cell${
                isPicked ? " abba__cell--picked" : ""
              }${revealed ? " abba__cell--revealed" : ""}`}
              onClick={() => onPickCell(c)}
              disabled={revealed && !isPicked}
            >
              <span className="abba__cell-coord">
                ({c.i}, {c.j})
              </span>
              <span className="abba__cell-value">
                {revealed && truth
                  ? fmt(entryAt(truth, c.i, c.j))
                  : isPicked
                  ? "?"
                  : ""}
              </span>
            </button>
          );
        })}
      </div>
      {pred && !revealed && (
        <label className="abba__input-row">
          <span className="abba__input-label">
            Your guess for {formula}[{pred.cell.i}, {pred.cell.j}]:
          </span>
          <input
            className="abba__input"
            type="text"
            inputMode="decimal"
            value={pred.guess}
            placeholder="number"
            onChange={(e) => onGuessChange(e.target.value)}
          />
        </label>
      )}
      {pred && revealed && truthValue !== null && (
        <div
          className={`abba__result${
            scoreValue >= 0.85
              ? " abba__result--good"
              : scoreValue >= 0.5
              ? " abba__result--ok"
              : " abba__result--off"
          }`}
        >
          <div className="abba__result-row">
            <span className="abba__result-label">YOU</span>
            <span className="abba__result-value">{pred.guess || "—"}</span>
          </div>
          <div className="abba__result-row">
            <span className="abba__result-label">TRUTH</span>
            <span className="abba__result-value">{fmt(truthValue)}</span>
          </div>
          <div className="abba__result-row">
            <span className="abba__result-label">SCORE</span>
            <span className="abba__result-value">
              {scoreValue.toFixed(2)} / 1.00
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
