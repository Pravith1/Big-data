const xmlSchemaService = require('./xmlSchemaService');
const mongoService = require('./mongoService');
const neo4jService = require('./neo4jService');

// ─────────────────────────────────────────────────────────
//  GENERIC XML-DRIVEN DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────

/**
 * Generic finder for any MongoDB entity defined in globalSchema.xml
 */
async function findEntities(entityName, query = {}, options = {}) {
  const schema = xmlSchemaService.getEntitySchema(entityName);
  if (!schema) throw new Error(`Unknown entity '${entityName}' in XML schema`);
  return mongoService.findDocuments(schema.collection, query, options);
}

/**
 * Generic single-document finder for any MongoDB entity defined in globalSchema.xml
 */
async function findEntityById(entityName, id) {
  const schema = xmlSchemaService.getEntitySchema(entityName);
  if (!schema) throw new Error(`Unknown entity '${entityName}' in XML schema`);
  return mongoService.findOneDocument(schema.collection, { [schema.primaryKey]: id });
}

/**
 * Generic insert driven by XML schema validation and document building
 */
async function createEntity(entityName, rawData) {
  const validation = xmlSchemaService.validateDocument(entityName, rawData);
  if (!validation.isValid) {
    throw new Error(`Validation failed for ${entityName}: ${validation.errors.join(', ')}`);
  }

  const schema = xmlSchemaService.getEntitySchema(entityName);
  const doc = xmlSchemaService.buildMongoDocument(entityName, rawData);
  const inserted = await mongoService.insertDocument(schema.collection, doc);

  // If this entity is also a Neo4j graph entity, sync the node into Neo4j
  const graphSchema = xmlSchemaService.getGraphEntitySchema(entityName);
  if (graphSchema) {
    try {
      const nodeProps = xmlSchemaService.buildNeo4jNode(entityName, rawData);
      await neo4jService.createNode(graphSchema.label, nodeProps);
    } catch (graphErr) {
      console.warn(`[Warning] Neo4j node sync skipped for ${entityName}: ${graphErr.message}`);
    }
  }

  return inserted;
}

/**
 * Generic update for any MongoDB entity defined in globalSchema.xml
 */
async function updateEntity(entityName, id, updates) {
  const schema = xmlSchemaService.getEntitySchema(entityName);
  if (!schema) throw new Error(`Unknown entity '${entityName}' in XML schema`);

  const updatedDoc = await mongoService.updateDocument(schema.collection, { [schema.primaryKey]: id }, updates);

  // Sync to Neo4j if graph entity exists
  const graphSchema = xmlSchemaService.getGraphEntitySchema(entityName);
  if (graphSchema && updatedDoc) {
    try {
      const nodeProps = xmlSchemaService.buildNeo4jNode(entityName, { ...updatedDoc, [graphSchema.keyProperty]: id });
      await neo4jService.createNode(graphSchema.label, nodeProps);
    } catch (graphErr) {
      console.warn(`[Warning] Neo4j node update skipped for ${entityName}: ${graphErr.message}`);
    }
  }

  return updatedDoc;
}

/**
 * Generic delete for any MongoDB entity defined in globalSchema.xml
 */
async function deleteEntity(entityName, id) {
  const schema = xmlSchemaService.getEntitySchema(entityName);
  if (!schema) throw new Error(`Unknown entity '${entityName}' in XML schema`);

  const deleted = await mongoService.deleteDocument(schema.collection, { [schema.primaryKey]: id });

  // Delete from Neo4j if graph entity exists
  const graphSchema = xmlSchemaService.getGraphEntitySchema(entityName);
  if (graphSchema) {
    try {
      await neo4jService.runCypher(
        `MATCH (n:${graphSchema.label} {${graphSchema.keyProperty}: $id}) DETACH DELETE n`,
        { id }
      );
    } catch (graphErr) {
      console.warn(`[Warning] Neo4j node delete skipped for ${entityName}: ${graphErr.message}`);
    }
  }

  return deleted;
}

// ─────────────────────────────────────────────────────────
//  DOMAIN-SPECIFIC WRAPPERS USING XML SCHEMA METADATA
// ─────────────────────────────────────────────────────────

// --- Players ---
async function getAllPlayers(filters = {}) {
  const schema = xmlSchemaService.getEntitySchema('Player');
  const query = filters.sport ? { sport: filters.sport } : {};
  return mongoService.findDocuments(schema.collection, query);
}

async function getPlayerById(playerId) {
  return findEntityById('Player', playerId);
}

async function createPlayerDoc(doc) {
  return createEntity('Player', doc);
}

async function updatePlayerDoc(playerId, updates) {
  return updateEntity('Player', playerId, updates);
}

async function deletePlayerDoc(playerId) {
  return deleteEntity('Player', playerId);
}

// --- Training Sessions ---
async function getTrainingByPlayer(playerId) {
  const schema = xmlSchemaService.getEntitySchema('TrainingSession');
  const fk = schema.foreignKey || 'playerId';
  return mongoService.findDocuments(schema.collection, { [fk]: playerId });
}

async function createTrainingDoc(doc) {
  return createEntity('TrainingSession', doc);
}

async function updateTrainingDoc(sessionId, updates) {
  return updateEntity('TrainingSession', sessionId, updates);
}

async function deleteTrainingDoc(sessionId) {
  return deleteEntity('TrainingSession', sessionId);
}

// --- Tournaments ---
async function getAllTournaments() {
  const schema = xmlSchemaService.getEntitySchema('Tournament');
  return mongoService.findDocuments(schema.collection, {});
}

async function getTournamentById(tournamentId) {
  return findEntityById('Tournament', tournamentId);
}

async function createTournamentDoc(doc) {
  return createEntity('Tournament', doc);
}

async function updateTournamentDoc(tournamentId, updates) {
  return updateEntity('Tournament', tournamentId, updates);
}

async function deleteTournamentDoc(tournamentId) {
  return deleteEntity('Tournament', tournamentId);
}

// --- Medical Records ---
async function getMedicalRecordsByPlayer(playerId) {
  const schema = xmlSchemaService.getEntitySchema('MedicalRecord');
  const fk = schema.foreignKey || 'playerId';
  return mongoService.findDocuments(schema.collection, { [fk]: playerId });
}

// --- Performance Records ---
async function getPerformanceByPlayer(playerId) {
  const schema = xmlSchemaService.getEntitySchema('PerformanceRecord');
  return mongoService.findDocuments(schema.collection, { playerId });
}

async function getPerformanceByTournament(tournamentId) {
  const schema = xmlSchemaService.getEntitySchema('PerformanceRecord');
  return mongoService.findDocuments(schema.collection, { tournamentId });
}

// ─────────────────────────────────────────────────────────
//  NEO4J GRAPH OPERATIONS DRIVEN BY XML SCHEMA
// ─────────────────────────────────────────────────────────

async function getPlayerRelationships(playerId) {
  const playerGraph = xmlSchemaService.getGraphEntitySchema('Player');
  try {
    const records = await neo4jService.runCypher(
      `
      MATCH (p:${playerGraph.label} {${playerGraph.keyProperty}: $playerId})
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
  } catch (err) {
    console.warn(`[Warning] getPlayerRelationships query error: ${err.message}`);
    return null;
  }
}

async function getPlayersByCoach(coachIdOrName) {
  try {
    return await neo4jService.getPlayersCoachedBy(coachIdOrName);
  } catch (err) {
    console.warn(`[Warning] getPlayersByCoach query error: ${err.message}`);
    return [];
  }
}

async function getTeamsByCoach(coachIdOrName) {
  try {
    return await neo4jService.getTeamsCoachedBy(coachIdOrName);
  } catch (err) {
    console.warn(`[Warning] getTeamsByCoach query error: ${err.message}`);
    return [];
  }
}

async function getPlayersByTeam(teamIdOrName) {
  try {
    return await neo4jService.getPlayersInTeam(teamIdOrName);
  } catch (err) {
    console.warn(`[Warning] getPlayersByTeam query error: ${err.message}`);
    return [];
  }
}

async function getTournamentPlayers(tournamentId) {
  const rel = xmlSchemaService.getRelationshipSchema('PARTICIPATES_IN');
  const tournamentGraph = xmlSchemaService.getGraphEntitySchema('Tournament');
  const playerGraph = xmlSchemaService.getGraphEntitySchema('Player');

  try {
    return await neo4jService.runCypher(
      `
      MATCH (p:${playerGraph.label})-[:${rel.name}]->(t:${tournamentGraph.label} {${tournamentGraph.keyProperty}: $tournamentId})
      RETURN p.id AS id, p.id AS playerId, p.name AS name, p.name AS playerName, p.sport AS sport
      `,
      { tournamentId }
    );
  } catch (err) {
    console.warn(`[Warning] getTournamentPlayers query error: ${err.message}`);
    return [];
  }
}

async function getTournamentTeams(tournamentId) {
  const rel = xmlSchemaService.getRelationshipSchema('PARTICIPATES_IN');
  const tournamentGraph = xmlSchemaService.getGraphEntitySchema('Tournament');
  const teamGraph = xmlSchemaService.getGraphEntitySchema('Team');

  try {
    return await neo4jService.runCypher(
      `
      MATCH (t:${teamGraph.label})-[:${rel.name}]->(tr:${tournamentGraph.label} {${tournamentGraph.keyProperty}: $tournamentId})
      RETURN t.id AS id, t.id AS teamId, t.name AS name, t.name AS teamName, t.sport AS sport
      `,
      { tournamentId }
    );
  } catch (err) {
    console.warn(`[Warning] getTournamentTeams query error: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────
//  CROSS-DATABASE OPERATIONS (Neo4j Graph + MongoDB Docs)
// ─────────────────────────────────────────────────────────

/**
 * Merges full MongoDB player profile with Neo4j graph relationships
 */
async function getPlayerFull(playerId) {
  const playerEntity = xmlSchemaService.getEntitySchema('Player');

  const profile = await mongoService.findOneDocument(playerEntity.collection, { [playerEntity.primaryKey]: playerId });
  if (!profile) return null;

  let graphData = null;
  try {
    graphData = await getPlayerRelationships(playerId);
  } catch (err) {
    console.warn(`[Warning] Failed to fetch graph relationships for player ${playerId}: ${err.message}`);
  }

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
 * Cross-DB query: Finds players coached by coach in Neo4j, then fetches their training sessions from MongoDB
 */
async function getCoachPlayerTraining(coachIdOrName) {
  const coachesRel = xmlSchemaService.getRelationshipSchema('COACHES');
  const memberOfRel = xmlSchemaService.getRelationshipSchema('MEMBER_OF');
  const trainingEntity = xmlSchemaService.getEntitySchema('TrainingSession');

  console.log(`[QueryService] getCoachPlayerTraining:`);
  console.log(`  → Neo4j: Traversing relationships '${coachesRel.name}' & '${memberOfRel.name}'`);
  console.log(`  → MongoDB: Querying collection '${trainingEntity.collection}' by foreignKey '${trainingEntity.foreignKey}'`);

  let graphPlayers = [];
  try {
    graphPlayers = await neo4jService.getPlayersCoachedBy(coachIdOrName);
  } catch (err) {
    console.warn(`[Warning] Neo4j getPlayersCoachedBy error: ${err.message}`);
  }

  if (!graphPlayers || graphPlayers.length === 0) {
    // If Neo4j is offline or has no data, return empty list gracefully
    return [];
  }

  const playerIds = graphPlayers.map(p => p.playerId);

  const trainingSessions = await mongoService.findDocuments(trainingEntity.collection, {
    [trainingEntity.foreignKey || 'playerId']: { $in: playerIds }
  });

  return graphPlayers.map(player => ({
    playerId: player.playerId,
    playerName: player.playerName,
    sport: player.sport,
    team: player.teamName || null,
    coachName: player.coachName || coachIdOrName,
    trainingSessions: trainingSessions
      .filter(ts => ts[trainingEntity.foreignKey || 'playerId'] === player.playerId)
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
 * Cross-DB query: Finds coached players in Neo4j and merges their full MongoDB documents
 */
async function getCoachPlayersWithProfiles(coachIdOrName) {
  const playerEntity = xmlSchemaService.getEntitySchema('Player');

  let graphPlayers = [];
  try {
    graphPlayers = await neo4jService.getPlayersCoachedBy(coachIdOrName);
  } catch (err) {
    console.warn(`[Warning] Neo4j getPlayersCoachedBy error: ${err.message}`);
  }

  if (!graphPlayers || graphPlayers.length === 0) return [];

  const playerIds = graphPlayers.map(p => p.playerId);

  const profiles = await mongoService.findDocuments(playerEntity.collection, {
    [playerEntity.primaryKey]: { $in: playerIds }
  });

  return graphPlayers.map(gp => {
    const profile = profiles.find(p => p[playerEntity.primaryKey] === gp.playerId) || {};
    return {
      ...profile,
      team: gp.teamName || null,
      coachName: gp.coachName || coachIdOrName
    };
  });
}

module.exports = {
  // Generic XML-driven
  findEntities,
  findEntityById,
  createEntity,
  updateEntity,
  deleteEntity,

  // MongoDB entities
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

  // Neo4j graph
  getPlayerRelationships,
  getPlayersByCoach,
  getTeamsByCoach,
  getPlayersByTeam,
  getTournamentPlayers,
  getTournamentTeams,

  // Cross-DB
  getPlayerFull,
  getCoachPlayerTraining,
  getCoachPlayersWithProfiles
};
