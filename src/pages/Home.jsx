// src/pages/Home.jsx
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Find Parking Smarter</h1>
          <p className="hero-sub">
            Live map search, historical availability and lightweight predictions — all in one place.
          </p>
          <div className="hero-cta">
            <Link to="/search" className="btn btn-primary">Start Searching</Link>
            <Link to="/Insight" className="btn btn-outline">See Insights</Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="features container">
        <div className="feature">
          <div className="feat-icon">🧭</div>
          <h3>Clear Navigation</h3>
          <p>Simple top nav and focused content paths help users find what they need fast.</p>
        </div>
        <div className="feature">
          <div className="feat-icon">📱</div>
          <h3>Responsive by Default</h3>
          <p>Touch-friendly controls, and fast loading.</p>
        </div>
        <div className="feature">
          <div className="feat-icon">⬜</div>
          <h3>Thoughtful White Space</h3>
          <p>Clean, scannable sections improve readability and focus.</p>
        </div>
        <div className="feature">
          <div className="feat-icon">⚡</div>
            <h3>Fast Performance</h3>
            <p>Optimized assets and efficient code ensure smooth interactions and quick load times.</p>
        </div>
      </section>


      {/* Final CTA */}
      <section className="final-cta">
        <div className="final-inner container">
          <h2>Ready to try?</h2>
          <p>Search a destination and see availability trends in seconds.</p>
          <Link to="/search" className="btn btn-primary">Open Map Search</Link>
        </div>
      </section>
    </main>
  );
}
