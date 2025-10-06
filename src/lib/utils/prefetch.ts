// src/lib/utils/prefetch.ts

type RoutePath = "/Analyzer" | "/Profile" | "/Insight" | "/Glossary";

const loaders: Record<RoutePath, () => Promise<unknown>> = {
  "/Analyzer": () => import("../../pages/Analyzer/AnalyzerIntro"),
  "/Profile": () => import("../../pages/Profile"),
  "/Insight": () => import("../../pages/Insight"),
  "/Glossary": () => import("../../pages/Glossary"),
};

const ALIASES: Readonly<Record<string, RoutePath>> = {
  "/analyzer": "/Analyzer",
  "/profile": "/Profile",
  "/insight": "/Insight",
  "/glossary": "/Glossary",
};

const done = new Set<RoutePath>();

interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}
type IdleRequestCallback = (deadline: IdleDeadline) => void;
type RequestIdleCallback = (cb: IdleRequestCallback, opts?: { timeout?: number }) => number;

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

function schedule(cb: () => void): void {
  const w = window as unknown as { requestIdleCallback?: RequestIdleCallback };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(() => cb());
  } else {
    setTimeout(cb, 0);
  }
}

function shouldSkipPrefetch(): boolean {
  const nav = navigator as Navigator & { connection?: NetworkInformationLike };
  const c = nav.connection;
  if (c?.saveData) return true;
  if (c?.effectiveType && /(^|\b)(2g|slow-2g)\b/i.test(c.effectiveType)) return true;
  return false;
}

export function prefetchRoute(rawPath: string): void {
  const key = (ALIASES[rawPath.toLowerCase()] ?? rawPath) as RoutePath;
  const loader = loaders[key];
  if (!loader) return;
  if (done.has(key)) return;
  if (shouldSkipPrefetch()) return;

  schedule(() => {
    loader()
      .then(() => done.add(key))
      .catch(() => done.delete(key));
  });
}
