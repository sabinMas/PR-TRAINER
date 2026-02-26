# CLAUDE.md – Sprint Tracker (Athlete Training Logger)

## Project purpose

A simple, mobile-first web app for bmx athletes to log sprint and block-sprint training sessions. The app tracks times, averages, personal records (PRs), and metadata (date, location, notes). It is deployed on Vercel and uses a Vercel-integrated database so 1–5 users can access their data from multiple devices.


> Important: Ignore any prior sessions or remembered context. Only use information from this repo and the current conversation.


## Architecture overview

- **Frontend**
  - HTML, CSS, vanilla JavaScript
  - Runs fully in the browser
  - Mobile-first design
  - Identifies the current user with a `userId` stored in `localStorage` (no real auth in v1)

- **Backend**
  - Vercel serverless functions under `/api`
  - Vercel database (e.g., Postgres) to persist entries
  - Simple JSON REST API

## Data model

```ts
type SprintType = "sprint" | "block";

interface Entry {
  id: string;         // UUID
  userId: string;     // localStorage-generated identifier in v1
  type: SprintType;   // 'sprint' | 'block'
  timeSec: number;    // seconds as float
  date: string;       // YYYY-MM-DD
  location: string;
  notes: string;
  createdAt: string;  // ISO timestamp
}


## Session and memory rules

- Treat **every Claude Code session as stateless**.
- **Do not rely on any previous conversation or session memory** when making changes.
- Always infer requirements **only from the current repository state and the files in this project** (especially PLANNING.md, TASKS.md, and this CLAUDE.md).
- If something is unclear or seems to depend on past context, **ask me in this session** instead of assuming.

