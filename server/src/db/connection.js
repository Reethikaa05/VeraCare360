import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'clinic.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_staff_id TEXT UNIQUE, -- original spreadsheet staff_id, null for manager
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager','staff')),
  profession TEXT CHECK (profession IN ('doctor','nurse','receptionist') OR profession IS NULL),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shift_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_shift_id TEXT UNIQUE, -- original spreadsheet shift_id, null for app-created shifts
  series_id INTEGER REFERENCES shift_series(id) ON DELETE SET NULL,
  date TEXT NOT NULL,            -- YYYY-MM-DD (local clinic date the shift starts on)
  start_time TEXT NOT NULL,      -- HH:MM 24h
  end_time TEXT NOT NULL,        -- HH:MM 24h (may be "next day" if overnight)
  start_dt TEXT NOT NULL,        -- ISO datetime, computed, used for overlap math
  end_dt TEXT NOT NULL,          -- ISO datetime, computed (accounts for overnight rollover)
  req_doctor INTEGER NOT NULL DEFAULT 0,
  req_nurse INTEGER NOT NULL DEFAULT 0,
  req_receptionist INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_start_dt ON shifts(start_dt);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by TEXT NOT NULL DEFAULT 'self', -- 'self' or 'manager'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(shift_id, user_id)
);

CREATE TABLE IF NOT EXISTS import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,       -- 'staff.csv (seed)' / 'shifts.csv (seed)' / uploaded filename
  kind TEXT NOT NULL,         -- 'staff' | 'shifts'
  run_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  merged_count INTEGER NOT NULL DEFAULT 0,
  total_rows INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS import_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_row TEXT NOT NULL,       -- JSON of original row
  outcome TEXT NOT NULL,       -- 'accepted' | 'rejected' | 'merged'
  reason TEXT,                 -- human-readable explanation
  action_taken TEXT            -- what we did about it
);
`;

db.exec(SCHEMA);

export default db;
