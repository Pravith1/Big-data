/**
 * PerformanceRecord Entity Model Helper
 */

function validatePerformanceRecord(data) {
  const errors = [];
  if (!data._id && !data.id && !data.performanceId) {
    errors.push('Performance record ID is required.');
  }
  if (!data.playerId) {
    errors.push('Player ID (playerId) is required.');
  }
  if (!data.tournamentId) {
    errors.push('Tournament ID (tournamentId) is required.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

function toMongoDocument(data) {
  const id = data._id || data.performanceId || data.id;
  return {
    _id: id,
    playerId: data.playerId,
    tournamentId: data.tournamentId,
    matchesPlayed: Number(data.matchesPlayed) || 0,
    goals: Number(data.goals) || 0,
    assists: Number(data.assists) || 0,
    rating: Number(data.rating) || 7.0
  };
}

module.exports = {
  validatePerformanceRecord,
  toMongoDocument
};
