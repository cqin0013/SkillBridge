// src/pages/Conclusion.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "chart.js/auto";

/**
 * Conclusion (Insights)
 * - Fetches two series (ac1.1 car-ownership, ac1.2 CBD population)
 * - Renders two line charts with basic KPIs (YoY, CAGR)
 * - Graceful fallback to local mock data if backend is unavailable
 * - English comments, simple structure, consistent formatting
 */

/* -------------------- Config & utilities (module scope) -------------------- */

const API_BASE = "http://localhost:3000"; // ← change to your backend if needed

function sliceByWindow(labels, data, win) {
  if (win === "all") return { labels, data };
  const n = win === "5y" ? 5 : 10;
  return { labels: labels.slice(-n), data: data.slice(-n) };
}

function cagr(start, end, years) {
  if (start <= 0 || years <= 0) return 0;
  return Math.pow(end / start, 1 / years) - 1;
}

function fmtPct(x) {
  if (x == null || Number.isNaN(x)) return "—";
  return (x * 100).toFixed(1) + "%";
}

/* ------------------------------- Component -------------------------------- */

export default function Conclusion() {
  // Remote data
  const [carData, setCarData] = useState({ labels: [], data: [] }); // ac1.1
  const [popData, setPopData] = useState({ labels: [], data: [] }); // ac1.2
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // View windows
  const [winCar, setWinCar] = useState("all"); // all | 10y | 5y
  const [winPop, setWinPop] = useState("all");

  // Chart refs (never query DOM by id)
  const carCanvasRef = useRef(null);
  const popCanvasRef = useRef(null);
  const carChartRef = useRef(null);
  const popChartRef = useRef(null);

  // Fetch once on mount; fallback to mock on failure
  useEffect(() => {
    const abort = new AbortController();

    async function load() {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`${API_BASE}/api/metrics/car-ownership`, { signal: abort.signal }),
          fetch(`${API_BASE}/api/metrics/cbd-population`, { signal: abort.signal }),
        ]);
        if (!r1.ok || !r2.ok) throw new Error("HTTP error");

        const carJson = await r1.json();
        const popJson = await r2.json();

        // Expect:
        // ac1.1  -> { series: [{ year, value }] }
        // ac1.2  -> { series: [{ year, population }] }
        setCarData({
          labels: carJson.series.map((s) => String(s.year)),
          data: carJson.series.map((s) => Number(s.value)),
        });
        setPopData({
          labels: popJson.series.map((s) => String(s.year)),
          data: popJson.series.map((s) => Number(s.population)),
        });
        setError("");
      } catch {
        // Fallback (kept small/simple for presentation)
        setError("Backend unavailable — showing mock data.");
        setCarData({
          labels: ["2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021"],
          data:   [320,   324,   325,   329,   333,   334,   338,   342,   343,   347,   351],
        });
        setPopData({
          labels: ["2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021"],
          data:   [ 9616, 10267, 11316, 12902, 14670, 16097, 16976, 17601, 18501, 19952, 21723, 23289, 24500, 25890, 27450, 29100, 30800, 32550, 33900, 35200, 36500 ],
        });
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => abort.abort();
  }, []);

  // Derived views
  const carView = useMemo(() => sliceByWindow(carData.labels, carData.data, winCar), [carData, winCar]);
  const popView = useMemo(() => sliceByWindow(popData.labels, popData.data, winPop), [popData, winPop]);

  // KPIs
  const carLatest = carView.data.at(-1);
  const carPrev = carView.data.at(-2);
  const carYoY = carPrev ? (carLatest - carPrev) / carPrev : 0;
  const carCagr = carView.data.length > 1 ? cagr(carView.data[0], carLatest, carView.data.length - 1) : 0;

  const popLatest = popView.data.at(-1);
  const popPrev = popView.data.at(-2);
  const popYoY = popPrev ? (popLatest - popPrev) / popPrev : 0;
  const popCagr = popView.data.length > 1 ? cagr(popView.data[0], popLatest, popView.data.length - 1) : 0;

  // Build/refresh charts when view data changes
  useEffect(() => {
    if (!carCanvasRef.current || carView.labels.length === 0) return;
    if (carChartRef.current) carChartRef.current.destroy();

    carChartRef.current = new Chart(carCanvasRef.current, {
      type: "line",
      data: {
        labels: carView.labels,
        datasets: [
          {
            label: "Passenger vehicles per 1,000 residents",
            data: carView.data,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,.12)",
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true, position: "bottom" } },
        scales: {
          y: { title: { display: true, text: "per 1,000 residents" } },
          x: { title: { display: true, text: "Year" } },
        },
      },
    });

    return () => carChartRef.current?.destroy();
  }, [carView]);

  useEffect(() => {
    if (!popCanvasRef.current || popView.labels.length === 0) return;
    if (popChartRef.current) popChartRef.current.destroy();

    popChartRef.current = new Chart(popCanvasRef.current, {
      type: "line",
      data: {
        labels: popView.labels,
        datasets: [
          {
            label: "CBD resident population",
            data: popView.data,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,.12)",
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true, position: "bottom" } },
        scales: {
          y: { title: { display: true, text: "people" }, beginAtZero: true },
          x: { title: { display: true, text: "Year" } },
        },
      },
    });

    return () => popChartRef.current?.destroy();
  }, [popView]);

  // Export helpers
  const exportPng = (which) => {
    const chart = which === "car" ? carChartRef.current : popChartRef.current;
    if (!chart) return;
    const a = document.createElement("a");
    a.href = chart.toBase64Image();
    a.download = which === "car" ? "car_ownership.png" : "population.png";
    a.click();
  };

  /* --------------------------------- Render -------------------------------- */

  return (
    <main style={{ background: "#f5f6fa", minHeight: "calc(100vh - 60px)", padding: 24, marginTop: 60 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 }}>
            City of Melbourne — Insights
          </h1>
          <p style={{ color: "#6b7280", marginTop: 6 }}>Key indicators, trends, and quick takeaways.</p>
          {loading && <div style={{ color: "#6b7280", marginTop: 6 }}>Loading metrics…</div>}
          {!loading && error && <div style={{ color: "#b45309", marginTop: 6 }}>{error}</div>}
        </header>

        {/* Car KPIs */}
        <KpiRow>
          <KpiCard title="Vehicles / 1k (latest)" value={carLatest?.toLocaleString() ?? "—"} hint={windowHint(carData.labels, winCar)} />
          <KpiCard title="Car YoY(Year of Year)" value={fmtPct(carYoY)} tone={carYoY >= 0 ? "up" : "down"} />
          <KpiCard title="Car CAGR(Compound Annual Growth Rate)" value={fmtPct(carCagr)} tone={carCagr >= 0 ? "up" : "down"} />
        </KpiRow>

        {/* Car chart */}
        <Card>
          <CardHeader
            title="Car Ownership Growth"
            right={
              <>
                <Select value={winCar} onChange={(e) => setWinCar(e.target.value)} options={[
                  { value: "all", label: "All years" },
                  { value: "10y", label: "Last 10y" },
                  { value: "5y", label: "Last 5y" },
                ]} />
                <GhostButton onClick={() => exportPng("car")}>Export PNG</GhostButton>
              </>
            }
          />
          <p style={{ margin: "8px 0 12px", color: "#4b5563" }}>
            Latest <strong>{carLatest?.toLocaleString() ?? "—"}</strong> per 1k residents; YoY  <strong>{fmtPct(carYoY)}</strong>; CAGR <strong>{fmtPct(carCagr)}</strong>.
          </p>
          <canvas ref={carCanvasRef} style={{ width: "100%", maxHeight: 420 }} />
          <Source>
            Australian Bureau of Statistics (ABS) 2021, <em>Motor Vehicle Census, Australia — Methodology</em>,&nbsp;
          </Source>
        </Card>

        {/* Population KPIs */}
        <KpiRow>
          <KpiCard title="Population (latest)" value={popLatest?.toLocaleString() ?? "—"} hint={windowHint(popData.labels, winPop)} />
          <KpiCard title="Population YoY(Year of Year)" value={fmtPct(popYoY)} tone={popYoY >= 0 ? "up" : "down"} />
          <KpiCard title="Population CAGR(Compound Annual Growth Rate)" value={fmtPct(popCagr)} tone={popCagr >= 0 ? "up" : "down"} />
        </KpiRow>

        {/* Population chart */}
        <Card>
          <CardHeader
            title="CBD Population Growth"
            right={
              <>
                <Select value={winPop} onChange={(e) => setWinPop(e.target.value)} options={[
                  { value: "all", label: "All years" },
                  { value: "10y", label: "Last 10y" },
                  { value: "5y", label: "Last 5y" },
                ]} />
                <GhostButton onClick={() => exportPng("pop")}>Export PNG</GhostButton>
              </>
            }
          />
          <p style={{ margin: "8px 0 12px", color: "#4b5563" }}>
            Latest population <strong>{popLatest?.toLocaleString() ?? "—"}</strong>; YoY <strong>{fmtPct(popYoY)}</strong>; CAGR <strong>{fmtPct(popCagr)}</strong>.
          </p>
          <canvas ref={popCanvasRef} style={{ width: "100%", maxHeight: 420 }} />
          <Source>
            Australian Bureau of Statistics (ABS) 2021, <em>Regional Population</em> (dataset 3218.0, 2001–2021),&nbsp;
          </Source>
        </Card>
      </div>
    </main>
  );
}

/*Small components*/

function KpiRow({ children }) {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
      {children}
    </section>
  );
}

function KpiCard({ title, value, hint, tone }) {
  const toneColor = tone === "up" ? "#16a34a" : tone === "down" ? "#dc2626" : "#111827";
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: toneColor }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Card({ children }) {
  return (
    <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, marginBottom: 12 }}>
      {children}
    </section>
  );
}

function CardHeader({ title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>{title}</h2>
      <div style={{ display: "flex", gap: 8 }}>{right}</div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff" }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function GhostButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>
      {children}
    </button>
  );
}

function Source({ children }) {
  return (
    <div style={{ fontSize: 12, color: "#6b7280", textAlign: "right", marginTop: 10 }}>Source: {children}</div>
  );
}

/* Tiny helper for hint */

function windowHint(labels, win) {
  if (!labels?.length) return "";
  if (win === "all") return `${labels[0]}–${labels.at(-1)}`;
  return `last ${win === "5y" ? 5 : 10} years`;
}
