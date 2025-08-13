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
  const [radius, setRadius] = useState(300);               // 可调半径
  const [onlyAvailable, setOnlyAvailable] = useState(false);
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
    markersRef.current.forEach((m) =>
      m.setMap ? m.setMap(null) : (m.map = null)
    );
    markersRef.current = [];
  };

  // ⬇️ 支持给 marker 绑定点击行为（比如选中 bay）
  const addMarker = (position, title, onClick) => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map) return null;
    const marker = new google.maps.Marker({ map, position, title });
    if (typeof onClick === "function") {
      marker.addListener("click", onClick);
    }
    markersRef.current.push(marker);
    return marker;
  };

  // 按当前过滤（只看已选）重画 markers；bay marker 绑定点击=>选中该 bay
  const drawMarkers = (list) => {
    const google = window.google;
    const map = mapRef.current;
    const dest = destRef.current;
    if (!google || !map || !dest) return;

    clearMarkers();

    // 目的地 marker（无点击）
    addMarker(dest, "Search destination");

    // bay markers：点击后选中该 bay
    list.forEach((b) => {
      addMarker(
        { lat: b.lat, lng: b.lng },
        `${b.bayId} bay`,
        () => setSelectedBay(b) // ✅ 点击 marker 选中 bay
      );
    });

    // 自适应边界
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(new google.maps.LatLng(dest.lat, dest.lng));
    list.forEach((b) => bounds.extend(new google.maps.LatLng(b.lat, b.lng)));
    if (!bounds.isEmpty()) map.fitBounds(bounds);
  };

  // 当“只看已选”或选中项变化时，按当前 bays 重画 markers
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
      setBays([]);
      setError("");
      clearMarkers();
      return;
    }
    setFetching(true);
    setError("");
    try {
      const list = await fetchAvailableBays({
        lat: dest.lat,
        lng: dest.lng,
        radius,
        onlyAvailable: forceOnlyAvailable,
      });

      const finalList = forceOnlyAvailable
        ? list.filter((b) => b.rtAvailable === true)
        : list;

      setBays(finalList);

      // 选中项不在结果中则清空
      if (selectedBay && !finalList.some((b) => b.bayId === selectedBay.bayId)) {
        clearSelectedBay();
      }

      // 根据当前 toggle 决定实际显示的列表并画 markers
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
      {/* 搜索栏 + 半径 + 刷新 同一行（配合你的 CSS Grid 三列） */}
      <div className="search-toolbar" style={{ gap: 12 }}>
        <input
          id="search-box"
          type="text"
          placeholder="Search for a location"
          aria-label="Search for a destination"
          className="search-box"
        />

        {/* 半径滑块（300~1000） */}
        <div
          className="radius-control"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <label htmlFor="radius" style={{ whiteSpace: "nowrap" }}>
            Radius
          </label>
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

          {/* 计数（显示当前可见数量） */}
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
                if (destRef.current) {
                  await loadBays(destRef.current, checked);
                }
              }}
            />
            <span style={{ marginLeft: 6 }}>Only available</span>
          </label>

          {/* 只看已选/显示全部 */}
          <button
            className={`solo-btn ${showOnlySelected ? "active" : ""}`}
            onClick={() => setShowOnlySelected((v) => !v)}
            disabled={!selectedBay || visibleBays.length === 0}
            title={
              !selectedBay
                ? "Select a bay first"
                : showOnlySelected
                ? "Show all bays"
                : "Show only the selected bay"
            }
            style={{ marginLeft: 8 }}
          >
            {showOnlySelected ? "Show all bays" : "Show only selected"}
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
                  onClick={() => setSelectedBay(b)}
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
