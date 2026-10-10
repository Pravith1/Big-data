const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.NEO4J_URI || '';
const username = process.env.NEO4J_USERNAME || process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || '';

let driver = null;

function isConfigValid() {
  if (!uri || uri.includes('<your-instance-id>') || !password || password.includes('<neo4j_password>')) {
    return false;
  }
  return true;
}

function getDriver() {
  if (!driver) {
    if (!isConfigValid()) {
      throw new Error('NEO4J_URI or NEO4J_PASSWORD is invalid or unconfigured');
    }
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }
  return driver;
}

async function pingNeo4j() {
  if (!isConfigValid()) {
    return { connected: false, uri, error: 'Neo4j credentials invalid or placeholder active' };
  }
  let session = null;
  try {
    const d = getDriver();
    session = d.session();
    const result = await session.run("RETURN 'Neo4j Connected' AS message");
    const message = result.records[0].get("message");
    return { connected: true, uri, message, error: null };
  } catch (error) {
    return { connected: false, uri, error: error.message };
  } finally {
    if (session) {
      await session.close();
    }
  }
}

async function closeNeo4j() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

module.exports = {
  getDriver,
  pingNeo4j,
  closeNeo4j,
  isConfigValid
};
