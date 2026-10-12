const neo4jService = require('../services/neo4jService');
const xmlSchemaService = require('../services/xmlSchemaService');

// POST /api/relationships/player-team
// Body: { playerId, teamId }
async function assignPlayerToTeam(req, res) {
  try {
    const { playerId, teamId } = req.body;
    if (!playerId || !teamId) {
      return res.status(400).json({ success: false, error: 'playerId and teamId are required' });
    }
    const rel = xmlSchemaService.getRelationshipStorage('MEMBER_OF');
    const result = await neo4jService.createRelationship('Player', playerId, rel.name, 'Team', teamId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}



// POST /api/relationships/coach-team
// Body: { coachId, teamId }
async function assignCoachToTeam(req, res) {
  try {
    const { coachId, teamId } = req.body;
    if (!coachId || !teamId) {
      return res.status(400).json({ success: false, error: 'coachId and teamId are required' });
    }
    const rel = xmlSchemaService.getRelationshipStorage('COACHES');
    const result = await neo4jService.createRelationship('Coach', coachId, rel.name, 'Team', teamId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/relationships/team-tournament
// Body: { teamId, tournamentId }
async function addTeamToTournament(req, res) {
  try {
    const { teamId, tournamentId } = req.body;
    if (!teamId || !tournamentId) {
      return res.status(400).json({ success: false, error: 'teamId and tournamentId are required' });
    }
    const rel = xmlSchemaService.getRelationshipStorage('PARTICIPATES_IN');
    const result = await neo4jService.createRelationship('Team', teamId, rel.name, 'Tournament', tournamentId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// POST /api/relationships/player-training-center
// Body: { playerId, trainingCenterId }
async function assignPlayerToTrainingCenter(req, res) {
  try {
    const { playerId, trainingCenterId } = req.body;
    if (!playerId || !trainingCenterId) {
      return res.status(400).json({ success: false, error: 'playerId and trainingCenterId are required' });
    }
    const rel = xmlSchemaService.getRelationshipStorage('TRAINS_AT');
    const result = await neo4jService.createRelationship('Player', playerId, rel.name, 'TrainingCenter', trainingCenterId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  assignPlayerToTeam,
  assignCoachToTeam,
  addTeamToTournament,
  assignPlayerToTrainingCenter
};
