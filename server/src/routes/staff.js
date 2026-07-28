import express from 'express';
import { db } from '../db/connection.js';
import { requireAuth, requireManager } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireManager);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, external_staff_id, full_name, email, profession, created_at
    FROM users WHERE role = 'staff' ORDER BY full_name
  `).all();
  res.json({ staff: rows });
});

export default router;
