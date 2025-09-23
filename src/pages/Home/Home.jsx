// src/components/ui/Home.jsx
import "./Home.css";
import IntroHero from "../../components/ui/Hero/Hero.jsx";
import heroBg from "../../assets/images/bridge.png";

export default function Home() {
  return (
    // Top-level shell for the homepage
    <div className="app-shell is-home">
      {/* <Header className="st-header" /> */}

      <main className="app-main">
        <IntroHero
          title="Bridge your skills to the next role"
          subtitle="Analyze strengths. Match roles. Build your roadmap."
          bgImage={heroBg}
          ctaText="Open Skill Analyzer"
          ctaHref="/analyzer?step=1 "
        />
      </main>

      {/* <Footer className="app-footer" /> */}
    </div>
  );
}
