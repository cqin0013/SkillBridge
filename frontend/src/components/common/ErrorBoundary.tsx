// src/components/common/ErrorBoundary.tsx
import React, { type PropsWithChildren } from "react";
import GlobalError from "./GlobalError";

interface ErrorBoundaryBaseProps {
  /** Feedback link shown in fallback UI */
  feedbackHref: string;
  /** Optional reporter (Sentry etc.) */
  onError?: (error: unknown, info: React.ErrorInfo) => void;
}

type ErrorBoundaryProps = PropsWithChildren<ErrorBoundaryBaseProps>;

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

/** Catches render-time errors and shows a safe fallback UI */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    // Forward to external reporter if provided
    this.props.onError?.(error, info);
    // Dev log; do not gate on process.env to avoid Node types
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <GlobalError feedbackHref={this.props.feedbackHref} />;
    }
    return this.props.children;
  }
}
