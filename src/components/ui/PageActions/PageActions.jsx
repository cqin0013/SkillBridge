import React, { useEffect, useState } from "react";
import { Button, Tooltip } from "antd";
import classNames from "classnames";
import "./PageActions.css";

/**
 * PageActions
 *
 * Props:
 * - onPrev, onNext
 * - prevDisabled?: boolean
 * - nextDisabled?: boolean
 * - prevDisabledReason?: string | null
 * - nextDisabledReason?: string | null
 * - disabledReason?: string | { prev?: string, next?: string }
 * - defaultDisabledReason?: string
 * - prevText?: string
 * - nextText?: string
 * - sticky?: boolean
 * - className?: string
 * - revealAtBottom?: boolean  (default: true)
 * - bottomOffset?: number     (default: 48)
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
      const show = viewportBottom >= docHeight - bottomOffset;
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

  // unify reasons
  const normUnified =
    typeof disabledReason === "string"
      ? { prev: disabledReason, next: disabledReason }
      : (disabledReason || {});

  const resolvedPrevReason = prevDisabled
    ? (prevDisabledReason ?? normUnified.prev ?? defaultDisabledReason)
    : undefined;

  const resolvedNextReason = nextDisabled
    ? (nextDisabledReason ?? normUnified.next ?? defaultDisabledReason)
    : undefined;

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

  // Helper: wrap with Tooltip only when we actually have a reason
  const wrapWithTooltip = (node, reason, isDisabled) => {
    const content = (
      <span
        className="page-actions__tooltip-wrap"
        tabIndex={isDisabled ? 0 : -1}
        aria-disabled={isDisabled ? "true" : "false"}
      >
        {node}
      </span>
    );
    if (!reason) return content;
    return (
      <Tooltip
        title={reason}
        placement="top"
        trigger={["hover", "focus"]}
        destroyOnHidden
        mouseEnterDelay={0.05}
        classNames={{ root: "pa-tooltip" }} // v5 replacement of overlayClassName
      >
        {content}
      </Tooltip>
    );
  };

  return (
    <div className={wrapperCls}>
      <div className="page-actions__spacer" />
      <div className="page-actions__buttons">
        {wrapWithTooltip(PrevBtn, resolvedPrevReason, prevDisabled)}
        {wrapWithTooltip(NextBtn, resolvedNextReason, nextDisabled)}
      </div>
    </div>
  );
}
