# AGENTS.md — Agent Guide (Read First)

Read this file before doing any work in this repository.

---

## 1. Project Overview

**Inventory Management System (IMS)** — a multi-shop inventory, sales, customer-credit, and expense web app.

* Frontend: React SPA (Vite 8 + React 19 + TypeScript)
* Backend: Supabase (PostgreSQL, Auth, Data API/PostgREST, RLS, Storage)
* Full product/spec docs live in `docs/` (read the relevant one before a feature).
* Before writing any schema, migration, RPC function, or trigger, read
  `docs/Database Schema Guide.md`.
* Progress is tracked in `TODO.md` using `[x]`/`[ ]` markers.

---

## 2. Tech Stack

| Purpose | Library |
| ------- | ------- |
| Build tool | Vite 8 |
| UI framework | React 19 (React Compiler enabled) |
| Language | TypeScript |
| Component library | Material UI (MUI) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Animation | CSS transitions (no heavy animation library) |
| Server state | TanStack Query |
| Data tables | TanStack Table |
| Forms | React Hook Form |
| Validation | Zod |
| Backend | Supabase Client SDK |

---

## 3. Commands

```bash
npm run dev       # start dev server
npm run build     # typecheck (tsc -b) + production build
npm run lint      # eslint
npm run preview   # preview production build
```

Always run `npm run build` (and `npm run lint` where relevant) after changes.

---

## 4. Performance Is a Hard Requirement

**Speed is a core feature of this app.** Everything below is a rule, not a suggestion.
When a choice makes the app slower, it is rejected and replaced with the faster option.

### 4.1 Bundle Size & Loading

* **Code-split by route.** Use `React.lazy()` + `Suspense` for every page module.
  Never import a whole page at the top level of the router.
* **Import MUI parts, never barrels.** Import components individually
  (`import Button from '@mui/material/Button'`), and icons individually from
  `@mui/icons-material`. Never `import * as MUI from '@mui/material'`.
* **No animation library is bundled** — use lightweight CSS transitions only.
* **Vendor chunk splitting** in `vite.config.ts`: split `react`, `mui`,
  `@tanstack/*` into separate cached chunks.
* **Target:** initial JS payload as small as possible; lazy-load feature routes
  so the login/dashboard shell stays light.
* **No heavy libraries** (charting, moment/date-fns, lodash, etc.) without
  justification and tree-shaking proof.

### 4.2 Fonts & Assets

* **No render-blocking webfonts.** Use system font stacks, or self-hosted fonts
  with `font-display: swap`. Avoid Google Fonts `<link>` in `index.html`.
* **Images:** use SVG/WebP; set explicit `width`/`height` to prevent CLS; lazy
  load below-the-fold images. Do not ship large PNG/JPGs in the bundle.
* **Icons:** use MUI icons (tree-shaken) or inline SVG. Never import an icon
  library's full set.

### 4.3 Data Fetching (TanStack Query + Supabase)

* Centralize all Supabase calls behind a data layer (typed helpers) — never
  query Supabase directly inside components.
* Set sensible `staleTime`/`gcTime`; avoid refetch on every window focus unless
  data must be live.
* **Prefetch** likely-needed data (e.g., products/customers for the New Sale
  page) during idle time; do not block route render on it.
* **Debounce search inputs** (e.g., 300ms) — never fire a query per keystroke.
* **Pagination, never "load all".** Lists use TanStack Table pagination
  (server-side via Supabase `.range()`); cap page size.
* Select only needed columns in Supabase queries — never `select('*')` on wide
  rows; request aggregate reports via RPC functions.
* Use `suspense`/placeholder data to avoid loading spinners on every navigation.

### 4.4 Rendering

* React Compiler is enabled — do **not** hand-write `useMemo`/`useCallback`
  unless profiling proves a hotspot. Trust the compiler.
* **Virtualize long tables/lists** (add `@tanstack/react-virtual` when a table
  can exceed ~100 rows). Never render hundreds of DOM rows unconditionally.
* Avoid anonymous functions/objects recreated inside frequently re-rendering
  lists; key lists correctly.
* Animations must not run on every render — trigger on mount/state
  change only, and keep them GPU-friendly (`transform`/`opacity`).
* Respect `prefers-reduced-motion`: disable heavy animation for those users.

### 4.5 Forms (React Hook Form + Zod)

* Validate on submit/blur; keep Zod schemas lean and shared with the data layer.
* Avoid running heavy async validation synchronously in the render loop.
* Prevent duplicate submissions (disable button while pending).

### 4.6 Build & Config

* Keep `vite.config.ts` minimal; enable `build.reportCompressedSize`, use
  `rollupOptions.output.manualChunks` for vendor caching.
* Do not add CSS frameworks that inject runtime JS or duplicate Tailwind.
* Only `VITE_`-prefixed public keys are safe in the client bundle; never ship
  secrets (slows nothing but is a security rule).

### 4.7 Anti-Patterns to Never Introduce

| Avoid | Use instead |
| ----- | ----------- |
| Route-level top imports (loads everything upfront) | `React.lazy` + `Suspense` |
| `import * as` from MUI / icons barrels | Individual named/barrel-free imports |
| `moment` / `date-fns` (big) | Native `Intl`/`Date`, or a tiny formatter |
| Chart libs on dashboards without proof of need | Lean SVG/CSS summaries |
| `select('*')` on wide tables | Explicit column selection |
| Loading entire lists into the client | Server-side pagination (`range`) |
| Debounce-less search-on-change | Debounced queries |
| Heavy scroll/scroll-listener animation loops | GPU-friendly transforms, throttled |
| `useMemo`/`useCallback` everywhere | React Compiler + profiling |

---

## 5. Conventions

* No comments in code unless explicitly requested.
* Follow existing file/folder structure; ask before creating new top-level dirs.
* Form inputs: MUI field + React Hook Form + Zod resolver (`zodResolver`).
* Data fetching: TanStack Query hook + typed Supabase helper.
* Update `TODO.md` markers as tasks complete (`[x]` done, `[ ]` pending).
* If a change affects a spec, update the matching doc in `docs/`.
* Verify with `npm run build` and `npm run lint` after changes.
