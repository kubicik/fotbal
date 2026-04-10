# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deployment

No build step. Push to `main` → GitHub Actions deploys to GitHub Pages automatically.

```bash
git add data/           # after editing JSON
git commit -m "..."
git push
```

Local dev: `python3 -m http.server 8000` (fetch() requires HTTP, not file://).

Live site: `https://kubicik.github.io/fotbal/`
Admin panel: `https://kubicik.github.io/fotbal/admin.html` (login: admin / admin)

## Architecture

**Purely static** — no build tool, no framework, no npm. Two HTML pages served directly by GitHub Pages.

### Data flow
- On first load, `DataLayer.init()` fetches all `data/*.json` files and seeds **localStorage**
- All edits write to localStorage only
- Publishing = edit JSON in `data/` → commit → push → GitHub Pages serves updated data
- Admin has "Načíst data z webu" button (`reloadFromRepo()`) to reseed localStorage from deployed JSON

### JS modules (loaded via `<script src>`, no modules/bundler)
All files share a single global scope.

| File | Responsibility |
|---|---|
| `js/data.js` | `DataLayer` IIFE — localStorage CRUD for all entities. `init()` seeds on first load and backfills missing keys (pattern used when new data files are added). `exportData()`, `reloadFromRepo()` |
| `js/views.js` | Pure functions returning HTML strings. Globals: `EVENT_TYPES`, `escHtml()`, `renderMarkdown()`, `resolveLocation()`, `renderCalendarPage()`, `renderPlayersPage()`, `renderTestingsPage()`, `renderTestingDetail()`, etc. |
| `js/app.js` | `App` IIFE — hash router, event delegation, form save logic, iCal fetch + parser (`parseICS()`), ICS export |
| `js/pdf.js` | `PDFExport` — wraps `window.print()` |
| `js/admin.js` | Standalone admin — login (sessionStorage), section routing, full-page editors (training composer, testing event editor), CRUD modals |

### Data files (`data/*.json`)
| File | Contents |
|---|---|
| `exercises.json` | Exercise library |
| `trainings.json` | Training sessions with ordered exercise references |
| `categories.json` | Exercise categories (id, name, slug, color) |
| `users.json` | Admin users |
| `players.json` | Squad — players (`role: "hráč"`) and coaches (`role: "trenér"`) |
| `testings.json` | Testing events — each event has N tests, each test has per-player results with multiple attempt values |
| `concept.json` | 3-month plan structure |
| `settings.json` | Team info, iCal URL, `classificationRules[]` (keyword→eventType), `locationAliases[]` (keyword→short name) |

### Key patterns

**Routing** (index.html): hash-based `#/section/id/action`. Routes: `trainings`, `training/:id`, `exercises`, `exercise/:id`, `calendar/:y/:m`, `players`, `testings`, `testing/:id`, `concept`.

**Adding a new data type**: (1) add key to `DATA_KEYS` in data.js, (2) add backfill check in `init()` for already-initialized localStorage, (3) add fetch to `init()` first-run block, `reloadFromRepo()`, and `exportData()`, (4) export CRUD functions in public API.

**Event types** (`EVENT_TYPES` in views.js AND admin.js — both must stay in sync): `trénink | zapas_doma | zapas_venku | turnaj | jine`. External iCal events are classified via `classifyEvent(title, rules)` in app.js — default fallback is `'jine'` (gray), not `'trénink'`.

**Calendar location display**: `resolveLocation(location, aliases)` in views.js maps raw location strings to short names using `settings.locationAliases[]`. Calendar event blocks show category label + location (two lines), full title in `title` attribute.

**Players/coaches**: same `players` array, distinguished by `role` field (`"hráč"` default, `"trenér"`). Public roster shows coaches section above players section.

**Testing events model**: `{ id, date, name, description, tests: [{ id, testName, unit, lowerIsBetter, results: [{ playerId, values: number[] }] }] }`. Completely separate from `player.tests[]` (legacy, kept empty).

**Markdown**: `renderMarkdown()` in views.js (public) — supports `**bold**`, `*italic*`, `- bullets`, `1. numbered`, `---` divider. Admin has its own copy in admin.js. Used for exercise descriptions and training notes.

**Images on exercises**: `exercise.imageUrl` (URL) or `exercise.imageData` (base64). Views prefer `imageData`.

**External calendar** (iCal): direct CORS fetch first, falls back to `api.allorigins.win` proxy.

**Edit mode** (index.html): toggled via header switch, stored in localStorage. Default OFF — hides edit/delete buttons for sharing.

### CSS
- `css/style.css` — public site (no shared variables with admin)
- `css/admin.css` — admin panel (self-contained)
