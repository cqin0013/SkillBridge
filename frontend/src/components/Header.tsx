// src/components/layout/Header.tsx
/**
 * Responsive Site Header with lazy GSAP loading.
 * - GSAP and ScrollTrigger are loaded on demand to keep initial bundle small.
 * - Types use return-type inference (no gsap.core.* in types).
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
  useMemo,
} from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { prefetchRoute } from "../lib/utils/prefetch";

// ----- Types (compile-time only) -----

// Use function return types to define GSAP timeline/tween types
type GsapObj = typeof import("gsap")["gsap"];
type GsapTimeline = ReturnType<GsapObj["timeline"]>;
type GsapTween = ReturnType<GsapObj["to"]>;


// ----- Lazy loaders with module cache -----
type GSAPModule = typeof import("gsap");
type STModule = typeof import("gsap/ScrollTrigger");
type STType = typeof import("gsap/ScrollTrigger")["ScrollTrigger"];
type STInstance = ReturnType<STType["create"]>;
let _gsap: GSAPModule | null = null;
let _st: STModule | null = null;

async function loadGsap(): Promise<GSAPModule> {
  if (_gsap) return _gsap;
  _gsap = await import("gsap");
  return _gsap;
}
async function loadScrollTrigger(): Promise<STModule> {
  if (_st) return _st;
  const [gsapMod, stMod] = await Promise.all([loadGsap(), import("gsap/ScrollTrigger")]);
  gsapMod.gsap.registerPlugin(stMod.ScrollTrigger);
  _st = stMod;
  return stMod;
}

// -----------------------------------------------------------------------------
// Config tokens
// -----------------------------------------------------------------------------
const HEADER_H = "h-16";
const NAV_SIZE = "text-sm lg:text-base";
const LOGO_SRC = "/StrangerThink.png";
const BRAND = "SkillBridge";
const NAV_ITEM_BASE = "no-underline decoration-transparent rounded-md px-3 py-2 transition";
const NAV_ITEM_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:rounded-lg";
const NAV_ITEM_HOVER =
  "hover:underline hover:decoration-1 hover:decoration-dashed hover:decoration-primary/60 hover:underline-offset-[6px]";
const NAV_ITEMS = [
  { label: "Analyzer", to: "/analyzer" },
  { label: "Insight", to: "/insight" },
  { label: "Profile", to: "/profile" },
] as const;

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
function getPrefersReduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------
const Brand = memo(function Brand({ fgClass }: { fgClass: string }) {
  const liftIn = (el: HTMLElement): void => {
    if (getPrefersReduced()) return;
    loadGsap().then(({ gsap }) => gsap.to(el, { y: -2, duration: 0.18, ease: "power2.out" }));
  };
  const liftOut = (el: HTMLElement): void => {
    if (getPrefersReduced()) return;
    loadGsap().then(({ gsap }) => gsap.to(el, { y: 0, duration: 0.2, ease: "power2.out" }));
  };

  return (
    <Link
      to="/"
      className="flex items-center gap-2"
      aria-label={`${BRAND} home`}
      onMouseEnter={(e) => liftIn(e.currentTarget)}
      onMouseLeave={(e) => liftOut(e.currentTarget)}
    >
      <img
        src={LOGO_SRC}
        alt=""
        aria-hidden="true"
        width={40}
        height={40}
        className="h-10 w-10 rounded-md object-contain lg:h-12 lg:w-12"
      />
      <span className={clsx("font-bold text-xl lg:text-2xl leading-none", fgClass)}>{BRAND}</span>
    </Link>
  );
});

const DesktopNav = memo(function DesktopNav({
  fgClass,
  indicatorColor,
}: {
  fgClass: string;
  indicatorColor: string;
}) {
  const navClass = ({ isActive }: { isActive: boolean }): string =>
    clsx(
      "relative font-bold transition-colors will-change-transform",
      fgClass,
      "px-1 pb-1",
      "no-underline decoration-transparent",
      NAV_SIZE,
      !isActive &&
        "hover:underline hover:decoration-1 hover:decoration-dashed hover:decoration-primary hover:underline-offset-[6px]",
      "active:underline active:decoration-1 active:decoration-dashed active:decoration-primary active:underline-offset-[6px]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded",
    );

  type EffectiveConnection = { saveData?: boolean; effectiveType?: string };
  type NavigatorWithConnection = Navigator & { connection?: EffectiveConnection };

  const canPrefetch = useMemo<boolean>(() => {
    if (typeof window === "undefined") return false;
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const conn = (navigator as NavigatorWithConnection).connection;
    const slow = !!(conn && (conn.saveData || (conn.effectiveType && /2g/.test(conn.effectiveType))));
    return desktop && !slow;
  }, []);

  const prefetched = useRef<Set<string>>(new Set());

  const liftIn = (el: HTMLElement): void => {
    if (getPrefersReduced()) return;
    loadGsap().then(({ gsap }) => gsap.to(el, { y: -2, duration: 0.16, ease: "power2.out" }));
  };
  const liftOut = (el: HTMLElement): void => {
    if (getPrefersReduced()) return;
    loadGsap().then(({ gsap }) => gsap.to(el, { y: 0, duration: 0.18, ease: "power2.out" }));
  };

  return (
    <nav className="relative hidden items-center gap-6 lg:flex" id="desktop-nav">
      {NAV_ITEMS.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={navClass}
          onPointerEnter={(e) => {
            if (canPrefetch && !prefetched.current.has(it.to)) {
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

      <span
        id="nav-indicator"
        aria-hidden="true"
        className={clsx("pointer-events-none absolute bottom-0 left-0 h-[2px] w-0", indicatorColor)}
      />
    </nav>
  );
});

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
  fgClass: string;
};

const MobileMenu = memo(function MobileMenu({ open, onClose, panelRef, fgClass }: MobileMenuProps) {
  if (!open) return null;

  const hoverUp = (el: HTMLElement): void => {
    if (getPrefersReduced()) return;
    loadGsap().then(({ gsap }) => gsap.to(el, { y: -2, duration: 0.16, ease: "power2.out" }));
  };
  const hoverDown = (el: HTMLElement): void => {
    if (getPrefersReduced()) return;
    loadGsap().then(({ gsap }) => gsap.to(el, { y: 0, duration: 0.18, ease: "power2.out" }));
  };

  return (
    <div
      ref={panelRef}
      className={clsx(
        "lg:hidden fixed top-16 right-3 z-50 w-[180px]",
        "rounded-xl border border-transparent",
        "bg-white/80 p-2 shadow-md",
        "max-h-[min(65vh,420px)] overflow-auto",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Main menu"
    >
      <div className={clsx("flex flex-col gap-1", NAV_SIZE)}>
        <NavLink
          to="/"
          className={({ isActive }): string =>
            clsx(
              NAV_ITEM_BASE,
              NAV_ITEM_FOCUS,
              fgClass,
              isActive ? "border-b-2 border-current" : clsx(NAV_ITEM_HOVER, "hover:bg-white/10"),
            )
          }
          onPointerEnter={(e) => hoverUp(e.currentTarget as HTMLElement)}
          onPointerLeave={(e) => hoverDown(e.currentTarget as HTMLElement)}
          onClick={onClose}
        >
          <span className="font-bold">Home</span>
        </NavLink>

        {NAV_ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }): string =>
              clsx(
                NAV_ITEM_BASE,
                NAV_ITEM_FOCUS,
                fgClass,
                isActive ? "border-b-2 border-current" : clsx(NAV_ITEM_HOVER, "hover:bg-white/10"),
              )
            }
            onPointerEnter={(e) => hoverUp(e.currentTarget as HTMLElement)}
            onPointerLeave={(e) => hoverDown(e.currentTarget as HTMLElement)}
            onClick={onClose}
          >
            <span className="font-bold">{it.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
});

const Burger = memo(
  forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { barClass: string }>(
    function Burger(props, ref) {
      const { barClass, ...rest } = props;
      const expanded = props["aria-expanded"] === true || props["aria-expanded"] === "true";

      return (
        <button
          {...rest}
          ref={ref}
          className={clsx(
            "lg:hidden rounded-md border border-gray-200 px-3 py-2",
            "transition-colors duration-150 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            props.className,
          )}
          aria-label="Toggle menu"
        >
          <span className={clsx("block h-0.5 w-5 transition-transform duration-200", barClass, expanded && "translate-y-1.5 rotate-45")} />
          <span className={clsx("mt-1 block h-0.5 w-5 transition-opacity duration-200", barClass, expanded && "opacity-0")} />
          <span className={clsx("mt-1 block h-0.5 w-5 transition-transform duration-200", barClass, expanded && "-translate-y-1 -rotate-45")} />
        </button>
      );
    },
  ),
);

// -----------------------------------------------------------------------------
// Main Header
// -----------------------------------------------------------------------------
type HeaderProps = { transparent?: boolean; className?: string };

export default function Header({ transparent = false, className }: HeaderProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [stReady, setStReady] = useState<boolean>(false);

  const { pathname } = useLocation();

  const onHome = pathname === "/";
  const fgClass = onHome ? "text-white" : "text-black";
  const indicatorColor = onHome ? "bg-white" : "bg-black";
  const burgerBarClass = onHome ? "bg-white" : "bg-black";

  const rootRef = useRef<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const drawerTl = useRef<GsapTimeline | null>(null);

  const menuId = useId();
  const close = useCallback((): void => setOpen(false), []);

  // Load ScrollTrigger after mount
  useEffect(() => {
    let alive = true;
    (async () => {
      if (typeof window === "undefined" || stReady) return;
      try {
        await loadScrollTrigger();
        if (alive) setStReady(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [stReady]);

  // Close drawer on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // Close when entering desktop breakpoint
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (ev: MediaQueryListEvent): void => {
      if (ev.matches) close();
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [close]);

  // Close on outside pointerdown
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (e.button === 2) return;
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, close]);

  // Focus management
  useEffect(() => {
    if (open) {
      const firstLink = panelRef.current?.querySelector("a") as HTMLAnchorElement | null;
      firstLink?.focus();
    } else {
      btnRef.current?.focus();
    }
  }, [open]);

  // Scroll-triggered hide/reveal header
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!stReady || !el) return;

    let trigger: STInstance | null = null;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([loadGsap(), loadScrollTrigger()]);

      const show = (): GsapTween =>
        gsap.to(el, { yPercent: 0, duration: 0.18, ease: "power2.out" });
      const hide = (): GsapTween =>
        gsap.to(el, { yPercent: -100, duration: 0.22, ease: "power2.out" });

      trigger = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate(self) {
          if (getPrefersReduced()) return;
          const atTop = typeof window !== "undefined" && window.scrollY <= 0;
          if (atTop) {
            show();
            return;
          }
          if (self.direction === 1) hide();
          else show();
        },
        onRefresh() {
          if (typeof window !== "undefined" && window.scrollY <= 0) show();
        },
      });
    })();

    return () => {
      if (trigger) trigger.kill();
    };
  }, [stReady]);

  // Position active indicator under current desktop link
  useLayoutEffect(() => {
    const nav = document.getElementById("desktop-nav");
    const indicator = document.getElementById("nav-indicator") as HTMLSpanElement | null;
    if (!nav || !indicator) return;

    (async () => {
      const { gsap } = await loadGsap();
      const positionTo = (target: HTMLElement | null): void => {
        if (!target) {
          gsap.set(indicator, { width: 0 });
          return;
        }
        const navBox = nav.getBoundingClientRect();
        const box = target.getBoundingClientRect();
        const x = box.left - navBox.left;
        const w = box.width;
        gsap.to(indicator, { x, width: w, duration: 0.25, ease: "expo.out" });
      };
      const active = nav.querySelector('a[aria-current="page"]') as HTMLElement | null;
      positionTo(active);
    })();
  }, [pathname]);

  // Drawer timeline build once
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    let tl: GsapTimeline | null = null;
    let alive = true;

    (async () => {
      const { gsap } = await loadGsap();
      if (!alive) return;
      tl = gsap
        .timeline({ paused: true })
        .fromTo(
          panel,
          { y: -8, opacity: 0, scale: 0.985 },
          { y: 0, opacity: 1, scale: 1, duration: 0.18, ease: "power2.out" },
        );
      drawerTl.current = tl;
    })();

    return () => {
      alive = false;
      if (tl) tl.kill();
      drawerTl.current = null;
    };
  }, []);

  // Play or reverse drawer timeline
  useEffect(() => {
    const tl = drawerTl.current;
    if (!tl) return;
    if (open) tl.play(0);
    else tl.reverse(0);
  }, [open]);

  return (
    <header
      ref={rootRef}
      className={clsx(
        "site-header",
        "top-0 z-40 border-b",
        (transparent || onHome)
          ? "bg-transparent border-transparent"
          : "bg-white/80 border-gray-200 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        className,
      )}
    >
      <div
        className={clsx(
          "mx-auto flex items-center justify-between px-2 sm:px-3",
          "max-w-screen-2xl",
          HEADER_H,
        )}
      >
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

      <div id={menuId}>
        <MobileMenu open={open} onClose={close} panelRef={panelRef} fgClass="text-black" />
      </div>
    </header>
  );
}
