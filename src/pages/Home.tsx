// src/pages/Home/Home.tsx
// English comments only inside code:
// - Background image is 20% taller than the hero (so 1/5 remains visible).
// - No CSS mask: we overlay a transparent→white gradient on top of the image,
//   which visually fades the edges to the page background (white).
// - Tighter spacing between Hero / FeatureSection / cards stays as you set.

import Hero from "../components/Hero"
import FeatureSection from "../components/home/FeatureSection"
import FeatureCard from "../components/home/FeatureCard"

import bridgeUrl from "../assets/image/bridge.png"
import analyzeSvg from "../assets/image/analyze.svg"
import dataSvg from "../assets/image/data.svg"
import profileSvg from "../assets/image/profie.svg"
import searchSvg from "../assets/image/search.svg"

export default function Home() {
  // Shared sizes
  const HEADER_H = 64 // must match Hero.headerHeight

  // Express heights using CSS calc strings (no JS math on viewport units)
  const HERO_H_EXPR = `calc(100dvh - ${HEADER_H}px)`              // hero height
  const BG_H_EXPR = `calc(${HERO_H_EXPR} + (${HERO_H_EXPR} / 5))` // hero + 1/5 hero
  const EXTRA_1_5_EXPR = `calc(${HERO_H_EXPR} / 5)`               // the extra 1/5 part

  // Fade range controls (percent of the background container height)
  const FADE_START = "78%" // start fading here (visible above)
  const FADE_END = "100%"  // fully white at the very bottom

  return (
    <main className="relative min-h-screen bg-white">
      {/* Background image layer (20% taller than the hero) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-0"
        style={{ height: BG_H_EXPR }}
      >
        {/* Image */}
        <div
          className="absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url(${bridgeUrl})`,
            // Align the focal line; 56–62% usually works for horizons
            backgroundPosition: "center 58%",
            // Keep cover; switch to "120% auto" for a closer framing
            backgroundSize: "cover",
          }}
        />
        {/* Overlay gradient (transparent → white). This is NOT a mask.
            Because the page canvas is white, the visual effect equals "fade to transparent". */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to bottom,
              rgba(255,255,255,0) ${FADE_START},
              rgba(255,255,255,1) ${FADE_END}
            )`,
          }}
        />
      </div>

      {/* Foreground content above the background */}
      <div className="relative z-10">
        {/* HERO: smaller veil for a tighter joint */}
        <Hero
          title="Bridge your skills to the next role"
          subtitle="Analyze strengths. Match roles. Build your roadmap."
          headerHeight={HEADER_H}
          scrollTargetId="analyzer"
        />

        {/* TOP SECTION: keep the extra 1/5 visible, then blend to white */}
        <section id="analyzer" className="relative bg-transparent">
          {/* Transparent → white cap over the extra 1/5 */}
          <div
            aria-hidden="true"
            className="w-full"
            style={{
              height: EXTRA_1_5_EXPR,
              backgroundImage:
                "linear-gradient(to bottom, rgba(255,255,255,0) 0%, #ffffff 100%)",
            }}
          />
          {/* Content wrapper on white; small negative margin to pull content upward */}
          <div className="bg-white -mt-30">
            <div className="mx-auto max-w-7xl px-4 pt-6 pb-12 lg:pt-8 lg:pb-16">
              <FeatureSection
                visual="panel"
                className="bg-transparent"
                badgeLabel="Core Feature"
                title="Ability Analyzer"
                description="Analyze your current career situation, understand your strengths and possible pivots, and receive actionable advice."
                bullets={[
                  "Skill gap analysis",
                  "Career path planning",
                  "Personalized suggestions",
                ]}
                image={analyzeSvg}
                imageAlt="Analyzer illustration"
                to="/analyzer"
                ctaLabel="Start analysis"
                ctaVariant="primary"
                size="normal"
              
              />
            </div>
          </div>
        </section>

        {/* CARDS: tighter section paddings and grid gaps */}
        <section className="bg-white -mt-15">
          <div className="mx-auto max-w-7xl px-3 lg:px-6 py-12 lg:py-16">
            <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-3">
              <FeatureCard
                title="Industry Insight"
                description="Explore industry trends, requirements, and growth areas to make better career choices."
                to="/insight"
                image={dataSvg}
                imageAlt="Data/insight icon"
                ctaLabel="Use Insight"
                ctaVariant="primary"
                tone="blue"
                revealDelayMs={0}
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
                revealDelayMs={60}
              />
              <FeatureCard
                title="Glossary"
                description="Look up job titles, industry terms, and workplace concepts to better understand career language."
                to="/glossary"
                image={searchSvg}
                imageAlt="Search/book icon"
                ctaLabel="Use Glossary"
                ctaVariant="primary"
                tone="blue"
                revealDelayMs={120}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
