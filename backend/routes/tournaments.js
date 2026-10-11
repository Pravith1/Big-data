const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');

// Dedicated semantic action routes
router.get('/getAllTournaments', tournamentController.getAllTournaments);
router.get('/getTournamentById/:id', tournamentController.getTournamentById);
router.get('/getTournamentPlayers/:id', tournamentController.getTournamentPlayers);
router.get('/getTournamentTeams/:id', tournamentController.getTournamentTeams);
router.post('/createTournament', tournamentController.createTournament);
router.put('/updateTournament/:id', tournamentController.updateTournament);
router.delete('/deleteTournament/:id', tournamentController.deleteTournament);

// REST aliases
router.post('/', tournamentController.createTournament);
router.get('/', tournamentController.getAllTournaments);
router.get('/:id/players', tournamentController.getTournamentPlayers);
router.get('/:id/teams', tournamentController.getTournamentTeams);
router.get('/:id', tournamentController.getTournamentById);
router.put('/:id', tournamentController.updateTournament);
router.delete('/:id', tournamentController.deleteTournament);

module.exports = router;
