

import { useEffect } from "react";
import useResponsive from "../../lib/hooks/useResponsive";

export default function ResponsiveProvider({ children }) {
  const { isDesktop, isTablet, isMobile } = useResponsive();

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("r-mobile", "r-tablet", "r-desktop");
    if (isMobile) html.classList.add("r-mobile");
    else if (isTablet) html.classList.add("r-tablet");
    else html.classList.add("r-desktop");
  }, [isDesktop, isTablet, isMobile]);

  return children;
}
