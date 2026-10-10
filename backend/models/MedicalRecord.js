/**
 * MedicalRecord Entity Model Helper
 */

function validateMedicalRecord(data) {
  const errors = [];
  if (!data._id && !data.id && !data.recordId) {
    errors.push('Medical record ID is required.');
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
  const id = data._id || data.recordId || data.id;
  return {
    _id: id,
    playerId: data.playerId,
    injury: data.injury || {
      type: 'Routine Checkup',
      severity: 'None',
      date: new Date().toISOString().split('T')[0]
    },
    treatment: data.treatment || 'None',
    recoveryStatus: data.recoveryStatus || 'Fit',
    fitnessAssessment: data.fitnessAssessment || {
      score: 90,
      date: new Date().toISOString().split('T')[0]
    }
  };
}

module.exports = {
  validateMedicalRecord,
  toMongoDocument
};
