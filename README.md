# OppDate - Monorepo

AI-powered global opportunity application platform.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Node.js + Fastify |
| Database | PostgreSQL (Docker locally, Neon in production) + Drizzle ORM |
| Real-time | WebSocket via @fastify/websocket (singleton hook with exponential backoff reconnect) |
| AI | Anthropic Claude (claude-haiku-4-5 for eligibility assessment, claude-opus-4-6 for Guide chat) |
| Payments | Stripe + Flutterwave + Paystack |
| File Storage | Cloudflare R2 |
| Email | Resend |
| Hosting | Render (API), Vercel (frontend) |
| Monitoring | Sentry (error tracking), BullMQ (background jobs via Redis) |

## Project Structure

```
oppdate/
  apps/
    web/          <- Next.js frontend
    api/          <- Fastify backend
  packages/
    types/        <- Shared TypeScript types
    utils/        <- Shared utilities
```

## Build Status

<!-- oppdate:build-status:start -->
_Last updated: 2026-10-30_

| Feature | Status | Notes |
|---|---|---|
| projectScaffolding | done | Monorepo, Docker, Fastify API, Next.js web, GitHub repo set up with main + dev branches |
| databaseSchema | done | Proposal B pivot fully applied. Removed all Gmail credential columns and portal credential columns from applications. Removed gmail_setup from applicationStatusEnum. Added: complianceCategoryEnum (A/B/C), documentReadinessStatusEnum (ready/needs_refinement/needs_creation). Added cover_letter, statement_of_purpose, essay to documentTypeEnum. threadTypeEnum: apply_for_me renamed to vip_assist. paymentPurposeEnum: apply_for_me renamed to vip_assist, added premium. users table: hasPaid replaced by isPremium + premiumSince + premiumUntil. opportunities table: added oppDateApply (bool), complianceCategory, institutionLogoUrl. New tables: authorizationAgreements (RAA signed before payment), applicationDocuments (per-slot readiness tracking). type-check clean on both workspaces. |
| landingPage | done | Final version approved by Emmanuella 2026-06-01. Exported to GitHub Pages. Ready for Next.js build on feature/landing-page branch. |
| mobileNav | done | Landing page Navbar with mobile hamburger menu, Services dropdown (desktop mega menu + mobile accordion), all links wired including /services/consultations. Footer links updated. |
| authSystem | done | Email/password auth and Google OAuth both wired. Google OAuth returns isNew flag to route new users to /onboarding. Admin login at /admin/login. Seed script creates super_admin. JWT stored in localStorage as oppdate_token; cleared on 401. httpOnly cookie + ws-ticket pattern implemented for WebSocket auth. Redirect-after-auth: ?redirect= param preserved through login and register flows; middleware carries full pathname + search string. |
| opportunityListings | done | Fully wired to real API. Three-state premium gating (guest 10 / free 20 / premium all unlocked). LockedCard shimmer placeholder with gate modal. Saved searches - save button in filter bar, dropdown to apply/delete — now gated to premium only (requirePremium on all 4 routes + UI hidden for free users). Institution logos rendered in cards when available. Filter tabs mapped to URL params. Search overlay (Cmd+K) gated to premium — free users see UpgradeModal. Recommendations widget: fixed ?opp= → ?slug= nav param so clicked cards pre-select and scroll correctly in listings panel. Capped at 6 with scoped query key to prevent cache bleed. |
| applyForMeFlow | done | Full apply flow wired: eligibility scoring with AI-generated assessment result (POST /api/v1/ai/eligibility-assessment), real document library modal + file upload to R2, application_documents table migrated, borderline modal and ineligible view both show AI-written summary and concern cards. Payment step calls Stripe checkout. Submitted view shows 4-stage pipeline. Application DB record deferred to payment confirmation step. |
| paymentIntegration | done | Premium subscription gate fully implemented: backend requirePremium middleware on GET /:slug (403 for non-premium), all non-premium users see zero real listings (all locked), persistent locked gate panel on listings right panel. Sidebar premium badge with expiry awareness (amber when <=7 days). Post-upgrade success banner on dashboard (?payment=success). Renewal nudge within 7 days of premiumUntil. IP-based regional pricing via geoip-lite (server-side, not spoofable). Lemon Squeezy eBook checkout flow: POST /ebooks/:id/checkout creates LS checkout URL, webhook handler confirms purchase. UpgradeModal cleaned up: no lockedCount, no manual PPP toggle, auto-detects region from API. Pending: LEMONSQUEEZY_API_KEY/STORE_ID/WEBHOOK_SECRET env vars, lsVariantId per eBook in admin, Stripe webhook secret for isPremium flip. |
| userDashboard | done | Dashboard, applications list, opportunity listings, messages, and credential library all wired. Onboarding checklist card. Notification bell badge resets on open. Full notifications page with 6 filter tabs. Notification click navigation: resolveHref maps all 7 notification types to correct routes, clicking navigates and closes dropdown. Notification preferences fully wired end-to-end with Resend (prefs.key !== false pattern — default on). Covers: inapp_pipeline, email_app_status, inapp_reminders, email_deadline, inapp_announcements, email_matching, email_new_message, email_security. Security alert email on password change. Profile page: fieldOfStudy and educationLevel fields added. Fixed Apply For Me CTA routing (/services/apply). |
| adminPanel | done | All wireable screens done. Avatar Presets module added at /admin/avatars (manager_admin+): upload images to R2 under avatars/presets/, label, delete with confirm dialog. DB migration 0014_avatar_presets applied. Public GET /api/v1/auth/avatar-presets endpoint added. ProfileSettingsPage preset tab now fetches from API instead of hardcoded placeholder array. Landing nav right-side filter links fixed via React.createElement interception (GROUP_LINK_HREFS map). Mentorship automated first message on payment confirmation wired. |
| advertisingSpaces | done | Public GET /api/v1/admin/ads/public?zone= endpoint added (no auth). AdBanner component fetches active placement and renders Google AdSense or image/link ad based on config. Inserted into ListingsPage (listings_feed zone, after GuideCTA) and DashboardPage (dashboard zone, below SavedSection). Admin can toggle placements and set config via the Advertising tab in Settings. |
| onboardingTooltips | done | Full onboarding wizard at /onboarding: welcome screen with word-by-word animation, Step 1 (role tiles), Step 2 (interest multi-select), Step 3 (country/nationality fields), Step 4 (goal tiles), personalising loader, then redirect to /dashboard. New users routed here from register page and Google OAuth (isNew flag). Preferences persisted server-side via PATCH /auth/me. |
<!-- oppdate:build-status:end -->

## Phase 2 Features

| Feature | Status | Notes |
|---|---|---|
| ebookReader | done | In-app PDF reader using react-pdf + pdfjs-dist. Page-by-page canvas rendering. Light/sepia/dark themes. Text size controls (small/medium/large/xl). Table of contents drawer (desktop sidebar, mobile bottom sheet). Reading progress sync via PATCH /api/v1/ebooks/:id/progress, debounced 2s + immediate on visibilitychange. Page turn via buttons, keyboard (arrows/space), and swipe gestures on mobile. Thumbnail strip with IntersectionObserver-based virtualisation. |
| consultationsBooking | done | Booking flow wired to live admin-managed mentor profiles (GET /api/v1/mentorships/mentors). Consultant lookup by UUID or slug fallback. Session pricing tiers (30/60/90 min). Redirect-after-auth preserves booking flow state. |
| mentorshipProgrammes | done | Admin panel creates/edits/deactivates programmes. Two core programmes seeded: 30-Day BSC ($250/mo) and 30-Day MSC ($350/mo). Seed script: yarn workspace @oppdate/api db:seed-mentorship-programmes. Admin mentorship stats use real data. |
| supportEmail | done | POST /api/v1/support enqueues email via Resend (BullMQ) instead of console.log. SUPPORT_EMAIL env var configures recipient (defaults to support@oppdate.com). |
| dynamicGuideQuiz | done | OppDate Guide eligibility quiz pulls questions from the current opportunity's eligibilityCriteria rather than hardcoded Chevening questions. Opportunity slug passed to GET /api/v1/ai/eligibility-criteria. |

## Messaging System Enhancements

All changes in this section were applied on 2026-10-22 as a single batch across `apps/api`, `apps/web`, and `packages/types`.

### Backend changes (`apps/api/src/routes/`)

**messaging.ts**
- Cursor-based pagination on `GET /threads/:id`: accepts `?before=<messageId>&limit=50`, returns `{ messages, hasMore }` instead of a hard 100-message cap.
- Replaced single `typing` WebSocket event with `typing_start` and `typing_stop`. Server auto-expires typing state after 3 seconds if no `typing_stop` arrives.
- New `PATCH /threads/:id/read` endpoint: updates `last_read_message_id` on the thread and resets `unreadByUser` to 0.
- New `POST /threads/:threadId/document-requests`: admin creates a document request with labelled items. Stores a `type='document_request'` message in the thread with JSON content referencing the request ID.
- New `GET /threads/:threadId/document-requests`: returns all document requests and their items for a thread, including per-item upload status (`pending`, `uploaded`, `verified`).

**documents.ts**
- After any document upload, emits a `document_uploaded` WebSocket event to the thread owner and assigned admin: `{ type: 'document_uploaded', threadId, documentId, itemId }`.

**admin.ts**
- Admin thread list (`GET /admin/messages`) now returns `referenceId` on each thread, linking it to its application record.
- Added `avgResponseTimeMs` to each thread row: computed as the average time between last user message and the next team reply per thread.

### Database migrations

**0017_document_requests.sql**
```sql
CREATE TABLE document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE document_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES document_requests(id) ON DELETE CASCADE,
  label text NOT NULL,
  document_id uuid REFERENCES documents(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','uploaded','verified')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**0018_read_cursors.sql**
```sql
ALTER TABLE message_threads ADD COLUMN last_read_message_id uuid REFERENCES messages(id);
```

### Frontend changes (`apps/web/src/`)

**hooks/useWebSocket.ts**
- Added `typing_start`, `typing_stop`, `document_uploaded` to the `WsMessage` type union.
- Added `documentId`, `itemId`, `status` fields to `WsMessage`.

**components/messages/MessagesPage.tsx**
- Per-thread typing state (`typingByThread`) with 4-second auto-dismiss timer on `typing_start` and immediate clear on `typing_stop`.
- Per-thread `hasMore` flag and `handleLoadMore` function: fetches with `?before=<firstMessageId>`, prepends to message list, preserves scroll position.
- `DocumentRequestCard` component uses React Query (`useQuery` with key `['doc-requests', threadId, requestId]`). On `document_uploaded` WS event, invalidates the matching query key so the card re-fetches item statuses without a page reload.
- Composer: `Enter` sends, `Shift+Enter` newlines. Character counter appears at 400 chars, soft warning at 800. Send button cycles through disabled / ready / sending / sent states.
- "New messages" scroll pill: appears when user is scrolled up and a new message arrives; clicking snaps to bottom; auto-dismisses on scroll.
- Application context ribbon above the thread view: shows opportunity name, deadline countdown (red if 7 days or fewer), compliance category, application status, and assigned team member. Collapsed by default after first open (state in `localStorage`).
- Region-aware background tint on the chat canvas: Africa (warm amber), Europe (cool slate), UN/International (teal), derived from `thread.opportunityCountry`.
- Mobile: CSS transform-based push navigation (thread slides in from right, list slides back from left). Swipe gestures on thread rows (swipe right marks read via `PATCH /threads/:id/read`, swipe left mutes). `visualViewport` resize listener shifts the composer up when the iOS keyboard appears. `env(safe-area-inset-bottom)` on composer wrapper.

**components/admin/AdminMessagesPage.tsx**
- Wired to `useWebSocket`. On `new_message`: if the thread is open, appends to a live message buffer so the reply appears immediately without waiting for a query refetch. If the thread is not open, triggers a shimmer animation on the thread row and invalidates the thread list query for unread count.
- Poll interval reduced from 30 seconds to 120 seconds; WebSocket handles real-time delivery for the active thread.
- `DocRequestForm` component: admin types labelled document names, submits to `POST /threads/:threadId/document-requests`. On success, invalidates the thread detail query so the card appears in the thread.
- Thread rows show average response time pill (`avgResponseTimeMs` from API).
- Mobile conversation view now fetches thread messages via `useQuery` (previously rendered an empty array from stale local state). Composer wired with `value`, `onChange`, `onKeyDown`, and `onClick` send - was previously uncontrolled and non-functional on mobile.

**app/admin.css**
- Fixed `.adm-tv-dategroup`: added `align-items: stretch` so `align-self: flex-end` on team bubbles takes effect. Without this, all bubbles rendered left-aligned regardless of sender.
- Fixed `.adm-tv-turn.user .adm-tv-bubble`: improved contrast (background `rgba(255,255,255,0.07)`, border `rgba(255,255,255,0.13)`). User bubbles were nearly invisible against the dark background.
- Fixed `.adm-tv-msgtime`: changed from `opacity: 0` (always hidden) to `opacity: 0.6` (always visible, brightens on hover).
- Added `@keyframes admRowShimmer` and `.adm-trow-shimmer`: highlight animation for thread rows that receive a new message while not selected.
- Added `.adm-trow-resptime`: avg response time pill on thread rows.
- Added `button.adm-tv-docreqbtn` and `.adm-docreq-form` with all child styles: inline document request creation form in the thread header.

**components/admin/AdminApplicationsPage.tsx**
- Application detail sidebar now uses admin API endpoints (`GET /api/v1/admin/messages` to find the thread by `referenceId`, `POST /api/v1/admin/messages/:id/reply` to send). Previously used user-facing endpoints, causing messages sent from the sidebar to appear as user messages instead of team messages.
- `referenceId` added to admin thread list select query in `admin.ts` to enable the application-to-thread lookup.
- Fixed duplicate React key warning: three pipeline stages (`verified`, `preparing`, `submitted`) all map to `dbStatus: 'accepted'`. Deduplication filter added; `stageKey` used as React key instead of `dbStatus`.

### New API endpoints added

| Method | Path | Description |
|---|---|---|
| GET | /messages/threads/:id | Now accepts `?before=<messageId>&limit=50` for cursor pagination |
| PATCH | /messages/threads/:id/read | Update read cursor, reset unread count |
| POST | /messages/threads/:id/document-requests | Admin creates a document request with labelled items |
| GET | /messages/threads/:id/document-requests | Fetch all document requests and item statuses for a thread |
| GET | /messages/ws-ticket | Issue a short-lived WebSocket auth ticket (already existed, documented here for completeness) |

---

## Session and Auth Hardening

All changes in this section were applied on 2026-10-27. The session timeout audit exposed 7 bugs across the backend and frontend token lifecycle. All 7 are now fixed.

### Session model (post-fix)

| Token / Cookie | Lifetime | Storage | Revocable on logout |
|---|---|---|---|
| User access token (JWT) | `JWT_EXPIRES_IN` (default 15m) | Signed JWT (stateless) | No - expires naturally |
| User access token cookie | Matches `JWT_EXPIRES_IN` exactly | Browser cookie (httpOnly) | Yes - cleared |
| User refresh token | `SESSION_IDLE_TIMEOUT` (default 1h) | PostgreSQL `refresh_tokens` table | Yes - deleted from DB |
| User refresh token cookie | `SESSION_IDLE_TIMEOUT` | Browser cookie (httpOnly, path /api/v1/auth) | Yes - cleared |
| Admin access token (JWT) | 8 hours (hardcoded) | Signed JWT (stateless) | No - expires naturally |
| Admin access token cookie | 8 hours | Browser cookie (httpOnly) | Yes - cleared |
| Password reset token | `PASSWORD_RESET_EXPIRES_IN` (default 15m) | Signed JWT (stateless) | No |
| WebSocket ticket | 60 seconds | Signed JWT (stateless) | No |

### Key concept: JWT_EXPIRES_IN vs SESSION_IDLE_TIMEOUT

`JWT_EXPIRES_IN=15m` controls how often the frontend silently rotates the access token. Users never see or feel this - it is a security rotation frequency. `SESSION_IDLE_TIMEOUT=1h` controls how long the session survives after the tab is hidden or closed. While the tab is visible, every silent refresh resets the idle clock, so the session is continuous. The idle timer only starts counting when the tab goes dark.

### Bug fixes applied

**BUG 1 - JWT_REFRESH_EXPIRES_IN was dead code**
`apps/api/src/routes/auth.ts` defined `JWT_REFRESH_EXPIRES_IN=30d` in `.env` and documented it in CLAUDE.md, but `createRefreshToken()` used a hardcoded `30 * 24 * 60 * 60 * 1000` constant and never read it. Fixed by removing the dead env var, adding `SESSION_IDLE_TIMEOUT=1h`, and making `createRefreshToken()` read and parse it via `parseExpiryToMs()`.

**BUG 2 - Access token cookie maxAge did not match JWT expiry**
`apps/api/src/utils/cookies.ts` set the `oppdate_token` cookie to `40 * 60` (40 minutes) while the JWT inside it expired at 15 minutes. The browser held a cookie pointing to a dead token for 25 extra minutes. Fixed: `ACCESS_TOKEN_MAX_AGE` is now computed from `JWT_EXPIRES_IN` at module load via `parseExpiryToSeconds()`, so cookie and JWT always expire together.

**BUG 3 - Admin refresh token was non-functional**
`apps/api/src/routes/admin.ts` generated an admin refresh token with `crypto.randomBytes(40)` and placed it in the `oppdate_admin_refresh` cookie with a 30-day maxAge. It was never stored in the database and no admin `/refresh` endpoint existed to consume it. The cookie was entirely dead. Fixed: token generation removed from admin login, cookie no longer set, `setAdminAuthCookies` signature simplified to `(reply, accessToken)`. Admin sessions are honestly 8-hour-only with no refresh path.

**BUG 4 - Password reset token expiry was not independently configurable**
`apps/api/src/routes/auth.ts` called `server.jwt.sign({ type: 'password_reset', ... })` with no `expiresIn` override, so the reset token silently inherited `JWT_EXPIRES_IN`. The email copy hardcoded "It expires in 15 minutes" which would lie if `JWT_EXPIRES_IN` was ever changed. Fixed: added `PASSWORD_RESET_EXPIRES_IN=15m` to `.env`, passed it explicitly to `jwt.sign()`, and the email body now reads the actual env var value.

**BUG 5 - No frontend token refresh - sessions died at access token expiry**
`apps/web/src/lib/api.ts` had a 401 interceptor that immediately cleared the token and redirected to login. A user idle for 16 minutes would be logged out even with a valid 30-day refresh token in the database. Fixed: the 401 interceptor now attempts `POST /auth/refresh` first, stores the new access token, and retries the original request - the user never sees a login screen. Concurrent 401s queue behind a single in-flight refresh call to prevent duplicate requests and redirect storms. Admin routes and the refresh endpoint itself are excluded.

**BUG 6 - Inactivity logout fired on active sessions (cross-tab bug)**
`apps/web/src/hooks/useInactivityLogout.ts` tracked the last-active timestamp in `localStorage`, which is shared across all tabs. If a user had two OppDate tabs open and only interacted with one, the 30-minute timer would still log out the idle tab even if the user was actively working in the other. Fixed: `useInactivityLogout` deleted entirely. Replaced with `useSessionKeepAlive` (new file) which runs a 13-minute refresh interval while the tab is visible, stops it on `visibilitychange -> hidden`, and immediately calls `/refresh` on `visibilitychange -> visible`. On return, the session is silently restored or login is shown if the refresh token expired.

**BUG 7 - Frontend cookie maxAge was 7 days regardless of session state**
`apps/web/src/lib/token.ts` set `COOKIE_MAX_AGE = 60 * 60 * 24 * 7` (7 days), leaving the browser cookie pointing at an expired JWT for days. Fixed: `COOKIE_MAX_AGE` reduced to `60 * 60 * 2` (2 hours) - a safe ceiling above the default 1-hour `SESSION_IDLE_TIMEOUT`.

### New and changed files

| File | Change |
|---|---|
| `apps/api/.env` | Removed `JWT_REFRESH_EXPIRES_IN`, added `SESSION_IDLE_TIMEOUT=1h`, added `PASSWORD_RESET_EXPIRES_IN=15m` |
| `apps/api/src/utils/time.ts` | NEW - `parseExpiryToMs()` and `parseExpiryToSeconds()` helpers for parsing strings like `'1h'`, `'15m'`, `'30d'` |
| `apps/api/src/utils/cookies.ts` | `ACCESS_TOKEN_MAX_AGE` now derived from `JWT_EXPIRES_IN`; admin refresh cookie removed from set/clear |
| `apps/api/src/routes/auth.ts` | `createRefreshToken()` reads `SESSION_IDLE_TIMEOUT`; password reset uses `PASSWORD_RESET_EXPIRES_IN` |
| `apps/api/src/routes/admin.ts` | Admin refresh token generation removed; `setAdminAuthCookies(reply, accessToken)` only |
| `apps/web/src/hooks/useInactivityLogout.ts` | DELETED |
| `apps/web/src/hooks/useSessionKeepAlive.ts` | NEW - tab-visibility-aware keep-alive with 13-minute refresh interval |
| `apps/web/src/lib/api.ts` | 401 interceptor replaced with refresh-and-retry; concurrent 401s queued |
| `apps/web/src/lib/token.ts` | `COOKIE_MAX_AGE` reduced from 7 days to 2 hours |
| `apps/web/src/components/app-shell/AppLayout.tsx` | `useInactivityLogout` replaced with `useSessionKeepAlive` |

---

## Admin Panel Improvements

All changes in this section were applied on 2026-10-30.

### Application management

- Stage advancement from the detail sidebar now updates the UI immediately without a page refresh. `statusMutation.onSuccess` patches `stage`, `dbStatus`, and `updated` directly on local state rather than waiting for the query refetch.
- "Jump to stage" dropdown redesigned to match the custom dark panel style. Uses `createPortal` with `position: fixed` and `getBoundingClientRect` to escape parent `overflow: hidden` containers. Fixed a bug where all jump destinations sent `submitted` to the DB regardless of selection - replaced `STAGE_ADVANCE_DB_STATUS` with a dedicated `STAGE_TO_DB_STATUS` destination map.
- Email notification sent on every application stage advancement (fire-and-forget, non-blocking). Uses the existing `applicationStatusEmail` template.
- Removed "Delete application record" and "View opportunity listing" from the application action menu.
- "View full thread" button in the application sidebar now navigates to `/admin/messages?thread=<id>` and the messages page reads the `thread` URL param to open the correct thread on load.

### Payments page

- `GET /admin/payments` now joins `users` and `opportunities` tables: returns `userName`, `userEmail`, `userAvatarUrl`, and `opportunityTitle` alongside each payment row.
- Table columns revised: "Transaction ID" renamed to "Reference", "Source" renamed to "Service" with a compact badge. Fee column removed. Opportunity title shown as a sub-line under the service badge.
- User avatars rendered in table rows and both desktop and mobile detail views, with initials fallback.
- Refund flow rewritten as an honest manual workflow. No gateway API call is made. Admin opens the gateway dashboard via a direct link, processes the refund there, then clicks "Mark as refunded" to update OppDate records. Confirmation dialog on desktop, bottom sheet on mobile.
- Download receipt button now opens a `ReceiptPrintModal` showing a branded receipt card (monogram, amount, reference, customer, service, gateway, transaction ID, date). "Print / Save PDF" opens a new browser window and triggers `window.print()` - no PDF library required.
- Receipt status badge reflects the actual payment status (green for succeeded, amber for pending/processing, red for failed).

### Email templates

- All 8 email templates rewritten with a professional table-based HTML layout: dark header, amber gradient divider, white card body, footer.
- `paymentConfirmationEmail` now accepts `gatewayPaymentId`, `gateway`, and `date` and renders a full receipt table in the email body (reference, service, amount, paid via, transaction ID, date). Clients receive this automatically at payment confirmation time via Stripe and Paystack webhooks.

### Files changed

| File | Change |
|---|---|
| `apps/api/src/routes/admin.ts` | Email after stage advance; payments join users + opportunities |
| `apps/api/src/routes/applications.ts` | `GET /:id` selects `opportunityDeadline` and `assigneeName` via correlated subquery |
| `apps/api/src/utils/email.ts` | `paymentConfirmationEmail` accepts `PaymentReceiptParams`; receipt table in email body |
| `apps/api/src/routes/payments.ts` | Webhook handlers pass `gatewayPaymentId` and `gateway` to confirmation email |
| `apps/web/src/components/admin/AdminApplicationsPage.tsx` | Optimistic stage update; portal dropdown; `STAGE_TO_DB_STATUS` map; removed delete + view listing actions |
| `apps/web/src/components/admin/AdminMessagesPage.tsx` | `selectedId` initialised from `?thread=` URL param |
| `apps/web/src/components/admin/AdminPaymentsPage.tsx` | Joined payment data; avatar rendering; manual refund flow; `ReceiptPrintModal` component |
| `apps/web/src/app/admin.css` | Source badge variants; gateway badge; refund divider; receipt modal styles |

---

## Getting Started

### Prerequisites
- Node.js >= 20
- Yarn >= 1.22
- Docker (for local PostgreSQL via `docker-compose.yml`)

### 1. Install dependencies

```bash
yarn install
```

`yarn.lock` is committed intentionally. Run `yarn install` again after any dependency changes to keep it up to date.

### 2. Set up environment variables

```bash
cp apps/api/.env.example apps/api/.env
# Fill in your values
```

### 3. Run database migrations

```bash
yarn db:migrate
```

### 4. Start development

```bash
# Both frontend and backend
yarn dev

# Backend only
yarn dev:api

# Frontend only
yarn dev:web
```

## API Endpoints

All endpoints are prefixed with `/api/v1`

| Method | Path | Description |
|---|---|---|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout |
| GET | /auth/me | Get current user |
| PATCH | /auth/me | Update profile and preferences |
| POST | /auth/google | Google OAuth |
| POST | /auth/forgot-password | Send reset email |
| POST | /auth/reset-password | Complete password reset |
| GET | /opportunities | List opportunities (with filters) |
| GET | /opportunities/:slug | Get single opportunity |
| POST | /opportunities | Create listing (admin) |
| PATCH | /opportunities/:id | Update listing (admin) |
| DELETE | /opportunities/:id | Delete listing (admin) |
| GET | /saved-opportunities | List saved opportunities |
| POST | /saved-opportunities/:opportunityId | Save an opportunity |
| DELETE | /saved-opportunities/:opportunityId | Unsave an opportunity |
| GET | /saved-searches | List saved searches |
| POST | /saved-searches | Save a search |
| PATCH | /saved-searches/:id | Update saved search |
| DELETE | /saved-searches/:id | Delete saved search |
| GET | /applications | List user's applications |
| GET | /applications/:id | Get application detail |
| POST | /applications/start | Start Apply For Me flow |
| POST | /applications/:id/eligibility | Submit eligibility responses |
| POST | /applications/:id/documents | Attach documents |
| PATCH | /applications/:id/status | Update status (admin) |
| GET | /documents | List credential library |
| POST | /documents | Upload a document |
| POST | /documents/:id/replace | Upload new version |
| DELETE | /documents/:id | Delete a document |
| GET | /documents/:id/download | Get signed download URL |
| GET | /messages/threads | Get messaging threads |
| GET | /messages/threads/:id | Get thread with messages (supports ?before=&limit= pagination) |
| POST | /messages/threads/:id/messages | Send a message |
| POST | /messages/threads | Create a thread |
| PATCH | /messages/threads/:id/read | Update read cursor, reset unread count |
| POST | /messages/threads/:id/document-requests | Create a document request (admin) |
| GET | /messages/threads/:id/document-requests | Fetch document requests and item statuses |
| PATCH | /messages/threads/:id/assign | Assign thread (admin) |
| PATCH | /messages/threads/:id/status | Update thread status (admin) |
| WS | /messages/ws?token=JWT | Real-time WebSocket connection |
| GET | /consultations | List user's consultations |
| POST | /consultations | Book a consultation |
| PATCH | /consultations/:id/meeting | Set meeting link (admin) |
| GET | /ebooks | List available ebooks |
| GET | /ebooks/library | List purchased ebooks |
| POST | /ebooks/:id/purchase | Initiate ebook purchase |
| PATCH | /ebooks/:id/progress | Save reading progress |
| POST | /ebooks/:id/download | Request download URL |
| GET | /mentorships | List user's mentorship memberships |
| GET | /mentorships/programmes | List mentorship programmes |
| POST | /mentorships/enrol | Enrol in a programme |
| GET | /mentorships/mentors | List mentor profiles (admin-managed) |
| GET | /notifications | List notifications |
| PATCH | /notifications/:id/read | Mark notification read |
| PATCH | /notifications/read-all | Mark all notifications read |
| DELETE | /notifications/:id | Delete a notification |
| POST | /payments/webhook/stripe | Stripe webhook handler |
| POST | /payments/webhook/paystack | Paystack webhook handler |
| POST | /payments/webhook/flutterwave | Flutterwave webhook handler |
| POST | /payments/webhook/lemonsqueezy | Lemon Squeezy webhook handler |
| POST | /support | Submit support contact form |
| GET | /ai/eligibility-criteria | Get eligibility criteria for an opportunity |
| POST | /ai/eligibility-assessment | AI-scored eligibility assessment |
| GET | /ai/recommendations | Personalised opportunity recommendations (Premium) |
| GET | /admin/stats | Platform-wide stats |
| GET | /admin/users | List all users (admin) |
| PATCH | /admin/users/:id/role | Change user role (admin) |
| PATCH | /admin/users/:id/ban | Ban/unban user (admin) |
| GET | /admin/messages | List all message threads (admin) - returns referenceId and avgResponseTimeMs |
| GET | /admin/messages/:id | Get thread detail with messages (admin) |
| POST | /admin/messages/:id/reply | Send a reply as team (admin) |
| GET | /admin/ads/public | Get active ad placement for a zone |
| GET | /admin/payments | List all payments with joined user and opportunity data |
| POST | /admin/payments/:id/refund | Mark a payment as refunded |
| GET | /admin/team-members | List team members for assignee picker |
| PATCH | /admin/applications/:id/assign | Assign application to a team member |

## Environment Variables

See `apps/api/.env.example` for all required variables.

### Session-related env vars

| Variable | Default | Purpose |
|---|---|---|
| `JWT_EXPIRES_IN` | `15m` | Access token cryptographic lifetime. Controls silent refresh frequency. Users never feel this. |
| `JWT_SECRET` | required | HMAC secret for signing access tokens (min 32 chars). |
| `SESSION_IDLE_TIMEOUT` | `1h` | How long a session survives after the tab closes. Sets `refresh_tokens.expiresAt`. |
| `PASSWORD_RESET_EXPIRES_IN` | `15m` | Password reset link lifetime. Email copy is generated from this value. |

## Database

Uses Drizzle ORM. Locally, run `docker-compose up -d` to start PostgreSQL. In production, the API connects to Neon via the `DATABASE_URL` environment variable - the driver is selected automatically based on whether the URL contains `neon.tech`.

```bash
# Generate migration files from schema changes
yarn db:generate

# Apply migrations
yarn db:migrate

# Open Drizzle Studio (database browser)
yarn db:studio

# Seed initial data (run in order on a fresh DB)
yarn workspace @oppdate/api db:seed-admin
yarn workspace @oppdate/api db:seed-mentorship-programmes
```
# oppdate-app
