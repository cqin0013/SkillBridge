// Tiny helper to navigate with route state.
import type { NavigateFunction } from "react-router-dom";

export function goWithState(
  navigate: NavigateFunction,
  to: string,
  state: Record<string, unknown>,
  replace = false
): void {
  navigate(to, { state, replace });
}
