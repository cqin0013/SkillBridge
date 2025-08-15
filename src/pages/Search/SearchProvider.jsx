import { createContext, useContext, useState } from "react";

/**
 * 提供全局的 selectedBay 状态：
 * { bayId, lat, lng, rtAvailable, timestamp }
 */
const SearchCtx = createContext(null);

export default function SearchProvider({ children }) {
  const [selectedBay, setSelectedBay] = useState(null);
  const clearSelectedBay = () => setSelectedBay(null);

  return (
    <SearchCtx.Provider value={{ selectedBay, setSelectedBay, clearSelectedBay }}>
      {children}
    </SearchCtx.Provider>
  );
}


// eslint-disable-next-line react-refresh/only-export-components
export function useSearch() {
  const ctx = useContext(SearchCtx);
  if (!ctx) throw new Error("useSearch must be used within <SearchProvider>");
  return ctx;
}
