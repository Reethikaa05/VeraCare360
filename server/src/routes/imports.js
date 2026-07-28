import express from 'express';
import multer from 'multer';
import { db } from '../db/connection.js';
import { requireAuth, requireManager } from '../middleware/auth.js';
import { parseCsvBuffer } from '../lib/csv.js';
import { importStaffRows } from '../lib/importStaff.js';
import { importShiftRows } from '../lib/importShifts.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = express.Router();
router.use(requireAuth, requireManager);

router.get('/runs', (req, res) => {
  const runs = db.prepare(`SELECT * FROM import_runs ORDER BY run_at DESC, id DESC`).all();
  res.json({ runs });
});

router.get('/runs/:id', (req, res) => {
  const run = db.prepare(`SELECT * FROM import_runs WHERE id = ?`).get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Import run not found' });
  const rows = db.prepare(`SELECT * FROM import_rows WHERE run_id = ? ORDER BY row_number`).all(req.params.id);
  res.json({ run, rows: rows.map(r => ({ ...r, raw_row: JSON.parse(r.raw_row) })) });
});

// POST /api/imports/upload  (multipart form: file, kind=staff|shifts)
router.post('/upload', upload.single('file'), (req, res) => {
  const kind = req.body?.kind;
  if (!['staff', 'shifts'].includes(kind)) {
    return res.status(400).json({ error: 'kind must be "staff" or "shifts"' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let rows;
  try {
    rows = parseCsvBuffer(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: `Could not parse CSV: ${err.message}` });
  }
  if (!rows.length) return res.status(400).json({ error: 'CSV has no data rows' });

  const sourceLabel = `${req.file.originalname} (manual upload)`;
  const result = kind === 'staff'
    ? importStaffRows(rows, sourceLabel)
    : importShiftRows(rows, sourceLabel);

  res.status(201).json({ result });
});

export default router;
