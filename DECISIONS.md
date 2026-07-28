# Design decisions

## Stack
Express + SQLite (`better-sqlite3`) on the backend, React + Vite + TypeScript + Tailwind on the
frontend, single Express process serving both the API and the built frontend in production so a
free-tier host only needs one web service. SQLite was chosen deliberately, not just for
simplicity — see "Concurrency" below.

## Editing a shift that already has claims
The brief explicitly leaves this open. Decision: **requirement counts (doctors/nurses/receptionists
needed) can be edited freely** — shrinking a requirement below the current headcount is allowed and
simply leaves the shift "over-staffed" (we never auto-remove someone who was validly assigned).
**Time (date/start/end) edits are re-validated**: before saving, the server checks every existing
claimant's *other* shifts for a new overlap against the proposed new time window. If any claimant
would now be double-booked, the edit is **rejected outright** with the list of conflicting people,
rather than silently unclaiming them. A manager who genuinely needs to move the shift has to first
remove the conflicting claim(s) themselves. This was chosen over silent auto-unclaim because
removing someone's shift without their knowledge felt like the wrong default for a staffing tool —
better to force an explicit, visible decision.

## Concurrency
`better-sqlite3` is synchronous and Node is single-threaded, so every claim/assign/unclaim runs
inside a single JS-level transaction that cannot be interleaved with another request's transaction
— there's no window for two simultaneous claims to both read "1 slot open" and both insert. This is
verified by an automated test that fires four claims at a two-person shift and asserts exactly two
succeed. The trade-off: this guarantee holds for a single Node process. If this were horizontally
scaled across multiple server instances, we'd need to move to Postgres with `SELECT ... FOR UPDATE`
or a unique constraint + retry, which is what I'd do first with more time (see below).

## CSV import cleaning rules
- **Roles** are normalized case-insensitively through a synonym map (`RN`/`Registered Nurse` →
  `nurse`, `MD`/`Physician` → `doctor`, `Recep.`/`Reception` → `receptionist`). Anything else
  (e.g. `Janitor`) is rejected as not a recognized clinical profession.
- **Dates**: `YYYY-MM-DD` is read as ISO. Slash-separated dates (`05/08/2026`) are read as
  `DD/MM/YYYY` (international convention); dash-separated non-ISO dates (`08-13-2026`) are read as
  `MM-DD-YYYY` (US convention) — this is an assumption, documented here and called out per-row in
  the import report, not something the data proves either way. Calendar-impossible dates
  (Feb 30) are rejected.
- **Times**: `HH:MM`, optionally suffixed `+N` meaning "N days later" (used for shifts spanning
  more than one midnight). If end time-of-day ≤ start time-of-day with no suffix, the shift is
  assumed to cross one midnight. Identical start/end is rejected as a zero-length shift.
- **Requirements**: only `role=count;role=count` is parsable; free text (`"two nurses and a
  doctor"`) is rejected rather than guessed at.
- **Duplicates**: exact or conflicting repeats of the same `staff_id`/`shift_id` are merged (first
  occurrence wins, later ones logged and discarded). Two staff rows with different IDs but the same
  name + email are treated as the same person duplicated and merged the same way. A row whose email
  collides with a *different* already-imported person is rejected outright, since email is the
  login identifier and can't be silently reassigned.
- **Missing email**: auto-generated as `staff{id}@clinic.local` so every valid staff member still
  gets a login, logged as a normalization note rather than a rejection.
- Every accepted row that required *any* cleanup, plus every rejected/merged row, is logged to the
  Import Report with the row, the reason, and the action taken.

## Auth / credentials
All seeded accounts (manager and staff) share one demo password (`Passw0rd!`, in the README) rather
than per-user random passwords, purely so the reviewer can log in as anyone without hunting through
a credentials table. In a real deployment this would be a forced-reset-on-first-login flow instead.

## What I'd do differently with more time
Move persistence to Postgres and make the claim path use `SELECT ... FOR UPDATE` (or an
`INSERT ... ON CONFLICT` counting trick) instead of relying on SQLite + single-process
serialization — it's correct today but doesn't scale past one instance. I'd also add the live-update
stretch goal (a WebSocket/SSE channel that pushes shift updates to anyone viewing the coverage board
or my-shifts page, so a fill-up is reflected without a manual refresh) — the data model already
supports it cleanly since every mutation goes through one place (`claimShift`/`unclaimShift`), it
just needed a broadcast hook I didn't have time to wire up.
