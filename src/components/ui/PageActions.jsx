import React, { useEffect, useState } from "react";
import { Button, Tooltip } from "antd";
import classNames from "classnames";
import "./PageActions.css";

/**
 * PageActions
 *
 * Props（向后兼容）：
 * - onPrev, onNext
 * - prevDisabled?: boolean
 * - nextDisabled?: boolean
 * - prevDisabledReason?: string | null
 * - nextDisabledReason?: string | null
 * - disabledReason?: string | { prev?: string, next?: string } // 统一入口（可选）
 * - defaultDisabledReason?: string
 * - prevText?: string
 * - nextText?: string
 * - sticky?: boolean
 * - className?: string
 * - revealAtBottom?: boolean   // default: true
 * - bottomOffset?: number      // default: 48
 */
export default function PageActions({
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  prevDisabledReason = null,
  nextDisabledReason = null,
  disabledReason, // string | {prev?, next?}
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

  // 统一/兼容禁用原因
  const normUnified =
    typeof disabledReason === "string"
      ? { prev: disabledReason, next: disabledReason }
      : (disabledReason || {});

  const resolvedPrevReason = prevDisabled
    ? (prevDisabledReason ?? normUnified.prev ?? defaultDisabledReason)
    : undefined; // 不禁用 => 不渲染 Tooltip

  const resolvedNextReason = nextDisabled
    ? (nextDisabledReason ?? normUnified.next ?? defaultDisabledReason)
    : undefined; // 不禁用 => 不渲染 Tooltip

  // 按钮本体
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

  return (
    <div className={wrapperCls}>
      <div className="page-actions__spacer" />
      <div className="page-actions__buttons">
        {/* Prev */}
        <Tooltip
          title={resolvedPrevReason}
          placement="top"
          trigger={["hover", "focus"]}           // 仅当有 title 时才会渲染并触发
          overlayClassName="pa-tooltip"           // 强制深色底+白字
          destroyTooltipOnHide
          mouseEnterDelay={0.05}
        >
          <span
            className="page-actions__tooltip-wrap"
            tabIndex={prevDisabled ? 0 : -1}
            aria-disabled={prevDisabled ? "true" : "false"}
          >
            {PrevBtn}
          </span>
        </Tooltip>

        {/* Next */}
        <Tooltip
          title={resolvedNextReason}
          placement="top"
          trigger={["hover", "focus"]}
          overlayClassName="pa-tooltip"
          destroyTooltipOnHide
          mouseEnterDelay={0.05}
        >
          <span
            className="page-actions__tooltip-wrap"
            tabIndex={nextDisabled ? 0 : -1}
            aria-disabled={nextDisabled ? "true" : "false"}
          >
            {NextBtn}
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
