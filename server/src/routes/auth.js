import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(String(email).trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.full_name, email: user.email, role: user.role, profession: user.profession },
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(`SELECT id, full_name as name, email, role, profession FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

export default router;
