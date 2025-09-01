import React from "react";
import PageActions from "../../../components/ui/PageActions";
import "./AnalyzerIntro.css";

export default function AnalyzerIntro({ onStart }) {
  return (
    <section className="intro-hero">
      <div className="intro-inner">
        <div className="intro-copy">
          <h1 className="intro-title">Career Ability Analyzer</h1>
          <p className="intro-lede">
            快速评估你的目标岗位、能力差距与学习路线。
          </p>
          <div className="intro-cta">
            <button className="cta" onClick={onStart}>
              Start
            </button>
          </div>
        </div>
        <div className="intro-spacer" aria-hidden="true" />
      </div>

      <PageActions />
    </section>
  );
}
