import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ComplexityTier = "essential" | "standard" | "complete";

const TIER_ORDER: ComplexityTier[] = ["essential", "standard", "complete"];

interface TierContextValue {
  tier: ComplexityTier;
  setTier: (t: ComplexityTier) => void;
  /** True if `level` should render at the current tier (inclusion semantics). */
  shouldRender: (level: ComplexityTier) => boolean;
}

const TierContext = createContext<TierContextValue | null>(null);

const STORAGE_KEY = "tessarix.tier";

interface TierProviderProps {
  defaultTier?: ComplexityTier;
  children: ReactNode;
}

export function TierProvider({
  defaultTier = "standard",
  children,
}: TierProviderProps) {
  const [tier, setTierState] = useState<ComplexityTier>(() => {
    if (typeof window === "undefined") return defaultTier;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && TIER_ORDER.includes(stored as ComplexityTier)) {
      return stored as ComplexityTier;
    }
    return defaultTier;
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, tier);
  }, [tier]);

  const setTier = (t: ComplexityTier) => setTierState(t);

  /**
   * Inclusion semantics: tagging marks the minimum tier at which a section
   * becomes relevant; higher tiers always include everything from lower tiers.
   *
   * - "essential" content renders at all three tiers.
   * - "standard" content renders at standard + complete.
   * - "complete" content renders only at complete.
   */
  const shouldRender = (level: ComplexityTier) => {
    const current = TIER_ORDER.indexOf(tier);
    const minimum = TIER_ORDER.indexOf(level);
    return current >= minimum;
  };

  return (
    <TierContext.Provider value={{ tier, setTier, shouldRender }}>
      {children}
    </TierContext.Provider>
  );
}

export function useTier(): TierContextValue {
  const ctx = useContext(TierContext);
  if (!ctx) {
    throw new Error("useTier must be used within a TierProvider");
  }
  return ctx;
}
