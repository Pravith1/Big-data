const queryService = require('../services/queryService');
const xmlSchemaService = require('../services/xmlSchemaService');

// POST /api/tournaments/createTournament (or POST /api/tournaments)
async function createTournament(req, res) {
  try {
    const validation = xmlSchemaService.validateDocument('Tournament', req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.errors.join(', ') });
    }

    const inserted = await queryService.createTournamentDoc(req.body);
    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/tournaments/getAllTournaments (or GET /api/tournaments)
async function getAllTournaments(req, res) {
  try {
    const tournaments = await queryService.getAllTournaments();
    res.json({ success: true, count: tournaments.length, data: tournaments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/tournaments/getTournamentById/:id (or GET /api/tournaments/:id)
async function getTournamentById(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).json({ success: false, error: 'Tournament ID is required' });

    const tournament = await queryService.getTournamentById(id);
    if (!tournament) return res.status(404).json({ success: false, error: `Tournament '${id}' not found` });
    res.json({ success: true, data: tournament });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/tournaments/getTournamentPlayers/:id (or GET /api/tournaments/:id/players)
async function getTournamentPlayers(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).json({ success: false, error: 'Tournament ID is required' });

    const players = await queryService.getTournamentPlayers(id);
    res.json({ success: true, count: players.length, data: players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/tournaments/getTournamentTeams/:id (or GET /api/tournaments/:id/teams)
async function getTournamentTeams(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).json({ success: false, error: 'Tournament ID is required' });

    const teams = await queryService.getTournamentTeams(id);
    res.json({ success: true, count: teams.length, data: teams });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// PUT /api/tournaments/updateTournament/:id (or PUT /api/tournaments/:id)
async function updateTournament(req, res) {
  try {
    const id = req.params.id;
    const updated = await queryService.updateTournamentDoc(id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: `Tournament '${id}' not found` });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/tournaments/deleteTournament/:id (or DELETE /api/tournaments/:id)
async function deleteTournament(req, res) {
  try {
    const id = req.params.id;
    const deleted = await queryService.deleteTournamentDoc(id);
    if (!deleted) return res.status(404).json({ success: false, error: `Tournament '${id}' not found` });
    res.json({ success: true, message: `Tournament '${id}' deleted from MongoDB and Neo4j` });
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
