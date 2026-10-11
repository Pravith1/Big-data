const express = require('express');
const router = express.Router();
const coachController = require('../controllers/coachController');

// Dedicated semantic action routes
router.get('/getCoachPlayers/:id', coachController.getCoachPlayers);
router.get('/getCoachTeams/:id', coachController.getCoachTeams);
router.get('/getCoachPlayerTraining/:id', coachController.getCoachPlayerTraining);

// REST aliases
router.get('/:id/players', coachController.getCoachPlayers);
router.get('/:id/teams', coachController.getCoachTeams);
router.get('/:id/training', coachController.getCoachPlayerTraining);

module.exports = router;
