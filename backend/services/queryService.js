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
  const players = await mongoService.findDocuments(schema.collection, query);

  try {
    const rels = await neo4jService.runCypher(`
      MATCH (p:Player)
      OPTIONAL MATCH (p)-[:MEMBER_OF]->(t:Team)
      OPTIONAL MATCH (c:Coach)-[:COACHES]->(t)
      RETURN p.id AS playerId, t.id AS teamId, c.id AS coachId
    `);
    if (rels && rels.length > 0) {
      const teamIds = [...new Set(rels.map(r => r.teamId).filter(Boolean))];
      const coachIds = [...new Set(rels.map(r => r.coachId).filter(Boolean))];

      const teamDocs = teamIds.length > 0 ? await mongoService.findDocuments('teams', { _id: { $in: teamIds } }) : [];
      const coachDocs = coachIds.length > 0 ? await mongoService.findDocuments('coaches', { _id: { $in: coachIds } }) : [];

      const teamMap = new Map(teamDocs.map(t => [t._id, t.name]));
      const coachMap = new Map(coachDocs.map(c => [c._id, c.name]));

      const relMap = new Map(rels.map(r => [r.playerId, {
        teamId: r.teamId || null,
        teamName: teamMap.get(r.teamId) || null,
        coachId: r.coachId || null,
        coachName: coachMap.get(r.coachId) || null
      }]));

      return players.map(p => {
        const r = relMap.get(p._id) || {};
        return {
          ...p,
          teamId: r.teamId || null,
          teamName: r.teamName || null,
          team: r.teamName || null,
          coachId: r.coachId || null,
          coachName: r.coachName || null,
          coach: r.coachName || null
        };
      });
    }
  } catch (err) {
    // Graceful fallback to pure mongo documents if graph error
  }

  return players;
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

/**
 * Graph-aware version: traverses (:Player)-[:HAS]->(:MedicalRecord) in Neo4j
 * to collect record IDs, then fetches full documents from MongoDB.
 * Falls back to FK-based MongoDB query if Neo4j is unavailable.
 */
async function getMedicalRecordsByPlayerGraph(playerId) {
  try {
    const records = await neo4jService.runCypher(
      `MATCH (p:Player {id: $playerId})-[:HAS]->(mr:MedicalRecord)
       RETURN mr.id AS medicalRecordId`,
      { playerId }
    );
    if (records && records.length > 0) {
      const mrIds = records.map(r => r.medicalRecordId).filter(Boolean);
      return mongoService.findDocuments('medical_records', { _id: { $in: mrIds } });
    }
    // Fallback to FK-based query
    return getMedicalRecordsByPlayer(playerId);
  } catch (err) {
    console.warn(`[Warning] getMedicalRecordsByPlayerGraph Neo4j error: ${err.message} — falling back to MongoDB FK query`);
    return getMedicalRecordsByPlayer(playerId);
  }
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
//  NEO4J GRAPH OPERATIONS DRIVEN BY XML SCHEMA & ENRICHED BY MONGODB
// ─────────────────────────────────────────────────────────



async function resolveCoach(coachIdOrName) {
  if (!coachIdOrName) return null;
  const coach = await mongoService.findOneDocument('coaches', {
    $or: [{ _id: coachIdOrName }, { name: coachIdOrName }]
  });
  return coach || { _id: coachIdOrName, name: coachIdOrName };
}

async function resolveTeam(teamIdOrName) {
  if (!teamIdOrName) return null;
  const team = await mongoService.findOneDocument('teams', {
    $or: [{ _id: teamIdOrName }, { name: teamIdOrName }]
  });
  return team || { _id: teamIdOrName, name: teamIdOrName };
}

async function getPlayerRelationships(playerId) {
  const playerGraph = xmlSchemaService.getGraphEntitySchema('Player');
  try {
    const records = await neo4jService.runCypher(
      `
      MATCH (p:${playerGraph.label} {${playerGraph.keyProperty}: $playerId})
      OPTIONAL MATCH (p)-[:MEMBER_OF]->(t:Team)
      OPTIONAL MATCH (c:Coach)-[:COACHES]->(t)
      RETURN
        p.id AS playerId,
        t.id AS teamId,
        c.id AS coachId
      `,
      { playerId }
    );
    if (!records || records.length === 0) return null;
    const rel = records[0];

    // Fetch entity documents from MongoDB
    const playerDoc = await mongoService.findOneDocument('players', { _id: playerId });
    const teamDoc = rel.teamId ? await mongoService.findOneDocument('teams', { _id: rel.teamId }) : null;
    const coachDoc = rel.coachId ? await mongoService.findOneDocument('coaches', { _id: rel.coachId }) : null;

    return {
      playerId: rel.playerId || playerId,
      playerName: playerDoc?.name || null,
      teamId: rel.teamId || null,
      teamName: teamDoc?.name || null,
      coachId: rel.coachId || null,
      coachName: coachDoc?.name || null,
      sport: playerDoc?.sport || teamDoc?.sport || null
    };
  } catch (err) {
    console.warn(`[Warning] getPlayerRelationships query error: ${err.message}`);
    return null;
  }
}

async function getPlayersByCoach(coachIdOrName) {
  try {
    const coach = await resolveCoach(coachIdOrName);
    const coachId = coach?._id || coachIdOrName;
    const records = await neo4jService.getPlayersCoachedBy(coachId);
    if (!records || records.length === 0) return [];

    const playerIds = [...new Set(records.map(r => r.playerId).filter(Boolean))];
    const teamIds = [...new Set(records.map(r => r.teamId).filter(Boolean))];

    const playerDocs = await mongoService.findDocuments('players', { _id: { $in: playerIds } });
    const teamDocs = teamIds.length > 0 ? await mongoService.findDocuments('teams', { _id: { $in: teamIds } }) : [];

    const playerMap = new Map(playerDocs.map(p => [p._id, p]));
    const teamMap = new Map(teamDocs.map(t => [t._id, t]));

    return records.map(r => {
      const pDoc = playerMap.get(r.playerId) || {};
      const tDoc = teamMap.get(r.teamId) || {};
      return {
        id: r.playerId,
        playerId: r.playerId,
        name: pDoc.name || r.playerId,
        playerName: pDoc.name || r.playerId,
        age: pDoc.age,
        gender: pDoc.gender,
        sport: pDoc.sport || tDoc.sport || coach?.sport || 'General',
        position: pDoc.position || 'Player',
        teamId: r.teamId || null,
        teamName: tDoc.name || null,
        coachId: coachId,
        coachName: coach?.name || coachId
      };
    });
  } catch (err) {
    console.warn(`[Warning] getPlayersByCoach query error: ${err.message}`);
    return [];
  }
}

async function getTeamsByCoach(coachIdOrName) {
  try {
    const coach = await resolveCoach(coachIdOrName);
    const coachId = coach?._id || coachIdOrName;
    const records = await neo4jService.getTeamsCoachedBy(coachId);
    if (!records || records.length === 0) return [];

    const teamIds = records.map(r => r.teamId).filter(Boolean);
    const teamDocs = await mongoService.findDocuments('teams', { _id: { $in: teamIds } });
    const teamMap = new Map(teamDocs.map(t => [t._id, t]));

    return records.map(r => {
      const tDoc = teamMap.get(r.teamId) || {};
      return {
        id: r.teamId,
        teamId: r.teamId,
        name: tDoc.name || r.teamId,
        teamName: tDoc.name || r.teamId,
        sport: tDoc.sport || coach?.sport || 'General',
        category: tDoc.category || 'Senior',
        coachId: coachId,
        coachName: coach?.name || coachId
      };
    });
  } catch (err) {
    console.warn(`[Warning] getTeamsByCoach query error: ${err.message}`);
    return [];
  }
}

async function getPlayersByTeam(teamIdOrName) {
  try {
    const team = await resolveTeam(teamIdOrName);
    const teamId = team?._id || teamIdOrName;
    const records = await neo4jService.getPlayersInTeam(teamId);
    if (!records || records.length === 0) return [];

    const playerIds = records.map(r => r.playerId).filter(Boolean);
    const playerDocs = await mongoService.findDocuments('players', { _id: { $in: playerIds } });
    const playerMap = new Map(playerDocs.map(p => [p._id, p]));

    return records.map(r => {
      const pDoc = playerMap.get(r.playerId) || {};
      return {
        id: r.playerId,
        playerId: r.playerId,
        name: pDoc.name || r.playerId,
        playerName: pDoc.name || r.playerId,
        age: pDoc.age,
        gender: pDoc.gender,
        sport: pDoc.sport || team?.sport || 'General',
        position: pDoc.position || 'Player',
        teamId: teamId,
        teamName: team?.name || teamId
      };
    });
  } catch (err) {
    console.warn(`[Warning] getPlayersByTeam query error: ${err.message}`);
    return [];
  }
}

async function getTournamentPlayers(tournamentId) {
  try {
    // Players participate through their teams: (Player)-[:MEMBER_OF]->(Team)-[:PARTICIPATES_IN]->(Tournament)
    const records = await neo4jService.runCypher(
      `
      MATCH (p:Player)-[:MEMBER_OF]->(t:Team)-[:PARTICIPATES_IN]->(tr:Tournament {id: $tournamentId})
      RETURN DISTINCT p.id AS playerId, t.id AS teamId
      `,
      { tournamentId }
    );

    if (!records || records.length === 0) return [];

    const playerIds = records.map(r => r.playerId).filter(Boolean);
    const teamIds = [...new Set(records.map(r => r.teamId).filter(Boolean))];

    const playerDocs = await mongoService.findDocuments('players', { _id: { $in: playerIds } });
    const teamDocs = teamIds.length > 0 ? await mongoService.findDocuments('teams', { _id: { $in: teamIds } }) : [];

    const playerMap = new Map(playerDocs.map(p => [p._id, p]));
    const teamMap = new Map(teamDocs.map(t => [t._id, t]));

    return records.map(r => {
      const pDoc = playerMap.get(r.playerId) || {};
      const tDoc = teamMap.get(r.teamId) || {};
      return {
        id: r.playerId,
        playerId: r.playerId,
        name: pDoc.name || r.playerId,
        playerName: pDoc.name || r.playerId,
        sport: pDoc.sport || tDoc.sport || 'General',
        position: pDoc.position || 'Player',
        teamId: r.teamId,
        teamName: tDoc.name || null
      };
    });
  } catch (err) {
    console.warn(`[Warning] getTournamentPlayers query error: ${err.message}`);
    return [];
  }
}

async function getTournamentTeams(tournamentId) {
  try {
    const records = await neo4jService.runCypher(
      `
      MATCH (t:Team)-[:PARTICIPATES_IN]->(tr:Tournament {id: $tournamentId})
      RETURN t.id AS teamId
      `,
      { tournamentId }
    );

    if (!records || records.length === 0) return [];

    const teamIds = records.map(r => r.teamId).filter(Boolean);
    const teamDocs = await mongoService.findDocuments('teams', { _id: { $in: teamIds } });
    const teamMap = new Map(teamDocs.map(t => [t._id, t]));

    return records.map(r => {
      const tDoc = teamMap.get(r.teamId) || {};
      return {
        id: r.teamId,
        teamId: r.teamId,
        name: tDoc.name || r.teamId,
        teamName: tDoc.name || r.teamId,
        sport: tDoc.sport || 'General',
        category: tDoc.category || 'Senior'
      };
    });
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
    relationships: graphData || null,
    graph: graphData
      ? {
          team: graphData.teamId ? { id: graphData.teamId, name: graphData.teamName } : null,
          coach: graphData.coachId ? { id: graphData.coachId, name: graphData.coachName } : null
        }
      : null,
    teamId: graphData?.teamId || null,
    teamName: graphData?.teamName || null,
    team: graphData?.teamName || null,
    coachId: graphData?.coachId || null,
    coachName: graphData?.coachName || null,
    coach: graphData?.coachName || null
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

  const graphPlayers = await getPlayersByCoach(coachIdOrName);
  if (!graphPlayers || graphPlayers.length === 0) {
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
  return getPlayersByCoach(coachIdOrName);
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
  getMedicalRecordsByPlayerGraph,
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
