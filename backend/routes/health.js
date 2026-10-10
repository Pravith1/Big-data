const express = require('express');
const router = express.Router();
const { pingMongo } = require('../config/mongodb');
const { pingNeo4j } = require('../config/neo4j');
const { loadSchema } = require('../services/xmlSchemaService');

// GET /api/health
router.get('/', async (req, res) => {
  const [mongo, neo4j] = await Promise.all([pingMongo(), pingNeo4j()]);

  let xmlStatus;
  try {
    loadSchema();
    xmlStatus = { loaded: true, error: null };
  } catch (err) {
    xmlStatus = { loaded: false, error: err.message };
  }

  const allHealthy = mongo.connected && neo4j.connected && xmlStatus.loaded;

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    services: {
      express: { running: true },
      mongodb: mongo,
      neo4j: neo4j,
      xmlSchema: xmlStatus
    }
  });
});

module.exports = router;
