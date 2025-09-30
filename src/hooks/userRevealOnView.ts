// src/hooks/useRevealOnView.ts
/**
 * useRevealOnView
 * Reveal an element once it intersects the viewport.
 * - Accepts both RefObject and MutableRefObject
 * - Accepts any HTMLElement subtype and allows null (initial render)
 * - Respects prefers-reduced-motion
 */

import { useEffect } from "react"

export function useRevealOnView<T extends HTMLElement>(
  ref: React.RefObject<T | null> | React.MutableRefObject<T | null>,
  delay = 0
) {
  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === "undefined") return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      el.classList.remove("opacity-0", "translate-y-2")
      el.classList.add("opacity-100", "translate-y-0")
      return
    }

    const initialBox = el.getBoundingClientRect()
    const viewportH = window.innerHeight || document.documentElement.clientHeight
    if (initialBox.top < viewportH * 0.9) {
      if (delay) el.style.transitionDelay = `${delay}ms`
      el.classList.remove("opacity-0", "translate-y-2")
      el.classList.add("opacity-100", "translate-y-0")
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (delay) el.style.transitionDelay = `${delay}ms`
            el.classList.remove("opacity-0", "translate-y-2")
            el.classList.add("opacity-100", "translate-y-0")
            io.unobserve(el)
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -12%" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, delay])
}
