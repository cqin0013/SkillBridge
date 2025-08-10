import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

/**
 * Search page — backend + robust normalization + directions
 *
 * - Uses Places Autocomplete (no SearchBox deprecation).
 * - Backend returns [] => show "No parking bays nearby." (no mock).
 * - Backend error => fall back to local mock bays.
 * - Frontend normalizes coords (lat/lng/lon) and ids (id/bayId) to avoid errors.
 * - Click a bay => latest status, InfoWindow, route with custom Start/End markers.
 */

export default function Search() {
  /* ===== Configuration ===== */
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const API_BASE = "http://localhost:3000";
  const DEFAULT_RADIUS = 300;

  /* ===== State / Refs ===== */
  const [bays, setBays] = useState([]);                   // [{id,name,lat,lng}]
  const [loadingMap, setLoadingMap] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const [selectedBay, setSelectedBay] = useState(null);   // string | null
  const [bayStatus, setBayStatus] = useState(null);       // {occupiedPercent, availabilityPercent, unoccupied, timestamp}
  const [routeInfo, setRouteInfo] = useState(null);       // {distanceText, durationText}

  const mapRef = useRef(null);
  const markersRef = useRef([]);                          // general markers (dest, bays, user)
  const markerByIdRef = useRef(new Map());                // bayId -> marker
  const bayLabelByIdRef = useRef(new Map());              // bayId -> "A"/"B"/...
  const destRef = useRef(null);                           // searched destination
  const directionsRendererRef = useRef(null);             // directions renderer
  const infoWindowRef = useRef(null);                     // single InfoWindow

  // user location cache + marker
  const userLocRef = useRef(null);                        // {lat,lng} | null
  const userLocMarkerRef = useRef(null);

  // custom Start/End markers for the current route
  const routeStartMarkerRef = useRef(null);
  const routeEndMarkerRef = useRef(null);

  const defaultCenter = { lat: -37.8136, lng: 144.9631 };

  /* ===== Validation & normalize helpers ===== */
  const toNum = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));
  const isFiniteNum = (n) => typeof n === "number" && Number.isFinite(n);
  const isLat = (n) => isFiniteNum(n) && n >= -90 && n <= 90;
  const isLng = (n) => isFiniteNum(n) && n >= -180 && n <= 180;
  const hasLatLng = (o) => o && isLat(o.lat) && isLng(o.lng);

  /* ===== Responsive grid styles for bay list ===== */
  const gridContainerStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    alignItems: "stretch",
  };
  const gridScrollable = (count) =>
    count > 16 ? { maxHeight: 320, overflowY: "auto", paddingRight: 4 } : {};
  const bayCardBase = (active) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    minHeight: 52,
    padding: 14,
    background: active ? "#ecfeff" : "#fff",
    border: `1px solid ${active ? "#06b6d4" : "#e5e7eb"}`,
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 15,
    lineHeight: 1.2,
    transition: "all .2s ease",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  /* ===== Init map + Places Autocomplete (no initial fetch) ===== */
  useEffect(() => {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: "beta",
      libraries: ["places"],
      language: "en",
    });

    loader.load().then((google) => {
      const el = document.getElementById("map");
      if (!el || mapRef.current) return;

      const map = new google.maps.Map(el, {
        center: defaultCenter,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;

      // Autocomplete (recommended alternative to SearchBox)
      const input = document.getElementById("search-box");
      const autocomplete = new google.maps.places.Autocomplete(input, {
        fields: ["geometry", "name", "place_id"],
      });

      autocomplete.addListener("place_changed", async () => {
        const p = autocomplete.getPlace();
        if (!p || !p.geometry || !p.geometry.location) return;

        const loc = p.geometry.location;
        const dest = { lat: loc.lat(), lng: loc.lng() };
        destRef.current = dest;

        await fetchAndRenderBays(dest);
      });

      setLoadingMap(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Helpers: clear / markers / InfoWindow ===== */
  const clearMarkers = () => {
    markersRef.current.forEach((m) => (m.setMap ? m.setMap(null) : (m.map = null)));
    markersRef.current = [];
    markerByIdRef.current.clear();
    bayLabelByIdRef.current.clear();

    if (userLocMarkerRef.current?.setMap) {
      userLocMarkerRef.current.setMap(null);
      userLocMarkerRef.current = null;
    }
  };

  const clearRouteOnlyMarkers = () => {
    if (routeStartMarkerRef.current?.setMap) routeStartMarkerRef.current.setMap(null);
    if (routeEndMarkerRef.current?.setMap) routeEndMarkerRef.current.setMap(null);
    routeStartMarkerRef.current = null;
    routeEndMarkerRef.current = null;
  };

  const clearRoute = () => {
    const dr = directionsRendererRef.current;
    if (dr?.setMap) {
      dr.setMap(null);
      directionsRendererRef.current = null;
    }
    clearRouteOnlyMarkers();
    setRouteInfo(null);
  };

  const closeInfoWindow = () => {
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }
  };

  const openInfoWindowForBay = (bay, marker) => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map || !marker) return;

    closeInfoWindow();
    const label = bayLabelByIdRef.current.get(bay.id) || "";
    const iw = new google.maps.InfoWindow({
      content: `<div style="font-weight:700;color:#111827">${label ? `${label} — ` : ""}${bay.name}</div>`,
    });
    iw.open({ anchor: marker, map });
    infoWindowRef.current = iw;
  };

  /* ===== Marker factories ===== */
  const addDestinationMarker = (position) => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map) return;

    let marker;
    if (google.maps.marker?.AdvancedMarkerElement) {
      const el = document.createElement("div");
      el.style.padding = "6px 10px";
      el.style.background = "#06b6d4";
      el.style.color = "#031317";
      el.style.fontWeight = "800";
      el.style.borderRadius = "12px";
      el.style.boxShadow = "0 6px 16px rgba(0,0,0,.15)";
      el.style.transform = "translateY(-6px)";
      el.innerText = "Your Destination";
      marker = new google.maps.marker.AdvancedMarkerElement({ map, position, content: el });
    } else {
      marker = new google.maps.Marker({
        map,
        position,
        label: { text: "Dest", color: "#06b6d4", fontWeight: "800" },
      });
    }
    markersRef.current.push(marker);
  };

  const addUserLocationMarker = (position) => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map) return;

    if (userLocMarkerRef.current?.setMap) {
      userLocMarkerRef.current.setMap(null);
      userLocMarkerRef.current = null;
    }

    let marker;
    if (google.maps.marker?.AdvancedMarkerElement) {
      const el = document.createElement("div");
      el.style.padding = "6px 10px";
      el.style.background = "#34d399";
      el.style.color = "#052e1c";
      el.style.fontWeight = "800";
      el.style.borderRadius = "12px";
      el.style.boxShadow = "0 6px 16px rgba(0,0,0,.15)";
      el.style.transform = "translateY(-6px)";
      el.innerText = "You";
      marker = new google.maps.marker.AdvancedMarkerElement({ map, position, content: el });
    } else {
      marker = new google.maps.Marker({
        map,
        position,
        label: { text: "You", color: "#34d399", fontWeight: "800" },
      });
    }
    userLocMarkerRef.current = marker;
    markersRef.current.push(marker);
  };

  const addStartEndMarkers = (origin, destination) => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map) return;

    clearRouteOnlyMarkers();

    // Start marker
    let startMarker;
    if (google.maps.marker?.AdvancedMarkerElement) {
      const el = document.createElement("div");
      el.style.padding = "6px 10px";
      el.style.background = "#2563eb";
      el.style.color = "#eaf2ff";
      el.style.fontWeight = "800";
      el.style.borderRadius = "12px";
      el.style.boxShadow = "0 6px 16px rgba(0,0,0,.15)";
      el.style.transform = "translateY(-6px)";
      el.innerText = "Start";
      startMarker = new google.maps.marker.AdvancedMarkerElement({ map, position: origin, content: el, title: "Start" });
    } else {
      startMarker = new google.maps.Marker({
        map,
        position: origin,
        title: "Start",
        label: { text: "S", color: "#2563eb", fontWeight: "800" },
      });
    }

    // End marker
    let endMarker;
    if (google.maps.marker?.AdvancedMarkerElement) {
      const el = document.createElement("div");
      el.style.padding = "6px 10px";
      el.style.background = "#ef4444";
      el.style.color = "#fff5f5";
      el.style.fontWeight = "800";
      el.style.borderRadius = "12px";
      el.style.boxShadow = "0 6px 16px rgba(0,0,0,.15)";
      el.style.transform = "translateY(-6px)";
      el.innerText = "End";
      endMarker = new google.maps.marker.AdvancedMarkerElement({ map, position: destination, content: el, title: "End" });
    } else {
      endMarker = new google.maps.Marker({
        map,
        position: destination,
        title: "End",
        label: { text: "E", color: "#ef4444", fontWeight: "800" },
      });
    }

    routeStartMarkerRef.current = startMarker;
    routeEndMarkerRef.current = endMarker;
  };

  const addBayMarker = (bay, label) => {
    if (!hasLatLng(bay)) return; // skip invalid coords

    const google = window.google;
    const map = mapRef.current;
    if (!google || !map) return;

    bayLabelByIdRef.current.set(bay.id, label);

    let marker;
    if (google.maps.marker?.AdvancedMarkerElement) {
      const el = document.createElement("div");
      el.style.padding = "6px 10px";
      el.style.background = "#111827";
      el.style.color = "#fff";
      el.style.fontWeight = "700";
      el.style.borderRadius = "10px";
      el.style.boxShadow = "0 4px 12px rgba(0,0,0,.15)";
      el.style.transform = "translateY(-6px)";
      el.innerText = `Parking Bay ${label}`;
      marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: bay.lat, lng: bay.lng },
        content: el,
        title: `${label} — ${bay.name}`,
      });
    } else {
      marker = new google.maps.Marker({
        map,
        position: { lat: bay.lat, lng: bay.lng },
        label: { text: `Bay ${label}`, fontWeight: "700" },
        title: `${label} — ${bay.name}`,
      });
    }

    markersRef.current.push(marker);
    markerByIdRef.current.set(bay.id, marker);

    if (marker.addListener) {
      marker.addListener("click", () => {
        onSelectBay(bay);
        openInfoWindowForBay(bay, marker);
      });
    }
  };

  /* ===== Directions ===== */
  const drawDrivingRoute = async (origin, destination) => {
    if (!hasLatLng(origin) || !hasLatLng(destination)) {
      setError("Invalid coordinates for routing.");
      return;
    }

    const google = window.google;
    const map = mapRef.current;
    if (!google || !map) return;
    clearRoute();

    const service = new google.maps.DirectionsService();
    const result = await service.route({
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
    });

    // Suppress default A/B markers so we can place "Start"/"End"
    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: false,
    });
    renderer.setDirections(result);
    directionsRendererRef.current = renderer;

    // Place custom Start/End markers
    addStartEndMarkers(origin, destination);

    const leg = result.routes[0].legs[0];
    setRouteInfo({
      distanceText: leg.distance?.text ?? "-",
      durationText: leg.duration?.text ?? "-",
    });
  };

  /* ===== Geolocation (Promise wrapper) ===== */
  function getUserLocation(options = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        options
      );
    });
  }

  /* ===== Backend calls ===== */

  // ac2.1 兼容 { bayId, lat, lon } / { id, lat, lng } / { latitude, longitude } 等
  async function apiFetchBays(near) {
    const qs = new URLSearchParams();
    if (near) qs.set("near", `${near.lat},${near.lng}`);
    qs.set("onlyAvailable", "true");
    qs.set("radius", String(DEFAULT_RADIUS));
    const url = `${API_BASE}/api/parking?${qs.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.json();               // 可能是 [] 或 [{ bayId, lat, lon, ... }]
    if (!Array.isArray(raw)) throw new Error("Invalid payload");

    const normalized = raw
      .map((x, i) => {
        const id = x.id ?? x.bayId ?? i + 1;
        const name = x.name || x.title || `Bay ${String.fromCharCode(65 + i)}`;
        const lat = toNum(x.lat ?? x.latitude);
        const lng = toNum(x.lng ?? x.lon ?? x.longitude); // 关键：兼容 lon
        return { id, name, lat, lng };
      })
      .filter(hasLatLng);                       // 过滤无效坐标

    return normalized;                           // 可能是 []
  }

  // ac2.3 兼容只有 { unoccupied } 的历史行
  async function apiFetchBayHistoryLatest(bayId) {
    const url = `${API_BASE}/api/bays/${bayId}/history`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("Empty history");

    const last = rows[rows.length - 1];

    const hasOccupied = typeof last.occupiedPercent === "number";
    const unoccupied =
      typeof last.unoccupied === "boolean"
        ? last.unoccupied
        : hasOccupied
        ? (100 - last.occupiedPercent) >= 50
        : false;

    const occupiedPercent = hasOccupied ? last.occupiedPercent : (unoccupied ? 0 : 100);
    const availabilityPercent = Math.max(0, Math.min(100, 100 - occupiedPercent));

    return {
      timestamp: last.timestamp || new Date().toISOString(),
      occupiedPercent,
      availabilityPercent,
      unoccupied,
    };
  }

  /* ===== Local mock data (only for backend errors) ===== */
  function mockBays(center) {
    const c = center || { lat: -37.8106, lng: 144.9625 };
    return [
      { id: 101, name: "Bay A", lat: c.lat, lng: c.lng },
      { id: 102, name: "Bay B", lat: c.lat + 0.0006, lng: c.lng + 0.0025 },
      { id: 103, name: "Bay C", lat: c.lat - 0.0008, lng: c.lng - 0.0015 },
      { id: 104, name: "Bay D", lat: c.lat + 0.0014, lng: c.lng + 0.0010 },
    ];
  }

  function mockLatest() {
    const occupiedPercent = Math.floor(60 + Math.random() * 40); // 60–99
    return {
      timestamp: new Date().toISOString(),
      occupiedPercent,
      unoccupied: occupiedPercent < 50,
    };
  }

  /* ===== Core flow: fetch and render bays ===== */
  async function fetchAndRenderBays(dest) {
    if (!dest) {
      clearRoute();
      clearMarkers();
      closeInfoWindow();
      setBays([]);
      setSelectedBay(null);
      setBayStatus(null);
      setError("");
      return;
    }

    setFetching(true);
    setError("");
    setSelectedBay(null);
    setBayStatus(null);
    clearRoute();
    closeInfoWindow();

    try {
      clearMarkers();
      addDestinationMarker(dest);

      let list = [];
      try {
        list = await apiFetchBays(dest); // normalized & filtered already
      } catch {
        setError("Backend unavailable. Using mock bays around your destination.");
        list = mockBays(dest);
      }

      // If list is empty, show empty state (no mock in this case)
      if (Array.isArray(list) && list.length === 0) {
        setBays([]);
        const map = mapRef.current;
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(new window.google.maps.LatLng(dest.lat, dest.lng));
        if (!bounds.isEmpty()) map.fitBounds(bounds);
        return;
      }

      // Normal render
      const map = mapRef.current;
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(new window.google.maps.LatLng(dest.lat, dest.lng));

      setBays(list);
      list.forEach((b, i) => {
        const label = String.fromCharCode(65 + i); // A/B/C...
        addBayMarker(b, label);
        if (hasLatLng(b)) bounds.extend(new window.google.maps.LatLng(b.lat, b.lng));
      });

      if (!bounds.isEmpty()) map.fitBounds(bounds);
    } finally {
      setFetching(false);
    }
  }

  /* ===== Bay selection ===== */
  async function onSelectBay(bay) {
    if (!bay) return;

    if (!hasLatLng(bay)) {
      setSelectedBay(bay?.name || "Unknown bay");
      setError("This bay has invalid coordinates.");
      return;
    }

    setSelectedBay(bay.name);

    // Keep camera aligned and show name bubble
    const map = mapRef.current;
    const marker = markerByIdRef.current.get(bay.id);
    if (marker && map) {
      if (marker.getPosition) map.panTo(marker.getPosition());
      else if (marker.position) map.panTo(marker.position);
      openInfoWindowForBay(bay, marker);
    }

    // Try routing from user's current location; fallback to searched destination.
    let routed = false;
    try {
      if (!userLocRef.current) {
        const loc = await getUserLocation();
        userLocRef.current = loc;
        addUserLocationMarker(loc);
      }
      await drawDrivingRoute(userLocRef.current, { lat: bay.lat, lng: bay.lng });
      routed = true;
    } catch {
      if (destRef.current) {
        setError("Could not access your location. Routing from the searched destination instead.");
        try {
          await drawDrivingRoute(destRef.current, { lat: bay.lat, lng: bay.lng });
          routed = true;
        } catch {/* ignore */}
      } else {
        setError("Could not access your location, and no destination is set.");
      }
    }

    // Status
    try {
      const latest = await apiFetchBayHistoryLatest(bay.id);
      setBayStatus(latest);
    } catch {
      const m = mockLatest();
      const availabilityPercent = Math.max(0, Math.min(100, 100 - m.occupiedPercent));
      setBayStatus({
        occupiedPercent: m.occupiedPercent,
        availabilityPercent,
        unoccupied: m.unoccupied,
        timestamp: m.timestamp,
      });
      setError((e) => e || "History API unavailable. Showing mock status.");
    }

    if (!routed) clearRoute();
  }

  /* ===== Refresh ===== */
  const onRefresh = () => fetchAndRenderBays(destRef.current);

  /* ===== UI ===== */
  const hasDestination = !!destRef.current;

  return (
    <div style={{ background: "#f5f6fa", minHeight: "calc(100vh - 60px)", padding: 28, marginTop: 60 }}>
      {/* Toolbar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <input
          id="search-box"
          type="text"
          placeholder="Search for a location"
          aria-label="Search for a destination"
          style={{ width: "100%", padding: "14px 16px", fontSize: 16, border: "1px solid #d1d5db", borderRadius: 12, background: "#fff" }}
        />
        <button
          onClick={onRefresh}
          disabled={loadingMap || fetching || !hasDestination}
          style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 700, minWidth: 110, opacity: hasDestination ? 1 : 0.6 }}
        >
          {fetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {(loadingMap || error) && (
        <div style={{ marginBottom: 10, fontSize: 14, color: error ? "#b45309" : "#6b7280" }}>
          {loadingMap ? "Loading map…" : error}
        </div>
      )}

      {/* Map */}
      <div id="map" style={{ width: "100%", height: 360, borderRadius: 16, marginBottom: 26, boxShadow: "0 8px 24px rgba(0,0,0,.08)", background: "#e5e7eb" }} />

      {/* Bay list */}
      {hasDestination && (
        <div style={{ background: "#fff", padding: 20, borderRadius: 16, marginBottom: 18, border: "1px solid #e5e7eb", boxShadow: "0 6px 18px rgba(0,0,0,.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontWeight: 800, fontSize: 18, color: "#111827" }}>Available Parking Bays</h3>
            {bays.length > 0 && (
              <span style={{ fontSize: 13, color: "#374151", background: "#eef2ff", border: "1px solid #e5e7eb", padding: "4px 8px", borderRadius: 8 }}>
                {bays.length} result{bays.length > 1 ? "s" : ""} (±{DEFAULT_RADIUS}m)
              </span>
            )}
          </div>

          <div style={{ ...gridContainerStyle, ...gridScrollable(bays.length) }}>
            {fetching && bays.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Loading nearby bays…</div>
            ) : bays.length === 0 ? (
              <div style={{ color: "#6b7280" }}>No parking bays nearby.</div>
            ) : (
              bays.map((bay, i) => {
                const label = String.fromCharCode(65 + i); // A/B/C...
                return (
                  <button
                    key={bay.id}
                    onClick={() => onSelectBay(bay)}
                    title={`${label} — ${bay.name}`}
                    style={bayCardBase(selectedBay === bay.name)}
                  >
                    {label} — {bay.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Status panel */}
      {hasDestination && (
        <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 6px 18px rgba(0,0,0,.05)" }}>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontWeight: 800, color: "#111827" }}>
            {selectedBay ? "Status" : "Select a Parking Bay"}
          </h3>
          {selectedBay && (
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#111827" }}>
              {selectedBay}
            </div>
          )}

          {selectedBay && bayStatus ? (
            <>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <Badge label="Occupied %" value={`${bayStatus.occupiedPercent}%`} tone={bayStatus.occupiedPercent >= 50 ? "danger" : "ok"} />
                <Badge label="Availability %" value={`${bayStatus.availabilityPercent}%`} tone={bayStatus.availabilityPercent >= 50 ? "ok" : "danger"} />
                <Badge label="State" value={bayStatus.unoccupied ? "Available" : "Occupied"} tone={bayStatus.unoccupied ? "ok" : "danger"} />
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Updated at {new Date(bayStatus.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {routeInfo && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge label="Driving distance" value={routeInfo.distanceText} tone="ok" />
                  <Badge label="ETA" value={routeInfo.durationText} tone="ok" />
                </div>
              )}
            </>
          ) : selectedBay ? (
            <div style={{ color: "#6b7280" }}>Loading latest status…</div>
          ) : (
            <div style={{ color: "#6b7280" }}>Choose a bay to see its status and route.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Small presentational helper ===== */
function Badge({ label, value, tone = "ok" }) {
  const bg = tone === "ok" ? "#ecfdf5" : "#fef2f2";
  const bd = tone === "ok" ? "#10b981" : "#ef4444";
  const fg = tone === "ok" ? "#065f46" : "#7f1d1d";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 12, background: bg, border: `1px solid ${bd}`, color: fg }}>
      <strong>{label}:</strong> {value}
    </div>
  );
}
