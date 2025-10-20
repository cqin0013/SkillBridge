# SkillBridge API Quick Check

https://thorough-annalise-fit5120-fc5e9371.koyeb.app/docs/
Swagger doc

https://thorough-annalise-fit5120-fc5e9371.koyeb.app/anzsco/search?first=2&s=engineer&limit=12
Search 6-digit ANZSCO by "first industry + keyword"

https://thorough-annalise-fit5120-fc5e9371.koyeb.app/anzsco/261313/skills
Reverse search SOC capability set from 6-digit ANZSCO

https://thorough-annalise-fit5120-fc5e9371.koyeb.app/api/anzsco/531111/training-advice?limit=10
Training recommendations (VET courses)


(ANZSCO) Regional/National Shortage Rating (based on shortage_list)
All States:
https://thorough-annalise-fit5120-fc5e9371.koyeb.app/api/anzsco/261313/demand

Designated states (e.g. VIC):
https://thorough-annalise-fit5120-fc5e9371.koyeb.app/api/anzsco/261313/demand?state=VIC

-----------------------------------------
# SkillBridge API

ANZSCO search, ability mapping (to SOC), training advice, and shortage metrics for Australia.

## Highlights

ANZSCO search by major group (first digit) + keyword

Ability aggregation: map 6-digit ANZSCO → SOC occupations → distinct knowledge/skills/tech pools

Training advice: VET courses linked to an ANZSCO code

Shortage metrics: latest/stats/trend; plus a helper endpoint that filters by ANZSCO 4-digit prefix

English/Chinese Swagger UI with switchable specs at /docs (served same-origin) 

swagger.i18n

## Quick start
Prerequisites

Node.js 18+

MySQL 8+

Redis (for sessions; any Redis-compatible service)

Environment

Create .env at project root:

### Server
PORT=8080
NODE_ENV=development

### MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=skillbridge

### Redis
REDIS_URL=redis://localhost:6379

### Sessions
SESSION_SECRET=replace-me
SESSION_NAME=sbridg.sid
SESSION_SAMESITE=lax
COOKIE_DOMAIN=

### CORS (optional: comma-separated list; supports regex via "re:/^...$/")
CORS_ALLOWLIST=http://localhost:5173,http://localhost:3000

### Public base URL (optional; useful for Swagger server list)
PUBLIC_BASE_URL=https://<your-app>.koyeb.app

## Install & run
npm install
node index.js


## Visit:

Swagger UI: http://localhost:8080/docs
(The UI loads same-origin OpenAPI docs; the server list also includes local & public URLs when present. )

swagger.i18n


Health check: GET /health → { ok: true }

# API Overview

Full, up-to-date schema, models, and examples are in Swagger UI (/docs). The UI exposes two OpenAPI documents (English / Chinese中文) via the dropdown selector. 

swagger.i18n

## Redis caching

This project uses Redis as a bypass cache for read-only interfaces, significantly reducing the latency of aggregation queries (for example, /occupations/rank-by-codes from ~4 seconds to milliseconds).

### Environment variable
REDIS_URL=rediss://default:AVljAAIncDFhMWJkZjdjZGMwMmQ0YTZhOGQ1MzllYjcyYjdlZmM1ZnAxMjI4ODM@keen-osprey-22883.upstash.io:6379

### Hit ID
Response JSON: cached: true | false

## ANZSCO

GET /anzsco/search?first=2&s=engineer&limit=12
Search 6-digit ANZSCO codes by major group (1..8) and optional title keyword.

GET /anzsco/{code}/skills
Given an ANZSCO 6-digit code, traverse ANZSCO → OSCA → ISCO → SOC and return distinct knowledge / skill / tech titles for the mapped SOC occupations.

## Training advice

GET /api/anzsco/{code}/training-advice?limit=10
List VET courses linked to the ANZSCO code.

## Shortage (ratings)

GET /api/anzsco/{code}/demand[?state=VIC]
National rating + per-state rating map; optional single-state view.

## Shortage (metrics by 4-digit prefix)

POST /api/shortage/by-anzsco
Body: { "anzsco_code": "261313" } (4–6 digits; server matches by first 4)
Returns:

latest_by_state: most-recent nsc_emp per state

stats_by_state: sample size, min/max, average, stddev per state

yearly_trend: average nsc_emp per state per year

## SOC ranking (reverse lookup by abilities)

POST /occupations/rank-by-codes[?major_first=2]
Rank SOC occupations by matches to the selected knowledge / skill / tech codes.
The result also includes unmatched codes per item and an anzsco_codes array per SOC (mapped back through SOC→ISCO→OSCA→ANZSCO). If major_first (1..8) is provided (either query or body), the anzsco_codes list is filtered to codes starting with that digit, and items with no remaining codes are removed.

### Accepted bodies

{
  "selections": [
    { "type": "knowledge", "code": "2.C.1.a" },
    { "type": "skill",     "code": "2.A.1.b" },
    { "type": "tech",      "code": "43233208" }
  ],
  "major_first": "2"
}


Or, equivalently:

{
  "knowledge_codes": ["2.C.1.a"],
  "skill_codes": ["2.A.1.a","2.A.1.b","2.A.1.c"],
  "tech_codes": ["43231507","43232110"],
  "major_first": "2"
}

## Glossary
GET /api/glossary/detail
Get glossary detail by term or acronym.
Returns term details (including also_called / see_also) based on a keyword or abbreviation.
Example: /api/glossary/detail?q=ICT

## Career growth
GET /api/career-growth/{code}
Career growth metrics by 4-digit ANZSCO unit group.
Returns 5-year / 10-year growth rate, ranking, current employment, projected new jobs, and national vs related-occupation averages.

## Feedback
POST /api/contact
Submit feedback form (JSON) and forward it to a mailbox.

## Admin
POST /api/admin/shortage/prewarm
Pre-warm cache for all 4-digit ANZSCO prefixes.

POST /api/admin/redis/flush-all
Flush all Redis keys (dangerous operation; admin only).

# Swagger / OpenAPI

The multi-locale Swagger UI mounts at /docs, populated by two OpenAPI specs (EN/中文). The generator searches route files in ./ and ./routes/** to build the docs, and the server list favors same-origin URLs to avoid “localhost” leaks in production. 

swagger.i18n

A simpler single-spec variant (with /api base path in the server list) is also provided in swagger.js for traditional setups. 

swagger

# CORS & Security

CORS allowlist supports exact origins and regex entries (re:/^...$/) via CORS_ALLOWLIST.

helmet enables a conservative CSP; connect-redis stores session data in Redis.

Cookies honor SESSION_SAMESITE and set secure=true automatically in production when needed.

# Project Layout
backend/       
 ├─ routes/       
│  ├─ map.data.fromtemp.js         
│  ├─ occupations.rank.router.js   
│  ├─ ...                          
├─ anzsco.training.router.js       
├─ anzsco.demand.router.js         
├─ swagger.i18n.js                 
├─ swagger.js                                   
├─ index.js        
└─ ...

# Database

The API expects the schema shown in the ERD (ANZSCO, OSCA, ISCO, SOC, VET, and NERO/extract tables). 

# Deployment notes

Same-origin docs: In production, the Swagger UI prefers relative servers so the UI works behind any reverse proxy or custom domain without leaking localhost. You can still add your public URL via PUBLIC_BASE_URL to display it in the server dropdown. 

swagger.i18n

Set secure session cookies (SESSION_SAMESITE=none + NODE_ENV=production) only when serving over HTTPS.

# Troubleshooting

No results / slow queries: verify data presence and indexes on mapping tables; confirm the 6-digit ANZSCO exists in mapping chains.

CORS blocked: ensure your origin matches CORS_ALLOWLIST (exact or regex).

Swagger missing routes: check that your route files live under project root or routes/** so the JSDoc scanner picks them up. 

swagger.i18n

# License

MIT.
