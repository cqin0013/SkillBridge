import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Keep number within [min, max] */
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export interface DraggableBadgePortalProps {
  onClick: () => void;                  // Fired on tap/click (dragging won't trigger)
  icon?: React.ReactNode;               // Inner icon/node
  containerSelector?: string;           // Main container selector (must be position: relative)

  /* Appearance */
  size?: number;                        // px (width = height)
  margin?: number;                      // px to container edges
  zIndex?: number;                      // z-index INSIDE the container
  bgClassName?: string;                 // Tailwind bg, e.g. "bg-blue-600"
  textClassName?: string;               // Tailwind text color, e.g. "text-white"
  className?: string;                   // Extra Tailwind classes
  iconSize?: number;                    // px
  roundedClassName?: string;            // default "rounded-full" (circle)

  /* Behavior */
  storageKey?: string;                  // Persisted position key
  initialEdge?: "left" | "right";       // Initial horizontal side
  initialVertical?: "top" | "center" | "bottom";
  snapToEdge?: boolean;                 // Snap to left/right on release
  moveThreshold?: number;               // px to treat as drag (vs click)
  lockVertical?: "none" | "top" | "bottom"; // lock Y to top/bottom edge (for “header 下方”固定在上边)
  debugMode?: boolean;                  // optional: console warnings
}

/**
 * DraggableBadgePortal
 * - Mounts into a specific container (absolute positioning inside that container).
 * - Smooth dragging via rAF + transform (no jitter, very responsive).
 * - Optional vertical lock to the top edge (header below).
 * - Dragging will NOT trigger click; only tap/click opens.
 * - Persists anchor position (left/top) in localStorage on release.
 */
const DraggableBadgePortal: React.FC<DraggableBadgePortalProps> = ({
  onClick,
  icon,
  containerSelector = "#main-content",

  size = 56,
  margin = 12,
  zIndex = 90,
  bgClassName = "bg-blue-600",
  textClassName = "text-white",
  className,
  iconSize = 22,
  roundedClassName = "rounded-full",

  storageKey = "draggable-badge-pos",
  initialEdge = "left",
  initialVertical = "top",
  snapToEdge = true,
  moveThreshold = 4,
  lockVertical = "top",
  debugMode = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  /** Anchored position (absolute left/top within container) */
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: margin, y: margin });

  /** Container size for clamping */
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  /** Dragging state */
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    moved: false,
  });

  /** Smooth dragging (translate only during drag) */
  const elRef = useRef<HTMLButtonElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const el = document.querySelector(containerSelector) as HTMLElement | null;
    if (!el && debugMode) {
      console.warn(`[Badge] container not found: ${containerSelector}`);
    }
    setContainer(el || null);
  }, [mounted, containerSelector, debugMode]);

  /** Observe container size (ResizeObserver + window resize) */
  useEffect(() => {
    if (!container) return;

    const readSize = () => {
      sizeRef.current = { w: container.clientWidth, h: container.clientHeight };
    };

    readSize();

    const ro = new ResizeObserver(readSize);
    ro.observe(container);

    const onWinResize = () => readSize();
    window.addEventListener("resize", onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
  }, [container]);

  /** Initialize anchor position (after size known) */
  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (!container || w === 0 || h === 0) return;

    // Defaults (top edge by request)
    let initial = {
      x: initialEdge === "right" ? Math.max(margin, w - size - margin) : margin,
      y:
        initialVertical === "top"
          ? margin
          : initialVertical === "center"
          ? Math.max(margin, (h - size) / 2)
          : Math.max(margin, h - size - margin),
    };

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) initial = saved;
    } catch {}

    // If lockVertical specified, force Y to top/bottom
    if (lockVertical === "top") initial.y = margin;
    if (lockVertical === "bottom") initial.y = Math.max(margin, h - size - margin);

    setPos({
      x: clamp(initial.x, margin, Math.max(0, w - size - margin)),
      y: clamp(initial.y, margin, Math.max(0, h - size - margin)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    container,
    size,
    margin,
    storageKey,
    initialEdge,
    initialVertical,
    lockVertical,
    sizeRef.current.w,
    sizeRef.current.h,
  ]);

  /** rAF painter for transform during dragging */
  const paint = () => {
    const el = elRef.current;
    if (!el) return;
    const { dx, dy } = dragDeltaRef.current;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    rafRef.current = null;
  };

  const schedulePaint = () => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(paint);
    }
  };

  /** Pointer handlers */
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!container) return;
    if (e.button === 0 || e.pointerType === "touch" || e.pointerType === "pen") {
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        moved: false,
      };
      // zero transform at drag start
      dragDeltaRef.current = { dx: 0, dy: 0 };
      schedulePaint();

      // Prevent page scroll on touch drag
      (e.currentTarget as HTMLElement).style.touchAction = "none";
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.dragging || !container) return;

    let dx = e.clientX - dragRef.current.startX;
    let dy = e.clientY - dragRef.current.startY;

    // Lock vertical if requested
    if (lockVertical === "top") dy = 0;
    if (lockVertical === "bottom") dy = 0;

    // Mark as "moved" to suppress click
    if (!dragRef.current.moved && (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold)) {
      dragRef.current.moved = true;
    }

    // Just store deltas; render via rAF transform
    dragDeltaRef.current = { dx, dy };
    schedulePaint();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.dragging || !container) return;
    dragRef.current.dragging = false;

    // Commit final position (anchor = original + delta)
    const { dx, dy } = dragDeltaRef.current;
    const { w, h } = sizeRef.current;

    let nextX = dragRef.current.origX + dx;
    let nextY = dragRef.current.origY + dy;

    // Respect vertical lock when committing
    if (lockVertical === "top") nextY = margin;
    if (lockVertical === "bottom") nextY = Math.max(margin, h - size - margin);

    nextX = clamp(nextX, margin, Math.max(0, w - size - margin));
    nextY = clamp(nextY, margin, Math.max(0, h - size - margin));

    // Reset transform to zero, move anchor
    const el = elRef.current;
    if (el) el.style.transform = "translate3d(0,0,0)";
    setPos({ x: nextX, y: nextY });

    // Edge snapping (horizontal)
    if (snapToEdge) {
      const center = w / 2;
      const toLeft = nextX + size / 2 < center;
      const targetX = toLeft ? margin : Math.max(margin, w - size - margin);
      setPos((p) => ({ ...p, x: targetX }));
    }

    // Release capture & restore touchAction
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    (e.currentTarget as HTMLElement).style.touchAction = "";
  };

  const handleClick = () => {
    // Only click when not dragged
    if (!dragRef.current.moved) onClick?.();
  };

  // Guard: container not ready → don't render (or debug fallback)
  const ready =
    mounted && container && sizeRef.current.w > 0 && sizeRef.current.h > 0;

  if (!ready) {
    if (debugMode) {
      return createPortal(
        <button
          type="button"
          onClick={handleClick}
          style={{
            position: "fixed",
            left: 16,
            top: 80,
            width: size,
            height: size,
            borderRadius: "50%",
            border: "none",
            outline: "none",
            zIndex: 2_147_483_000,
            background: "#ef4444",
            color: "#fff",
          }}
        >
          {icon}
        </button>,
        document.body
      );
    }
    return null;
  }

  // Absolute inside container; no rectangular frame (pure circle)
  const style: React.CSSProperties = {
    position: "absolute",
    left: pos.x,
    top: pos.y,
    width: size,
    height: size,
    zIndex,
    /* Smooth dragging hint */
    willChange: "transform",
  };

  const classes = [
    "inline-flex items-center justify-center select-none",
    "transition-transform duration-75 active:scale-95",
    "cursor-grab active:cursor-grabbing outline-none border-0", // no border box
    roundedClassName,                 // circle
    bgClassName,                      // e.g. bg-blue-600
    textClassName,                    // e.g. text-white
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <button
      ref={elRef}
      type="button"
      aria-label="Open panel"
      style={style}
      className={classes}
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <span style={{ fontSize: iconSize, lineHeight: 1 }}>{icon}</span>
    </button>,
    container!
  );
};

export default DraggableBadgePortal;
