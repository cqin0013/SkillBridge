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
  const [radius, setRadius] = useState(300);              // ✅ 可调半径
  const [onlyAvailable, setOnlyAvailable] = useState(false); // ✅ 只显示可用切换

  const mapRef = useRef(null);
  const destRef = useRef(null);
  const markersRef = useRef([]);

  const defaultCenter = { lat: -37.8136, lng: 144.9631 };

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

  const addMarker = (position, title) => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map) return;
    const marker = new google.maps.Marker({ map, position, title });
    markersRef.current.push(marker);
  };

  async function loadBays(dest, forceOnlyAvailable = onlyAvailable) {
    if (!dest) {
      setBays([]);
      setError("");
      clearMarkers();
      return;
    }
    setFetching(true);
    setError("");
    clearMarkers();
    try {
      addMarker(dest, "Search destination");
      const list = await fetchAvailableBays({
        lat: dest.lat,
        lng: dest.lng,
        radius, // ✅ 使用当前半径
        onlyAvailable: forceOnlyAvailable,
      });

      const finalList = forceOnlyAvailable
        ? list.filter((b) => b.rtAvailable === true)
        : list;

      setBays(finalList);

      if (selectedBay && !finalList.some((b) => b.bayId === selectedBay.bayId)) {
        clearSelectedBay();
      }

      const google = window.google;
      const map = mapRef.current;
      if (google && map) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(dest.lat, dest.lng));
        finalList.forEach((b) => {
          addMarker({ lat: b.lat, lng: b.lng }, `${b.bayId} bay`);
          bounds.extend(new google.maps.LatLng(b.lat, b.lng));
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds);
      }
    } catch {
      setError("Backend unavailable.");
    } finally {
      setFetching(false);
    }
  }

  const hasDestination = !!destRef.current;

  return (
    <div className="search-page">
      {/* 搜索栏 + 半径 + 刷新 同一行 */}
      <div className="search-toolbar" style={{ gap: 12 }}>
        <input
          id="search-box"
          type="text"
          placeholder="Search for a location"
          aria-label="Search for a destination"
          className="search-box"
        />

        {/* ✅ 半径滑块（300~1000） */}
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

          {hasDestination && bays.length > 0 && (
            <span className="count-badge">
              {bays.length} result{bays.length > 1 ? "s" : ""} (±{radius}m)
            </span>
          )}

          {/* ✅ 只显示 available 开关 */}
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
        </div>

        {!hasDestination ? (
          <div className="muted">Please enter a location.</div>
        ) : fetching && bays.length === 0 ? (
          <div className="muted">Loading nearby bays…</div>
        ) : bays.length === 0 ? (
          <div className="muted">No parking bays nearby.</div>
        ) : (
          <div className="bay-grid">
            {bays.map((b) => {
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
