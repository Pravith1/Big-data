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

    const graphPlayers = await neo4jService.runCypher(
      `
      MATCH (p:Player)
      OPTIONAL MATCH (p)-[:MEMBER_OF]->(t:Team)
      OPTIONAL MATCH (p)-[:COACHED_BY]->(c:Coach)
      RETURN p.id AS playerId, t.id AS teamId, c.id AS coachId
      ORDER BY playerId
      `
    ).catch(() => []);

    const playerIds = graphPlayers.map(p => p.playerId).filter(Boolean);
    const teamIds = [...new Set(graphPlayers.map(p => p.teamId).filter(Boolean))];
    const coachIds = [...new Set(graphPlayers.map(p => p.coachId).filter(Boolean))];

    const playerDocs = await mongoService.findDocuments('players', { _id: { $in: playerIds } }).catch(() => []);
    const teamDocs = await mongoService.findDocuments('teams', { _id: { $in: teamIds } }).catch(() => []);
    const coachDocs = await mongoService.findDocuments('coaches', { _id: { $in: coachIds } }).catch(() => []);

    const playerMap = new Map(playerDocs.map(p => [p._id, p]));
    const teamMap = new Map(teamDocs.map(t => [t._id, t]));
    const coachMap = new Map(coachDocs.map(c => [c._id, c]));

    const players = graphPlayers.map(gp => {
      const pDoc = playerMap.get(gp.playerId) || {};
      const tDoc = teamMap.get(gp.teamId) || {};
      const cDoc = coachMap.get(gp.coachId) || {};
      return {
        playerId: gp.playerId,
        name: pDoc.name || gp.playerId,
        sport: pDoc.sport || tDoc.sport || null,
        team: tDoc.name || null,
        coach: cDoc.name || null
      };
    });

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
