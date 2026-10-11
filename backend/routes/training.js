const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/trainingController');

// Dedicated semantic action routes
router.get('/getTrainingByPlayer/:playerId', trainingController.getTrainingByPlayer);
router.post('/createTrainingSession', trainingController.createTrainingSession);
router.put('/updateTrainingSession/:id', trainingController.updateTrainingSession);
router.delete('/deleteTrainingSession/:id', trainingController.deleteTrainingSession);

// REST aliases
router.post('/', trainingController.createTrainingSession);
router.get('/player/:playerId', trainingController.getTrainingByPlayer);
router.put('/:id', trainingController.updateTrainingSession);
router.delete('/:id', trainingController.deleteTrainingSession);

module.exports = router;
