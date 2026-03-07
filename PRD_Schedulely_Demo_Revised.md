# Schedulely Demo PRD (Revised for 4-Day Build)

## 1) Purpose
Build a working demonstration prototype for class within 4 days.
The demo should prove the core value: faster group scheduling with privacy-preserving availability, without full production integrations.

## 2) Source Reduction From Original PRD
Original V1 included (extracted): OAuth sign-in, instant import, connect another calendar, privacy defaults, personal week grid, shared spaces, invites/join flow, combined availability heatmap, suggested times, propose time, sync status.

This revised scope intentionally cuts further:
- No OAuth
- Outlook only
- Lightweight local onboarding
- No write-back to external calendars
- No advanced sync orchestration/webhooks

## 3) Product Goal (Demo)
For students coordinating group meetings, Schedulely demo lets users paste a **published Outlook calendar HTML link**, generate free/busy availability, share a group space, and quickly find/conflict-check meeting times.

## 4) Demo Success Criteria (Must visibly work)
1. User can onboard in under 1 minute with name/email + Outlook published HTML link.
2. System imports availability from that link and shows a personal weekly availability view.
3. User can create a shared space and add teammates (demo can use email string invites without real email delivery).
4. Group view shows overlap/conflicts clearly.
5. User can propose a time; system flags if a conflict exists for any member and suggests alternatives.

## 5) In-Scope Features (Strict MVP)

### A. Lightweight Onboarding (No Auth)
- Fields: `name`, `email`, `timezone`.
- User pastes Outlook published calendar HTML URL.
- System validates URL format and stores profile locally.

Acceptance criteria:
- New user record can be created without OAuth.
- Invalid/empty URL gets clear error state.
- Successful onboarding takes <= 3 screens.

### B. Outlook HTML Availability Import
- Backend fetches and parses the Outlook published HTML calendar page.
- Convert events into internal busy blocks for a 14-day window.
- Run manual refresh (button) instead of background sync.

Acceptance criteria:
- At least one busy block appears for a valid link.
- Last refresh timestamp is visible.
- Parser failures show actionable error message.

### C. Personal Availability Week Grid
- Weekly grid showing busy vs free blocks in user timezone.
- No event titles required in default mode (privacy-first).

Acceptance criteria:
- User can see current week and next week.
- Busy blocks are visually distinct from free slots.

### D. Shared Space + Basic Member Add
- Create a shared space (e.g., “PM Team Demo”).
- Add members by email (local records / demo seed users).
- Members each have one Outlook published link in profile.

Acceptance criteria:
- Space can be created and reopened.
- At least 3 members can be attached for demo.

### E. Group Overlap + Conflict Highlighting
- Compute overlap across selected members for chosen duration (30 or 60 min).
- Heatmap/list states: `all available`, `some conflicts`, `no overlap`.

Acceptance criteria:
- Group view updates when member availability changes.
- At least top 3 candidate slots are shown.

### F. Propose Time + Recheck
- User picks a suggested slot and creates a proposal.
- System immediately rechecks all member busy blocks.
- If conflict exists, proposal marked `conflicted` with alternatives.

Acceptance criteria:
- Proposal status can be `valid` or `conflicted`.
- Conflicted proposal displays at least 2 alternative times.

## 6) Out of Scope (Strict)
- OAuth / SSO / account linking
- Google Calendar / Apple Calendar integrations
- Real email sending and tokenized invite acceptance
- Webhooks, auto background sync, provider health monitoring
- Calendar write-back (creating events in Outlook)
- Per-space advanced privacy overrides
- Mobile-native app or advanced responsive polish
- AI scheduling optimization/gamification
- Institutional admin features/audit tooling

## 7) User Flow (Demo Script)
1. User lands on onboarding.
2. Enters name/email/timezone + Outlook published HTML URL.
3. Clicks `Import availability`.
4. Sees personal week availability.
5. Creates shared space and adds 2-4 teammates.
6. Opens group overlap view and reviews suggested slots.
7. Proposes one slot.
8. Demo shows either `valid` or `conflicted` and suggested alternatives.

## 8) Data Model (Minimal)
- `users(id, name, email, timezone, outlook_html_url, created_at)`
- `availability_blocks(id, user_id, start_at, end_at, status, source_updated_at)`
- `shared_spaces(id, name, owner_user_id, created_at)`
- `shared_space_members(id, space_id, user_id)`
- `meeting_proposals(id, space_id, proposer_user_id, start_at, end_at, status, created_at)`

Optional helper:
- `import_logs(id, user_id, run_at, status, message)`

## 9) Functional Requirements
1. Import service must parse Outlook-published HTML into normalized datetime blocks.
2. Availability engine must merge busy blocks per user and compute overlap across members.
3. Proposal creation must perform conflict check at submission time.
4. UI must expose manual refresh per user.
5. UI must show timezone clearly on personal and group views.

## 10) Non-Functional Requirements (Demo-Appropriate)
- Reliability: if import fails, app remains usable with prior successful data.
- Performance: overlap computation returns in < 2 seconds for up to 8 members and 14-day window.
- Privacy: default display is free/busy only.
- Observability: basic logs for import and conflict check failures.

## 11) Risks and Mitigations
- Risk: Outlook published HTML format variance.
  - Mitigation: support one known sample format first; add fallback parser rules.
- Risk: Remote fetch/CORS issues in browser-only implementation.
  - Mitigation: fetch and parse on backend server, not client.
- Risk: Incomplete class demo data.
  - Mitigation: include seeded users and sample published links for backup demo path.

## 12) 4-Day Execution Plan

### Day 1
- Implement onboarding + user storage.
- Build Outlook HTML fetch/parse endpoint.
- Persist availability blocks.

### Day 2
- Build personal week grid + manual refresh.
- Build shared space creation and member add.

### Day 3
- Implement overlap computation + suggested times list.
- Implement proposal + conflict recheck + alternatives.

### Day 4
- Polish demo flow, fix parser edge cases, seed backup data.
- Prepare 5-minute live demo script.

## 13) Demo Acceptance Checklist
- [ ] New user can onboard with Outlook HTML URL (no OAuth).
- [ ] Availability imports and renders in week view.
- [ ] Shared space with multiple members works.
- [ ] Group overlap/suggestions render correctly.
- [ ] Proposal detects conflicts and suggests alternatives.
- [ ] Out-of-scope features are not partially implemented.

