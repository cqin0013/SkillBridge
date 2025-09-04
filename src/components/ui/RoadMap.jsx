import React from "react";
import "./RoadMap.css";

export default function Roadmap({ steps = [], className = "" }) {
  if (!steps.length) return null;

  return (
    <section className={`roadmap-container ${className}`} aria-label="Roadmap">
      <div className="roadmap-line" aria-hidden="true" />
      <ol className="roadmap-list">
        {steps.map((step, idx) => (
          <li key={idx} className="roadmap-item">
            <div className="roadmap-circle" aria-hidden="true">{idx + 1}</div>
            <article className="roadmap-card">
              <header className="roadmap-card__header">
                <h3 className="roadmap-card__title">{step.title}</h3>
                {step.date && <time className="roadmap-card__date">{step.date}</time>}
              </header>
              {step.desc && <p className="roadmap-card__desc">{step.desc}</p>}
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
