// Reusable tutorial/onboarding component with spotlight effect
// Uses project Button component (primary color). Skip keeps original gray style.
// Tooltip centered when target missing; throttled highlight updates.

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Button from "../ui/Button";

/** Single tutorial step definition */
export interface TutorialStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

/** Props for Tutorial component */
export interface TutorialProps {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
  headerOffset?: number;
}

/** Rect for spotlight box */
type RectLike = { top: number; left: number; width: number; height: number; bottom: number; right: number };

/** Convert DOMRect → RectLike */
function toRectLike(r: DOMRect): RectLike {
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
}

/** Detect scrollable elements */
function isScrollable(el: Element): boolean {
  const s = window.getComputedStyle(el);
  const y = s.overflowY;
  const x = s.overflowX;
  const he = el as HTMLElement;
  const canY = (y === "auto" || y === "scroll") && he.scrollHeight > he.clientHeight;
  const canX = (x === "auto" || x === "scroll") && he.scrollWidth > he.clientWidth;
  return canY || canX;
}

/** Collect scrollable ancestors up to the document root */
function getScrollAncestors(el: Element): HTMLElement[] {
  const arr: HTMLElement[] = [];
  let p: Node | null = el.parentNode;
  while (p && p instanceof HTMLElement) {
    if (isScrollable(p)) arr.push(p);
    p = p.parentNode;
  }
  const root = document.scrollingElement as HTMLElement | null;
  if (root) arr.push(root);
  return arr;
}

/** Instantly center target in all scrollable ancestors */
function centerInAllScrollers(el: Element, headerOffset: number): void {
  const rect = (el as HTMLElement).getBoundingClientRect();
  const ancestors = getScrollAncestors(el);
  for (const scroller of ancestors) {
    const isPage = scroller === document.scrollingElement;
    const viewport = isPage
      ? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
      : (scroller as HTMLElement).getBoundingClientRect();
    const tx = rect.left + rect.width / 2;
    const ty = rect.top + rect.height / 2;
    const dx = tx - (viewport.left + viewport.width / 2);
    const dy = ty - (viewport.top + viewport.height / 2 - (isPage ? headerOffset : 0));
    if (isPage) {
      window.scrollTo({
        left: Math.max(0, scroller.scrollLeft + dx),
        top: Math.max(0, scroller.scrollTop + dy),
        behavior: "auto",
      });
    } else {
      (scroller as HTMLElement).scrollLeft = Math.max(0, (scroller as HTMLElement).scrollLeft + dx);
      (scroller as HTMLElement).scrollTop = Math.max(0, (scroller as HTMLElement).scrollTop + dy);
    }
  }
}

/** Get element if visible */
function resolveTarget(selector: string): Element | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = (el as HTMLElement).getBoundingClientRect?.();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  return el;
}

export default function Tutorial({
  steps,
  isOpen,
  onClose,
  zIndex = 9999,
  headerOffset = 0,
}: TutorialProps): React.ReactElement | null {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [highlightRect, setHighlightRect] = useState<RectLike | null>(null);
 
  const rafRef = useRef<number | null>(null);

  const step = steps[currentStep];
  const totalSteps = steps.length;

  /** Recalculate spotlight box */
  const updateHighlight = useCallback(() => {
    if (!step?.target) {
      setHighlightRect(null);
      return;
    }
    const el = resolveTarget(step.target);
    if (!el) {
      setHighlightRect(null);

      return;
    }

    centerInAllScrollers(el, headerOffset);
    requestAnimationFrame(() => {
      const r1 = (el as HTMLElement).getBoundingClientRect();
      requestAnimationFrame(() => {
        const r2 = (el as HTMLElement).getBoundingClientRect();
        setHighlightRect(toRectLike(r2.width > 0 ? r2 : r1));
 
      });
    });
  }, [step, headerOffset]);

  /** Throttled update */
  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      updateHighlight();
    });
  }, [updateHighlight]);

  /** Step navigation */
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) setCurrentStep((i) => i + 1);
    else onClose();
  }, [currentStep, totalSteps, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((i) => i - 1);
  }, [currentStep]);

  const handleSkip = useCallback(() => onClose(), [onClose]);

  /** Update on step change */
  useEffect(() => {
    if (!isOpen || !step) return;
    const t = setTimeout(updateHighlight, 50);
    return () => clearTimeout(t);
  }, [isOpen, step, updateHighlight]);

  /** Scroll / resize / mutation observers (throttled) */
  useEffect(() => {
    if (!isOpen) return;
    const onScroll = (): void => scheduleUpdate();
    const onResize = (): void => scheduleUpdate();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    const obs = new MutationObserver(() => scheduleUpdate());
    obs.observe(document.body, { subtree: true, childList: true, attributes: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      obs.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, scheduleUpdate]);

  /** Keyboard shortcuts */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") handleSkip();
      else if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  /** Tooltip position (kept same visual style) */
  const getTooltipStyle = useCallback((): React.CSSProperties => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640;
    const isTablet = vw >= 640 && vw < 1024;
    const base: React.CSSProperties = { position: "fixed", zIndex: (zIndex || 9999) + 2 };

    if (!highlightRect) {
      return {
        ...base,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(450px, calc(100vw - 40px))",
        maxHeight: "70vh",
      };
    }

    if (isMobile)
      return { ...base, bottom: 16, left: 16, right: 16, width: "auto", maxHeight: "40vh" };
    if (isTablet)
      return { ...base, bottom: 20, left: "50%", transform: "translateX(-50%)", width: "min(500px,calc(100%-60px))" };

    const pad = 24;
    const w = Math.min(450, vw - 40);
    const spaceTop = highlightRect.top;
    const spaceBottom = vh - highlightRect.bottom;
    if (spaceBottom > 220)
      return { ...base, top: highlightRect.bottom + pad, left: "50%", transform: "translateX(-50%)", width: w };
    if (spaceTop > 220)
      return { ...base, bottom: vh - highlightRect.top + pad, left: "50%", transform: "translateX(-50%)", width: w };
    return { ...base, top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: w };
  }, [highlightRect, zIndex]);

  if (!isOpen || !step) return null;

  return createPortal(
    <div
      className="tutorial-overlay"
      style={{ position: "fixed", inset: 0, zIndex: zIndex || 9999, pointerEvents: "none" }}
    >
      {/* Background dim */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", pointerEvents: "auto" }}
        onClick={handleSkip}
      />
      {/* Spotlight */}
      {highlightRect && (
        <div
          style={{
            position: "absolute",
            left: highlightRect.left - 8,
            top: highlightRect.top - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            border: "3px solid #3b82f6",
            borderRadius: 8,
            boxShadow: "0 0 0 4px rgba(59,130,246,0.2)",
            pointerEvents: "none",
            transition: "all 0.3s ease",
          }}
        />
      )}
      {/* Tooltip */}
      <div style={{ ...getTooltipStyle(), pointerEvents: "auto" }}>
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col h-full overflow-hidden">
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
                <div className="text-xs sm:text-sm text-slate-500">
                  Step {currentStep + 1} of {totalSteps}
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{step.content}</p>
          </div>

          {/* Footer buttons */}
          <div className="flex-shrink-0 border-t border-slate-200 p-3 sm:p-4 bg-slate-50">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handlePrev}
                disabled={currentStep === 0}
                aria-label="Previous"
              >
                Prev
              </Button>

              {/* Skip retains original gray style */}
              <button
                onClick={handleSkip}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Skip tutorial"
              >
                Skip
              </button>

              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                aria-label={currentStep === totalSteps - 1 ? "Finish" : "Next"}
              >
                {currentStep === totalSteps - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
