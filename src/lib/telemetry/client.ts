/**
 * Frontend telemetry client. Buffers events in memory and flushes to the Rust
 * host in batches. Flushes on three signals:
 *   - buffer hits FLUSH_THRESHOLD events
 *   - FLUSH_INTERVAL_MS elapsed since the last flush
 *   - visibilitychange to "hidden" (immediate flush so we don't lose recent
 *     events on tab close)
 *
 * The client is a singleton — initialise once at app start via `initTelemetry()`,
 * then call `emit(event)` from anywhere. Reads `__tessarixTelemetry` off `window`
 * for DevTools-side inspection.
 */

import { invoke } from "@tauri-apps/api/core";
import type { TelemetryEvent, TelemetryEventEnvelope } from "./events";

const FLUSH_THRESHOLD = 24;
const FLUSH_INTERVAL_MS = 5000;

interface TelemetryState {
  sessionId: string;
  buffer: TelemetryEventEnvelope[];
  seq: number;
  /** True while a flush is in flight, to prevent reentrant flushes. */
  flushing: boolean;
  /** Last successful append size. Surfaced in debug helper. */
  lastBatchSize: number;
  /** Total events emitted this session (committed + buffered + dropped). */
  totalEmitted: number;
  flushTimer: ReturnType<typeof setTimeout> | null;
}

let state: TelemetryState | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

/** Stable session id generator. Prefers crypto.randomUUID; falls back to a custom rand. */
function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }
  // Fallback: timestamp + random; not as strong but readable.
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `s-${t}-${r}`;
}

/**
 * Initialise the telemetry client. Idempotent — subsequent calls return the
 * already-active session.
 */
export function initTelemetry(): { sessionId: string } {
  if (state) return { sessionId: state.sessionId };
  state = {
    sessionId: generateSessionId(),
    buffer: [],
    seq: 0,
    flushing: false,
    lastBatchSize: 0,
    totalEmitted: 0,
    flushTimer: null,
  };

  // Initial session_start event.
  emit({
    kind: "session_start",
    data: {
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      viewport:
        typeof window !== "undefined"
          ? { w: window.innerWidth, h: window.innerHeight }
          : { w: 0, h: 0 },
    },
  });

  // Flush when the tab/window is hidden — last chance before the process dies.
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        void flush();
      }
    });
  }
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      emit({ kind: "session_end", data: { reason: "unload" } });
      // Best-effort sync flush — Tauri's invoke is async, but the unload event
      // pumps the JS task queue briefly. We schedule and hope.
      void flush();
    });

    // Capture uncaught browser-side exceptions.
    window.addEventListener("error", (e) => {
      emit({
        kind: "error",
        data: {
          source: "window.error",
          message: e.message || String(e.error),
          stack:
            (e.error && typeof e.error === "object" && "stack" in e.error
              ? String((e.error as { stack: unknown }).stack)
              : undefined),
        },
      });
    });

    // Capture unhandled promise rejections.
    window.addEventListener("unhandledrejection", (e) => {
      const reason = e.reason;
      const message =
        reason && typeof reason === "object" && "message" in reason
          ? String((reason as { message: unknown }).message)
          : String(reason);
      const stack =
        reason && typeof reason === "object" && "stack" in reason
          ? String((reason as { stack: unknown }).stack)
          : undefined;
      emit({
        kind: "error",
        data: { source: "unhandled_rejection", message, stack },
      });
    });

    // Wrap console.error and console.warn so React warnings, library errors,
    // and any explicit console.error() calls flow into telemetry. Use try/catch
    // wrapper to make sure a buggy emit() never breaks logging itself.
    const installConsoleHook = (
      method: "error" | "warn",
      label: "console.error" | "console.warn",
    ) => {
      const original = console[method].bind(console);
      console[method] = (...args: unknown[]) => {
        try {
          const message = args
            .map((a) => {
              if (typeof a === "string") return a;
              if (a instanceof Error)
                return `${a.name}: ${a.message}${a.stack ? "\n" + a.stack : ""}`;
              try {
                return JSON.stringify(a);
              } catch {
                return String(a);
              }
            })
            .join(" ");
          // Avoid recursive loop: don't re-emit when emit itself logs.
          if (!message.includes("[tessarix-telemetry]")) {
            emit({ kind: "error", data: { source: label, message } });
          }
        } catch {
          // ignore — we never want telemetry to break console output
        }
        original(...args);
      };
    };
    installConsoleHook("error", "console.error");
    installConsoleHook("warn", "console.warn");
  }

  // Periodic time-based flush.
  scheduleFlush();

  // Expose for DevTools inspection.
  if (typeof window !== "undefined") {
    (window as unknown as { __tessarixTelemetry: typeof debug }).__tessarixTelemetry =
      debug;
  }

  return { sessionId: state.sessionId };
}

function scheduleFlush(): void {
  if (!state) return;
  if (state.flushTimer) return;
  state.flushTimer = setTimeout(() => {
    state!.flushTimer = null;
    void flush();
    // Re-arm after each flush; we want a steady cadence regardless of buffer
    // pressure flushes that interleave.
    scheduleFlush();
  }, FLUSH_INTERVAL_MS);
}

/** Emit a telemetry event. Non-blocking — drops onto the buffer and returns. */
export function emit(event: TelemetryEvent): void {
  if (!state) {
    // Telemetry not initialised yet — drop. Avoid throwing during early renders.
    return;
  }
  const envelope: TelemetryEventEnvelope = {
    session_id: state.sessionId,
    timestamp: nowIso(),
    seq: state.seq++,
    ...event,
  };
  state.buffer.push(envelope);
  state.totalEmitted++;

  if (state.buffer.length >= FLUSH_THRESHOLD) {
    void flush();
  }
}

/** Manually flush. Safe to call repeatedly; no-op if buffer empty or already flushing. */
export async function flush(): Promise<void> {
  if (!state) return;
  if (state.flushing) return;
  if (state.buffer.length === 0) return;

  state.flushing = true;
  const batch = state.buffer.splice(0, state.buffer.length);
  try {
    await invoke<number>("telemetry_write_batch", {
      sessionId: state.sessionId,
      events: batch,
    });
    state.lastBatchSize = batch.length;
  } catch (e) {
    // On failure, put events back in front of the buffer so we don't lose them.
    // Cap re-buffering at the threshold to avoid unbounded growth if the host
    // is permanently dead.
    const head = batch.slice(0, FLUSH_THRESHOLD);
    state.buffer.unshift(...head);
    // eslint-disable-next-line no-console
    console.warn("[tessarix-telemetry] flush failed:", e);
  } finally {
    state.flushing = false;
  }
}

/** DevTools-callable inspector. Returns a snapshot of the current state. */
export function debug(): {
  sessionId: string;
  bufferedEvents: number;
  totalEmitted: number;
  lastBatchSize: number;
  flushing: boolean;
} | null {
  if (!state) return null;
  return {
    sessionId: state.sessionId,
    bufferedEvents: state.buffer.length,
    totalEmitted: state.totalEmitted,
    lastBatchSize: state.lastBatchSize,
    flushing: state.flushing,
  };
}

/** Get the resolved on-disk path for the current session's JSONL file. */
export async function getSessionPath(): Promise<string | null> {
  if (!state) return null;
  try {
    return await invoke<string>("telemetry_session_path", {
      sessionId: state.sessionId,
    });
  } catch {
    return null;
  }
}

/** Get the on-disk path to the telemetry directory. */
export async function getTelemetryDir(): Promise<string | null> {
  try {
    return await invoke<string>("telemetry_dir_path");
  } catch {
    return null;
  }
}
