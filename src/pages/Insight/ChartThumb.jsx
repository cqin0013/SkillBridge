// src/pages/Insight/ChartThumb.jsx
import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import { Link } from "react-router-dom";

const API_BASE = "https://fit-8mtq.onrender.com";

/**
 * 在卡片里渲染一个小号 Chart.js 做缩略图：
 * - canvas 始终渲染（保证能拿到 context）
 * - 第一段 effect 只负责取数
 * - 第二段 effect 在 canvas 存在 + 数据就绪时再创建图表
 */
export default function ChartThumb({ type, title, sub, to }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const [labels, setLabels] = useState([]);
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 1) 取数据
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr("");
        setLabels([]);
        setValues([]);

        const url =
          type === "ownership"
            ? `${API_BASE}/api/metrics/car-ownership`
            : `${API_BASE}/api/metrics/cbd-population`;

        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;

        setLabels(j.series.map((s) => String(s.year)));
        setValues(
          type === "ownership"
            ? j.series.map((s) => Number(s.value))
            : j.series.map((s) => Number(s.population))
        );
      } catch {
        if (alive) setErr("Failed to load preview.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [type]);

  // 2) 渲染图表（确保 canvas 已挂载 + 有数据）
  useEffect(() => {
    if (loading) return;
    if (!canvasRef.current) return;
    if (labels.length === 0 || values.length === 0) return;

    // 销毁旧实例
    if (chartRef.current) chartRef.current.destroy();

    // 用 requestAnimationFrame 确保 DOM 布局完成
    const id = requestAnimationFrame(() => {
      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              data: values,
              borderColor: type === "ownership" ? "#6366f1" : "#22c55e",
              backgroundColor:
                type === "ownership"
                  ? "rgba(99,102,241,.12)"
                  : "rgba(34,197,94,.12)",
              tension: 0.35,
              pointRadius: 0,
              borderWidth: 2,
              fill: true,
            },
          ],
        },
        options: {
          animation: false,
          responsive: true,
          maintainAspectRatio: false, // 由容器高度控制
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { display: false } },
        },
      });
    });

    return () => {
      cancelAnimationFrame(id);
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [loading, labels, values, type]);

  return (
    <Link to={to} className="img-card" aria-label={`Open ${title}`}>
      <div className="thumb-canvas-wrap">
        {/* ⚠️ canvas 永远渲染在 DOM，避免拿不到 context */}
        <canvas ref={canvasRef} className="thumb-canvas" />
        {(loading || err) && (
          <div className="thumb-skeleton">{err || "Loading…"}</div>
        )}
      </div>

      <div className="img-overlay">
        <h3 className="img-title">{title}</h3>
        <p className="img-sub">{sub}</p>
      </div>
    </Link>
  );
}
