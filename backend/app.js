require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pingMongo, closeMongo } = require('./config/mongodb');
const { pingNeo4j, closeNeo4j } = require('./config/neo4j');

const app = express();
const PORT = process.env.PORT || 8000;

// ─── Middleware 
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ─── Route Handlers 
const healthRoutes = require('./routes/health');
const seedRoutes = require('./routes/seed');
const schemaRoutes = require('./routes/schema');
const playerRoutes = require('./routes/players');
const trainingRoutes = require('./routes/training');
const tournamentRoutes = require('./routes/tournaments');
const coachRoutes = require('./routes/coaches');
const teamRoutes = require('./routes/teams');
const relationshipRoutes = require('./routes/relationships');

// API Endpoints
app.use('/api/health', healthRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/schema', schemaRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api', require('./routes/overview'));

// Root Aliases (Allows direct calls like /players/getAllPlayers or /players/getCoachPlayerTraining)
app.use('/players', playerRoutes);
app.use('/training', trainingRoutes);
app.use('/tournaments', tournamentRoutes);
app.use('/coaches', coachRoutes);
app.use('/teams', teamRoutes);
app.use('/relationships', relationshipRoutes);
app.use('/schema', schemaRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

async function checkDatabaseConnections() {
  const [mongo, neo4j] = await Promise.all([pingMongo(), pingNeo4j()]);
  const xmlSchemaService = require('./services/xmlSchemaService');
  let schemaInfo = 'Loaded';
  try {
    const summary = xmlSchemaService.getSchemaSummary();
    schemaInfo = `Loaded (${summary.mongodbEntities.length} Document Entities, ${summary.neo4jNodes.length} Graph Nodes, ${summary.neo4jRelationships.length} Relationships)`;
  } catch (e) {
    schemaInfo = `Error: ${e.message}`;
  }

  console.log(`\n================================================================`);
  console.log(`🚀 Distributed Sports Management API (Port ${PORT})`);
  console.log(`================================================================`);
  console.log(`📦 MongoDB:     ${mongo.connected ? `✅ Connected (DB: ${mongo.database})` : `❌ Not connected - ${mongo.error}`}`);
  console.log(`🕸️ Neo4j:       ${neo4j.connected ? `✅ Connected (${neo4j.message || neo4j.uri})` : `⚠️  Not connected - ${neo4j.error}`}`);
  console.log(`📜 XML Schema:  ✅ ${schemaInfo}`);
  console.log(`================================================================\n`);

  return { mongo, neo4j };
}

async function startServer() {
  await checkDatabaseConnections();

  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Distributed Sports Management API running on port ${PORT}`);
    console.log(`   Health:        http://localhost:${PORT}/api/health`);
    console.log(`   XML Schema:    http://localhost:${PORT}/api/schema`);
    console.log(`   Players:       http://localhost:${PORT}/api/players/getAllPlayers`);
    console.log(`   Coach Player:  http://localhost:${PORT}/api/players/getCoachPlayerTraining?coachId=C101`);
    console.log(`   Coaches:       http://localhost:${PORT}/api/coaches`);
    console.log(`   Training:      http://localhost:${PORT}/api/training`);
    console.log(`   Tournaments:   http://localhost:${PORT}/api/tournaments/getAllTournaments`);
    console.log(`   Teams:         http://localhost:${PORT}/api/teams`);
    console.log(`   Relationships: http://localhost:${PORT}/api/relationships\n`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await Promise.all([closeMongo(), closeNeo4j()]);
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

// ─── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  startServer().catch((error) => {
    console.error(`[Startup] Failed to start server: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = app;
