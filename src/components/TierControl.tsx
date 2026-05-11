import { useTier, type ComplexityTier } from "../state/TierContext";
import { emit as emitTelemetry } from "../lib/telemetry";
import "./TierControl.css";

const TIERS: { id: ComplexityTier; label: string; description: string }[] = [
  {
    id: "essential",
    label: "Essential",
    description: "The headline — what it is and why it matters.",
  },
  {
    id: "standard",
    label: "Standard",
    description: "The mechanism in enough depth to understand the why.",
  },
  {
    id: "complete",
    label: "Complete",
    description: "Edge cases, implementation traps, deep dives.",
  },
];

export function TierControl() {
  const { tier, setTier } = useTier();

  return (
    <div className="tier-control" role="radiogroup" aria-label="Complexity tier">
      <div className="tier-control__label">Depth</div>
      <div className="tier-control__buttons">
        {TIERS.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={tier === t.id}
            className={`tier-control__btn tier-control__btn--${t.id} ${
              tier === t.id ? "tier-control__btn--active" : ""
            }`}
            onClick={() => {
              if (t.id !== tier) {
                emitTelemetry({
                  kind: "tier_change",
                  data: { from: tier, to: t.id },
                });
              }
              setTier(t.id);
            }}
            title={t.description}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
