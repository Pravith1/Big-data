/**
 * Player Entity Model Helper
 */

function validatePlayer(playerData) {
  const errors = [];
  if (!playerData._id && !playerData.playerId && !playerData.id) {
    errors.push('Player ID (_id or playerId or id) is required.');
  }
  if (!playerData.name) {
    errors.push('Player name is required.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

function toMongoDocument(playerData) {
  const id = playerData._id || playerData.playerId || playerData.id;
  return {
    _id: id,
    name: playerData.name,
    age: Number(playerData.age) || 20,
    gender: playerData.gender || 'Male',
    sport: playerData.sport || 'Football',
    position: playerData.position || 'Player',
    trainingCenterId: playerData.trainingCenterId || null,
    contact: playerData.contact || {
      email: playerData.email || '',
      phone: playerData.phone || ''
    },
    joinedDate: playerData.joinedDate || new Date().toISOString().split('T')[0]
  };
}

function toNeo4jNode(playerData) {
  const id = playerData._id || playerData.playerId || playerData.id;
  return {
    id: id,
    name: playerData.name,
    age: Number(playerData.age) || 20,
    sport: playerData.sport || 'Football'
  };
}

module.exports = {
  validatePlayer,
  toMongoDocument,
  toNeo4jNode
};
