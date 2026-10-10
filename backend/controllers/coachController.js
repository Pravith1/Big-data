const queryService = require('../services/queryService');
const neo4jService = require('../services/neo4jService');
const xmlSchemaService = require('../services/xmlSchemaService');

// GET /api/coaches/:id/players
// Neo4j-only: find players coached by this coach
// Optionally merges MongoDB profiles if ?full=true
async function getCoachPlayers(req, res) {
  try {
    const coachIdOrName = req.params.id;
    const withProfile = req.query.full === 'true';

    let players;
    if (withProfile) {
      // Cross-DB: Neo4j relationships + MongoDB player profiles merged
      players = await queryService.getCoachPlayersWithProfiles(coachIdOrName);
    } else {
      // Neo4j only
      players = await queryService.getPlayersByCoach(coachIdOrName);
    }

    res.json({ success: true, count: players.length, data: players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/coaches/:id/teams
// Neo4j-only: find teams managed by this coach
async function getCoachTeams(req, res) {
  try {
    const teams = await queryService.getTeamsByCoach(req.params.id);
    res.json({ success: true, count: teams.length, data: teams });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/coaches/:id/training
// Cross-DB: Neo4j → player IDs → MongoDB → training sessions → merged
async function getCoachPlayerTraining(req, res) {
  try {
    const coachIdOrName = req.params.id;
    const results = await queryService.getCoachPlayerTraining(coachIdOrName);
    res.json({
      success: true,
      note: 'Training data fetched from MongoDB, player-coach relationships from Neo4j',
      count: results.length,
      data: results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getCoachPlayers,
  getCoachTeams,
  getCoachPlayerTraining
};
