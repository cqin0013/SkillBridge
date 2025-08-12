import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

/**
 * Search page — user-selectable radius + backend + normalization + directions
 *
 * Backend contract:
 *   /api/parking → [{ bayId, unoccupied, lat, lon, timestamp, name? }, ...]
 *   (lon is mapped to lng; bayId mapped to id)
 *
 * Status panel shows:
 *   - Availability (no percentage, just available/unavailable)
 *   - Prediction: available   (mock)
 *   - History: available (mock)
 *   - Driving distance, ETA
 * New: user can choose route origin — Destination (default) or My location.
 */

export default function Search() {
  /*  Configuration */
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const API_BASE = "https://fit-8mtq.onrender.com";

  /* State / Refs  */
  const [bays, setBays] = useState([]);            // [{id,name,lat,lng,unoccupied,timestamp}]
  const [loadingMap, setLoadingMap] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const [selectedBayName, setSelectedBayName] = useState(null);
  const [selectedBayObj, setSelectedBayObj] = useState(null); // keep the object for redraws
  const [availability, setAvailability] = useState(null);     // "available" | "unavailable" | null
  const [updatedAt, setUpdatedAt] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // user-selectable radius (meters)
  const [radius, setRadius] = useState(300);

  // route origin: "destination" | "mylocation"
  const [routeOrigin, setRouteOrigin] = useState("destination");

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const markerByIdRef = useRef(new Map());
  const bayLabelByIdRef = useRef(new Map());
  const destRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const infoWindowRef = useRef(null);

  const userLocRef = useRef(null);
  const userLocMarkerRef = useRef(null);
  const routeStartMarkerRef = useRef(null);
  const routeEndMarkerRef = useRef(null);

  const defaultCenter = { lat: -37.8136, lng: 144.9631 };

  /*  Helpers: validation  */
  const toNum = (v) => (v === "" || v === null || v === undefined ? NaN : Number(v));
  const isFiniteNum = (n) => typeof n === "number" && Number.isFinite(n);
  const isLat = (n) => isFiniteNum(n) && n >= -90 && n <= 90;
  const isLng = (n) => isFiniteNum(n) && n >= -180 && n <= 180;
  const hasLatLng = (o) => o && isLat(o.lat) && isLng(o.lng);

  /*  Styles: bay list grid  */
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

  /* Init map + Places Autocomplete */
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

  /* Clear helpers */
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

  /* Map markers */
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
    // Start
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
      startMarker = new google.maps.Marker({ map, position: origin, title: "Start", label: { text: "S", color: "#2563eb", fontWeight: "800" } });
    }
    // End
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
      endMarker = new google.maps.Marker({ map, position: destination, title: "End", label: { text: "E", color: "#ef4444", fontWeight: "800" } });
    }
    routeStartMarkerRef.current = startMarker;
    routeEndMarkerRef.current = endMarker;
  };

  const openInfoWindowForBay = (bay, marker) => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map || !marker) return;
    if (infoWindowRef.current) infoWindowRef.current.close();
    const label = bayLabelByIdRef.current.get(bay.id) || "";
    const iw = new google.maps.InfoWindow({
      content: `<div style="font-weight:700;color:#111827">${label ? `${label} — ` : ""}${bay.name}</div>`,
    });
    iw.open({ anchor: marker, map });
    infoWindowRef.current = iw;
  };

  const addBayMarker = (bay, label) => {
    if (!hasLatLng(bay)) return;
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

  /* Directions */
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

    const renderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      preserveViewport: false,
    });
    renderer.setDirections(result);
    directionsRendererRef.current = renderer;

    addStartEndMarkers(origin, destination);

    const leg = result.routes[0].legs[0];
    setRouteInfo({
      distanceText: leg.distance?.text ?? "-",
      durationText: leg.duration?.text ?? "-",
    });
  };

  /* Geolocation */
  function getUserLocation(options = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("Geolocation is not supported by this browser."));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        options
      );
    });
  }

  /* Backend: /api/parking */
  async function apiFetchBays(near, customRadius) {
    const radiusToUse = Math.max(50, Math.min(5000, Number(customRadius) || 300)); // clamp 50–5000m
    const qs = new URLSearchParams();
    if (near) qs.set("near", `${near.lat},${near.lng}`);
    qs.set("onlyAvailable", "true");
    qs.set("radius", String(radiusToUse));
    const url = `${API_BASE}/api/parking?${qs.toString()}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.json();
    if (!Array.isArray(raw)) throw new Error("Invalid payload");

    const normalized = raw
      .map((x, i) => {
        const id = x.id ?? x.bayId ?? i + 1;
        const name = x.name || x.title || `Bay ${String.fromCharCode(65 + i)}`;
        const lat = toNum(x.lat);
        const lng = toNum(x.lng ?? x.lon); // compat: lon → lng
        const unoccupied = typeof x.unoccupied === "boolean" ? x.unoccupied : null;
        const timestamp = x.timestamp ?? null;
        return { id, name, lat, lng, unoccupied, timestamp };
      })
      .filter(hasLatLng);

    return normalized; // may be []
  }

  /* Fetch + render */
  async function fetchAndRenderBays(dest) {
    if (!dest) {
      clearRoute();
      clearMarkers();
      closeInfoWindow();
      setBays([]);
      setSelectedBayName(null);
      setSelectedBayObj(null);
      setAvailability(null);
      setUpdatedAt(null);
      setError("");
      return;
    }

    setFetching(true);
    setError("");
    setSelectedBayName(null);
    setSelectedBayObj(null);
    setAvailability(null);
    setUpdatedAt(null);
    clearRoute();
    closeInfoWindow();

    try {
      clearMarkers();
      addDestinationMarker(dest);

      let list = [];
      try {
        list = await apiFetchBays(dest, radius);
      } catch {
        setError("Backend unavailable.");
        list = [];
      }

      if (Array.isArray(list) && list.length === 0) {
        setBays([]);
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(new window.google.maps.LatLng(dest.lat, dest.lng));
        const map = mapRef.current;
        if (!bounds.isEmpty() && map) map.fitBounds(bounds);
        return;
      }

      const map = mapRef.current;
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(new window.google.maps.LatLng(dest.lat, dest.lng));

      setBays(list);
      list.forEach((b, i) => {
        const label = String.fromCharCode(65 + i);
        addBayMarker(b, label);
        if (hasLatLng(b)) bounds.extend(new window.google.maps.LatLng(b.lat, b.lng));
      });

      if (!bounds.isEmpty() && map) map.fitBounds(bounds);
    } finally {
      setFetching(false);
    }
  }

  /* Route from chosen origin (helper) */
  async function routeToBay(bay) {
    if (!bay || !hasLatLng(bay)) return;

    if (routeOrigin === "destination") {
      if (!destRef.current) {
        setError("No destination set yet. Please search a place first.");
        return;
      }
      try {
        await drawDrivingRoute(destRef.current, { lat: bay.lat, lng: bay.lng });
      } catch {
        setError("Routing from destination failed.");
      }
      return;
    }

    // routeOrigin === "mylocation"
    try {
      if (!userLocRef.current) {
        const loc = await getUserLocation();
        userLocRef.current = loc;
        addUserLocationMarker(loc);
      }
      await drawDrivingRoute(userLocRef.current, { lat: bay.lat, lng: bay.lng });
    } catch {
      setError("Could not access your location (permission or signal).");
    }
  }

  /* Select bay */
  async function onSelectBay(bay) {
    if (!bay) return;
    if (!hasLatLng(bay)) {
      setSelectedBayName(bay?.name || "Unknown bay");
      setSelectedBayObj(bay);
      setError("This bay has invalid coordinates.");
      return;
    }

    setSelectedBayName(bay.name);
    setSelectedBayObj(bay);

    const map = mapRef.current;
    const marker = markerByIdRef.current.get(bay.id);
    if (marker && map) {
      if (marker.getPosition) map.panTo(marker.getPosition());
      else if (marker.position) map.panTo(marker.position);
      openInfoWindowForBay(bay, marker);
    }

    // Availability as text (no %)
    if (typeof bay.unoccupied === "boolean") {
      setAvailability(bay.unoccupied ? "available" : "unavailable");
      setUpdatedAt(bay.timestamp || new Date().toISOString());
    } else {
      setAvailability(null);
      setUpdatedAt(null);
    }

    // Route according to user choice
    await routeToBay(bay);
  }

  /* Re-draw route when user changes origin option */
  useEffect(() => {
    if (!selectedBayObj) return;
    clearRoute();
    routeToBay(selectedBayObj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOrigin]);

  /* Refresh */
  const onRefresh = () => fetchAndRenderBays(destRef.current);

  /* UI */
  const hasDestination = !!destRef.current;

  // radius input
  const onRadiusInput = (e) => setRadius(e.target.value);
  const onApplyRadius = () => { if (destRef.current) fetchAndRenderBays(destRef.current); };

  // route origin handlers
  const setOriginDestination = () => setRouteOrigin("destination");
  const setOriginMyLocation = () => setRouteOrigin("mylocation");

  const originBtnStyle = (active) => ({
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${active ? "#111827" : "#d1d5db"}`,
    background: active ? "#111827" : "#fff",
    color: active ? "#fff" : "#111827",
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <div style={{ background: "#f5f6fa", minHeight: "calc(100vh - 60px)", padding: 28, marginTop: 60 }}>
      {/* Toolbar (search + radius + origin + refresh) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <input
          id="search-box"
          type="text"
          placeholder="Search for a location"
          aria-label="Search for a destination"
          style={{ width: "90%", padding: "14px 16px", fontSize: 16, border: "1px solid #d1d5db", borderRadius: 12, background: "#fff" }}
        />

        {/* Radius */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="radius-input" style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>Radius:</label>
          <input
            id="radius-input"
            type="number"
            min={50}
            max={5000}
            step={50}
            value={radius}
            onChange={onRadiusInput}
            style={{ width: 100, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 10, background: "#fff" }}
          />
          <button
            onClick={onApplyRadius}
            disabled={loadingMap || fetching || !hasDestination}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #374151", background: "#374151", color: "#fff", fontWeight: 700 }}
          >
            Apply
          </button>
        </div>

        {/* Route origin */}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={setOriginDestination} style={originBtnStyle(routeOrigin === "destination")}>
            From: Destination
          </button>
          <button type="button" onClick={setOriginMyLocation} style={originBtnStyle(routeOrigin === "mylocation")}>
            From: My location
          </button>
        </div>

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
                {bays.length} result{bays.length > 1 ? "s" : ""} (±{Math.max(50, Math.min(5000, Number(radius) || 300))}m)
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
                const label = String.fromCharCode(65 + i);
                return (
                  <button
                    key={bay.id}
                    onClick={() => onSelectBay(bay)}
                    title={`${label} — ${bay.name}`}
                    style={bayCardBase(selectedBayName === bay.name)}
                  >
                    {label} — {bay.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Status panel — Availability (text) + Prediction + History + Distance/ETA */}
      {hasDestination && (
        <div style={{ background: "#fff", padding: 20, borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 6px 18px rgba(0,0,0,.05)" }}>
          <h3 style={{ marginTop: 0, marginBottom: 8, fontWeight: 800, color: "#111827" }}>
            {selectedBayName ? "Status" : "Select a Parking Bay"}
          </h3>
          {selectedBayName && (
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#111827" }}>
              {selectedBayName}
            </div>
          )}

          {selectedBayName ? (
            <>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                {availability && (
                  <Badge label="Availability" value={availability} tone={availability === "available" ? "ok" : "danger"} />
                )}
                {/* Mock add-ons as requested */}
                <Badge label="Prediction" value="available" tone="ok" />
                <Badge label="History" value="available in the past" tone="ok" />

                {routeInfo && (
                  <>
                    <Badge label="Driving distance" value={routeInfo.distanceText} tone="ok" />
                    <Badge label="ETA" value={routeInfo.durationText} tone="ok" />
                  </>
                )}
                {updatedAt && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Updated at {new Date(updatedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: "#6b7280" }}>Choose a bay to see availability and route.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* Small presentational helper */
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