const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');

// POST   /api/players           → create player
// GET    /api/players           → get all players (supports ?sport=Football)
// GET    /api/players/:id       → get player profile from MongoDB
// GET    /api/players/:id/full  → merged: MongoDB profile + Neo4j graph relationships
// GET    /api/players/:id/training      → player's training history (MongoDB)
// GET    /api/players/:id/relationships → player's graph relationships (Neo4j)
// PUT    /api/players/:id       → update player
// DELETE /api/players/:id       → delete from MongoDB + Neo4j

router.post('/', playerController.createPlayer);
router.get('/', playerController.getAllPlayers);
router.get('/:id/full', playerController.getPlayerFull);
router.get('/:id/training', playerController.getPlayerTraining);
router.get('/:id/relationships', playerController.getPlayerRelationships);
router.get('/:id', playerController.getPlayerById);
router.put('/:id', playerController.updatePlayer);
router.delete('/:id', playerController.deletePlayer);

module.exports = router;
