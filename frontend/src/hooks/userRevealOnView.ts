/**
 * useRevealOnView
 * Reveal an element once it enters the viewport.
 * - Accepts a RefObject<T | null> created by useRef
 * - Works for any HTMLElement subtype
 * - Respects prefers-reduced-motion
 * - No 'any' used
 */

import { useEffect } from "react";

export function useRevealOnView<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  delay = 0
): void {
  useEffect(() => {
    // Abort on SSR or missing node
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    // If users prefer reduced motion, reveal immediately without animation
    const prefersReduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.classList.remove("opacity-0", "translate-y-2");
      el.classList.add("opacity-100", "translate-y-0");
      return;
    }

    // If already close enough to viewport on mount, reveal immediately
    const initialBox = el.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    if (initialBox.top < viewportH * 0.9) {
      if (delay) el.style.transitionDelay = `${delay}ms`;
      el.classList.remove("opacity-0", "translate-y-2");
      el.classList.add("opacity-100", "translate-y-0");
      return;
    }

    // Otherwise observe and reveal when intersecting
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (delay) el.style.transitionDelay = `${delay}ms`;
            el.classList.remove("opacity-0", "translate-y-2");
            el.classList.add("opacity-100", "translate-y-0");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -12%" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [ref, delay]);
}
