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
 * - prevDisabled?: boolean
 * - prevDisabledReason?: string | null
 * - nextDisabled?: boolean
 * - nextDisabledReason?: string | null
 * - defaultDisabledReason?: string     // 默认浮窗原因（英文）
 * - prevText?: string
 * - nextText?: string
 * - sticky?: boolean
 * - className?: string
 * - revealAtBottom?: boolean           // default: true
 * - bottomOffset?: number              // default: 48
 */
export default function PageActions({
  onPrev,
  onNext,
  prevDisabled = false,
  prevDisabledReason = null,
  nextDisabled = false,
  nextDisabledReason = null,
  defaultDisabledReason = "This action is unavailable right now.",
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
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
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
    { "is-sticky": sticky },
    { "is-revealed": isRevealed, "is-hidden": !isRevealed },
    className
  );

  // Buttons
  const PrevBtn = (
    <Button
      onClick={onPrev}
      type="default"
      disabled={prevDisabled}
      aria-disabled={prevDisabled ? "true" : "false"}
    >
      {prevText}
    </Button>
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

  const prevTip = prevDisabled ? (prevDisabledReason || defaultDisabledReason) : null;
  const nextTip = nextDisabled ? (nextDisabledReason || defaultDisabledReason) : null;

  return (
    <div className={wrapperCls}>
      <div className="page-actions__spacer" />
      <div className="page-actions__buttons">
        {prevTip ? (
          <Tooltip placement="top" title={prevTip}>
            <span className="page-actions__tooltip-wrap">{PrevBtn}</span>
          </Tooltip>
        ) : (
          PrevBtn
        )}

        {nextTip ? (
          <Tooltip placement="top" title={nextTip}>
            <span className="page-actions__tooltip-wrap">{NextBtn}</span>
          </Tooltip>
        ) : (
          NextBtn
        )}
      </div>
    </div>
  );
}
