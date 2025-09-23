
import React, { useEffect, useState } from "react";
import { Button, Tooltip } from "antd";
import classNames from "classnames";
import useResponsive from "../../../lib/hooks/useResponsive"; 
import "./PageActions.css";

/**
 * PageActions
 *
 * A bottom action bar with optional "sticky at bottom" behavior and an
 * optional "reveal only when user reaches near the page bottom" effect.
 *
 * Props:
 * - onPrev, onNext: handlers for Back / Next buttons
 * - prevDisabled?: boolean
 * - nextDisabled?: boolean
 * - prevDisabledReason?: string | null
 * - nextDisabledReason?: string | null
 * - disabledReason?: string | { prev?: string, next?: string }  // unified reason
 * - defaultDisabledReason?: string
 * - prevText?: string
 * - nextText?: string
 * - sticky?: boolean                    // if true, bar becomes sticky at bottom
 * - className?: string
 * - revealAtBottom?: boolean (default: true) // show only when near doc bottom
 * - bottomOffset?: number (default: 48)      // px from doc bottom to trigger reveal
 */
export default function PageActions({
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  prevDisabledReason = null,
  nextDisabledReason = null,
  disabledReason,
  defaultDisabledReason = "This action is unavailable right now.",
  prevText = "Back",
  nextText = "Next",
  sticky = false,
  className,
  revealAtBottom = true,
  bottomOffset = 48,
}) {
  // Use your responsive flags to adapt minor UI details.
  const { isMobile } = useResponsive();

  // Slightly larger offset on mobile to account for OS UI / address bar changes.
  const effectiveOffset = isMobile ? bottomOffset + 16 : bottomOffset;

  // Whether the bar is visible (revealed). If revealAtBottom=false, show immediately.
  const [isRevealed, setIsRevealed] = useState(!revealAtBottom);

  useEffect(() => {
    if (!revealAtBottom) {
      setIsRevealed(true);
      return;
    }
    const compute = () => {
      const scrollEl = document.scrollingElement || document.documentElement;
      const docHeight = scrollEl?.scrollHeight ?? 0;
      const viewportBottom =
        (window.scrollY || window.pageYOffset || 0) + window.innerHeight;
      setIsRevealed(viewportBottom >= docHeight - effectiveOffset);
    };

    // initial compute + listeners
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);

    // Observe DOM changes that might change page height
    const mo = new MutationObserver(() => compute());
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
      mo.disconnect();
    };
  }, [revealAtBottom, effectiveOffset]);

  // Wrapper classes
  const wrapperCls = classNames(
    "page-actions",
    { "is-sticky": sticky },
    { "is-revealed": isRevealed, "is-hidden": !isRevealed },
    className
  );

  // Normalize disabled reasons
  const unified =
    typeof disabledReason === "string"
      ? { prev: disabledReason, next: disabledReason }
      : disabledReason || {};

  const resolvedPrevReason = prevDisabled
    ? prevDisabledReason ?? unified.prev ?? defaultDisabledReason
    : undefined;

  const resolvedNextReason = nextDisabled
    ? nextDisabledReason ?? unified.next ?? defaultDisabledReason
    : undefined;

  // Button size: a touch-friendlier height on mobile
  const btnSize = isMobile ? "middle" : "large";

  const PrevBtn = (
    <Button
      type="default"
      size={btnSize}
      onClick={onPrev}
      disabled={prevDisabled}
      aria-disabled={prevDisabled ? "true" : "false"}
    >
      {prevText}
    </Button>
  );

  const NextBtn = (
    <Button
      type="primary"
      size={btnSize}
      onClick={onNext}
      disabled={nextDisabled}
      aria-disabled={nextDisabled ? "true" : "false"}
    >
      {nextText}
    </Button>
  );

  // Wrap a node with a Tooltip only when a reason exists.
  const withTooltip = (node, reason, isDisabled) => {
    const trigger = (
      <span
        className="page-actions__tooltip-wrap"
        tabIndex={isDisabled ? 0 : -1}
        aria-disabled={isDisabled ? "true" : "false"}
      >
        {node}
      </span>
    );
    if (!reason) return trigger;
    return (
      <Tooltip
        title={reason}
        placement="top"
        trigger={["hover", "focus"]}
        classNames={{ root: "pa-tooltip" }}   
        destroyTooltipOnHid         
        mouseEnterDelay={0.05}
      >
        {trigger}
      </Tooltip>
    );
  };

  return (
    <div className={wrapperCls}>
      {/* pushes actions to the right edge */}
      <div className="page-actions__spacer" />
      <div className="page-actions__buttons">
        {withTooltip(PrevBtn, resolvedPrevReason, prevDisabled)}
        {withTooltip(NextBtn, resolvedNextReason, nextDisabled)}
      </div>
    </div>
  );
}
