// src/pages/Home/Home.tsx
// English comments only inside code:
// Hero (fade divider) → panel-style FeatureSection (primary CTA) → 3 FeatureCards.
// Card row is wider (max-w-7xl, smaller horizontal padding, larger gap).
// The 3rd card uses primary tone.

import Hero from "../components/Hero"
import FeatureSection from "../components/home/FeatureSection"
import FeatureCard from "../components/home/FeatureCard"

import bridgeUrl from "../assets/image/bridge.png"
import analyzeSvg from "../assets/image/analyze.svg"
import dataSvg from "../assets/image/data.svg"
import profileSvg from "../assets/image/profie.svg"   // file name is 'profie.svg'
import searchSvg from "../assets/image/search.svg"

export default function Home() {
  return (
    <>
      {/* Hero fades into the white background of the first section */}
      <Hero
        title="Bridge your skills to the next role"
        subtitle="Analyze strengths. Match roles. Build your roadmap."
        bg={bridgeUrl}
        headerHeight={64}
        scrollTargetId="analyzer"
        divider="fade"
        dividerColor="#ffffff"
        dividerHeight={140}
      />

      {/* Panel-style FeatureSection focused on the Analyzer (primary CTA) */}
      <FeatureSection
        id="analyzer"
        className="bg-white"
        size="large"
        visual="panel"
        badgeLabel="Core Feature"
        title="Ability Analyzer"
        description="Analyze your current career situation, understand your strengths and possible pivots, and receive actionable advice."
        bullets={["Skill gap analysis", "Career path planning", "Personalized suggestions"]}
        image={analyzeSvg}
        imageClassName="h-64 w-64 xl:h-72 xl:w-72"
        imageAlt="Analyzer abstract illustration"
        to="/analyzer"
        ctaLabel="Start analysis"
        ctaVariant="primary"
      />

      {/* Cards row: wider container, closer to screen edges, and larger gaps */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-3 lg:px-6 py-16 lg:py-24">
          <div className="grid grid-cols-1 gap-8 lg:gap-10 lg:grid-cols-3">
            <FeatureCard
              title="Industry Insight"
              description="Explore industry trends, requirements, and growth areas to make better career choices."
              to="/insight"
              image={dataSvg}
              imageAlt="Data/insight icon"
              ctaLabel="Use Insight"
              ctaVariant="primary"
              tone="blue"
            />
            <FeatureCard
              title="Profile"
              description="Organize your skills, experiences, and interests. Identify improvement areas and prepare for career transitions."
              to="/profile"
              image={profileSvg}
              imageAlt="Profile/user icon"
              ctaLabel="Use Profile"
              ctaVariant="accent"
              tone="gold"
            />
            <FeatureCard
              title="Glossary"
              description="Look up job titles, industry terms, and workplace concepts to better understand career language."
              to="/glossary"
              image={searchSvg}
              imageAlt="Search/book icon"
              ctaLabel="Use Glossary"
              ctaVariant="primary"
              tone="blue"   // primary tone for the 3rd card
            />
          </div>
        </div>
      </section>
    </>
  )
}
