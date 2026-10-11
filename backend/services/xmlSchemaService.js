const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const schemaPath = path.join(__dirname, '..', 'schema', 'globalSchema.xml');
let parsedSchemaCache = null;

function ensureArray(val) {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

function loadSchema() {
  if (parsedSchemaCache) return parsedSchemaCache;

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Global schema XML file not found at: ${schemaPath}`);
  }

  const xmlData = fs.readFileSync(schemaPath, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true
  });

  const jsonObj = parser.parse(xmlData);
  if (!jsonObj.globalSchema) {
    throw new Error('Invalid globalSchema XML structure: Missing <globalSchema> root');
  }

  parsedSchemaCache = jsonObj.globalSchema;
  return parsedSchemaCache;
}

function reloadSchema() {
  parsedSchemaCache = null;
  return loadSchema();
}

/**
 * Normalizes field definitions recursively from XML format
 */
function normalizeFields(rawFieldsContainer) {
  if (!rawFieldsContainer || !rawFieldsContainer.field) return [];
  const fieldList = ensureArray(rawFieldsContainer.field);

  return fieldList.map(f => {
    const fieldDef = {
      name: f['@_name'],
      type: (f['@_type'] || 'string').toLowerCase(),
      required: f['@_required'] === 'true' || f['@_required'] === true,
      primaryKey: f['@_primaryKey'] === 'true' || f['@_primaryKey'] === true,
      foreignKey: f['@_foreignKey'] || null,
      default: f['@_default'] !== undefined ? f['@_default'] : null,
      allowed: f['@_allowed'] ? f['@_allowed'].split(',').map(s => s.trim()) : null,
      description: f['@_description'] || ''
    };

    if (f.field) {
      fieldDef.fields = normalizeFields(f);
    }
    return fieldDef;
  });
}

/**
 * Returns normalized MongoDB entity schema parsed from XML
 */
function getEntitySchema(entityName) {
  const schema = loadSchema();
  const entities = ensureArray(schema.entity);
  const found = entities.find(e => e['@_name'] && e['@_name'].toLowerCase() === entityName.toLowerCase());

  if (!found || !found.storage) return null;

  return {
    name: found['@_name'],
    database: found.storage['@_database'] || 'mongodb',
    collection: found.storage['@_collection'],
    primaryKey: found.storage['@_primaryKey'] || '_id',
    foreignKey: found.storage['@_foreignKey'] || null,
    fields: normalizeFields(found.fields)
  };
}

/**
 * Alias for backward compatibility with existing services
 */
function getEntityStorage(entityName) {
  const entity = getEntitySchema(entityName);
  if (!entity) return null;
  return {
    entity: entity.name,
    database: entity.database,
    collection: entity.collection,
    primaryKey: entity.primaryKey,
    foreignKey: entity.foreignKey
  };
}

/**
 * Returns normalized Neo4j graph entity schema parsed from XML
 */
function getGraphEntitySchema(entityName) {
  const schema = loadSchema();
  const graphEntities = ensureArray(schema.graphEntity);
  const found = graphEntities.find(g => g['@_name'] && g['@_name'].toLowerCase() === entityName.toLowerCase());

  if (!found || !found.storage) return null;

  const rawProps = found.properties && found.properties.property ? ensureArray(found.properties.property) : [];
  const properties = rawProps.map(p => ({
    name: p['@_name'],
    type: (p['@_type'] || 'string').toLowerCase(),
    required: p['@_required'] === 'true' || p['@_required'] === true,
    key: p['@_key'] === 'true' || p['@_key'] === true
  }));

  return {
    name: found['@_name'],
    database: found.storage['@_database'] || 'neo4j',
    label: found.storage['@_label'] || found['@_name'],
    keyProperty: found.storage['@_keyProperty'] || 'id',
    properties
  };
}

/**
 * Alias for backward compatibility
 */
function getGraphEntityStorage(entityName) {
  const entity = getGraphEntitySchema(entityName);
  if (!entity) return null;
  return {
    entity: entity.name,
    database: entity.database,
    label: entity.label,
    keyProperty: entity.keyProperty
  };
}

/**
 * Returns normalized relationship schema parsed from XML
 */
function getRelationshipSchema(relationshipName) {
  const schema = loadSchema();
  const relationships = ensureArray(schema.relationship);
  const found = relationships.find(r => r['@_name'] && r['@_name'].toUpperCase() === relationshipName.toUpperCase());

  if (!found) return null;

  return {
    name: found['@_name'],
    database: (found.storage && found.storage['@_database']) || 'neo4j',
    from: found['@_from'] || null,
    to: found['@_to'] || null
  };
}

const getRelationshipStorage = getRelationshipSchema;

/**
 * Validates document input against the fields defined in globalSchema.xml
 */
function validateDocument(entityName, rawData) {
  const entitySchema = getEntitySchema(entityName);
  if (!entitySchema) {
    return { isValid: false, errors: [`Entity '${entityName}' not found in XML schema.`] };
  }

  const errors = [];
  const data = rawData || {};

  // Primary key resolution check (e.g. _id, id, playerId)
  const pkField = entitySchema.fields.find(f => f.primaryKey || f.name === entitySchema.primaryKey);
  if (pkField && pkField.required) {
    const pkVal = data[pkField.name] || data.id || data._id || data[`${entityName.toLowerCase()}Id`];
    if (!pkVal) {
      errors.push(`Primary key '${pkField.name}' is required for entity ${entityName}.`);
    }
  }

  // Validate top-level fields
  for (const field of entitySchema.fields) {
    if (field.primaryKey) continue; // Already checked

    const val = data[field.name];

    if (field.required && (val === undefined || val === null || val === '')) {
      errors.push(`Field '${field.name}' is required for entity ${entityName}.`);
      continue;
    }

    if (val !== undefined && val !== null && val !== '') {
      if (field.type === 'number') {
        if (isNaN(Number(val))) {
          errors.push(`Field '${field.name}' must be a number.`);
        }
      } else if (field.allowed && Array.isArray(field.allowed)) {
        if (!field.allowed.includes(String(val))) {
          errors.push(`Field '${field.name}' must be one of: ${field.allowed.join(', ')}.`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Builds a validated, formatted MongoDB document according to XML schema defaults and types
 */
function buildMongoDocument(entityName, rawData) {
  const entitySchema = getEntitySchema(entityName);
  if (!entitySchema) {
    throw new Error(`Cannot build MongoDB document: Entity '${entityName}' not found in XML.`);
  }

  const data = rawData || {};
  const doc = {};

  // Resolve Primary Key
  const pkName = entitySchema.primaryKey || '_id';
  const pkVal = data[pkName] || data.id || data._id || data[`${entityName.toLowerCase()}Id`];
  if (pkVal) {
    doc[pkName] = String(pkVal);
  }

  // Map each field from the XML schema
  for (const field of entitySchema.fields) {
    if (field.name === pkName) continue;

    const rawVal = data[field.name];

    if (field.type === 'object') {
      if (rawVal && typeof rawVal === 'object') {
        doc[field.name] = {};
        if (field.fields) {
          for (const subField of field.fields) {
            const subVal = rawVal[subField.name];
            if (subVal !== undefined) {
              doc[field.name][subField.name] = subField.type === 'number' ? Number(subVal) : subVal;
            } else if (subField.default !== null) {
              doc[field.name][subField.name] = subField.default === 'CURRENT_DATE'
                ? new Date().toISOString().split('T')[0]
                : (subField.type === 'number' ? Number(subField.default) : subField.default);
            }
          }
        } else {
          doc[field.name] = { ...rawVal };
        }
      } else {
        doc[field.name] = {};
      }
    } else if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
      if (field.type === 'number') {
        doc[field.name] = Number(rawVal);
      } else {
        doc[field.name] = rawVal;
      }
    } else if (field.default !== null && field.default !== undefined) {
      if (field.default === 'CURRENT_DATE') {
        doc[field.name] = new Date().toISOString().split('T')[0];
      } else if (field.type === 'number') {
        doc[field.name] = Number(field.default);
      } else {
        doc[field.name] = field.default;
      }
    } else {
      doc[field.name] = null;
    }
  }

  return doc;
}

/**
 * Builds Neo4j node properties from raw payload based on XML graphEntity properties
 */
function buildNeo4jNode(entityName, rawData) {
  const graphSchema = getGraphEntitySchema(entityName);
  if (!graphSchema) {
    throw new Error(`Cannot build Neo4j node: Graph entity '${entityName}' not found in XML.`);
  }

  const data = rawData || {};
  const node = {};

  const keyProp = graphSchema.keyProperty || 'id';
  const keyVal = data[keyProp] || data.id || data._id || data[`${entityName.toLowerCase()}Id`];
  if (keyVal) {
    node[keyProp] = String(keyVal);
  }

  for (const prop of graphSchema.properties) {
    if (prop.name === keyProp) continue;

    const val = data[prop.name];
    if (val !== undefined && val !== null) {
      node[prop.name] = prop.type === 'number' ? Number(val) : val;
    }
  }

  return node;
}

/**
 * Returns complete XML schema metadata summary for inspection
 */
function getSchemaSummary() {
  const schema = loadSchema();
  const entities = ensureArray(schema.entity).map(e => getEntitySchema(e['@_name']));
  const graphEntities = ensureArray(schema.graphEntity).map(g => getGraphEntitySchema(g['@_name']));
  const relationships = ensureArray(schema.relationship).map(r => getRelationshipSchema(r['@_name']));

  return {
    mongodbEntities: entities,
    neo4jNodes: graphEntities,
    neo4jRelationships: relationships
  };
}

module.exports = {
  loadSchema,
  reloadSchema,
  getEntitySchema,
  getEntityStorage,
  getGraphEntitySchema,
  getGraphEntityStorage,
  getRelationshipSchema,
  getRelationshipStorage,
  validateDocument,
  buildMongoDocument,
  buildNeo4jNode,
  getSchemaSummary
};
