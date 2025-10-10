// Generic route→Redux fallback hook (no any).
// Priority: route state → Redux → default. Hydrates Redux once if empty.

import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { useAppDispatch } from "../store/hooks";

type UseRouteFallbackOpts<T> = {
  stateKey: string;                               // key in location.state
  select: (s: RootState) => T;                    // read from Redux
  setAction: (v: T) => PayloadAction<T>;          // write to Redux
  defaultValue: T;                                // default when both empty
  normalize?: (v: T) => T;                        // optional sanitizer
  isEmpty?: (v: T) => boolean;                    // optional emptiness check
};

function defaultIsEmpty<T>(v: T): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function useRouteFallback<T>(opts: UseRouteFallbackOpts<T>): T {
  const { stateKey, select, setAction, defaultValue, normalize, isEmpty } = opts;
  const dispatch = useAppDispatch();
  const location = useLocation();

  // 1) read from route state
  const routeVal: T | undefined = useMemo(() => {
    const st = location.state as Record<string, unknown> | null;
    const raw = st && stateKey in st ? (st[stateKey] as T) : undefined;
    return raw === undefined ? undefined : (normalize ? normalize(raw) : raw);
  }, [location.state, stateKey, normalize]);

  // 2) read from Redux
  const reduxVal = useSelector(select);

  // 3) choose the value to use
  const value: T = useMemo(() => {
    if (routeVal !== undefined) return routeVal;
    if (!(isEmpty ?? defaultIsEmpty)(reduxVal)) return reduxVal;
    return defaultValue;
  }, [routeVal, reduxVal, defaultValue, isEmpty]);

  // 4) hydrate Redux once if it is empty but route has value
  useEffect(() => {
    const empty = (isEmpty ?? defaultIsEmpty)(reduxVal);
    if (empty && routeVal !== undefined) {
      dispatch(setAction(routeVal));
    }
  }, [reduxVal, routeVal, dispatch, setAction, isEmpty]);

  return value;
}
