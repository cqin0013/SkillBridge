// src/components/ui/Home.jsx
import "./Home.css";
import IntroHero from "../../components/ui/Hero/Hero.jsx";
import heroBg from "../../assets/images/bridge.png";

export default function Home() {
  return (
    // ✅ 在首页的顶层容器加 is-home（或你喜欢的命名）
    <div className="app-shell is-home">
      {/* 如果你有固定的 Header，这里正常渲染即可 */}
      {/* <Header className="st-header" /> */}

      <main className="app-main">
        <IntroHero
          title="Bridge your skills to the next role"
          subtitle="Analyze strengths. Match roles. Build your roadmap."
          bgImage={heroBg}
          ctaText="Open Skill Analyzer"
          ctaHref="/Analyzer"
        />
      </main>

      {/* <Footer className="app-footer" /> */}
    </div>
  );
}
