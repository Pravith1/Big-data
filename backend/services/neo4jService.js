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

async function getPlayersCoachedBy(coachNameOrId) {
  const query = `
    MATCH (c:Coach)
    WHERE c.name = $coachParam OR c.id = $coachParam
    OPTIONAL MATCH (c)-[:COACHES]->(t:Team)<-[:MEMBER_OF]-(p:Player)
    OPTIONAL MATCH (p)-[:COACHED_BY]->(c)
    WITH DISTINCT p, t, c
    WHERE p IS NOT NULL
    RETURN p.id AS id, p.id AS playerId, p.name AS name, p.name AS playerName, p.sport AS sport, t.id AS teamId, t.name AS teamName, c.name AS coachName
  `;
  return await runCypher(query, { coachParam: coachNameOrId });
}

async function getPlayersInTeam(teamIdOrName) {
  const query = `
    MATCH (t:Team)
    WHERE t.id = $teamParam OR t.name = $teamParam
    MATCH (p:Player)-[:MEMBER_OF]->(t)
    RETURN p.id AS id, p.id AS playerId, p.name AS name, p.name AS playerName, p.sport AS sport, t.id AS teamId, t.name AS teamName
  `;
  return await runCypher(query, { teamParam: teamIdOrName });
}

async function getTeamsCoachedBy(coachNameOrId) {
  const query = `
    MATCH (c:Coach)
    WHERE c.name = $coachParam OR c.id = $coachParam
    MATCH (c)-[:COACHES]->(t:Team)
    RETURN t.id AS id, t.id AS teamId, t.name AS name, t.name AS teamName,
           coalesce(
             t.sport,
             CASE
               WHEN toLower(t.name) CONTAINS 'football' THEN 'Football'
               WHEN toLower(t.name) CONTAINS 'cricket' THEN 'Cricket'
               WHEN toLower(t.name) CONTAINS 'shuttler' OR toLower(t.name) CONTAINS 'badminton' THEN 'Badminton'
               WHEN toLower(t.name) CONTAINS 'swim' OR toLower(t.name) CONTAINS 'aqua' THEN 'Swimming'
               ELSE 'Football'
             END
           ) AS sport,
           c.id AS coachId, c.name AS coachName
  `;
  return await runCypher(query, { coachParam: coachNameOrId });
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
