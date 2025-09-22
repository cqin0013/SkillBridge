// src/routes/RequireGate.jsx

import { Navigate, useLocation } from "react-router-dom";
import { isGateUnlocked } from "../lib/gate";

export default function RequireGate({ children }) {
  const loc = useLocation();
  if (!isGateUnlocked()) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/gate?next=${next}`} replace />;
  }
  return children;
}
