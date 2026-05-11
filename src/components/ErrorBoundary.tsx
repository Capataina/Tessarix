import { Component, type ErrorInfo, type ReactNode } from "react";
import { emit as emitTelemetry } from "../lib/telemetry";

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI. Default: a minimal "something went wrong" panel. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * App-root React error boundary. Catches render-phase exceptions in descendants
 * and emits an `error` telemetry event with full stack + React component stack
 * so we can see which subtree crashed in the JSONL log.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, componentStack: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? null });
    emitTelemetry({
      kind: "error",
      data: {
        source: "error_boundary",
        message: `${error.name}: ${error.message}`,
        stack: error.stack,
        component_stack: info.componentStack ?? undefined,
      },
    });
  }

  reset = (): void => {
    this.setState({ error: null, componentStack: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div className="error-boundary">
        <h2>Something broke in the UI.</h2>
        <p>
          The error has been written to the telemetry log. You can usually
          recover by reloading.
        </p>
        <pre>{error.message}</pre>
        <button type="button" onClick={this.reset}>
          Try to recover
        </button>
      </div>
    );
  }
}
