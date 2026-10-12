const express = require('express');
const router = express.Router();
const relationshipController = require('../controllers/relationshipController');

// All relationship creation endpoints — all write to Neo4j only
// The XML schema defines which relationship type maps to which edge in the graph

// POST /api/relationships/player-team
//   Body: { playerId, teamId }
//   Creates: (Player)-[:MEMBER_OF]->(Team)
router.post('/player-team', relationshipController.assignPlayerToTeam);



// POST /api/relationships/coach-team
//   Body: { coachId, teamId }
//   Creates: (Coach)-[:COACHES]->(Team)
router.post('/coach-team', relationshipController.assignCoachToTeam);



// POST /api/relationships/team-tournament
//   Body: { teamId, tournamentId }
//   Creates: (Team)-[:PARTICIPATES_IN]->(Tournament)
router.post('/team-tournament', relationshipController.addTeamToTournament);

// POST /api/relationships/player-training-center
//   Body: { playerId, trainingCenterId }
//   Creates: (Player)-[:TRAINS_AT]->(TrainingCenter)
router.post('/player-training-center', relationshipController.assignPlayerToTrainingCenter);

module.exports = router;
