// AnalyzerIntro.jsx
// Full-bleed hero section for the Analyzer entry step.
// Presents a concise value proposition and a prominent "Start" CTA.

import React from "react";
import "./AnalyzerIntro.css";
import heroImg from "../../../assets/images/Analyzer.png"; // Right-side illustrative image

export default function AnalyzerIntro({ onStart }) {
  return (
    <section className="intro-hero" aria-label="Analyzer introduction">
      <div className="intro-inner">
        {/* Left column: headline, lede, and a primary CTA button */}
        <div className="intro-copy">
          <p className="intro-kicker">Career Transition • Skills Gap • Roadmaps</p>
          <h1 className="intro-title">Career Ability Analyzer</h1>
          <p className="intro-lede">
            Quickly assess your target role, identify skill gaps, and get a personalized
            learning plan to bridge from where you are to where you want to be.
          </p>
          <div className="intro-cta">
            {/* onStart is supplied by the wizard. Clicking moves to Step 1. */}
            <button className="btn primary" onClick={onStart}>
              Start
            </button>
          </div>
        </div>

        {/* Right column: decorative/illustrative image.
            aria-hidden prevents duplicate reading by screen readers. */}
        <div className="intro-visual" aria-hidden="true">
          <img src={heroImg} alt="" loading="eager" />
        </div>
      </div>
    </section>
  );
}
