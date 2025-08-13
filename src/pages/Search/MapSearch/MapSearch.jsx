// src/pages/Search/MapSearch.jsx
import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { fetchAvailableBays } from "../../../services/parkingAPI";
import { useSearch } from "../SearchProvider";
import "./MapSearch.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export default function MapSearch() {
  const { selectedBay, setSelectedBay, clearSelectedBay } = useSearch();

  const [bays, setBays] = useState([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [radius, setRadius] = useState(300);                 // 可调半径
  const [onlyAvailable, setOnlyAvailable] = useState(false); // 只显示可用
  const [showOnlySelected, setShowOnlySelected] = useState(false); // 只看已选

  const mapRef = useRef(null);
  const destRef = useRef(null);
  const markersRef = useRef([]);

  const defaultCenter = { lat: -37.8136, lng: 144.9631 };

  // 若开启“只看已选”但选中被清空，则自动回到显示全部
  useEffect(() => {
    if (showOnlySelected && !selectedBay) setShowOnlySelected(false);
  }, [showOnlySelected, selectedBay]);

  useEffect(() => {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: "beta",
      libraries: ["places"],
      language: "en",
    });

    loader.load().then((google) => {
      if (mapRef.current) return;
      const el = document.getElementById("map");
      if (!el) return;

      const map = new google.maps.Map(el, {
        center: defaultCenter,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;

      const input = document.getElementById("search-box");
      const ac = new google.maps.places.Autocomplete(input, {
        fields: ["geometry", "name", "place_id"],
      });

      ac.addListener("place_changed", async () => {
        const p = ac.getPlace();
        if (!p?.geometry?.location) return;
        const loc = p.geometry.location;
        const dest = { lat: loc.lat(), lng: loc.lng() };
        destRef.current = dest;

        clearSelectedBay();
        await loadBays(dest);
      });

      setLoadingMap(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => (m.setMap ? m.setMap(null) : (m.map = null)));
    markersRef.current = [];
  };

  // 统一的“选中某个 bay”动作：选中 + 自动切到“只看已选”
  const selectBay = (b) => {
    setSelectedBay(b);
    setShowOnlySelected(true); // ✅ 自动切换
  };

  // 支持点击 marker 的回调
  const addMarker = (position, title, onClick) => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map) return null;
    const marker = new google.maps.Marker({ map, position, title });
    if (typeof onClick === "function") marker.addListener("click", onClick);
    markersRef.current.push(marker);
    return marker;
  };

  // 根据当前过滤绘制 markers
  const drawMarkers = (list) => {
    const google = window.google;
    const map = mapRef.current;
    const dest = destRef.current;
    if (!google || !map || !dest) return;

    clearMarkers();

    // 目的地 marker
    addMarker(dest, "Search destination");

    // bay markers（点击 => 选中并自动只看已选）
    list.forEach((b) => {
      addMarker(
        { lat: b.lat, lng: b.lng },
        `${b.bayId} bay`,
        () => selectBay(b) // ✅
      );
    });

    // 自适应边界
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(new google.maps.LatLng(dest.lat, dest.lng));
    list.forEach((b) => bounds.extend(new google.maps.LatLng(b.lat, b.lng)));
    if (!bounds.isEmpty()) map.fitBounds(bounds);
  };

  // “只看已选”或选中变化时重画
  useEffect(() => {
    if (!destRef.current) return;
    const filtered =
      showOnlySelected && selectedBay
        ? bays.filter((b) => b.bayId === selectedBay.bayId)
        : bays;
    drawMarkers(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnlySelected, selectedBay]);

  async function loadBays(dest, forceOnlyAvailable = onlyAvailable) {
    if (!dest) {
      setBays([]); setError(""); clearMarkers(); return;
    }
    setFetching(true); setError("");
    try {
      const list = await fetchAvailableBays({
        lat: dest.lat,
        lng: dest.lng,
        radius,
        onlyAvailable: forceOnlyAvailable,
      });

      const finalList = forceOnlyAvailable ? list.filter((b) => b.rtAvailable === true) : list;
      setBays(finalList);

      // 选中项不在结果中则清空
      if (selectedBay && !finalList.some((b) => b.bayId === selectedBay.bayId)) {
        clearSelectedBay();
      }

      // 根据当前开关决定显示的列表
      const toRender =
        showOnlySelected && selectedBay
          ? finalList.filter((b) => b.bayId === selectedBay.bayId)
          : finalList;

      drawMarkers(toRender);
    } catch {
      setError("Backend unavailable.");
      clearMarkers();
    } finally {
      setFetching(false);
    }
  }

  const hasDestination = !!destRef.current;
  const visibleBays =
    showOnlySelected && selectedBay
      ? bays.filter((b) => b.bayId === selectedBay.bayId)
      : bays;

  return (
    <div className="search-page">
      {/* 搜索栏 + 半径 + 刷新 */}
      <div className="search-toolbar" style={{ gap: 12 }}>
        <input
          id="search-box"
          type="text"
          placeholder="Search for a location"
          aria-label="Search for a destination"
          className="search-box"
        />

        {/* 半径滑块（300~1000） */}
        <div className="radius-control" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="radius" style={{ whiteSpace: "nowrap" }}>Radius</label>
          <input
            id="radius"
            type="range"
            min={300}
            max={1000}
            step={50}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            aria-label="Search radius in meters"
          />
          <span style={{ width: 60, textAlign: "right" }}>{radius} m</span>
        </div>

        <button
          onClick={() => loadBays(destRef.current)}
          disabled={loadingMap || fetching || !hasDestination}
          className="refresh-btn"
        >
          {fetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {(loadingMap || error) && (
        <div className={`notice ${error ? "error" : ""}`}>
          {loadingMap ? "Loading map…" : error}
        </div>
      )}

      {/* 地图 */}
      <div id="map" className="map" />

      {/* Bays 面板 */}
      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">
            {onlyAvailable ? "Available Parking Bays" : "Parking Bays"}
          </h3>

          {hasDestination && (
            <span className="count-badge">
              {visibleBays.length} result{visibleBays.length !== 1 ? "s" : ""} (±{radius}m)
            </span>
          )}

          {/* 只显示 available */}
          <label className="toggle-only-available" style={{ marginLeft: "auto" }}>
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={async (e) => {
                const checked = e.target.checked;
                setOnlyAvailable(checked);
                if (destRef.current) await loadBays(destRef.current, checked);
              }}
            />
            <span style={{ marginLeft: 6 }}>Only available</span>
          </label>

          {/* 显示全部 / 只看已选：此处按钮只负责“恢复显示全部” */}
          <button
            className={`solo-btn ${showOnlySelected ? "active" : ""}`}
            onClick={() => setShowOnlySelected(false)}
            disabled={!showOnlySelected}
            title={showOnlySelected ? "Show all bays" : "Select a bay to focus"}
            style={{ marginLeft: 8 }}
          >
            Show all bays
          </button>
        </div>

        {!hasDestination ? (
          <div className="muted">Please enter a location.</div>
        ) : fetching && bays.length === 0 ? (
          <div className="muted">Loading nearby bays…</div>
        ) : visibleBays.length === 0 ? (
          <div className="muted">No parking bays.</div>
        ) : (
          <div className="bay-grid">
            {visibleBays.map((b) => {
              const active = selectedBay?.bayId === b.bayId;
              return (
                <button
                  key={b.bayId}
                  onClick={() => selectBay(b)}           
                  className={`bay-card ${active ? "active" : ""}`}
                  title={`${b.bayId} bay`}
                >
                  {b.bayId} bay
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
