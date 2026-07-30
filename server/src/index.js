import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import shiftRoutes from './routes/shifts.js';
import staffRoutes from './routes/staff.js';
import importRoutes from './routes/imports.js';
import { seedDatabase } from './db/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// Automatically seed DB on boot if empty (guarantees live deployment always has initial data)
try {
  seedDatabase();
} catch (e) {
  console.error('Error seeding database on startup:', e);
}

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/imports', importRoutes);

// Serve the built React app if present (single-service deploy: Express serves both
// the API and the static frontend so one free-tier web service is enough).
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
