const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');

// POST   /api/tournaments              → create tournament (MongoDB + Neo4j node)
// GET    /api/tournaments              → get all tournaments (MongoDB)
// GET    /api/tournaments/:id          → get tournament details (MongoDB)
// GET    /api/tournaments/:id/players  → players participating in tournament (Neo4j)
// GET    /api/tournaments/:id/teams    → teams participating in tournament (Neo4j)
// PUT    /api/tournaments/:id          → update tournament (MongoDB)
// DELETE /api/tournaments/:id          → delete from MongoDB + Neo4j

router.post('/', tournamentController.createTournament);
router.get('/', tournamentController.getAllTournaments);
router.get('/:id/players', tournamentController.getTournamentPlayers);
router.get('/:id/teams', tournamentController.getTournamentTeams);
router.get('/:id', tournamentController.getTournamentById);
router.put('/:id', tournamentController.updateTournament);
router.delete('/:id', tournamentController.deleteTournament);

module.exports = router;
