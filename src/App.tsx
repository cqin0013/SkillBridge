// Router with nested layout. Lazy-load pages and show a Tailwind spinner during suspense.

import { Suspense, lazy, useEffect } from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom" 
import MainLayout from "./layouts/MainLayout"

// Lazy-load pages
const Home = lazy(() => import("./pages/Home"))
const Analyzer = lazy(() => import("./pages/Analyzer/AnalyzerIntro")) 
const Insight = lazy(() => import("./pages/Insight"))
const Profile = lazy(() => import("./pages/Profile"))
const Glossary = lazy(() => import("./pages/Glossary"))
const Feedback = lazy(() => import("./pages/Feedback"))
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"))
const Terms = lazy(() => import("./pages/Terms"))

const NotFoundPage = lazy(() => import("./pages/NotFoundPage"))

// Tailwind spinner fallback
function Spinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-transparent"
        aria-label="Loading"
        role="status"
      />
    </div>
  )
}

export default function App() {
  // --- Inline "scroll to top on route change" ---
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // If navigating to an in-page anchor like "/#features", let the browser jump there
    if (hash) return

    // Scroll the window to top on route change
    // Note: use "auto" (instant) to avoid fighting your header hide/show animation
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [pathname, hash])
  // ----------------------------------------------

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        {/* All pages share the same layout */}
        <Route path="/" element={<MainLayout />}>
          {/* index == "/" */}
          <Route index element={<Home />} />

          {/* pages */}
          <Route path="Analyzer" element={<Analyzer />} />
          <Route path="Insight" element={<Insight />} />
          <Route path="Profile" element={<Profile />} />
          <Route path="Glossary" element={<Glossary />} />
          <Route path="Feedback" element={<Feedback />} />
          <Route path="PrivacyPolicy" element={<PrivacyPolicy />} />
          <Route path="Terms" element={<Terms />} />
          {/* 404 or redirect */}
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
