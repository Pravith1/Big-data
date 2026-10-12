const { getDriver } = require('../config/neo4j');
const neo4j = require('neo4j-driver');

function formatFieldValue(val) {
  if (val === null || val === undefined) return val;
  if (neo4j.isInt(val)) return val.toNumber();
  if (Array.isArray(val)) return val.map(formatFieldValue);
  if (typeof val === 'object') {
    if (val.properties) return formatFieldValue(val.properties);
    const formatted = {};
    for (const key in val) {
      formatted[key] = formatFieldValue(val[key]);
    }
    return formatted;
  }
  return val;
}

async function runCypher(query, params = {}) {
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result.records.map(record => {
      const obj = {};
      record.keys.forEach(key => {
        obj[key] = formatFieldValue(record.get(key));
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

async function createNode(label, properties) {
  const query = `
    MERGE (n:${label} {id: $id})
    SET n += $properties
    RETURN n
  `;
  const result = await runCypher(query, {
    id: properties.id,
    properties
  });
  return result.length > 0 ? result[0].n : null;
}

async function createRelationship(fromLabel, fromId, relType, toLabel, toId, relProps = {}) {
  const query = `
    MATCH (a:${fromLabel} {id: $fromId})
    MATCH (b:${toLabel} {id: $toId})
    MERGE (a)-[r:${relType}]->(b)
    SET r += $relProps
    RETURN a.id AS fromId, type(r) AS relationship, b.id AS toId
  `;
  const result = await runCypher(query, {
    fromId,
    toId,
    relProps
  });
  return result.length > 0 ? result[0] : null;
}

async function getPlayersCoachedBy(coachId) {
  const query = `
    MATCH (c:Coach {id: $coachId})-[:COACHES]->(t:Team)<-[:MEMBER_OF]-(p:Player)
    RETURN DISTINCT p.id AS playerId, t.id AS teamId, c.id AS coachId
  `;
  return await runCypher(query, { coachId });
}

async function getPlayersInTeam(teamId) {
  const query = `
    MATCH (p:Player)-[:MEMBER_OF]->(t:Team {id: $teamId})
    RETURN p.id AS playerId, t.id AS teamId
  `;
  return await runCypher(query, { teamId });
}

async function getTeamsCoachedBy(coachId) {
  const query = `
    MATCH (c:Coach {id: $coachId})-[:COACHES]->(t:Team)
    RETURN t.id AS teamId, c.id AS coachId
  `;
  return await runCypher(query, { coachId });
}

module.exports = {
  runCypher,
  createNode,
  createRelationship,
  getPlayersCoachedBy,
  getPlayersInTeam,
  getTeamsCoachedBy,
  formatFieldValue
};
