// Typed wrappers for react-redux hooks.
// Use these instead of raw useDispatch/useSelector for full TS inference.

import { useDispatch, useSelector, shallowEqual } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./index";

// Dispatch with the correct AppDispatch type (thunks included)
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Selector that knows your RootState shape
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export { shallowEqual };