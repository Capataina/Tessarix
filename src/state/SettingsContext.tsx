import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * User-facing UI preferences. Persisted to localStorage and reflected onto
 * the document root as CSS custom properties so any stylesheet can read them.
 *
 * Adding a new setting:
 *   1. Add a field to `Settings` with sensible default and a serialisable type.
 *   2. Add it to `DEFAULT_SETTINGS`.
 *   3. Add its CSS-variable application in `applySettingsToRoot`.
 *   4. Expose a control for it in `SettingsPanel`.
 */

export type FontSize = "compact" | "default" | "comfortable" | "large";
export type ContentWidth = "narrow" | "default" | "wide" | "full";
export type Density = "tight" | "default" | "airy";

export interface Settings {
  fontSize: FontSize;
  contentWidth: ContentWidth;
  density: Density;
  reducedMotion: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  fontSize: "default",
  contentWidth: "default",
  density: "default",
  reducedMotion: false,
};

const STORAGE_KEY = "tessarix:settings:v1";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Best-effort persistence; ignore quota / privacy-mode failures.
  }
}

// CSS-variable maps for each setting.
const FONT_SIZE_PX: Record<FontSize, string> = {
  compact: "15px",
  default: "16px",
  comfortable: "17px",
  large: "19px",
};

const CONTENT_WIDTH_PX: Record<ContentWidth, string> = {
  narrow: "640px",
  default: "760px",
  wide: "900px",
  full: "1180px",
};

const DENSITY_SCALE: Record<Density, string> = {
  tight: "0.85",
  default: "1",
  airy: "1.18",
};

function applySettingsToRoot(s: Settings) {
  const root = document.documentElement;
  root.style.setProperty("--app-font-size", FONT_SIZE_PX[s.fontSize]);
  root.style.setProperty("--lesson-max-w-base", CONTENT_WIDTH_PX[s.contentWidth]);
  root.style.setProperty("--density-scale", DENSITY_SCALE[s.density]);
  // Reduced-motion: drive both a CSS variable (for transition-duration math)
  // and a data attribute (for a blanket class-style override in theme.css).
  root.style.setProperty(
    "--motion-scale",
    s.reducedMotion ? "0" : "1",
  );
  root.dataset.reducedMotion = s.reducedMotion ? "true" : "false";
}

interface SettingsContextValue {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  // Apply on mount and on every change.
  useEffect(() => {
    applySettingsToRoot(settings);
    saveSettings(settings);
  }, [settings]);

  const update = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, update, reset }),
    [settings, update, reset],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used inside a SettingsProvider");
  }
  return ctx;
}
