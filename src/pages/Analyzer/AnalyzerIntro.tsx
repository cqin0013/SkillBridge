// src/pages/Analyzer/AnalyzerIntro.tsx
// Intro page for the Analyzer wizard.
// - Uses a full-bleed hero and feature sections.
// - CTA navigates to the first data-collection step via a static path.

import HeroIntro from "../../components/analyzer/HeroIntro";
import FeatureCard from "../../components/FeatureCard";
import DataAnalyzerIcon from "../../assets/image/dataAnalyzer.svg";
import MatchIcon from "../../assets/image/match.svg";
import PlanIcon from "../../assets/image/plan.svg";
import HowItWorks from "../../components/analyzer/HowItWorks";
import IntroImage from "../../assets/image/analyze.svg";

export default function AnalyzerIntro() {
  return (
    <>
      {/* Full-bleed hero: expands to screen width and touches header (no top gap) */}
      <div className="w-screen mx-[calc(50%-50vw)]">
        <HeroIntro
          title="Career Analyzer"
          description="Understand your strengths, explore tailored job options, and plan your growth with evidence-based insights."
          image={IntroImage}
          tone="blue" // 'blue' | 'yellow' | 'white'
          ctaLabel="Start test"
          ctaTo="/analyzer/get-info" /* Static path to the next step */
        />
      </div>

      {/* Main content, centered and constrained */}
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        {/* Why choose us */}
        <section className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink">
            Why choose us
          </h2>
          <p className="mt-3 text-ink-soft max-w-2xl mx-auto">
            We combine market data, personalized recommendations, and clear
            action plans to support your career journey.
          </p>

          {/* Features grid (centered) */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              title="Data-driven decisions"
              description="Leverage market data and industry trends to get accurate career guidance."
              image={DataAnalyzerIcon}
              imageAlt="Data analyzer icon"
              tone="gold"
            />
            <FeatureCard
              title="Personalized matching"
              description="Align your unique strengths and interests with roles that fit you best."
              image={MatchIcon}
              imageAlt="Matching icon"
              tone="blue"
            />
            <FeatureCard
              title="Clear action plan"
              description="Receive concrete upskilling suggestions and resources to reach your goals faster."
              image={PlanIcon}
              imageAlt="Action plan icon"
              tone="gold"
            />
          </div>
        </section>

        {/* How it works */}
        <section className="mt-20 max-w-7xl mx-auto">
          <HowItWorks />
        </section>
      </main>
    </>
  );
}
