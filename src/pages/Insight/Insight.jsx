// src/pages/Conclusion.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "chart.js/auto";

/**
 * Conclusion (Insights)
 * - Fetches two series (ac1.1 car-ownership, ac1.2 CBD population)
 * - Renders two line charts
 * - Graceful fallback to local mock data if backend is unavailable
 * - English comments, simple structure, consistent formatting
 */

const API_BASE = "https://fit-8mtq.onrender.com"; // ← change to your backend if needed

function sliceByWindow(labels, data, win) {
  if (win === "all") return { labels, data };
  const n = win === "5y" ? 5 : 10;
  return { labels: labels.slice(-n), data: data.slice(-n) };
}

export default function Conclusion() {
  const [carData, setCarData] = useState({ labels: [], data: [] });
  const [popData, setPopData] = useState({ labels: [], data: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [winCar, setWinCar] = useState("all");
  const [winPop, setWinPop] = useState("all");

  const carCanvasRef = useRef(null);
  const popCanvasRef = useRef(null);
  const carChartRef = useRef(null);
  const popChartRef = useRef(null);

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

  const carView = useMemo(() => sliceByWindow(carData.labels, carData.data, winCar), [carData, winCar]);
  const popView = useMemo(() => sliceByWindow(popData.labels, popData.data, winPop), [popData, winPop]);

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

  const exportPng = (which) => {
    const chart = which === "car" ? carChartRef.current : popChartRef.current;
    if (!chart) return;
    const a = document.createElement("a");
    a.href = chart.toBase64Image();
    a.download = which === "car" ? "car_ownership.png" : "population.png";
    a.click();
  };

  return (
    <main style={{ background: "#f5f6fa", minHeight: "calc(100vh - 60px)", padding: 24, marginTop: 60 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 }}>
            City of Melbourne — Insights
          </h1>
          <p style={{ color: "#6b7280", marginTop: 6 }}>Key indicators and trends.</p>
          {loading && <div style={{ color: "#6b7280", marginTop: 6 }}>Loading metrics…</div>}
          {!loading && error && <div style={{ color: "#b45309", marginTop: 6 }}>{error}</div>}
        </header>

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
          <canvas ref={carCanvasRef} style={{ width: "100%", maxHeight: 420 }} />
        </Card>

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
          <canvas ref={popCanvasRef} style={{ width: "100%", maxHeight: 420 }} />
        </Card>
      </div>
    </main>
  );
}

/* Small components */
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