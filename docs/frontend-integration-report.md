# Frontend integration report

Branch `version1` · backend `gocwgl_server` @ `7c2130e` · Oct 18, 2026

`pnpm lint`, `tsc --noEmit` and `pnpm build` all pass. Types are generated with `pnpm gen:api` (OpenAPI → `src/utils/api/types.ts` + `models.ts`).

## How it's wired

- **`src/utils/`** holds every bit of backend code: `api/` (client + one file per module + generated types), `auth/` (in-memory session, `restoreSession()`, `signOut()`, `<RequireStaff>` / `<RequireClient>`), `hooks/` (TanStack Query, one file per module; every mutation invalidates what it changes), `mappers/` (form, survey builder drafts), `format/` (cents, ISO dates in the business time zone), `errors.ts`, `providers.tsx` (one `QueryClientProvider` in `app/layout.tsx`).
- **Proxy:** `next.config.ts` rewrites `/api/*` → `BACKEND_URL` (default `https://api.gocwgl.com`; set `BACKEND_URL=http://127.0.0.1:8000` for a local backend), so cookies are same-site.
- **Tokens:** access token in memory only; one refresh at a time; 401 → refresh → retry once → `/login`. CSRF header on refresh/logout.
- **View as client:** the admin opens `/portal?as=<contactId>` in an iframe; the iframe asks the parent window for the token with `postMessage` (same origin, never in the URL) and never calls `/auth/refresh` itself. `/portal/*` calls carry `X-Client-Id`; write controls are hidden.
- **Embed codes** are shown as text, and previewed only in `<iframe sandbox="allow-scripts allow-forms" srcDoc>`.
- **Downloads** use an authenticated fetch → blob. Uploads use `FormData` (`file`, `category`).
- No component calls `fetch`; nothing reads `src/data/*` mock records; `lib/embedStore.ts` (localStorage) is deleted.

## 1. Screens connected

| Area | Screens |
|---|---|
| Sign-in | Sign in, 2-step code (incl. recovery codes, SSO `?oauth=mfa`), sign up, verify email + resend, forgot password, **new** reset-password step (`?reset_token=`), **new** accept-invite step (`?invite=`), `?oauth=success/unverified/error/cancelled`, signed-in card with the real user, session restore on load, sign out (admin sidebar, portal Account), Google/Microsoft buttons (show the API's 502 message when not configured) |
| Admin | Dashboard, Reporting, Contacts (all / active / inactive incl. archived), Add client, Edit contact (archive on `409 contact_has_billing`, unarchive, portal invite, custom-pipeline membership, links, embeds), Tags, Sales board + custom pipelines (drag & drop, editor), Calendars (list, new, edit, availability, scheduled calls with book/reschedule/cancel, booking-page preview from `/public/booking`, calendar sync), Payments (subscriptions, invoices, payment methods, billing modal), Build progress, Client media, Email (composer, sent list polling Queued → Sent, templates), Forms, Surveys, Automations (+ **new** recent-runs panel with cancel), Report bugs (tickets, replies, internal notes), Settings (profile, business, notifications, team, domains, security with TOTP QR + recovery codes, devices, sign out everywhere), View as client |
| Portal | Overview, to-do drawer, Funnels (+ catalog-priced request drawer, Polar "Pay now", embed codes), Daily reports (+ "email me" pref), System health (report a problem), Build progress, Assets + brand kit, Support (requests with threads, reply/close, chat), Billing (Polar checkout, start plan, update card, `?paid=` / `?subscribed=` return), Account (profile, alerts, portal team) |

### Verified in the browser (local backend)
Anonymous `/admin` → `/login`; sign up → email code (from the API console) → signed in → portal loads every section with 200s; create a support request; save profile; reload restores the session with exactly one refresh; client visiting `/admin` → `/portal`; sign out → `/portal` redirects to `/login`; wrong password shows the API message; correct sign-in; Google button shows "Google sign-in is not set up."; forgot → reset link → new password (204).

**Admin, as a local test owner:** first sign-in → "Set up 2-step verification" → Settings › Security (deep link); TOTP setup with QR + secret, confirm code, recovery codes shown once; sign out from the sidebar; sign in again with password + recovery code. Every admin page and settings tab loads with no failed calls. Writes checked: create tag; add client (+ duplicate email shows the 409 message); edit contact stage/phone; new calendar; booking-page preview slots from `/public/booking`; book a call from "Needs a time"; move a card on the sales board; create a custom pipeline, add a contact, move it; invoice (API total) and subscription, mark both paid; connect Stripe test keys (secret comes back masked, becomes default); delete a billed contact → 409 → "Archive instead" → Inactive → unarchive; start a build, tick a task (progress from the API), post an update; media upload, authenticated download, delete; email Queued → Sent; create form, survey (+ publish) and automation; reply, internal note and status on a ticket; save business details and notification switches; invite and cancel a team member; add a domain, check DNS (stays pending), remove it; save the subdomain. **View as client:** the portal loads read-only in the frame, every `/portal/*` call returns 200 with `X-Client-Id`, the frame never calls `/auth/refresh`, and no token is in the URL.

Two bugs found and fixed while testing: admin/portal deep links (`?tab=…`) were ignored after a client-side navigation (now read with `useSearchParams`), and Client Media only listed clients who already had files (paid clients now get an empty folder to upload into).

### Not verified yet
Accept invite (needs the invite email link), Polar checkout and Google/Microsoft sign-in (I-1/I-2/I-3), and drag-and-drop with a real mouse (the move buttons were used).

## 2. Still on mock / UI-only data

- **Sign-in brand panel** (`data/auth.ts` `BRAND_PANEL`): marketing copy with sample numbers ("4 / 4 funnels"). No API for it.
- **Pure UI constants** kept in `src/data/*`: colors, icons, labels, stage/tag palettes, provider forms, funnel type/add-on *descriptions* (names, steps and prices come from `/portal/funnels/catalog`), request types, time-zone list.
- **Price preview** in the funnel request drawer and the invoice modal sums catalog / line prices for display only; the saved price and `totalCents` come back from the API.
- **Admin dashboard "Revenue growth"** chart is now "New leads per day" (real data): there is no MRR history endpoint.
- **Embed / share snippets** for forms and surveys point at `forms.[yourdomain].com/embed.js` and `/survey/{id}`, which don't exist yet (see gaps).
- **Domain DNS table** shows only the verification TXT record from the API.

## 3. Backend gaps (needed, not invented)

1. `GET /admin/reports/dashboard` and `OverviewOut.kpis` are untyped (`object`) in OpenAPI and use **snake_case** keys (`new_leads`, `revenue_cents`, `daily_leads`…), unlike the rest of the API. Typed by hand in `utils/api/reporting.ts` / `OverviewSection.tsx`.
2. No MRR / revenue history series for the dashboard chart.
3. Reporting supports only 7/30/90 days: the old "This month", "All time" and custom-range filters are gone.
4. `GET /admin/contacts` caps pages at 100 and can't filter by sign-up date, subscription, call status or active/inactive; the UI pages through everything and filters for display (T-2).
5. Admin UI for a client's **to-dos, daily reports, health checks/incidents, funnels (incl. `quoteCents`), client chat inbox, audit log, sent alerts, jobs**: all wrapped in `utils/api` + hooks, but the current UI has no screens for them, so staff can't create to-dos/reports/checks from the app yet.
6. Portal assets can't be re-categorised by the client (no `PATCH /portal/assets/{id}`).
7. Funnel requests have no `goal` (the API copies `offer`) and no per-funnel links; the drawer's link picker was removed.
8. No "send invoice reminder" endpoint (button removed) and no per-invoice/subscription payment-provider choice.
9. `ClientBillingOut` has no card brand/last 4 ("Card on file" is shown instead).
10. `PUT /admin/payment-connections/{provider}` replaces every field, so updating means re-entering all keys.
11. A client can't edit their business name/website (only `/users/me` fields).
12. Domains: only the TXT verification record is returned; the A/CNAME routing targets aren't.
13. No hosted public form/survey page or embed script, no ICS feed for CRM bookings, no "write bookings to" target for calendar sync.
14. Forms always set a stage (no "don't change stage").
15. `GET /auth/oauth/{provider}/authorize` answers 502 JSON instead of redirecting to `/login?oauth=error`; the login page pre-checks with a no-follow request.
16. Build "Reply or give feedback" has no endpoint; it sends a portal message.
17. Health checks with `clientAction: "reconnect"` have no reconnect flow (F-2); the button sends a report.
18. `GET /admin/media` lists only clients that already have files; the UI adds paid clients as empty folders.

### Where the code and the guide differ
- `openapi-typescript` needed `--default-non-nullable false`; otherwise every defaulted request field became required.
- `/auth/refresh` without a cookie answers **403 `csrf_failed`**, not 401; it's treated as "signed out".
- The README's example puts types in `src/lib/api-types.ts`; the guide's `src/utils/api/types.ts` was used.

## Local test data created
In the local `gocwgl_crm` database: owner **owner.test.claude@example.com** (2-step on), client **portal.test.claude@example.com** ("Claude Test Studio") with request REQ-100 (now "In progress", with a reply and a note), contact **Lena Testcase** with invoice INV-1001 and a $97/month subscription (both paid), a build, a booked call and a sent email, tag "Integration test", calendar "Discovery Call Test", pipeline "Onboarding Test", form "Test signup form", survey "Test survey", automation "Test welcome flow", and a Stripe connection with fake test keys. The business name was set to "GoCWGL Test HQ" and the subdomain to "claudetest"; change them back in Settings if you had other values. Delete the rest when you no longer need it.
