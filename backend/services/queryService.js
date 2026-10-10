const xmlSchemaService = require('./xmlSchemaService');
const mongoService = require('./mongoService');
const neo4jService = require('./neo4jService');

// ─────────────────────────────────────────────────────────
//  MONGODB-ONLY OPERATIONS
// ─────────────────────────────────────────────────────────

async function getAllPlayers(filters = {}) {
  const { collection } = xmlSchemaService.getEntityStorage('Player');
  const query = filters.sport ? { sport: filters.sport } : {};
  return mongoService.findDocuments(collection, query);
}

async function getPlayerById(playerId) {
  const { collection } = xmlSchemaService.getEntityStorage('Player');
  return mongoService.findOneDocument(collection, { _id: playerId });
}

async function createPlayerDoc(doc) {
  const { collection } = xmlSchemaService.getEntityStorage('Player');
  return mongoService.insertDocument(collection, doc);
}

async function updatePlayerDoc(playerId, updates) {
  const { collection } = xmlSchemaService.getEntityStorage('Player');
  return mongoService.updateDocument(collection, { _id: playerId }, updates);
}

async function deletePlayerDoc(playerId) {
  const { collection } = xmlSchemaService.getEntityStorage('Player');
  return mongoService.deleteDocument(collection, { _id: playerId });
}

async function getTrainingByPlayer(playerId) {
  const { collection } = xmlSchemaService.getEntityStorage('TrainingSession');
  return mongoService.findDocuments(collection, { playerId });
}

async function createTrainingDoc(doc) {
  const { collection } = xmlSchemaService.getEntityStorage('TrainingSession');
  return mongoService.insertDocument(collection, doc);
}

async function updateTrainingDoc(sessionId, updates) {
  const { collection } = xmlSchemaService.getEntityStorage('TrainingSession');
  return mongoService.updateDocument(collection, { _id: sessionId }, updates);
}

async function deleteTrainingDoc(sessionId) {
  const { collection } = xmlSchemaService.getEntityStorage('TrainingSession');
  return mongoService.deleteDocument(collection, { _id: sessionId });
}

async function getAllTournaments() {
  const { collection } = xmlSchemaService.getEntityStorage('Tournament');
  return mongoService.findDocuments(collection, {});
}

async function getTournamentById(tournamentId) {
  const { collection } = xmlSchemaService.getEntityStorage('Tournament');
  return mongoService.findOneDocument(collection, { _id: tournamentId });
}

async function createTournamentDoc(doc) {
  const { collection } = xmlSchemaService.getEntityStorage('Tournament');
  return mongoService.insertDocument(collection, doc);
}

async function updateTournamentDoc(tournamentId, updates) {
  const { collection } = xmlSchemaService.getEntityStorage('Tournament');
  return mongoService.updateDocument(collection, { _id: tournamentId }, updates);
}

async function deleteTournamentDoc(tournamentId) {
  const { collection } = xmlSchemaService.getEntityStorage('Tournament');
  return mongoService.deleteDocument(collection, { _id: tournamentId });
}

async function getMedicalRecordsByPlayer(playerId) {
  const { collection } = xmlSchemaService.getEntityStorage('MedicalRecord');
  return mongoService.findDocuments(collection, { playerId });
}

async function getPerformanceByPlayer(playerId) {
  const { collection } = xmlSchemaService.getEntityStorage('PerformanceRecord');
  return mongoService.findDocuments(collection, { playerId });
}

async function getPerformanceByTournament(tournamentId) {
  const { collection } = xmlSchemaService.getEntityStorage('PerformanceRecord');
  return mongoService.findDocuments(collection, { tournamentId });
}

// ─────────────────────────────────────────────────────────
//  NEO4J-ONLY OPERATIONS
// ─────────────────────────────────────────────────────────

async function getPlayerRelationships(playerId) {
  // XML tells us: Player, Coach, Team, Sport, TrainingCenter → all Neo4j
  const playerGraph = xmlSchemaService.getGraphEntityStorage('Player');
  const records = await neo4jService.runCypher(
    `
    MATCH (p:${playerGraph.label} {id: $playerId})
    OPTIONAL MATCH (p)-[:MEMBER_OF]->(t:Team)
    OPTIONAL MATCH (p)-[:COACHED_BY]->(c:Coach)
    OPTIONAL MATCH (p)-[:PLAYS]->(s:Sport)
    OPTIONAL MATCH (p)-[:TRAINS_AT]->(tc:TrainingCenter)
    RETURN
      p.id AS playerId, p.name AS playerName,
      t.id AS teamId, t.name AS teamName,
      c.id AS coachId, c.name AS coachName,
      s.id AS sportId, s.name AS sport,
      tc.id AS trainingCenterId, tc.name AS trainingCenterName
    `,
    { playerId }
  );
  return records.length > 0 ? records[0] : null;
}

async function getPlayersByCoach(coachIdOrName) {
  // XML: COACHES relationship → Neo4j; MEMBER_OF relationship → Neo4j
  return neo4jService.getPlayersCoachedBy(coachIdOrName);
}

async function getTeamsByCoach(coachIdOrName) {
  return neo4jService.getTeamsCoachedBy(coachIdOrName);
}

async function getPlayersByTeam(teamIdOrName) {
  return neo4jService.getPlayersInTeam(teamIdOrName);
}

async function getTournamentPlayers(tournamentId) {
  // XML: PARTICIPATES_IN (Player → Tournament) → Neo4j
  const { name: relType } = xmlSchemaService.getRelationshipStorage('PARTICIPATES_IN');
  const { label: tournamentLabel } = xmlSchemaService.getGraphEntityStorage('Tournament');
  const { label: playerLabel } = xmlSchemaService.getGraphEntityStorage('Player');
  return neo4jService.runCypher(
    `
    MATCH (p:${playerLabel})-[:${relType}]->(t:${tournamentLabel} {id: $tournamentId})
    RETURN p.id AS playerId, p.name AS playerName
    `,
    { tournamentId }
  );
}

async function getTournamentTeams(tournamentId) {
  // XML: PARTICIPATES_IN (Team → Tournament) → Neo4j
  const { name: relType } = xmlSchemaService.getRelationshipStorage('PARTICIPATES_IN');
  const { label: tournamentLabel } = xmlSchemaService.getGraphEntityStorage('Tournament');
  const { label: teamLabel } = xmlSchemaService.getGraphEntityStorage('Team');
  return neo4jService.runCypher(
    `
    MATCH (t:${teamLabel})-[:${relType}]->(tr:${tournamentLabel} {id: $tournamentId})
    RETURN t.id AS teamId, t.name AS teamName
    `,
    { tournamentId }
  );
}

// ─────────────────────────────────────────────────────────
//  CROSS-DATABASE OPERATIONS (Neo4j → MongoDB → Merge)
// ─────────────────────────────────────────────────────────

/**
 * GET /api/players/:id/full
 * MongoDB: full player profile document
 * Neo4j:   player's team, coach, sport, training center relationships
 * Merges into one unified response.
 */
async function getPlayerFull(playerId) {
  // Step 1: XML lookup — Player entity → MongoDB
  const { collection: playerCollection } = xmlSchemaService.getEntityStorage('Player');

  // Step 2: XML lookup — Player graph entity + all relationship types → Neo4j
  const playerGraph = xmlSchemaService.getGraphEntityStorage('Player');

  // Step 3: MongoDB — fetch full profile
  const profile = await mongoService.findOneDocument(playerCollection, { _id: playerId });
  if (!profile) return null;

  // Step 4: Neo4j — fetch graph relationships
  const graphData = await getPlayerRelationships(playerId);

  // Step 5: Merge
  return {
    ...profile,
    graph: graphData
      ? {
          team: graphData.teamId ? { id: graphData.teamId, name: graphData.teamName } : null,
          coach: graphData.coachId ? { id: graphData.coachId, name: graphData.coachName } : null,
          sport: graphData.sportId ? { id: graphData.sportId, name: graphData.sport } : null,
          trainingCenter: graphData.trainingCenterId
            ? { id: graphData.trainingCenterId, name: graphData.trainingCenterName }
            : null
        }
      : null
  };
}

/**
 * GET /api/coaches/:id/training
 * Neo4j:   find all players coached by this coach (via COACHES → Team → MEMBER_OF → Player)
 * MongoDB: fetch training sessions for those player IDs
 * Merges player graph info + training documents.
 */
async function getCoachPlayerTraining(coachIdOrName) {
  // Step 1: XML lookup — which DB handles COACHES relationship?
  const coachesRel = xmlSchemaService.getRelationshipStorage('COACHES');
  const memberOfRel = xmlSchemaService.getRelationshipStorage('MEMBER_OF');
  const trainingEntity = xmlSchemaService.getEntityStorage('TrainingSession');

  console.log(`[QueryService] getCoachPlayerTraining`);
  console.log(`  → Neo4j: relationship '${coachesRel.name}' (${coachesRel.from} → ${coachesRel.to})`);
  console.log(`  → Neo4j: relationship '${memberOfRel.name}' (${memberOfRel.from} → ${memberOfRel.to})`);
  console.log(`  → MongoDB: entity 'TrainingSession' in collection '${trainingEntity.collection}'`);

  // Step 2: Neo4j — get players coached by this coach
  const graphPlayers = await neo4jService.getPlayersCoachedBy(coachIdOrName);
  if (!graphPlayers || graphPlayers.length === 0) return [];

  const playerIds = graphPlayers.map(p => p.playerId);
  console.log(`  → Retrieved ${playerIds.length} player IDs from Neo4j: [${playerIds.join(', ')}]`);

  // Step 3: MongoDB — get training sessions for those players
  const trainingSessions = await mongoService.findDocuments(trainingEntity.collection, {
    playerId: { $in: playerIds }
  });
  console.log(`  → Retrieved ${trainingSessions.length} training sessions from MongoDB`);

  // Step 4: Merge — join on playerId
  return graphPlayers.map(player => ({
    playerId: player.playerId,
    playerName: player.playerName,
    sport: player.sport,
    team: player.teamName || null,
    coachName: player.coachName || coachIdOrName,
    trainingSessions: trainingSessions
      .filter(ts => ts.playerId === player.playerId)
      .map(ts => ({
        sessionId: ts._id,
        date: ts.date,
        durationMinutes: ts.durationMinutes,
        metrics: ts.metrics,
        fitnessScore: ts.fitnessScore,
        coachFeedback: ts.coachFeedback
      }))
  }));
}

/**
 * GET /api/coaches/:id/players  (with full MongoDB profile merged in)
 * Neo4j:   players coached by coach
 * MongoDB: full player profile for each
 */
async function getCoachPlayersWithProfiles(coachIdOrName) {
  const playerEntity = xmlSchemaService.getEntityStorage('Player');
  const coachesRel = xmlSchemaService.getRelationshipStorage('COACHES');

  console.log(`[QueryService] getCoachPlayersWithProfiles`);
  console.log(`  → Neo4j: relationship '${coachesRel.name}'`);
  console.log(`  → MongoDB: collection '${playerEntity.collection}'`);

  // Neo4j: get player IDs + basic graph data
  const graphPlayers = await neo4jService.getPlayersCoachedBy(coachIdOrName);
  if (!graphPlayers || graphPlayers.length === 0) return [];

  const playerIds = graphPlayers.map(p => p.playerId);

  // MongoDB: get full profiles
  const profiles = await mongoService.findDocuments(playerEntity.collection, {
    _id: { $in: playerIds }
  });

  // Merge
  return graphPlayers.map(gp => {
    const profile = profiles.find(p => p._id === gp.playerId) || {};
    return {
      ...profile,
      team: gp.teamName || null,
      coachName: gp.coachName || coachIdOrName
    };
  });
}

module.exports = {
  // MongoDB-only
  getAllPlayers,
  getPlayerById,
  createPlayerDoc,
  updatePlayerDoc,
  deletePlayerDoc,
  getTrainingByPlayer,
  createTrainingDoc,
  updateTrainingDoc,
  deleteTrainingDoc,
  getAllTournaments,
  getTournamentById,
  createTournamentDoc,
  updateTournamentDoc,
  deleteTournamentDoc,
  getMedicalRecordsByPlayer,
  getPerformanceByPlayer,
  getPerformanceByTournament,

  // Neo4j-only
  getPlayerRelationships,
  getPlayersByCoach,
  getTeamsByCoach,
  getPlayersByTeam,
  getTournamentPlayers,
  getTournamentTeams,

  // Cross-database
  getPlayerFull,
  getCoachPlayerTraining,
  getCoachPlayersWithProfiles
};
