import SearchProvider from "./SearchProvider";
import MapSearch from "./MapSearch/MapSearch";
import BayInfo from "./BayInfo/BayInfo";
import "./SearchPage.css"; // 可选，简单写：.searchpage{padding:20px;}

export default function SearchPage() {
  return (
    <SearchProvider>
      <main className="searchpage">
        <MapSearch />
        <BayInfo />
      </main>
    </SearchProvider>
  );
}
