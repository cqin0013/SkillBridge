// src/lib/providers/ResponsiveProvider.jsx
// Globally controls typography sizes via CSS variables using useResponsive().
// Works without CSS media queries and affects Portals (e.g., AntD Modal) by
// toggling a class on <html>. You can tweak the numbers to your taste.

import { useEffect } from "react";
import useResponsive from "../../lib/hooks/useResponsive";

export default function ResponsiveProvider({ children }) {
  const { isDesktop, isTablet, isMobile } = useResponsive();

  useEffect(() => {
    // Toggle a single class on <html> so CSS variables apply globally (incl. portals)
    const html = document.documentElement;
    html.classList.remove("r-mobile", "r-tablet", "r-desktop");
    if (isMobile) html.classList.add("r-mobile");
    else if (isTablet) html.classList.add("r-tablet");
    else html.classList.add("r-desktop");
  }, [isDesktop, isTablet, isMobile]);

  return children;
}
