const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const schemaPath = path.join(__dirname, '..', 'schema', 'globalSchema.xml');
let parsedSchema = null;

function loadSchema() {
  if (parsedSchema) return parsedSchema;

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Global schema XML file not found at: ${schemaPath}`);
  }

  const xmlData = fs.readFileSync(schemaPath, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const jsonObj = parser.parse(xmlData);
  if (!jsonObj.globalSchema) {
    throw new Error('Invalid globalSchema XML structure');
  }

  parsedSchema = jsonObj.globalSchema;
  return parsedSchema;
}

function getEntityStorage(entityName) {
  const schema = loadSchema();
  let entities = schema.entity;
  if (!entities) return null;
  if (!Array.isArray(entities)) entities = [entities];

  const found = entities.find(e => e['@_name'] && e['@_name'].toLowerCase() === entityName.toLowerCase());
  if (found && found.storage) {
    return {
      entity: found['@_name'],
      database: found.storage['@_database'],
      collection: found.storage['@_collection'],
      primaryKey: found.storage['@_primaryKey'] || '_id',
      foreignKey: found.storage['@_foreignKey'] || null
    };
  }
  return null;
}

function getGraphEntityStorage(entityName) {
  const schema = loadSchema();
  let graphEntities = schema.graphEntity;
  if (!graphEntities) return null;
  if (!Array.isArray(graphEntities)) graphEntities = [graphEntities];

  const found = graphEntities.find(g => g['@_name'] && g['@_name'].toLowerCase() === entityName.toLowerCase());
  if (found && found.storage) {
    return {
      entity: found['@_name'],
      database: found.storage['@_database'],
      label: found.storage['@_label'],
      keyProperty: found.storage['@_keyProperty'] || 'id'
    };
  }
  return null;
}

function getRelationshipStorage(relationshipName) {
  const schema = loadSchema();
  let relationships = schema.relationship;
  if (!relationships) return null;
  if (!Array.isArray(relationships)) relationships = [relationships];

  const found = relationships.find(r => r['@_name'] && r['@_name'].toUpperCase() === relationshipName.toUpperCase());
  if (found) {
    return {
      name: found['@_name'],
      database: found.storage ? found.storage['@_database'] : 'neo4j',
      from: found['@_from'] || null,
      to: found['@_to'] || null
    };
  }
  return null;
}

function getDatabasesForOperation(operation) {
  // Categorize standard operations based on metadata
  switch (operation) {
    case 'playersByCoach':
    case 'teamsByCoach':
    case 'playersByTeam':
    case 'tournamentParticipants':
    case 'createRelationship':
      return { databases: ['neo4j'], isCrossDatabase: false };

    case 'trainingByPlayer':
    case 'playerProfile':
    case 'tournamentDetails':
    case 'allPlayers':
    case 'medicalRecordsByPlayer':
    case 'createEntity':
      return { databases: ['mongodb'], isCrossDatabase: false };

    case 'trainingOfPlayersByCoach':
    case 'tournamentPerformanceOfCoachPlayers':
    case 'playerFullDetails':
      return { databases: ['neo4j', 'mongodb'], isCrossDatabase: true };

    default:
      return { databases: ['mongodb'], isCrossDatabase: false };
  }
}

module.exports = {
  loadSchema,
  getEntityStorage,
  getGraphEntityStorage,
  getRelationshipStorage,
  getDatabasesForOperation
};
