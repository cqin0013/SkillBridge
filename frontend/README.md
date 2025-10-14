# SkillBridge

## Overview

SkillBridge is a career-planning SPA that guides users from aspiration to action.  
The multi-step Analyzer collects role interests, surfaces recommended occupations, highlights missing abilities, and suggests training.  
A persistent Profile page keeps roadmaps and advice in sync, while the Insight dashboard visualises market data (growth, comparison rates, geographic demand).  
The app is designed for modern UX: state persistence, skeleton loading, graceful error handling, and tutorial overlays.

## Tech Stack

| Layer            | Selection                                                     |
|------------------|---------------------------------------------------------------|
| Framework        | React 19 + Vite 7                                             |
| Language         | TypeScript 5                                                  |
| Routing          | React Router 7                                                |
| State Management | Redux Toolkit + React Redux                                   |
| Data Fetching    | TanStack Query 5 (parallel queries, caching, retries)         |
| Styling & UI     | Tailwind CSS 4, clsx, Lucide icons, custom Hero/Tutorial UI   |
| Visualisation    | Recharts, D3-geo, TopoJSON                                    |
| Misc Tools       | GSAP, html-to-image, jsPDF, redux-persist                     |
| Quality & Tooling| ESLint + Prettier, TypeScript ESLint, Vitest & Playwright (preconfigured) |

## Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Start development server (http://localhost:5173 by default)
npm run dev

# 3. Build production bundle
npm run build

# 4. Preview production build locally
npm run preview

# 5. Lint codebase
npm run lint
```

> **Node ≥ 18** is recommended.  
> Switch to `pnpm`/`yarn` if preferred (update scripts accordingly).

## Environment Variables

Create `.env` (or `.env.local`) in the project root:

```bash
VITE_API_BASE=https://your-api-gateway.example.com/
VITE_SITE_PASSWORD=                           # leave empty to skip password gate
```

- `VITE_API_BASE` – Base URL for backend APIs handling search, skills, growth, shortage, etc.
- `VITE_SITE_PASSWORD` – Optional lightweight access gate; omit or leave blank for immediate access.

## Project Structure

```
src/
├─ App.tsx                   # Root router & Suspense
├─ layouts/                  # Main layout, header/footer
├─ components/
│  ├─ analyzer/              # JobSuggestion cards, Ability pickers, etc.
│  ├─ insight/               # Map, growth chart, comparison chart
│  ├─ profile/               # SkillRoadMap, TrainingAdvice UI
│  ├─ tutorial/              # Reusable tutorial overlay
│  └─ ui/                    # Buttons, toggles, helpers
├─ pages/                    # Home, Analyzer, Profile, Insight, Feedback, static pages
├─ hooks/                    # TanStack Query hooks, reveal-on-view, route helpers
├─ lib/
│  ├─ api/                   # API clients (search, skills, growth, shortage, contact)
│  └─ utils/                 # PDF export, helpers
├─ store/                    # Redux slice, typed hooks
├─ data/                     # Industry options, tutorial steps
└─ types/                    # Domain types (roles, abilities, routes, API contracts)
```

## Common NPM Commands

| Command          | Description                                    |
|------------------|------------------------------------------------|
| `npm run dev`    | Start Vite dev server (with HMR)               |
| `npm run build`  | Type-check + bundle production assets          |
| `npm run preview`| Preview the production build locally           |
| `npm run lint`   | ESLint (TypeScript + React + formatting rules) |

Vitest/Playwright are preconfigured; add tests under `tests/` or `playwright/` and run `npx vitest` / `npx playwright test` as needed.

## Deployment

1. **Build** – `npm run build` produces static assets under `dist/`.
2. **Serve** – Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, S3 + CloudFront, etc.).
3. **API Base** – Ensure `VITE_API_BASE` points to the correct production backend via environment variables at build time.

CI/CD (GitHub Actions, etc.) can run `npm ci && npm run lint && npm run build` before publishing artifacts.

## Code Style & Testing

- ESLint + Prettier enforce consistent formatting and React Hook rules.
- Tailwind class ordering is handled by `prettier-plugin-tailwindcss`.
- Types are strict; avoid `any` and leverage domain typings under `src/types/`.
- For automated tests, intercept API calls in E2E (Playwright/Cypress) to stabilise async flows and skeleton states.

## API Endpoints (Summary)

| Endpoint / Client                                   | Purpose                                                     |
|-----------------------------------------------------|-------------------------------------------------------------|
| `GET /anzsco/search`                                | Search occupations by industry and keyword                  |
| `GET /anzsco/{code}/skills`                         | Fetch abilities (knowledge/skill/tech) by ANZSCO code       |
| `GET /anzsco/{code}/shortage`                       | Retrieve geographic shortage / employment distribution      |
| `GET /api/career-growth/{code}`                     | Major group growth metrics (rates, rankings, employment)    |
| `GET /api/anzsco/{code}/demand` (`getDemand`)       | Demand indicators / shortage labels for the occupation      |
| `POST /occupation/rank` (`rankByCodes`)             | Rank occupations using selected abilities + industries      |
| `GET /occupation/training/{code}`                   | Fetch recommended VET training advice                       |
| `GET /glossary/detail?keyword=...`                  | Look up terminology definitions (VET glossary)              |
| `POST /contact`                                     | Submit feedback / contact form                              |

Each client wrapper normalises payloads (`safeNumber`, `safeString`) and surfaces errors via TanStack Query state flags (`isLoading`, `isError`, etc.), so UI components can render skeletons, fallbacks, or retries as needed.

---

SkillBridge is built to extend. Add new data sources, enhance analysis steps, or integrate reporting with minimal friction. Happy hacking! 🚀
