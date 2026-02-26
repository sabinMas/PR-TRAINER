# Sprint Tracker – Planning

## 1. Project overview

A simple, mobile-first web application that lets athletes log and review their training:
- Track sprint and block-sprint times
- See averages per type
- Keep personal records (PRs)
- Attach notes, date, and location to every entry

Primary audience: 1–5 athletes/coaches using phones on the track.
Deployment: Vercel, with a Vercel-integrated database (e.g., Vercel Postgres / similar).

## 2. Goals and non-goals

### Goals
- Fast, simple data entry on mobile
- Online-first app (assume users are connected)
- Persistent data in a shared backend (Vercel DB)
- Per-user data separation (each user sees only their own entries, once we have auth)
- Clear view of:
  - Sprint vs block-sprint times
  - Averages per type
  - All-time PRs with date/location

### Non-goals (v1)
- Full authentication system (magic-link or similar is a future enhancement)
- Complex roles or multi-team support
- Advanced charts/analytics
- Offline sync or offline-first behavior

## 3. Core features (MVP)

Frontend:
- Add entry:
  - Type: sprint or block-sprint
  - Time (seconds)
  - Date
  - Location
  - Notes
- List of past entries
- Automatic stats:
  - Average time for sprints
  - Average time for block sprints
  - PR for each type (fastest time) with date/location/notes

Backend:
- Simple REST (or RPC-style) API via Vercel serverless functions:
  - `POST /api/entries` – create entry
  - `GET /api/entries` – list entries (for a given user)
  - (Optionally later) `PUT /api/entries/:id`, `DELETE /api/entries/:id`
- Data stored in Vercel DB, keyed by a “user identifier”.

### User separation without real auth (v1)

Since v1 has no real authentication:
- Use a simple user identifier stored in `localStorage` (e.g., random UUID).
- Send this `userId` with every API request.
- Backend uses `userId` to scope entries.
- This mimics per-user isolation and allows a later swap to real auth (magic link).

Later, when magic-link auth is added:
- Replace the client-generated `userId` with a proper `userId` from the auth provider.
- Migrate existing entries from “anonymous IDs” to authenticated IDs if needed.

## 4. UX & UI sketch (mobile-first)

Single-page layout:

1. **Header**
   - App name (e.g., “Sprint Tracker”)
   - Short subtitle (e.g., “Log your sprint and block times”)

2. **New entry form**
   - Type selector (Sprint / Block Sprint)
   - Time input (seconds, decimals allowed)
   - Date picker (default to today)
   - Location text input
   - Notes textarea
   - “Save” button

3. **Stats section**
   - Sprint average
   - Block-sprint average
   - Sprint PR (time, date, location)
   - Block-sprint PR (time, date, location)

4. **Entries list**
   - Reverse chronological
   - Each card shows: type, time, date, location, notes

Future enhancements:
- Filters by date range / type
- Additional event types (100m, 200m, etc.)
- Export/import data
- Magic-link auth for real user accounts

## 5. Technical design

### Stack

Frontend:
- HTML5
- CSS (mobile-first, no framework initially)
- Vanilla JavaScript

Backend:
- Vercel serverless functions (`/api/*`)
- Vercel-integrated database (e.g., Postgres)
- Simple REST API returning JSON

### Data model

```ts
type SprintType = "sprint" | "block";

interface Entry {
  id: string;         // UUID
  userId: string;     // identifier from localStorage (v1) or auth provider (later)
  type: SprintType;
  timeSec: number;    // seconds as a float
  date: string;       // ISO date (YYYY-MM-DD)
  location: string;
  notes: string;
  createdAt: string;  // ISO timestamp
}
