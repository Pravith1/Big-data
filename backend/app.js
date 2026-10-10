require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

// Standard REST endpoints (what the frontend calls — no knowledge of underlying DBs)
app.use('/api/health',        require('./routes/health'));
app.use('/api/seed',          require('./routes/seed'));
app.use('/api/players',       require('./routes/players'));
app.use('/api/training',      require('./routes/training'));
app.use('/api/tournaments',   require('./routes/tournaments'));
app.use('/api/coaches',       require('./routes/coaches'));
app.use('/api/teams',         require('./routes/teams'));
app.use('/api/relationships', require('./routes/relationships'));

// Developer/demo endpoint — NOT for frontend use
// Exposes internal queryService operations for architecture demonstration
app.use('/api/dev', require('./routes/dev'));

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Distributed Sports Management API running on port ${PORT}`);
  console.log(`   Health:        http://localhost:${PORT}/api/health`);
  console.log(`   Players:       http://localhost:${PORT}/api/players`);
  console.log(`   Coaches:       http://localhost:${PORT}/api/coaches`);
  console.log(`   Training:      http://localhost:${PORT}/api/training`);
  console.log(`   Tournaments:   http://localhost:${PORT}/api/tournaments`);
  console.log(`   Teams:         http://localhost:${PORT}/api/teams`);
  console.log(`   Relationships: http://localhost:${PORT}/api/relationships`);
  console.log(`   [Dev] Schema:  http://localhost:${PORT}/api/dev/schema`);
  console.log(`   [Dev] Query:   POST http://localhost:${PORT}/api/dev/query\n`);
});

module.exports = app;
