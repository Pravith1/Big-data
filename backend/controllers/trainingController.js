const queryService = require('../services/queryService');
const xmlSchemaService = require('../services/xmlSchemaService');

// POST /api/training/createTrainingSession (or POST /api/training)
async function createTrainingSession(req, res) {
  try {
    const body = { ...req.body };
    if (!body._id && body.session_id) body._id = body.session_id;
    if (!body._id && body.sessionId) body._id = body.sessionId;
    if (!body._id) body._id = `TS${Math.floor(1000 + Math.random() * 9000)}`;

    if (!body.playerId && body.player_id) body.playerId = body.player_id;
    if (!body.durationMinutes && body.duration_minutes) body.durationMinutes = Number(body.duration_minutes);
    if (!body.durationMinutes && body.duration) body.durationMinutes = Number(body.duration);
    if (!body.coachFeedback && (body.notes || body.drills)) body.coachFeedback = [body.drills, body.notes].filter(Boolean).join(' - ');

    const validation = xmlSchemaService.validateDocument('TrainingSession', body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: validation.errors.join(', ') });
    }

    const inserted = await queryService.createTrainingDoc(body);
    res.status(201).json({ success: true, data: inserted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/training/getTrainingByPlayer/:playerId (or GET /api/training/player/:playerId)
async function getTrainingByPlayer(req, res) {
  try {
    const playerId = req.params.playerId || req.query.playerId;
    if (!playerId) return res.status(400).json({ success: false, error: 'playerId is required' });

    const sessions = await queryService.getTrainingByPlayer(playerId);
    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// PUT /api/training/updateTrainingSession/:id (or PUT /api/training/:id)
async function updateTrainingSession(req, res) {
  try {
    const id = req.params.id;
    const updated = await queryService.updateTrainingDoc(id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Training session not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /api/training/deleteTrainingSession/:id (or DELETE /api/training/:id)
async function deleteTrainingSession(req, res) {
  try {
    const id = req.params.id;
    const deleted = await queryService.deleteTrainingDoc(id);
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
