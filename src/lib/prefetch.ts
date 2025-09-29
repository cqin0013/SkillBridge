// Prefetch route chunks for React.lazy 

type RoutePath = "/Analyzer" | "/Profile" | "/Insight" | "/Glossary"

const loaders: Record<RoutePath, () => Promise<unknown>> = {
  "/Analyzer": () => import("../pages/Analyzer/Aalyzer"),
  "/Profile":  () => import("../pages/Profile"),
  "/Insight":  () => import("../pages/Insight"),
  "/Glossary":  () => import("../pages/Glossary"),
}

const done = new Set<RoutePath>()

// Minimal types so TS/ESLint are happy
interface IdleDeadline {
  readonly didTimeout: boolean
  timeRemaining(): number
}
type IdleRequestCallback = (deadline: IdleDeadline) => void
type RequestIdleCallback = (cb: IdleRequestCallback, opts?: { timeout?: number }) => number

interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
}

function schedule(cb: () => void) {
  if (typeof window !== "undefined") {
    const w = window as Window & { requestIdleCallback?: RequestIdleCallback }
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(() => cb())
      return
    }
  }
  // Fallback when requestIdleCallback is not available
  setTimeout(cb, 0)
}

function shouldSkipPrefetch(): boolean {
  const nav = navigator as Navigator & { connection?: NetworkInformationLike }
  const conn = nav.connection
  if (conn?.saveData) return true
  if (conn?.effectiveType && /(^|\b)(2g|slow-2g)\b/i.test(conn.effectiveType)) return true
  return false
}

export function prefetchRoute(path: RoutePath) {
  if (done.has(path)) return
  if (shouldSkipPrefetch()) return

  schedule(() => {
    loaders[path]()
      .then(() => done.add(path))     // mark as prefetched
      .catch(() => done.delete(path)) // allow retry on failure
  })
}
