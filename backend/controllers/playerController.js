const queryService = require('../services/queryService');
const neo4jService = require('../services/neo4jService');
const xmlSchemaService = require('../services/xmlSchemaService');
const Player = require('../models/Player');

// POST /api/players
async function createPlayer(req, res) {
  try {
    const { isValid, errors } = Player.validatePlayer(req.body);
    if (!isValid) return res.status(400).json({ success: false, error: errors.join(', ') });

    const mongoDoc = Player.toMongoDocument(req.body);
    const neo4jNode = Player.toNeo4jNode(req.body);

    const { label } = xmlSchemaService.getGraphEntityStorage('Player');

    const inserted = await queryService.createPlayerDoc(mongoDoc);
    await neo4jService.createNode(label, neo4jNode);

    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players
async function getAllPlayers(req, res) {
  try {
    const players = await queryService.getAllPlayers({ sport: req.query.sport });
    res.json({ success: true, count: players.length, data: players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/:id
async function getPlayerById(req, res) {
  try {
    const player = await queryService.getPlayerById(req.params.id);
    if (!player) return res.status(404).json({ success: false, error: 'Player not found' });
    res.json({ success: true, data: player });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/:id/full  (MongoDB profile + Neo4j graph merged)
async function getPlayerFull(req, res) {
  try {
    const player = await queryService.getPlayerFull(req.params.id);
    if (!player) return res.status(404).json({ success: false, error: 'Player not found' });
    res.json({ success: true, data: player });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/:id/training  (MongoDB only)
async function getPlayerTraining(req, res) {
  try {
    const sessions = await queryService.getTrainingByPlayer(req.params.id);
    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/:id/relationships  (Neo4j only)
async function getPlayerRelationships(req, res) {
  try {
    const graph = await queryService.getPlayerRelationships(req.params.id);
    if (!graph) return res.status(404).json({ success: false, error: 'Player not found in graph' });
    res.json({ success: true, data: graph });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// PUT /api/players/:id
async function updatePlayer(req, res) {
  try {
    const updated = await queryService.updatePlayerDoc(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Player not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/players/:id
async function deletePlayer(req, res) {
  try {
    const deleted = await queryService.deletePlayerDoc(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Player not found' });

    const { label } = xmlSchemaService.getGraphEntityStorage('Player');
    await neo4jService.runCypher(`MATCH (p:${label} {id: $id}) DETACH DELETE p`, { id: req.params.id });

    res.json({ success: true, message: 'Player deleted from both MongoDB and Neo4j' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  createPlayer,
  getAllPlayers,
  getPlayerById,
  getPlayerFull,
  getPlayerTraining,
  getPlayerRelationships,
  updatePlayer,
  deletePlayer
};
