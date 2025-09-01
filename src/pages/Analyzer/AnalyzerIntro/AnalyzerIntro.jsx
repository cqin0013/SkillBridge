import React from "react";
import "./AnalyzerIntro.css";
import heroImg from "../../../assets/images/Analyzer.png"; // ✅ right-side image

export default function AnalyzerIntro({ onStart }) {
  return (
    <section className="intro-hero" aria-label="Analyzer introduction">
      <div className="intro-inner">
        {/* left: copy */}
        <div className="intro-copy">
          <p className="intro-kicker">Career Transition • Skills Gap • Roadmaps</p>
          <h1 className="intro-title">Career Ability Analyzer</h1>
          <p className="intro-lede">
            Quickly assess your target role, identify skill gaps, and get a personalized
            learning plan to bridge from where you are to where you want to be.
          </p>
          <div className="intro-cta">
            <button className="btn primary" onClick={onStart}>
              Start
            </button>
          </div>
        </div>

        {/* right: centered image */}
        <div className="intro-visual" aria-hidden="true">
          <img src={heroImg} alt="" loading="eager" />
        </div>
      </div>
    </section>
  );
}
