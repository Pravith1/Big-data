const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');

// POST   /api/training                      → create training session (MongoDB)
// GET    /api/training/player/:playerId      → get all sessions for a player (MongoDB)
// PUT    /api/training/:id                   → update training session (MongoDB)
// DELETE /api/training/:id                   → delete training session (MongoDB)

router.post('/', trainingController.createTrainingSession);
router.get('/player/:playerId', trainingController.getTrainingByPlayer);
router.put('/:id', trainingController.updateTrainingSession);
router.delete('/:id', trainingController.deleteTrainingSession);

module.exports = router;
