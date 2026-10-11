const queryService = require('../services/queryService');
const xmlSchemaService = require('../services/xmlSchemaService');

// POST /api/players/createPlayer (or POST /api/players)
async function createPlayer(req, res) {
  try {
    const validation = xmlSchemaService.validateDocument('Player', req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.errors.join(', ') });
    }

    const inserted = await queryService.createPlayerDoc(req.body);
    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/getAllPlayers (or GET /api/players)
async function getAllPlayers(req, res) {
  try {
    const players = await queryService.getAllPlayers({ sport: req.query.sport });
    res.json({ success: true, count: players.length, data: players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/getPlayerById/:id (or GET /api/players/:id)
async function getPlayerById(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).json({ success: false, error: 'Player ID is required' });

    const player = await queryService.getPlayerById(id);
    if (!player) return res.status(404).json({ success: false, error: `Player '${id}' not found` });
    res.json({ success: true, data: player });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/getPlayerFull/:id (or GET /api/players/:id/full)
// Merges MongoDB player profile with Neo4j graph relationships
async function getPlayerFull(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).json({ success: false, error: 'Player ID is required' });

    const player = await queryService.getPlayerFull(id);
    if (!player) return res.status(404).json({ success: false, error: `Player '${id}' not found` });
    res.json({ success: true, data: player });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/getPlayerTraining/:id (or GET /api/players/:id/training)
async function getPlayerTraining(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).json({ success: false, error: 'Player ID is required' });

    const sessions = await queryService.getTrainingByPlayer(id);
    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/getPlayerRelationships/:id (or GET /api/players/:id/relationships)
async function getPlayerRelationships(req, res) {
  try {
    const id = req.params.id || req.query.id;
    if (!id) return res.status(400).json({ success: false, error: 'Player ID is required' });

    const graph = await queryService.getPlayerRelationships(id);
    if (!graph) return res.status(404).json({ success: false, error: `Player '${id}' not found in graph` });
    res.json({ success: true, data: graph });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/getCoachPlayerTraining (or /api/players/getCoachPlayerTraining/:coachId)
// Cross-DB operation: Traverses coach-player relationships in Neo4j and joins MongoDB training sessions
async function getCoachPlayerTraining(req, res) {
  try {
    const coachIdOrName = req.params.coachId || req.query.coachId || req.query.coach;
    if (!coachIdOrName) {
      return res.status(400).json({ success: false, error: 'coachId parameter (or ?coachId=...) is required' });
    }

    const results = await queryService.getCoachPlayerTraining(coachIdOrName);
    res.json({
      success: true,
      coach: coachIdOrName,
      count: results.length,
      data: results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/players/getCoachPlayers (or /api/players/getCoachPlayers/:coachId)
async function getCoachPlayers(req, res) {
  try {
    const coachIdOrName = req.params.coachId || req.query.coachId || req.query.coach;
    if (!coachIdOrName) {
      return res.status(400).json({ success: false, error: 'coachId parameter is required' });
    }

    const withProfile = req.query.full === 'true';
    const players = withProfile
      ? await queryService.getCoachPlayersWithProfiles(coachIdOrName)
      : await queryService.getPlayersByCoach(coachIdOrName);

    res.json({ success: true, coach: coachIdOrName, count: players.length, data: players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// PUT /api/players/updatePlayer/:id (or PUT /api/players/:id)
async function updatePlayer(req, res) {
  try {
    const id = req.params.id;
    const updated = await queryService.updatePlayerDoc(id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: `Player '${id}' not found` });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/players/deletePlayer/:id (or DELETE /api/players/:id)
async function deletePlayer(req, res) {
  try {
    const id = req.params.id;
    const deleted = await queryService.deletePlayerDoc(id);
    if (!deleted) return res.status(404).json({ success: false, error: `Player '${id}' not found` });
    res.json({ success: true, message: `Player '${id}' deleted from MongoDB and Neo4j` });
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
  getCoachPlayerTraining,
  getCoachPlayers,
  updatePlayer,
  deletePlayer
};
