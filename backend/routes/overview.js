const express = require('express');
const router = express.Router();
const queryService = require('../services/queryService');
const xmlSchemaService = require('../services/xmlSchemaService');
const mongoService = require('../services/mongoService');
const neo4jService = require('../services/neo4jService');

// GET /api/mongo/overview
router.get('/mongo/overview', async (req, res) => {
  try {
    const summary = xmlSchemaService.getSchemaSummary();
    const collections = {};

    for (const ent of summary.mongodbEntities) {
      try {
        collections[ent.collection] = await mongoService.countDocuments(ent.collection);
      } catch {
        collections[ent.collection] = 0;
      }
    }

    const rawPlayers = await queryService.getAllPlayers();
    const players = rawPlayers.map(p => ({
      player_id: p._id,
      ...p
    }));

    res.json({
      collections,
      players
    });
  } catch (err) {
    res.status(503).json({ success: false, error: err.message });
  }
});

// GET /api/neo4j/overview
router.get('/neo4j/overview', async (req, res) => {
  try {
    const labels = await neo4jService.runCypher(
      'MATCH (n) UNWIND labels(n) AS label RETURN label, count(*) AS count ORDER BY label'
    ).catch(() => []);

    const relationships = await neo4jService.runCypher(
      'MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS count ORDER BY type'
    ).catch(() => []);

    const players = await neo4jService.runCypher(
      `
      MATCH (p:Player)
      OPTIONAL MATCH (p)-[:MEMBER_OF]->(t:Team)
      OPTIONAL MATCH (p)-[:COACHED_BY]->(c:Coach)
      RETURN p.id AS playerId, p.name AS name, p.sport AS sport,
             t.name AS team, c.name AS coach
      ORDER BY playerId
      `
    ).catch(() => []);

    res.json({
      labels,
      relationships,
      players
    });
  } catch (err) {
    res.json({
      labels: [],
      relationships: [],
      players: []
    });
  }
});

module.exports = router;
