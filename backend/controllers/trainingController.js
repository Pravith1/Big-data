const queryService = require('../services/queryService');

// POST /api/training
async function createTrainingSession(req, res) {
  try {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ success: false, error: 'playerId is required' });

    const id = req.body._id || req.body.id || req.body.sessionId;
    if (!id) return res.status(400).json({ success: false, error: 'Training session ID (_id) is required' });

    const doc = { _id: id, ...req.body };
    const inserted = await queryService.createTrainingDoc(doc);
    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/training/player/:playerId
async function getTrainingByPlayer(req, res) {
  try {
    const sessions = await queryService.getTrainingByPlayer(req.params.playerId);
    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// PUT /api/training/:id
async function updateTrainingSession(req, res) {
  try {
    const updated = await queryService.updateTrainingDoc(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Training session not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/training/:id
async function deleteTrainingSession(req, res) {
  try {
    const deleted = await queryService.deleteTrainingDoc(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Training session not found' });
    res.json({ success: true, message: 'Training session deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  createTrainingSession,
  getTrainingByPlayer,
  updateTrainingSession,
  deleteTrainingSession
};
