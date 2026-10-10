/**
 * devController.js
 *
 * Developer/demo-only endpoint.
 * NOT intended for frontend use.
 * Exposes internal query routing for architecture demonstration only.
 */
const queryService = require('../services/queryService');
const xmlSchemaService = require('../services/xmlSchemaService');

const SUPPORTED_OPERATIONS = [
  { name: 'getAllPlayers',              params: ['sport?'],         db: 'mongodb' },
  { name: 'getPlayerById',             params: ['playerId'],       db: 'mongodb' },
  { name: 'getTrainingByPlayer',       params: ['playerId'],       db: 'mongodb' },
  { name: 'getAllTournaments',          params: [],                 db: 'mongodb' },
  { name: 'getTournamentById',         params: ['tournamentId'],   db: 'mongodb' },
  { name: 'getMedicalRecordsByPlayer', params: ['playerId'],       db: 'mongodb' },
  { name: 'getPerformanceByPlayer',    params: ['playerId'],       db: 'mongodb' },
  { name: 'getPlayersByCoach',         params: ['coachId'],        db: 'neo4j'   },
  { name: 'getTeamsByCoach',           params: ['coachId'],        db: 'neo4j'   },
  { name: 'getPlayersByTeam',          params: ['teamId'],         db: 'neo4j'   },
  { name: 'getTournamentPlayers',      params: ['tournamentId'],   db: 'neo4j'   },
  { name: 'getTournamentTeams',        params: ['tournamentId'],   db: 'neo4j'   },
  { name: 'getPlayerRelationships',    params: ['playerId'],       db: 'neo4j'   },
  { name: 'getPlayerFull',             params: ['playerId'],       db: 'mongodb + neo4j (cross-db)' },
  { name: 'getCoachPlayerTraining',    params: ['coachId'],        db: 'mongodb + neo4j (cross-db)' },
  { name: 'getCoachPlayersWithProfiles', params: ['coachId'],      db: 'mongodb + neo4j (cross-db)' },
];

// POST /api/dev/query
async function runDevQuery(req, res) {
  const { operation, ...params } = req.body;

  if (!operation) {
    return res.status(400).json({
      success: false,
      error: 'operation field is required',
      supportedOperations: SUPPORTED_OPERATIONS
    });
  }

  if (typeof queryService[operation] !== 'function') {
    return res.status(400).json({
      success: false,
      error: `Unknown operation: '${operation}'`,
      supportedOperations: SUPPORTED_OPERATIONS
    });
  }

  try {
    // Pass the first param value dynamically
    const paramValues = Object.values(params);
    const result = await queryService[operation](...paramValues);

    res.json({
      success: true,
      dev: true,
      note: 'This endpoint is for architecture demonstration only. Frontend should use standard REST routes.',
      operation,
      params,
      data: result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/dev/schema
async function getSchemaInfo(req, res) {
  try {
    const schema = xmlSchemaService.loadSchema();
    res.json({
      success: true,
      dev: true,
      note: 'Raw parsed XML Global Schema — the metadata layer driving all query routing',
      schema
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/dev/operations
async function listOperations(req, res) {
  res.json({
    success: true,
    dev: true,
    note: 'Internal queryService operations available for demo via POST /api/dev/query',
    operations: SUPPORTED_OPERATIONS
  });
}

module.exports = {
  runDevQuery,
  getSchemaInfo,
  listOperations
};
