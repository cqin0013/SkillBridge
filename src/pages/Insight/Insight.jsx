import "./Insight.css";
import ChartThumb from "./ChartThumb";
import DataInsight from "./DataInsight/DataInsight";

export default function Insight() {
  return (
    <main className="insight-page">
      <div className="insight-wrap">
        <header className="insight-header">
          <h1>Insights</h1>
          <p>Preview the charts below. Tap a card to view the full chart.</p>
        </header>

        {/* 顶部：两张缩略图（ChartThumb 使用后端数据实时渲染） */}
        <section className="insight-gallery" aria-label="Insight previews">
          <ChartThumb
            type="ownership"
            title="Car ownership"
            sub="Passenger vehicles per 1,000 residents."
            to="/insight/ownership"
          />
          <ChartThumb
            type="population"
            title="CBD population"
            sub="Resident population in Melbourne CBD."
            to="/insight/population"
          />
        </section>

        {/* 下方：数据源表格（可复用） */}
        <h2 className="insight-subheading">Data sources</h2>
        <DataInsight />
      </div>
    </main>
  );
}
