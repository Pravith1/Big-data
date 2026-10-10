const express = require('express');
const router = express.Router();
const coachController = require('../controllers/coachController');

// GET /api/coaches/:id/players
//   → Neo4j: find players coached by this coach
//   → ?full=true: additionally merges MongoDB player profiles (cross-DB)
//
// GET /api/coaches/:id/teams
//   → Neo4j: find teams managed by this coach
//
// GET /api/coaches/:id/training
//   → Cross-DB: Neo4j finds players → MongoDB fetches training sessions → merged result
//   → This is the main distributed query demonstration

router.get('/:id/players', coachController.getCoachPlayers);
router.get('/:id/teams', coachController.getCoachTeams);
router.get('/:id/training', coachController.getCoachPlayerTraining);

module.exports = router;
