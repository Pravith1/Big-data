/**
 * TrainingSession Entity Model Helper
 */

function validateTrainingSession(data) {
  const errors = [];
  if (!data._id && !data.id && !data.sessionId) {
    errors.push('Training session ID is required.');
  }
  if (!data.playerId) {
    errors.push('Player ID (playerId) is required.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

function toMongoDocument(data) {
  const id = data._id || data.sessionId || data.id;
  return {
    _id: id,
    playerId: data.playerId,
    date: data.date || new Date().toISOString().split('T')[0],
    durationMinutes: Number(data.durationMinutes) || 60,
    metrics: data.metrics || {
      distanceKm: Number(data.distanceKm) || 0,
      steps: Number(data.steps) || 0,
      calories: Number(data.calories) || 0,
      averageHeartRate: Number(data.averageHeartRate) || 120,
      maximumHeartRate: Number(data.maximumHeartRate) || 160
    },
    fitnessScore: Number(data.fitnessScore) || 7.5,
    coachFeedback: data.coachFeedback || ''
  };
}

module.exports = {
  validateTrainingSession,
  toMongoDocument
};
