const queryService = require('../services/queryService');
const neo4jService = require('../services/neo4jService');
const xmlSchemaService = require('../services/xmlSchemaService');
const Tournament = require('../models/Tournament');

// POST /api/tournaments
async function createTournament(req, res) {
  try {
    const { isValid, errors } = Tournament.validateTournament(req.body);
    if (!isValid) return res.status(400).json({ success: false, error: errors.join(', ') });

    const doc = Tournament.toMongoDocument(req.body);
    const node = Tournament.toNeo4jNode(req.body);

    const { label } = xmlSchemaService.getGraphEntityStorage('Tournament');

    const inserted = await queryService.createTournamentDoc(doc);
    await neo4jService.createNode(label, node);

    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/tournaments
async function getAllTournaments(req, res) {
  try {
    const tournaments = await queryService.getAllTournaments();
    res.json({ success: true, count: tournaments.length, data: tournaments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/tournaments/:id
async function getTournamentById(req, res) {
  try {
    const tournament = await queryService.getTournamentById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, error: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/tournaments/:id/players  (Neo4j)
async function getTournamentPlayers(req, res) {
  try {
    const players = await queryService.getTournamentPlayers(req.params.id);
    res.json({ success: true, count: players.length, data: players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/tournaments/:id/teams  (Neo4j)
async function getTournamentTeams(req, res) {
  try {
    const teams = await queryService.getTournamentTeams(req.params.id);
    res.json({ success: true, count: teams.length, data: teams });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// PUT /api/tournaments/:id
async function updateTournament(req, res) {
  try {
    const updated = await queryService.updateTournamentDoc(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Tournament not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/tournaments/:id
async function deleteTournament(req, res) {
  try {
    const deleted = await queryService.deleteTournamentDoc(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Tournament not found' });

    const { label } = xmlSchemaService.getGraphEntityStorage('Tournament');
    await neo4jService.runCypher(`MATCH (t:${label} {id: $id}) DETACH DELETE t`, { id: req.params.id });

    res.json({ success: true, message: 'Tournament deleted from both MongoDB and Neo4j' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  createTournament,
  getAllTournaments,
  getTournamentById,
  getTournamentPlayers,
  getTournamentTeams,
  updateTournament,
  deleteTournament
};
