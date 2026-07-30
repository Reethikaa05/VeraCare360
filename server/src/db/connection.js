import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'clinic.db');

const SQL = await initSqlJs();

let buffer = null;
if (fs.existsSync(DB_PATH)) {
  try {
    buffer = fs.readFileSync(DB_PATH);
  } catch (e) {}
}

const sqlDb = buffer && buffer.length > 0 ? new SQL.Database(buffer) : new SQL.Database();
let transactionDepth = 0;

function save() {
  if (transactionDepth > 0) return;
  const currentDbPath = process.env.DB_PATH || DB_PATH;
  if (currentDbPath === ':memory:' || !currentDbPath) return;
  const dir = path.dirname(currentDbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const data = sqlDb.export();
  fs.writeFileSync(currentDbPath, Buffer.from(data));
}

class Statement {
  constructor(sqlDb, sql) {
    this.sqlDb = sqlDb;
    this.sql = sql;
  }

  _execute(args, fn) {
    const stmt = this.sqlDb.prepare(this.sql);
    let params = args;
    if (args.length === 1 && Array.isArray(args[0])) {
      params = args[0];
    }
    stmt.bind(params);
    try {
      return fn(stmt);
    } finally {
      stmt.free();
    }
  }

  get(...args) {
    return this._execute(args, (stmt) => {
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    });
  }

  all(...args) {
    return this._execute(args, (stmt) => {
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    });
  }

  run(...args) {
    return this._execute(args, (stmt) => {
      stmt.step();
      const changes = this.sqlDb.getRowsModified();
      const res = this.sqlDb.exec("SELECT last_insert_rowid() as id;");
      const lastInsertRowid = res.length && res[0].values && res[0].values.length ? res[0].values[0][0] : 0;
      save();
      return { changes, lastInsertRowid };
    });
  }
}

export class DBWrapper {
  constructor(sqlDb) {
    this.sqlDb = sqlDb;
  }

  pragma(sql) {
    try {
      this.sqlDb.exec(`PRAGMA ${sql};`);
    } catch (e) {}
  }

  exec(sql) {
    this.sqlDb.exec(sql);
    save();
  }

  prepare(sql) {
    return new Statement(this.sqlDb, sql);
  }

  transaction(fn) {
    return (...args) => {
      transactionDepth++;
      if (transactionDepth === 1) {
        this.sqlDb.exec("BEGIN TRANSACTION;");
      } else {
        this.sqlDb.exec(`SAVEPOINT sp_${transactionDepth};`);
      }
      try {
        const result = fn(...args);
        if (transactionDepth === 1) {
          this.sqlDb.exec("COMMIT;");
        } else {
          this.sqlDb.exec(`RELEASE SAVEPOINT sp_${transactionDepth};`);
        }
        transactionDepth--;
        if (transactionDepth === 0) save();
        return result;
      } catch (err) {
        try {
          if (transactionDepth === 1) {
            this.sqlDb.exec("ROLLBACK;");
          } else {
            this.sqlDb.exec(`ROLLBACK TO SAVEPOINT sp_${transactionDepth};`);
          }
        } catch (e) {}
        transactionDepth--;
        throw err;
      }
    };
  }
}

export const db = new DBWrapper(sqlDb);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_staff_id TEXT UNIQUE,
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
  external_shift_id TEXT UNIQUE,
  series_id INTEGER REFERENCES shift_series(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  start_dt TEXT NOT NULL,
  end_dt TEXT NOT NULL,
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
  assigned_by TEXT NOT NULL DEFAULT 'self',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(shift_id, user_id)
);

CREATE TABLE IF NOT EXISTS import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
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
  raw_row TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason TEXT,
  action_taken TEXT
);
`;

db.exec(SCHEMA);

export default db;
