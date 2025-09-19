// /src/hooks/useResponsive.js
import { useMediaQuery } from "react-responsive";

/**
 * Custom hook to manage responsive breakpoints.
 * Returns booleans indicating whether the viewport
 * is desktop, tablet, or mobile size.
 */
export default function useResponsive() {
  // Desktop: width >= 992px
  const isDesktop = useMediaQuery({ minWidth: 992 });

  // Tablet: 768px <= width < 992px
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 991 });

  // Mobile: width < 768px
  const isMobile = useMediaQuery({ maxWidth: 767 });

  return { isDesktop, isTablet, isMobile };
}
