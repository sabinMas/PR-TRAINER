
***

## TASKS.md

```markdown
# Sprint Tracker – Tasks

## 1. Project setup

- [ ] Create Vercel project
- [ ] Initialize repo with:
  - [ ] `index.html`
  - [ ] (Optional) `styles.css`, `app.js`
  - [ ] `PLANNING.md`, `TASKS.md`, `CLAUDE.md`
- [ ] Configure Vercel-integrated database (e.g., Vercel Postgres)
- [ ] Create `entries` table with schema from PLANNING.md

## 2. Frontend UI (mobile-first)

- [ ] Implement main layout container
- [ ] Header with app name + subtitle
- [ ] New entry form:
  - [ ] Type: select (Sprint / Block Sprint)
  - [ ] Time: number input (step 0.01)
  - [ ] Date: date input (default today)
  - [ ] Location: text input (optional)
  - [ ] Notes: textarea
  - [ ] Submit button
- [ ] Stats section placeholders
- [ ] Entries list container
- [ ] Responsive styles for small screens

## 3. User identification (no real auth)

- [ ] On app load, check `localStorage` for `userId`
- [ ] If missing, generate a random UUID and store as `userId`
- [ ] Include `userId` in every API request (e.g., in JSON body or header)

## 4. Backend API (Vercel functions)

- [ ] Create `/api/entries` route:
  - [ ] `GET /api/entries`
    - [ ] Read `userId` from query or header/body
    - [ ] Fetch all entries for that `userId` ordered by `created_at DESC`
    - [ ] Return JSON
  - [ ] `POST /api/entries`
    - [ ] Validate payload: `userId`, `type`, `timeSec`, `date`
    - [ ] Insert row into DB with generated `id` and `created_at`
    - [ ] Return created entry as JSON
- [ ] (Optional / later) Add:
  - [ ] `PUT /api/entries/:id` (update entry)
  - [ ] `DELETE /api/entries/:id` (delete entry)

## 5. Frontend integration with API

- [ ] On load:
  - [ ] Fetch entries from `GET /api/entries?userId=...`
  - [ ] Store entries in memory
  - [ ] Render stats and list
- [ ] On form submit:
  - [ ] Validate input
  - [ ] Call `POST /api/entries`
  - [ ] On success, add to local state and re-render
- [ ] Render logic:
  - [ ] Reverse chronological ordering
  - [ ] Cards showing type, time, date, location, notes

## 6. Stats & PRs (frontend)

- [ ] Implement helper functions:
  - [ ] `getSprintEntries(entries)`
  - [ ] `getBlockEntries(entries)`
  - [ ] `getAverageTime(entries)`
  - [ ] `getPR(entries)`
- [ ] Update stats on:
  - [ ] Initial load
  - [ ] After new entry creation
- [ ] Display:
  - [ ] Sprint average
  - [ ] Block-sprint average
  - [ ] Sprint PR (time, date, location)
  - [ ] Block-sprint PR (time, date, location)

## 7. Validation & UX polish

- [ ] Client-side validation (time > 0, required fields)
- [ ] Basic error messages for invalid input
- [ ] Show loading state while fetching entries
- [ ] Show empty state message when no entries exist
- [ ] Handle API errors (display simple error message)

## 8. Optional enhancements (later)

- [ ] Edit entries
- [ ] Delete entries
- [ ] Filters by type/date range
- [ ] Export to CSV/JSON
- [ ] Magic-link authentication integration
- [ ] Migrate from `localStorage` `userId` to auth user IDs

## 9. Testing

- [ ] Test in local dev (browser + Vercel dev)
- [ ] Test deployed version on actual phones
- [ ] Verify per-user isolation using different browsers/devices (different `userId`s)
- [ ] Check DB for correct `user_id` scoping
