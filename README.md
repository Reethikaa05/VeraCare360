# Clinic Shift Scheduler

A staff shift scheduling app: managers create shifts and see week-at-a-glance coverage; staff
(doctors, nurses, receptionists) browse and claim shifts, with every business rule enforced
server-side and safe under concurrent use.

## Stack

- **Backend**: Node.js, Express, SQLite (`better-sqlite3`), JWT auth, `bcryptjs` for passwords.
  SQLite's synchronous driver gives free transactional serialization for the claiming logic — see
  `DECISIONS.md`.
- **Frontend**: React + TypeScript + Vite + Tailwind CSS, React Router.
- **Deploy**: single Docker image — Express serves both the API and the built React app, so one
  free-tier web service (Render/Fly/Railway) is enough.

## Run locally — two options

### Option A: Docker (one command, nothing else to install)

```bash
docker compose up --build
```

Open **http://localhost:4000**. The database seeds automatically on first boot from
`server/seed-data/staff.csv` and `server/seed-data/shifts.csv` (idempotent — re-running won't
duplicate data). Data persists in a named Docker volume between restarts.

### Option B: Plain terminal, no Docker

If you don't have Docker installed, this does the same thing with just Node + npm:

```bash
./start.sh
```

First run installs dependencies for both `server/` and `client/`, seeds the database, then starts
the API on **http://localhost:4000** and the Vite dev server on **http://localhost:5173** (open
this one — it proxies `/api` calls to the backend, and gives you hot-reload while you look
around). Ctrl+C stops both.

Equivalent manual steps, if you'd rather run each piece yourself:

```bash
# Backend
cd server
npm install
npm run seed      # imports the CSVs + creates the manager account
npm run dev        # http://localhost:4000

# Frontend (separate terminal)
cd client
npm install
npm run dev         # http://localhost:5173, proxies /api to :4000
```

## Login credentials

All seeded accounts share the password:

```
Passw0rd!
```

**Manager:**
```
manager@clinic.local
```

**Staff** (35 accounts imported from `staff.csv`, one login per row that passed validation —
full list and every rejection/merge reason is visible in-app on the **Import Report** page after
logging in as the manager). A few to try:

| Profession | Name | Email |
|---|---|---|
| Doctor | Marcus Whitfield | `marcus.whitfield@clinicmail.test` |
| Nurse | Aisha Sharma | `aisha.sharma@clinicmail.test` |
| Receptionist | Karan Ali | `karan.ali@clinicmail.test` |

(Note: one seeded nurse, Robin Vale, had no email in the source spreadsheet — the importer
auto-generated `staff995@clinic.local` for that login, and logged why on the Import Report page.)

## Tests

```bash
cd server
npm test
```

Runs with Node's built-in test runner (`node --test`) against an isolated temp SQLite file — safe
to run repeatedly, never touches your dev/seed data. Covers:
- messy date/time parsing (ambiguous formats, overnight rollover, impossible dates)
- every claiming rule (profession headcount, overlap detection, manager-assign parity, unclaim,
  edit-time re-validation)
- a concurrency test that fires 4 simultaneous claims at a 2-person shift and asserts exactly 2
  succeed

No frontend test suite is included; given the time budget I prioritized backend business-rule
coverage since that's where correctness actually matters (see `DECISIONS.md` for what I'd add next).

## Deploying it live

The whole app is one Docker image, so any container host works. E.g. on **Render**:
1. New → Web Service → point at this repo.
2. Environment: Docker (it will pick up the root `Dockerfile` automatically).
3. Add an environment variable `JWT_SECRET` set to a random string.
4. Deploy. Render's free tier spins down on inactivity, so the first request after idle can take
   ~30-60s to cold-start — subsequent requests are fast.

The seed step runs automatically on container boot (`node src/db/seed.js && node src/index.js`) and
is idempotent, so redeploys never duplicate data.

## Design

The public landing page and login screen share a small custom design system (not Tailwind
defaults): an ink-navy background, a teal/coral duotone accent standing in for "day shift / evening
handoff," Fraunces for display type paired with Inter for UI text and IBM Plex Mono for data
(times, stats). The signature visual is a hand-built 24-hour shift ring (`ShiftRing.tsx`) — the
same night/day/evening coverage concept the actual dashboard tracks, distilled into one image.
Reduced-motion is respected on the ambient ring animation.

## Project structure

```
clinic-scheduler/
├── Dockerfile              # multi-stage: builds client, runs server (serves both)
├── docker-compose.yml
├── start.sh                 # one-command run without Docker
├── DECISIONS.md
├── server/
│   ├── src/
│   │   ├── index.js        # Express app entry
│   │   ├── db/             # schema + seed script
│   │   ├── lib/            # dates.js, claims.js (business rules), importStaff.js, importShifts.js
│   │   ├── routes/         # auth, shifts, staff, imports
│   │   └── __tests__/      # node --test suite
│   └── seed-data/          # the original staff.csv / shifts.csv
└── client/
    └── src/
        ├── pages/          # Landing, Login, Dashboard (coverage), MyShifts, ImportPage, ImportReport, StaffPage
        ├── components/     # ShiftRing (signature hero visual), ShiftModal, StatusBadge
        └── lib/            # api.ts (typed fetch client), auth.tsx, dateUtils.ts
```
