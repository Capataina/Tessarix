import { useEffect, useState } from "react";
import {
  useSettings,
  type FontSize,
  type ContentWidth,
  type Density,
} from "../state/SettingsContext";
import "./SettingsPanel.css";

const FONT_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "comfortable", label: "Comfortable" },
  { value: "large", label: "Large" },
];

const WIDTH_OPTIONS: { value: ContentWidth; label: string }[] = [
  { value: "narrow", label: "Narrow" },
  { value: "default", label: "Default" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full" },
];

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "tight", label: "Tight" },
  { value: "default", label: "Default" },
  { value: "airy", label: "Airy" },
];

export function SettingsButton() {
  const [open, setOpen] = useState(false);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="settings-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open settings"
        title="Settings"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      {open && <SettingsPanel onClose={() => setOpen(false)} />}
    </>
  );
}

interface SettingsPanelProps {
  onClose: () => void;
}

function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, update, reset } = useSettings();

  return (
    <div
      className="settings-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="settings-panel">
        <header className="settings-panel__head">
          <h2 className="settings-panel__title">Settings</h2>
          <button
            type="button"
            className="settings-panel__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </header>

        <div className="settings-panel__body">
          <SettingGroup
            label="Font size"
            description="Controls base text size across the app."
          >
            <SegmentedControl
              value={settings.fontSize}
              options={FONT_OPTIONS}
              onChange={(v) => update("fontSize", v)}
            />
          </SettingGroup>

          <SettingGroup
            label="Content width"
            description="Maximum width of the lesson body. Wider settings give more horizontal room for prose and tables; narrower keeps lines shorter and easier to read."
          >
            <SegmentedControl
              value={settings.contentWidth}
              options={WIDTH_OPTIONS}
              onChange={(v) => update("contentWidth", v)}
            />
          </SettingGroup>

          <SettingGroup
            label="UI density"
            description="Scales padding, gaps, and widget spacing. Tight is more compact; airy gives more breathing room."
          >
            <SegmentedControl
              value={settings.density}
              options={DENSITY_OPTIONS}
              onChange={(v) => update("density", v)}
            />
          </SettingGroup>

          <SettingGroup
            label="Reduced motion"
            description="Disable animations and transitions across the app. Useful if motion is distracting or causes discomfort."
          >
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => update("reducedMotion", e.target.checked)}
              />
              <span>{settings.reducedMotion ? "On" : "Off"}</span>
            </label>
          </SettingGroup>
        </div>

        <footer className="settings-panel__foot">
          <button
            type="button"
            className="settings-panel__reset"
            onClick={reset}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            className="settings-panel__done"
            onClick={onClose}
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

interface SettingGroupProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingGroup({ label, description, children }: SettingGroupProps) {
  return (
    <section className="settings-group">
      <header className="settings-group__head">
        <span className="settings-group__label">{label}</span>
        {description && (
          <span className="settings-group__description">{description}</span>
        )}
      </header>
      <div className="settings-group__control">{children}</div>
    </section>
  );
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="settings-segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`settings-segmented__option ${
            o.value === value ? "settings-segmented__option--active" : ""
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
