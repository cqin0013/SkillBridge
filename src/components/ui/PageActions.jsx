import React, { useEffect, useState } from "react";
import { Button, Tooltip } from "antd";
import classNames from "classnames";
import "./PageActions.css";

/**
 * PageActions
 * - Auto-reveals only when the user scrolls near the bottom of the page.
 * - Works everywhere without changing callers.
 *
 * Props (backward compatible):
 * - onPrev, onNext
 * - nextDisabled?: boolean
 * - nextDisabledReason?: string | null
 * - prevText?: string
 * - nextText?: string
 * - sticky?: boolean                 // still supported, but not required
 * - className?: string
 *
 * Advanced (optional):
 * - revealAtBottom?: boolean         // default: true (auto-hide until bottom)
 * - bottomOffset?: number            // px threshold from document bottom (default: 48)
 */
export default function PageActions({
  onPrev,
  onNext,
  nextDisabled = false,
  nextDisabledReason = null,
  prevText = "Back",
  nextText = "Next",
  sticky = false,
  className,
  revealAtBottom = true,
  bottomOffset = 48,
}) {
  const [isRevealed, setIsRevealed] = useState(!revealAtBottom);

  useEffect(() => {
    if (!revealAtBottom) {
      setIsRevealed(true);
      return;
    }

    const compute = () => {
      const scrollEl = document.scrollingElement || document.documentElement;
      const docHeight = scrollEl.scrollHeight || 0;
      const viewportBottom = window.scrollY + window.innerHeight;
      const show = viewportBottom >= (docHeight - bottomOffset);
      setIsRevealed(show);
    };

    // run once then on scroll/resize
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);

    // also observe DOM changes that may change height (optional, lightweight)
    const mo = new MutationObserver(() => compute());
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
      mo.disconnect();
    };
  }, [revealAtBottom, bottomOffset]);

  const wrapperCls = classNames(
    "page-actions",
    { "is-sticky": sticky },               // keep old behavior if you were using it
    { "is-revealed": isRevealed, "is-hidden": !isRevealed },
    className
  );

  const NextBtn = (
    <Button
      type="primary"
      onClick={onNext}
      disabled={nextDisabled}
      aria-disabled={nextDisabled ? "true" : "false"}
    >
      {nextText}
    </Button>
  );

  return (
    <div className={wrapperCls}>
      <div className="page-actions__spacer" />
      <div className="page-actions__buttons">
        <Button onClick={onPrev} type="default">
          {prevText}
        </Button>

        {nextDisabled && nextDisabledReason ? (
          <Tooltip placement="top" title={nextDisabledReason}>
            <span className="page-actions__tooltip-wrap">{NextBtn}</span>
          </Tooltip>
        ) : (
          NextBtn
        )}
      </div>
    </div>
  );
}
