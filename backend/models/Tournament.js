/**
 * Tournament Entity Model Helper
 */

function validateTournament(data) {
  const errors = [];
  if (!data._id && !data.id && !data.tournamentId) {
    errors.push('Tournament ID is required.');
  }
  if (!data.name) {
    errors.push('Tournament name is required.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

function toMongoDocument(data) {
  const id = data._id || data.tournamentId || data.id;
  return {
    _id: id,
    name: data.name,
    sport: data.sport || 'General',
    location: data.location || 'Stadium',
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    endDate: data.endDate || new Date().toISOString().split('T')[0],
    status: data.status || 'Upcoming'
  };
}

function toNeo4jNode(data) {
  const id = data._id || data.tournamentId || data.id;
  return {
    id: id,
    name: data.name
  };
}

module.exports = {
  validateTournament,
  toMongoDocument,
  toNeo4jNode
};
