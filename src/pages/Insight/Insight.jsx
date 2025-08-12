import { Link } from "react-router-dom";
import "./Insight.css";

export default function Insight() {
  return (
    <main className="insight-page">
      <div className="insight-wrap">
        <header className="insight-header">
          <h1>Insights</h1>
          <p>Choose a metric to view.</p>
        </header>

        <div className="insight-grid">
          <Link to="/insight/ownership" className="insight-card">
            <h3 className="insight-card-title">Car ownership</h3>
            <p className="insight-card-sub">
              Passenger vehicles per 1,000 residents.
            </p>
          </Link>

          <Link to="/insight/population" className="insight-card">
            <h3 className="insight-card-title">CBD population</h3>
            <p className="insight-card-sub">
              Resident population in Melbourne CBD.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
