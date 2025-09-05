# Fuzzy search (return the top 10 occupations sorted by similarity)
Default (including aliases/job names in search and sorting)
http://localhost:8080/occupations/search-and-titles?s=chief&limit=10

Only main titles are included (aliases/job names are not considered)
http://localhost:8080/occupations/search-and-titles?s=chief&includeAliases=0&limit=10

f3
Get three types of titles by occupation code
/occupations/:code/titles

Path parameters:
code (string, required), example: 11-1011.00

Successful response (200) example
{
"occupation": {
"occupation_code": "11-1011.00",
"occupation_title": "Chief Executives",
"occupation_description": "..."
},
"knowledge_titles": [
{ "code": "2.C.1.a", "title": "Administration and Management" },
{ "code": "2.C.1.b", "title": "Administrative" }
],
"skill_titles": [
{ "code": "2.A.1.b", "title": "Active Listening" },
{ "code": "2.A.2.a", "title": "Critical Thinking" }
],
"tech_titles": [
{ "code": "43231507", "title": "Project management software" },
{ "code": "43232110", "title": "Spreadsheet software" }
]
}

f5: Reverse aggregation and sorting of occupations based on three skill codes
/occupations/rank-by-codes

Parameters:
Form A: Flat selections
{
"selections": [
{ "type": "knowledge", "code": "2.C.1.a" },
{ "type": "skill", "code": "2.A.1.b" },
{ "type": "tech", "code": "43231507" }
]
}

Form B: Three array fields
{
"knowledge_codes": ["2.C.1.a"],
"skill_codes": ["2.A.1.b"],
"tech_codes": ["43231507", "43232110"]
}

Successful response (200) example
{
"total_selected": 6,
"items": [
{
"occupation_code": "11-1011.00",
"occupation_title": "Chief Executives",
"count": 4,
"unmatched": {
"knowledge": [],
"skill": [
{ "code": "2.A.2.a", "title": "Critical Thinking" }
],
"tech": [
{ "code": "43232106", "title": "Presentation software" }
]
}
}
]
}

1. CORS Whitelist Control

Use the cors middleware and the environment variable CORS_ALLOWLIST.

Logic: Cross-origin access is allowed only when the origin in the request header is in the whitelist; otherwise, a 403 {"error":"CORS blocked"} response is returned.

Settings:

credentials: true → Supports cookies/sessions on the frontend.

Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS.

Custom headers: Content-Type, Authorization, X-CSRF-Token.

This prevents cross-domain calls from unknown websites and protects the API from abuse.

2. HTTP Security Headers (Helmet + CSP)

Use helmet() to add common security headers, for example:

X-Content-Type-Options: nosniff (prevents MIME type spoofing)

X-Frame-Options: SAMEORIGIN + frame-ancestors 'none' (prevents clickjacking and iframe nesting)

Referrer-Policy: no-referrer (prevents sensitive URL leakage)

Strict-Transport-Security: max-age=31536000; includeSubDomains (forces HTTPS)

Configured Content-Security-Policy (CSP):

default-src 'self' (trusts only itself by default)

connect-src restricts communication to the API itself and whitelisted frontend domains

Disallow third-party scripts (script-src 'self')

Disallow nesting by other sites (frame-ancestors 'none')

This layer is a defensive measure. XSS, clickjacking, and data injection.

3. Session Management + Redis Persistence

Use express-session to manage user sessions, with the following cookie settings:

httpOnly: true (Cookies cannot be read by JavaScript, preventing XSS theft)

secure: true (Transmission only over HTTPS, automatically enabled on render)

sameSite: lax / none (Defaults to lax locally, set to none for cross-site use)

maxAge: 8 hours

Sessions are stored in Redis, not in memory:

Use connect-redis + redis (or ioredis), and configure REDIS_URL.

Redis persistence ensures that sessions are not lost during service restarts or multi-instance deployments.

Debug route verification:

/debug/login → Set userId and write to the session

/debug/me → Read the session

/debug/redis, /debug/redis-write → Check Redis connection and writes
