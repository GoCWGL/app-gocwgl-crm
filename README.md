# GoCWGL CRM

Next.js 16 (App Router) + TypeScript + SCSS. Three screens:

| Route     | What it is                                                                                  |
| --------- | ------------------------------------------------------------------------------------------- |
| `/login`  | Sign in, sign up, forgot password and the security-code step (`/` redirects here)            |
| `/admin`  | Admin CRM: dashboard, contacts, pipeline, calendar, payments, build progress, media, email, forms, automation, reporting, bug reports, settings |
| `/portal` | Client portal: overview, funnels, daily reports, system health, build progress, assets, support, billing, account |

Demo admin login: `christian@gocwgl.com` / `GoCWGL2026!`. Any 6-digit code works at the security-code step. Any other email signs in as a client.

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Project structure

```
src/
  app/                 Routes only (thin pages that render a feature)
  features/
    auth/              Sign-in flow (SignInPage + one component per step)
    portal/            Client portal: PortalApp, sections/, components/, state/, lib/
    admin/             Admin CRM:    AdminApp,  sections/, components/, modals/, state/, lib/
  components/
    ui/                Reusable UI kit: Button, Badge, Field/Input/Select, Modal, Toggle,
                       SegmentedControl, ProgressBar, BarChart, StatGrid, Timeline, FileCard, Icon…
    layout/            AppShell, Sidebar, PageHeader
  data/                Sample data and option lists (auth.ts, portal.ts, admin/*.ts)
  lib/                 Small helpers: utils (money, ids, CSV), dates, tones
  assets/images/       Logos
  styles/              SCSS (see below)
```

Each feature keeps its shared state in one React context (`state/PortalContext.tsx`, `state/AdminContext.tsx`). Sections read it with `usePortal()` / `useAdmin()` and keep form drafts and filters in local state.

## Styles

All styles are global SCSS, imported once in `src/app/layout.tsx` through `src/styles/main.scss`:

```
styles/
  abstracts/   tokens (_variables), functions, mixins, keyframes — no CSS output
  base/        reset, typography, element defaults
  layouts/     app shell, sidebar, page header
  components/  one partial per UI component (button, card, modal, table…)
  pages/       auth, portal/*, admin/* — styles for a single screen
  utilities/   tone classes, animations, helpers (loaded last)
```

Class names follow BEM (`block__element--modifier`). Colors come from named **tones** (`cyan`, `green`, `amber`, `brand`…) defined once in `abstracts/_variables.scss`. Components take a `tone` prop, which adds a `.tone-<name>` class exposing `--tone-bg`, `--tone-fg` and `--tone-solid`, so TSX never contains hex colors.

## Before going live

All data is sample data held in memory; nothing is saved after a reload. You still need to:

- connect a backend or database for contacts, payments and the rest;
- replace the demo password in `src/data/auth.ts` with real authentication;
- make the admin's "View as client" a read-only session for the chosen client.
