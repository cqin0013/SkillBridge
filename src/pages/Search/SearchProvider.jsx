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

/**
 * 自定义 Hook 便于使用。
 * 注意：如果你的 ESLint 报 `react-refresh/only-export-components`，
 * 可以在下行上方加一条注释关闭这条规则，或把 Hook 单独拆到 useSearch.js。
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSearch() {
  const ctx = useContext(SearchCtx);
  if (!ctx) throw new Error("useSearch must be used within <SearchProvider>");
  return ctx;
}
