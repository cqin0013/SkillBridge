// Profile page with tutorial matching Insight page style
// - Uses TutorialLauncher in the header (top-right corner)
// - Export PDF button always visible (mobile + desktop)
// - Shows skill roadmap from unmatched abilities
// - Auto-fetches training advice
// - VET glossary search for terminology lookup


import React, { useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "../store"
import { useAppDispatch } from "../store/hooks"

// UI Components
import HelpToggleSmall from "../components/ui/HelpToggleSmall"
import CareerChoicePanel, {
  type CareerChoiceState,
  type OccupationSearchInputs,
} from "../components/profile/CareerChoicePanel"
import SkillRoadMap, { type SkillRoadmapItem } from "../components/profile/SkillRoadMap"
import TrainingAdviceList, { type TrainingAdvice } from "../components/profile/TrainingAdviceList"
import VetGlossarySearch from "../components/profile/VetGlossarySearch"
import TutorialLauncher from "../components/tutorial/TutorialLauncher"
import { useTrainingAdvice } from "../hooks/queries/useTrainingAdvice"

// Redux actions + types
import {
  setChosenRoles,
  setChosenAbilities,
  setInterestedIndustryCodes,
  setPreferredRegion,
  setSelectedJob,
  setTrainingAdvice,
} from "../store/analyzerSlice"
import type {
  AbilityLite,
  UnmatchedBuckets,
  RoleLite,
  SelectedJob,
  TrainingAdviceState,
} from "../store/analyzerSlice"

// Data and hooks
import { industryOptions, industryNameOf } from "../data/industries"
import { useAnzscoSearch } from "../hooks/queries/userAnzscoSearch"
import type { SearchParams } from "../hooks/queries/userAnzscoSearch"
import { getProfileTutorialSteps } from "../data/ProfileTutorialSteps"
import type { AnalyzerRouteState } from "../types/routes"
import type { AnzscoOccupation } from "../types/domain"
import type { TrainingAdviceRes, TrainingCourse } from "../types/training"

// Utils
import { exportElementToPdf } from "../lib/utils/pdf"

// ============================================================================
// Constants
// ============================================================================
const REGION_OPTIONS = [
  "New South Wales",
  "Victoria",
  "Queensland",
  "Western Australia",
  "South Australia",
  "Tasmania",
  "Northern Territory",
  "Australian Capital Territory",
]

// ============================================================================
// Types
// ============================================================================
type SelectedJobValue = Exclude<SelectedJob, null>

// ============================================================================
// Helper Functions
// ============================================================================

/** Generate fallback URL for a course code */
const fallbackCourseUrl = (code: string): string =>
  `https://training.gov.au/training/details/${encodeURIComponent(code)}`

/** Safe string normalization */
const normName = (v: unknown): string => (typeof v === "string" ? v : "")

/** Normalize roles array with deduplication */
const normalizeRoles = (roles: Array<RoleLite | string> | null | undefined): RoleLite[] => {
  if (!Array.isArray(roles)) return []
  const seen = new Set<string>()
  const out: RoleLite[] = []
  for (const role of roles) {
    if (!role) continue
    const id = (typeof role === "string" ? role : role.id ?? "").trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const title = typeof role === "string" ? role : role.title || id
    out.push({ id, title })
  }
  return out
}

/** Normalize selected job */
const normalizeSelectedJob = (
  job: SelectedJob | string | null | undefined
): SelectedJobValue | null => {
  if (!job) return null
  if (typeof job === "string") {
    const code = job.trim()
    if (!code) return null
    return { code, title: code }
  }
  const code = (job.code ?? "").trim()
  if (!code) return null
  return { code, title: job.title || code }
}

/** Generate unique key for ability */
const abilityKey = (a: AbilityLite): string | null => {
  const name = normName((a as { name?: unknown }).name)
  const code =
    typeof (a as { code?: unknown }).code === "string" ? (a as { code?: string }).code : ""
  if (!name && !code) return null
  return `${a.aType}:${code || name.toLowerCase()}`
}

/** Generate unique key for roadmap item */
const roadmapKey = (it: SkillRoadmapItem): string | null => {
  const name = normName((it as { skill?: unknown }).skill)
  const code =
    typeof (it as { code?: unknown }).code === "string" ? (it as { code?: string }).code : ""
  if (!name && !code) return null
  return `${it.abilityType}:${code || name.toLowerCase()}`
}

/** Generate identity key for ability */
const abilityIdentityKey = (ability: AbilityLite): string => {
  const name = normName(ability.name)
  const base = ability.code ?? name
  const safe = base ? encodeURIComponent(base) : `unnamed-${ability.aType}`
  return `${ability.aType}:${safe}`
}

/** Remove duplicate abilities */
const uniqueAbilities = (abilities: AbilityLite[]): AbilityLite[] => {
  const seen = new Set<string>()
  const result: AbilityLite[] = []
  for (const a of abilities) {
    const k = abilityKey(a)
    const name = normName(a.name)
    if (!k || !name) continue
    if (!seen.has(k)) {
      seen.add(k)
      result.push({ ...a, name })
    }
  }
  return result
}

/** Collapse unmatched buckets into flat ability array */
const collapseUnmatchedBuckets = (b: UnmatchedBuckets | null | undefined): AbilityLite[] => {
  if (!b) return []
  const extract = (entry: unknown): { name: string; code?: string } | null => {
    if (typeof entry === "string") {
      const trimmed = entry.trim()
      return trimmed ? { name: trimmed } : null
    }
    if (entry && typeof entry === "object") {
      const obj = entry as { name?: unknown; title?: unknown; label?: unknown; code?: unknown }
      const code =
        typeof obj.code === "string" && obj.code.trim().length > 0 ? obj.code.trim() : undefined
      const candidate =
        (typeof obj.name === "string" && obj.name.trim()) ||
        (typeof obj.title === "string" && obj.title.trim()) ||
        (typeof obj.label === "string" && obj.label.trim()) ||
        code ||
        ""
      const name = candidate.trim()
      return name ? { name, code } : null
    }
    return null
  }
  const collect = (list: unknown[] | undefined, aType: AbilityLite["aType"]): AbilityLite[] =>
    (list ?? [])
      .map(extract)
      .filter((item): item is { name: string; code?: string } => item !== null)
      .map((item) => ({ name: item.name, code: item.code, aType }))
  return [
    ...collect(b.skill as unknown[] | undefined, "skill"),
    ...collect(b.knowledge as unknown[] | undefined, "knowledge"),
    ...collect(b.tech as unknown[] | undefined, "tech"),
  ]
}

/** Convert abilities to skill roadmap items */
const toSkillRoadmapItems = (abilities: AbilityLite[]): SkillRoadmapItem[] =>
  abilities.map((ability, index) => ({
    id: `${abilityIdentityKey(ability)}:${index}`,
    abilityType: ability.aType,
    category: ability.aType,
    skill: normName(ability.name),
    code: typeof ability.code === "string" ? ability.code : undefined,
  }))

/** Deduplicate roadmap items */
const dedupeRoadmapItems = (items: SkillRoadmapItem[]): SkillRoadmapItem[] => {
  const seen = new Set<string>()
  const result: SkillRoadmapItem[] = []
  for (const it of items) {
    const k = roadmapKey(it)
    if (!k) continue
    if (!seen.has(k)) {
      seen.add(k)
      result.push(it)
    }
  }
  return result
}

/** Map training API response to Redux state */
const mapAdviceResToState = (
  res: TrainingAdviceRes | null | undefined,
  fallbackOccupation: { code: string; title: string }
): TrainingAdviceState => {
  const occupation = res?.anzsco ?? fallbackOccupation
  const rawCourses = res?.vet_courses ?? []
  const courses: TrainingCourse[] = rawCourses.map((c) => ({
    id: c.vet_course_code,
    name: c.course_name || c.vet_course_code,
  }))
  return { occupation, courses }
}

/** SelectQuestion modal for region selection */
function SelectQuestion({
  title,
  open,
  options,
  value,
  onClose,
  onSave,
  helperText,
}: {
  title: string
  open: boolean
  options: string[]
  value: string | null
  onClose: () => void
  onSave: (value: string) => void
  helperText?: string
}): React.ReactElement | null {
  const [selected, setSelected] = useState<string | null>(value)

  useEffect(() => {
    setSelected(value)
  }, [value])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        {helperText && <p className="text-sm text-ink-soft">{helperText}</p>}

        <div className="grid max-h-80 gap-2 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className="rounded-lg border px-3 py-2 text-left text-sm font-medium transition"
              style={{
                borderColor: selected === opt ? "#5E75A4" : "#e2e8f0",
                backgroundColor: selected === opt ? "#5E75A4" : "white",
                color: selected === opt ? "white" : "#0f172a",
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (selected) onSave(selected)
              onClose()
            }}
            className="flex-1 rounded-full bg-primary py-2 px-4 font-semibold text-ink-invert transition hover:bg-primary/90"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-border py-2 px-4 font-semibold text-ink transition hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================
export default function Profile(): React.ReactElement {
  const dispatch = useAppDispatch()
  const { state } = useLocation()
  const routeState = (state as (AnalyzerRouteState & { notice?: string }) | undefined) ?? undefined

  // Refs
  const exportRef = useRef<HTMLDivElement | null>(null)
  const vetTerminologyRef = useRef<HTMLDivElement>(null)

  // Redux state
  const analyzer = useSelector((s: RootState) => s.analyzer)
  const notice = routeState?.notice

  // Hydrate from route state (one-time)
  useEffect(() => {
    if (!routeState) return
    if (!analyzer.chosenRoles?.length && routeState.roles?.length) {
      dispatch(setChosenRoles(normalizeRoles(routeState.roles)))
    }
    if (!analyzer.chosenAbilities?.length && routeState.abilities?.length) {
      dispatch(setChosenAbilities(routeState.abilities))
    }
    if (
      (!analyzer.interestedIndustryCodes || analyzer.interestedIndustryCodes.length === 0) &&
      routeState.industries?.length
    ) {
      dispatch(setInterestedIndustryCodes(routeState.industries))
    }
    if (!analyzer.preferredRegion && routeState.region) {
      dispatch(setPreferredRegion(routeState.region))
    }
    if (!analyzer.selectedJob && routeState.selectedJob) {
      const normalized = normalizeSelectedJob(routeState.selectedJob)
      if (normalized) dispatch(setSelectedJob(normalized))
    }
    if (!analyzer.trainingAdvice && routeState.training) {
      dispatch(setTrainingAdvice(routeState.training))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Career choice value
  const careerChoiceValue = useMemo((): CareerChoiceState => {
    const pastJobsRedux = normalizeRoles(analyzer.chosenRoles)
    const targetJobRedux = normalizeSelectedJob(analyzer.selectedJob)
    const regionRedux = analyzer.preferredRegion || ""

    const pastJobsRoute = normalizeRoles(routeState?.roles)
    const targetJobRoute = normalizeSelectedJob(routeState?.selectedJob)
    const regionRoute = routeState?.region || ""

    const pastJobs = pastJobsRedux.length > 0 ? pastJobsRedux : pastJobsRoute
    const targetJobSource = targetJobRedux ?? targetJobRoute
    const targetJob = targetJobSource ? { id: targetJobSource.code, title: targetJobSource.title } : null

    return { pastJobs, targetJob, region: regionRedux || regionRoute }
  }, [analyzer, routeState])

  // Handle career choice changes
  const onCareerChoiceChange = (next: CareerChoiceState): void => {
    dispatch(setChosenRoles(normalizeRoles(next.pastJobs)))
    const targetJobForRedux = next.targetJob ? { code: next.targetJob.id, title: next.targetJob.title } : null
    dispatch(setSelectedJob(targetJobForRedux))
    dispatch(setPreferredRegion(next.region))
  }

  // Training advice fetch
  const selectedJobCode = analyzer.selectedJob?.code ?? ""
  const selectedJobTitle = analyzer.selectedJob?.title ?? ""
  const {
    data: trainingData,
    isFetching: trainingFetching,
    isError: trainingError,
  } = useTrainingAdvice(selectedJobCode)

  useEffect(() => {
    if (!trainingData || trainingFetching || trainingError) return
    const mapped = mapAdviceResToState(trainingData, { code: selectedJobCode, title: selectedJobTitle })
    dispatch(setTrainingAdvice(mapped))
  }, [trainingData, trainingFetching, trainingError, selectedJobCode, selectedJobTitle, dispatch])

  // Training items
  const trainingItems: TrainingAdvice[] = useMemo(() => {
    const courses = analyzer.trainingAdvice?.courses ?? []
    return courses.map((c) => ({
      title: c.name ?? c.id,
      code: c.id,
      url: c.url ?? fallbackCourseUrl(c.id),
    }))
  }, [analyzer.trainingAdvice])

  // Occupation search
  const [industryCode, setIndustryCode] = useState("")
  const [keyword, setKeyword] = useState("")
  const [searchParams, setSearchParams] = useState<SearchParams>(null)
  const { data: searchDataRaw, isFetching, isError } = useAnzscoSearch(searchParams)
  const normalizedResults: AnzscoOccupation[] = useMemo(
    () => (Array.isArray(searchDataRaw) ? searchDataRaw : []),
    [searchDataRaw]
  )

  const occupationSearch: OccupationSearchInputs = {
    industryOptions: industryOptions.map((opt) => ({ value: opt.value, label: opt.label })),
    industryCode,
    onIndustryChange: setIndustryCode,
    keyword,
    onKeywordChange: setKeyword,
    onSearch: () => {
      const industryName = industryNameOf(industryCode) ?? ""
      if (industryName || keyword.trim()) {
        setSearchParams({ industry: industryName, keyword: keyword.trim(), limit: 20 })
      }
    },
    results: normalizedResults,
    isFetching,
    isError,
    noResults: !isFetching && normalizedResults.length === 0,
  }

  // Skill roadmap from unmatched
  const unmatchedRedux = analyzer.selectedJobUnmatched
  const unmatchedRoute = routeState?.unmatched ?? null
  const abilitiesFromUnmatched = useMemo(() => {
    const source = unmatchedRedux ?? unmatchedRoute ?? null
    return uniqueAbilities(collapseUnmatchedBuckets(source))
  }, [unmatchedRedux, unmatchedRoute])

  const initialRoadmap = useMemo(() => {
    const items = dedupeRoadmapItems(toSkillRoadmapItems(abilitiesFromUnmatched))
    const key = `unmatched:${items.length}`
    return { key, items }
  }, [abilitiesFromUnmatched])

  // Export PDF
  const onExportPdf = async (): Promise<void> => {
    if (!exportRef.current) return
    const code = analyzer.selectedJob?.code ? `_${analyzer.selectedJob.code}` : ""
    const fileName = `Profile${code}.pdf`
    await exportElementToPdf(exportRef.current, fileName)
  }

  return (
    <div id="profile-export-root" ref={exportRef}>
      {/* Header with tutorial button via TutorialLauncher */}
      <div id="profile-header" className="relative bg-white px-4 py-12 sm:px-6 lg:px-8">
        {/* Tutorial button in the top-right corner.
           Header on this page is not fixed inside this block, so no headerOffset needed. */}
        <TutorialLauncher
          steps={getProfileTutorialSteps}
          placement="top-right"
          label="View Tutorial"
          variant="outline"
          ariaLabel="View Tutorial"
          className="z-[60]"
          headerOffset={0}
          tutorialHeaderOffset={0}
        />

        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Profile</h1>
            <HelpToggleSmall
              placement="bottom"
              openOn="both"
              text={
                <>
                  <p className="mb-2">
                    <strong>Career Intent:</strong> Define your past roles, target job, and preferred location.
                  </p>
                  <p className="mb-2">
                    <strong>Skill Roadmap:</strong> Focus on abilities you're currently missing. Add target dates.
                  </p>
                  <p className="mb-2">
                    <strong>Training Advice:</strong> Discover relevant VET courses mapped to your target occupation.
                  </p>
                  <p>
                    <strong>VET Glossary:</strong> Look up unfamiliar course terminology before enrolling.
                  </p>
                </>
              }
            />
          </div>
          <p className="mx-auto max-w-3xl text-base text-slate-700 sm:text-lg">
            Organize your career intent, track your skill development roadmap, and discover relevant training opportunities.
          </p>
          {notice && (
            <div className="mt-4 inline-block rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
              {notice}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        {/* Career Intent Section */}
        <section id="career-intent" className="relative">
          {/* Export PDF button — always visible now (removed `hidden sm:block`) */}
          <div className="absolute right-0 -top-6 sm:-top-8">
            <button
              onClick={onExportPdf}
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-white px-4 py-2 text-sm font-semibold text-primary shadow-lg transition-all hover:bg-primary hover:text-white"
              aria-label="Export this page as PDF"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9V4h12v5M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1M6 14h12v8H6v-8Z" />
              </svg>
              <span>Export PDF</span>
            </button>
          </div>

          <h2 className="mb-4 text-2xl font-heading font-bold text-ink">Career Intent</h2>
          <CareerChoicePanel
            value={careerChoiceValue}
            onChange={onCareerChoiceChange}
            regionOptions={REGION_OPTIONS}
            SelectQuestion={SelectQuestion}
            occupationSearch={occupationSearch}
          />
        </section>

        {/* Skill Roadmap Section */}
        <section id="skill-roadmap">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-heading font-bold text-ink">Skill Roadmap</h2>
            <HelpToggleSmall
              placement="left"
              openOn="both"
              text={
                <div>
                  <p>
                    We list only <strong>missing abilities</strong> detected for your selected job. You can{" "}
                    <strong>customize</strong> this list at any time.
                  </p>
                </div>
              }
            />
          </div>

          <div className="rounded-xl border border-border bg-white p-6 shadow-card">
            <p className="mb-4 text-sm text-ink-soft">
              Plan your skill development journey with timelines for each skill you want to acquire.
            </p>
            <SkillRoadMap key={initialRoadmap.key} initialSkills={initialRoadmap.items} />
          </div>
        </section>

        {/* Training Advice Section */}
        <section id="training-advice">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-heading font-bold text-ink">Training Advice</h2>
            <HelpToggleSmall
              placement="left"
              openOn="both"
              text="This list updates based on the target job you select."
            />
          </div>

          <div className="rounded-xl border border-border bg-white p-6 shadow-card">
            <TrainingAdviceList
              items={trainingItems}
              title=""
              onRemove={(item) => {
                const updated = trainingItems.filter((t) => t.code !== item.code)
                dispatch(
                  setTrainingAdvice({
                    occupation: analyzer.trainingAdvice?.occupation || { code: "", title: "" },
                    courses: updated.map((t) => ({ id: t.code, name: t.title, url: t.url })),
                  })
                )
              }}
            />

            {trainingItems.length > 0 && (
              <div className="mt-6 border-t border-border pt-6">
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="mb-2 text-sm text-blue-900">
                      <strong>Confused by course terminology?</strong> Try our VET Terminology Dictionary below.
                    </p>
                    <button
                      onClick={() =>
                        vetTerminologyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                      className="text-sm font-semibold text-blue-700 underline hover:text-blue-800"
                    >
                      Jump to VET Glossary
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* VET Glossary Section */}
        <section id="vet-terminology" ref={vetTerminologyRef}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-heading font-bold text-ink">VET Terminology</h2>
            <HelpToggleSmall
              placement="left"
              openOn="both"
              text="Search for any VET term or acronym to see its definition and related terms."
            />
          </div>

          <VetGlossarySearch />
        </section>
      </div>
    </div>
  )
}
