
import { Link } from "react-router-dom";
import "./Hero.css";
import heroBg from "../../../assets/images/bridge.png"; 

export default function Hero() {
  return (
    <section
      className="sb-hero"
      style={{ "--hero-bg": `url(${heroBg})` }} 
      aria-label="SkillBridge introduction"
    >
      <div className="sb-hero__inner">
        <div className="sb-hero__left">
          <p className="sb-hero__kicker">Career Transition • Skills Gap • Roadmaps</p>
          <h1 className="sb-hero__title">Bridge Your Experience to the Next Role</h1>
          <p className="sb-hero__sub">
            Assess transferable skills, see role pathways, and get a learning plan.
          </p>
          <div className="sb-hero__cta">
            {/* nav to /Analyzer?step=1 */}
            <Link
              to={{ pathname: "/Analyzer", search: "?step=1" }}
              className="sb-btn sb-btn--primary"
            >
              Open Skill Analyzer
            </Link>
          </div>
        </div>
        <div className="sb-hero__right" aria-hidden="true" />
      </div>
    </section>
  );
}
