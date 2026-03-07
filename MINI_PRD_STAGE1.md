# Schedulely Lite - Mini PRD (Rapid Demo)

## Goal
Ship a live demo today that proves one thing: group scheduling is faster with imported Outlook availability and conflict-aware suggestions.

## Target User
Graduate student team coordinating 3-5 people across shared projects.

## Core User Story
As a coordinator, I can import my Outlook availability, view team overlap, and propose a time with immediate conflict check.

## Scope (Stage 1 only)
1. Onboarding (no auth): `name`, `email`, `timezone`, published calendar URL or uploaded calendar file.
2. Manual import: backend fetches/parses Outlook published HTML or ICS, or parses uploaded file content into busy blocks.
3. Personal availability view: basic busy/free display for next 14 days.
4. Shared space: one space, 2-4 members (seeded is fine).
5. Suggestions and conflict check: top 3 slots for 30/60 min, and `valid/conflicted` on propose.
6. Demo utility: one-click reset action to erase all data and automatically reseed demo users/calendars.

## Out of Scope (for now)
1. OAuth/SSO.
2. Google/Apple integration.
3. Real invite emails.
4. Auto-sync/webhooks.
5. Calendar write-back.
6. Advanced UI (heatmap can wait).

## Success Criteria (today)
1. Paste Outlook HTML or ICS link -> import success visible.
2. At least 3 members shown in group view.
3. Top suggested slots appear.
4. Propose slot returns `valid` or `conflicted` plus alternatives.

## Recommended Stack
1. Frontend: `Vite + Svelte + TypeScript + Tailwind + daisyUI`.
2. Backend: small `Node + Fastify` service.
3. Storage: `SQLite` (or JSON for first pass), seeded teammate data.

### Why a backend is still needed
A backend is necessary even for demo mode because Outlook HTML/ICS fetch/parsing and CORS are unreliable from browser-only code. For Stage 1, this is not a full sync server, only a small import API with manual refresh.

## First-Stage Plan (next few hours)

### Phase A: Skeleton (45-60 min)
1. Scaffold frontend and backend.
2. Define minimal endpoints:
   - `POST /users`
   - `POST /users/:id/import`
   - `GET /users/:id/availability`
   - `POST /spaces`
   - `GET /spaces/:id/overlap`
   - `POST /spaces/:id/proposals`

### Phase B: Data + Import (60-90 min)
1. Add minimal tables/models: `users`, `availability_blocks`, `shared_spaces`, `shared_space_members`, `proposals`.
2. Implement Outlook parser with support for published HTML and ICS formats.
3. Add manual refresh and last-import timestamp.

### Phase C: Demo UI (60-90 min)
1. Onboarding form.
2. Personal availability page (list/grid-lite).
3. Shared space page with seeded members.
4. Suggestions panel plus propose button plus conflict result.

### Phase D: Stabilize (30-45 min)
1. Seed fallback demo data.
2. Add clear error states for failed import.
3. Rehearse 3-minute demo flow.

## Demo Script (3 minutes)
1. Create user with Outlook published HTML or ICS link.
2. Run import and show busy blocks loaded.
3. Open shared space with 3-5 members.
4. Show top suggested slots.
5. Propose one slot and show `valid` or `conflicted` plus alternatives.

## Cut Lines if Time Slips
1. Keep: import, overlap suggestions, conflict check.
2. Cut first: richer visualizations, proposal history, invite workflows.
3. Cut second: polished UI states and non-critical settings.
