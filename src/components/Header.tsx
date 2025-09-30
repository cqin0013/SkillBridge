// src/components/Header.tsx

/**
 * Header (site-wide navigation bar)
 *
 * Responsibilities
 * - Desktop: inline nav with solid active indicator (GSAP) and hover dashed underline
 * - Mobile: hamburger + drawer (transparent panel); closes on outside click / ESC / route change
 * - Animations: scroll hide/reveal (GSAP, yPercent), hover lift on brand & nav, drawer timeline
 *
 * Accessibility
 * - aria-label / aria-controls / aria-expanded / aria-modal
 * - Focus management: move focus into drawer on open, return to trigger on close
 * - Uses focus-visible rings; respects prefers-reduced-motion
 *
 * Performance
 * - Dynamically loads ScrollTrigger to shrink initial bundle
 * - One-time guarded route prefetch on desktop & good networks
 */

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  forwardRef,
  useId,
} from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import gsap from "gsap";
import type { ScrollTrigger as ScrollTriggerClass } from "gsap/ScrollTrigger";
import { prefetchRoute } from "../lib/prefetch";

// Config
// ------
const HEADER_H = "h-16";                 // layout height token (~64px)
const NAV_SIZE = "text-sm lg:text-base"; // smaller on mobile
const LOGO_SRC = "/StrangerThink.png";
const BRAND = "SkillBridge";

type RoutePath = "/Analyzer" | "/Glossary" | "/Insight" | "/Profile";
type NavItem = { label: string; to: RoutePath };

const NAV_ITEMS = [
  { label: "Analyzer", to: "/Analyzer" },
  { label: "Insight",  to: "/Insight"  },
  { label: "Glossary", to: "/Glossary" },
  { label: "Profile",  to: "/Profile"  },
] as const satisfies ReadonlyArray<NavItem>;

// Types for ScrollTrigger (static vs instance)
// -------------------------------------------
type ScrollTriggerStatic   = typeof ScrollTriggerClass;          // static side: create(), ...
type ScrollTriggerInstance = InstanceType<ScrollTriggerStatic>;  // instance side: direction, ...

// Utils
// -----
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Subcomponents
// -------------
// Brand now accepts a `fgClass` to switch text color (white on home, black elsewhere)
const Brand = memo(function Brand({ fgClass }: { fgClass: string }) {
  // Hover: subtle lift (skips when reduced motion is preferred)
  const liftIn  = (el: HTMLElement) => { if (!prefersReduced()) gsap.to(el, { y: -2, duration: 0.18, ease: "power2.out" }); };
  const liftOut = (el: HTMLElement) => { if (!prefersReduced()) gsap.to(el, { y:  0, duration: 0.20, ease: "power2.out" }); };

  return (
    <Link
      to="/"
      className="flex items-center gap-2"
      aria-label={`${BRAND} home`}
      onMouseEnter={(e) => liftIn(e.currentTarget)}
      onMouseLeave={(e) => liftOut(e.currentTarget)}
    >
      {/* Decorative logo (hidden from AT because the wordmark follows) */}
      <img
        src={LOGO_SRC}
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
        className="h-10 w-10 rounded-md object-contain lg:h-12 lg:w-12"
      />
      <span className={cx("font-bold text-xl lg:text-2xl leading-none", fgClass)}>
        {BRAND}
      </span>
    </Link>
  );
});

// Desktop nav receives `fgClass` (link color) and `indicatorColor`.
// Hover dashed underline color switched to accent (was primary).
const DesktopNav = memo(function DesktopNav({
  fgClass,
  indicatorColor,
}: {
  fgClass: string;
  indicatorColor: string;
}) {
  // Active underline is drawn by indicator bar; hover shows dashed underline in accent color
  const navClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      "relative font-bold transition-colors will-change-transform",
      fgClass,
      "px-1 pb-1",                                  // space for indicator bar
      "no-underline decoration-transparent",
      NAV_SIZE,
      !isActive &&
        "hover:underline hover:decoration-1 hover:decoration-dashed hover:decoration-primary hover:underline-offset-[6px]",
      "active:underline active:decoration-1 active:decoration-dashed active:decoration-primary active:underline-offset-[6px]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded"
    );

  // Hover lift (GSAP)
  const liftIn  = (el: HTMLElement) => { if (!prefersReduced()) gsap.to(el, { y: -2, duration: 0.16, ease: "power2.out" }); };
  const liftOut = (el: HTMLElement) => { if (!prefersReduced()) gsap.to(el, { y:  0, duration: 0.18, ease: "power2.out" }); };

  // One-time prefetch on desktop and not-slow network
  type EffectiveConnection = { saveData?: boolean; effectiveType?: string };
  type NavigatorWithConnection = Navigator & { connection?: EffectiveConnection };
  const prefetched = useRef<Set<string>>(new Set());
  const canPrefetch = () => {
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const conn = (navigator as NavigatorWithConnection).connection;
    const slow = !!(conn && (conn.saveData || (conn.effectiveType && /2g/.test(conn.effectiveType))));
    return desktop && !slow;
  };

  return (
    <nav className="relative hidden items-center gap-6 lg:flex" id="desktop-nav">
      {NAV_ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={navClass}
          onPointerEnter={(e) => {
            if (canPrefetch() && !prefetched.current.has(it.to)) {
              prefetchRoute(it.to);
              prefetched.current.add(it.to);
            }
            liftIn(e.currentTarget as HTMLElement);
          }}
          onPointerLeave={(e) => liftOut(e.currentTarget as HTMLElement)}
        >
          {it.label}
        </NavLink>
      ))}

      {/* Active indicator (solid 2px bar). Positioned by GSAP on route change. */}
      <span
        id="nav-indicator"
        aria-hidden="true"
        className={cx("pointer-events-none absolute bottom-0 left-0 h-[2px] w-0", indicatorColor)}
      />
    </nav>
  );
});

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
  fgClass: string; // inherit foreground (white on home, black elsewhere)
};

// Transparent mobile drawer: panel is see-through; keep rounded corners and a soft shadow.
// Link hover uses a very light translucent fill for feedback (remove if you want 100% pure transparent).
const MobileMenu = memo(function MobileMenu({ open, onClose, panelRef, fgClass }: MobileMenuProps) {
  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={cx(
        "lg:hidden fixed top-16 right-3 z-50 w-[180px]",
        "rounded-xl border border-transparent",   // no visible border
        "bg-white/80 p-2 shadow-md",          // transparent background + soft shadow
        "max-h-[min(65vh,420px)] overflow-auto",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
    >
      <div className={cx("flex flex-col gap-1", NAV_SIZE)}>
        {NAV_ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              cx(
                "no-underline decoration-transparent rounded-md px-3 py-2 transition",
                fgClass, // use inherited foreground color (white on home, black elsewhere)
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-lg",
                // dashed underline uses accent color on hover/active
                isActive
                  ? "border-b-2 border-current"
                  : "hover:underline hover:decoration-1 hover:decoration-dashed hover:decoration-primary/60 hover:underline-offset-[6px] hover:bg-white/10"
              )
            }
            onPointerEnter={(e) => { if (!prefersReduced()) gsap.to(e.currentTarget, { y: -2, duration: 0.16, ease: "power2.out" }); }}
            onPointerLeave={(e) => { if (!prefersReduced()) gsap.to(e.currentTarget, { y:  0, duration: 0.18, ease: "power2.out" }); }}
            onClick={onClose}
          >
            <span className="font-bold">{it.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
});

// Burger now accepts a bar color class (white on home, black elsewhere)
const Burger = memo(
  forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { barClass: string }>(
    function Burger(props, ref) {
      const { barClass, ...rest } = props;
      const expanded = props["aria-expanded"] === true || props["aria-expanded"] === "true";

      return (
        <button
          {...rest}
          ref={ref}
          className={cx(
            "lg:hidden rounded-md border border-gray-200 px-3 py-2",
            "transition-colors duration-150 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            props.className
          )}
          aria-label="Toggle menu"
        >
          {/* top bar */}
          <span className={cx("block h-0.5 w-5 transition-transform duration-200", barClass, expanded && "translate-y-1.5 rotate-45")} />
          {/* middle bar */}
          <span className={cx("mt-1 block h-0.5 w-5 transition-opacity duration-200", barClass, expanded && "opacity-0")} />
          {/* bottom bar */}
          <span className={cx("mt-1 block h-0.5 w-5 transition-transform duration-200", barClass, expanded && "-translate-y-1 -rotate-45")} />
        </button>
      );
    }
  )
);

// Main Header
// -----------
type HeaderProps = {
  transparent?: boolean;
  className?: string;
};

export default function Header({ transparent = false, className }: HeaderProps) {
  // State
  const [open, setOpen] = useState(false);
  const [stReady, setStReady] = useState(false); // ScrollTrigger ready flag

  // Routing
  const { pathname } = useLocation();

  // Determine color scheme: white on home (transparent over hero), black elsewhere
  const onHome = pathname === "/";
  const fgClass = onHome ? "text-white" : "text-black";
  const indicatorColor = onHome ? "bg-white" : "bg-black";
  const burgerBarClass = onHome ? "bg-white" : "bg-black";

  // Refs (DOM & timelines)
  const rootRef  = useRef<HTMLElement | null>(null);
  const btnRef   = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const drawerTl = useRef<gsap.core.Timeline | null>(null);

  // ScrollTrigger: keep the static side (class) to call .create()
  const stRef = useRef<ScrollTriggerStatic | null>(null);

  // Unique id for aria-controls
  const menuId = useId();

  // Close helper
  const close = useCallback(() => setOpen(false), []);

  // Dynamically import ScrollTrigger (shrink initial bundle)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === "undefined") return;
      if (stRef.current) { setStReady(true); return; } // already loaded
      const mod = await import("gsap/ScrollTrigger");
      if (!mounted) return;
      gsap.registerPlugin(mod.ScrollTrigger);
      stRef.current = mod.ScrollTrigger; // static side
      setStReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  // Close on route change
  useEffect(() => { close(); }, [pathname, close]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // Close when crossing into desktop breakpoint
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (ev: MediaQueryListEvent) => { if (ev.matches) close(); };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [close]);

  // Close on outside pointerdown (snappier than click)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, close]);

  // Focus management: move focus into drawer on open; return to trigger on close
  useEffect(() => {
    if (open) {
      const firstLink = panelRef.current?.querySelector("a") as HTMLAnchorElement | null;
      firstLink?.focus();
    } else {
      btnRef.current?.focus();
    }
  }, [open]);

  // Animation: scroll hide/reveal header (when ScrollTrigger is ready)
  useLayoutEffect(() => {
    const ST = stRef.current;
    const el = rootRef.current;
    if (!stReady || !ST || !el) return;

    const ctx = gsap.context(() => {
      const show = (): gsap.core.Tween =>
        gsap.to(el, { yPercent: 0,    duration: 0.18, ease: "power2.out" });
      const hide = (): gsap.core.Tween =>
        gsap.to(el, { yPercent: -100, duration: 0.22, ease: "power2.out" });

      const trigger = ST.create({
        start: 0,
        end: "max",
        onUpdate(self: ScrollTriggerInstance) {
          if (prefersReduced()) return;
          const atTop = typeof window !== "undefined" && window.scrollY <= 0;
          if (atTop) { show(); return; }
          if (self.direction === 1) hide(); else show();
        },
        onRefresh() {
          if (typeof window !== "undefined" && window.scrollY <= 0) show();
        }
      });

      return () => trigger.kill();
    }, rootRef);

    return () => ctx.revert();
  }, [stReady]);

  // Animation: place active indicator under current link
  useLayoutEffect(() => {
    const nav = document.getElementById("desktop-nav");
    const indicator = document.getElementById("nav-indicator") as HTMLSpanElement | null;
    if (!nav || !indicator) return;

    const positionTo = (target: HTMLElement | null) => {
      if (!target) { gsap.set(indicator, { width: 0 }); return; }
      const navBox = nav.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const x = box.left - navBox.left;
      const w = box.width;
      gsap.to(indicator, { x, width: w, duration: 0.25, ease: "expo.out" });
    };

    const active = nav.querySelector('a[aria-current="page"]') as HTMLElement | null;
    positionTo(active);
  }, [pathname]);

  // Build drawer timeline once
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      panel,
      { y: -8, opacity: 0, scale: 0.985 },
      { y: 0,  opacity: 1, scale: 1, duration: 0.18, ease: "power2.out" }
    );

    drawerTl.current = tl;
    return () => { tl.kill(); drawerTl.current = null; };
  }, []);

  // Play/reverse drawer timeline
  useEffect(() => {
    const tl = drawerTl.current;
    if (!tl) return;
    if (open) tl.play(0); else tl.reverse(0);
  }, [open]);

  return (
    <header
      ref={rootRef}
      className={cx(
        "site-header",
        "top-0 z-40 border-b",
        // keep transparent only where parent asks (e.g., on "/")
        (transparent || onHome)
          ? "bg-transparent border-transparent"
          : "bg-white/80 border-gray-200 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        className
      )}
    >
      {/* Wider container & smaller paddings: hug the screen edges a bit more */}
      <div className={cx("mx-auto flex items-center justify-between px-2 sm:px-3", "max-w-screen-2xl", HEADER_H)}>
        <Brand fgClass={fgClass} />
        <DesktopNav fgClass={fgClass} indicatorColor={indicatorColor} />
        <Burger
          ref={btnRef}
          aria-controls={menuId}
          aria-expanded={open}
          barClass={burgerBarClass}
          onClick={() => setOpen((v) => !v)}
        />
      </div>

      {/* aria-controls target for the hamburger */}
      <div id={menuId}>
        <MobileMenu open={open} onClose={close} panelRef={panelRef} fgClass={fgClass} />
      </div>
    </header>
  );
}
