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

**Purely static** — no build tool, no framework, no npm. Three HTML pages served directly by GitHub Pages.

### Pages
| File | Purpose |
|---|---|
| `index.html` | Public site (trainings, calendar, exercises, concept) |
| `admin.html` | Admin panel — login-gated CRUD for all data |

### Data flow
- On first load, `DataLayer.init()` fetches all `data/*.json` files and seeds **localStorage**
- All edits write to localStorage only
- Publishing = export JSON from admin → commit to `data/` → push → GitHub Pages

### JS modules (loaded via `<script src>`, no modules/bundler)
All files share a single global scope.

| File | Responsibility |
|---|---|
| `js/data.js` | `DataLayer` IIFE — localStorage CRUD for exercises, trainings, categories, users, concept, settings. Also `exportData()`, `reloadFromRepo()` |
| `js/views.js` | Pure functions returning HTML strings. Globals: `EVENT_TYPES`, `CATEGORY_LABELS`, `escHtml()`, `categoryBadge()`, `eventTypeBadge()`, `renderCalendarPage()`, etc. |
| `js/app.js` | `App` IIFE — hash router (`#/trainings`, `#/calendar/:y/:m`, `#/exercise/:id`, etc.), event delegation, form save logic, iCal fetch + parser, ICS export |
| `js/pdf.js` | `PDFExport` — wraps `window.print()` with title management |
| `js/admin.js` | Standalone admin logic — login (sessionStorage), section routing, CRUD modals for exercises/categories/users/concept/settings |

### Data files (`data/*.json`)
All loaded on init, editable via admin, exported for publishing:
- `exercises.json`, `trainings.json`, `categories.json`, `users.json`
- `concept.json` — 3-month plan structure
- `settings.json` — team info, iCal URL, `classificationRules[]`

### Key patterns

**Routing** (index.html): hash-based `#/section/id/action`. Handled in `App` → `handleRoute()`.

**Categories**: stored in localStorage as `fnj_categories`. The `categoryBadge()` function in views.js looks them up dynamically — color comes from `cat.color`, not CSS classes.

**Event types** (`EVENT_TYPES` in views.js): `trénink | zapas_doma | zapas_venku | turnaj`. Stored as `training.eventType`. External iCal events get auto-classified via `classifyEvent(title, rules)` in app.js using `settings.classificationRules`.

**Images on exercises**: stored as either `exercise.imageUrl` (URL string) or `exercise.imageData` (base64 data URL from file upload). Views prefer `imageData` over `imageUrl`.

**External calendar** (iCal): `fetchExternalEvents()` in app.js tries direct CORS fetch, falls back to `api.allorigins.win` proxy. Parsed with a hand-written iCal parser (`parseICS()`).

**Edit mode** (index.html): toggled via header switch, stored in localStorage. When OFF, edit/delete buttons are hidden — this is the default state for sharing URLs with assistants.

### CSS
- `css/style.css` — public site styles
- `css/admin.css` — admin panel styles (self-contained, no shared variables with style.css)
