const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI || '';
const dbName = process.env.MONGO_DB || 'smart_sports';

let client = null;
let db = null;

function isUriValid(url) {
  if (!url || url.includes('<db_password>')) {
    return false;
  }
  return true;
}

async function connectMongo() {
  if (db) return db;
  if (!isUriValid(uri)) {
    throw new Error('MONGO_URI is missing or contains unreplaced placeholder <db_password>');
  }
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected successfully to MongoDB database: ${dbName}`);
  }
  return db;
}

async function getDb() {
  if (!db) {
    return await connectMongo();
  }
  return db;
}

async function pingMongo() {
  try {
    if (!isUriValid(uri)) {
      return { connected: false, error: 'MONGO_URI placeholder active or missing' };
    }
    const database = await getDb();
    await database.command({ ping: 1 });
    return { connected: true, database: dbName, error: null };
  } catch (error) {
    return { connected: false, database: dbName, error: error.message };
  }
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connectMongo,
  getDb,
  pingMongo,
  closeMongo
};
