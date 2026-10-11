const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');

// ─────────────────────────────────────────────────────────────
// Dedicated Frontend Routes (Explicit Actions)
// ─────────────────────────────────────────────────────────────

// GET /api/players/getAllPlayers (supports ?sport=Football)
router.get('/getAllPlayers', playerController.getAllPlayers);

// GET /api/players/getCoachPlayerTraining (supports ?coachId=C101 or /:coachId)
router.get('/getCoachPlayerTraining/:coachId', playerController.getCoachPlayerTraining);
router.get('/getCoachPlayerTraining', playerController.getCoachPlayerTraining);

// GET /api/players/getCoachPlayers (supports ?coachId=C101 or /:coachId)
router.get('/getCoachPlayers/:coachId', playerController.getCoachPlayers);
router.get('/getCoachPlayers', playerController.getCoachPlayers);

// GET /api/players/getPlayerById/:id
router.get('/getPlayerById/:id', playerController.getPlayerById);

// GET /api/players/getPlayerFull/:id (MongoDB profile + Neo4j relationships merged)
router.get('/getPlayerFull/:id', playerController.getPlayerFull);

// GET /api/players/getPlayerTraining/:id (MongoDB training history)
router.get('/getPlayerTraining/:id', playerController.getPlayerTraining);

// GET /api/players/getPlayerRelationships/:id (Neo4j graph relationships)
router.get('/getPlayerRelationships/:id', playerController.getPlayerRelationships);

// POST /api/players/createPlayer
router.post('/createPlayer', playerController.createPlayer);

// PUT /api/players/updatePlayer/:id
router.put('/updatePlayer/:id', playerController.updatePlayer);

// DELETE /api/players/deletePlayer/:id
router.delete('/deletePlayer/:id', playerController.deletePlayer);

// ─────────────────────────────────────────────────────────────
// Standard REST Aliases (Backward Compatibility)
// ─────────────────────────────────────────────────────────────
router.post('/', playerController.createPlayer);
router.get('/', playerController.getAllPlayers);
router.get('/:id/full', playerController.getPlayerFull);
router.get('/:id/training', playerController.getPlayerTraining);
router.get('/:id/relationships', playerController.getPlayerRelationships);
router.get('/:id', playerController.getPlayerById);
router.put('/:id', playerController.updatePlayer);
router.delete('/:id', playerController.deletePlayer);

module.exports = router;
