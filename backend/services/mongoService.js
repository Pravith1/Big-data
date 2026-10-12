const { getDb } = require('../config/mongodb');

async function getCollection(collectionName) {
  const db = await getDb();
  if (!db) {
    throw new Error(`MongoDB connection unavailable: cannot access collection '${collectionName}'`);
  }
  return db.collection(collectionName);
}

async function findDocuments(collectionName, query = {}, options = {}) {
  const col = await getCollection(collectionName);
  const cursor = col.find(query, options);
  return await cursor.toArray();
}

async function findOneDocument(collectionName, query) {
  const col = await getCollection(collectionName);
  return await col.findOne(query);
}

async function insertDocument(collectionName, document) {
  const col = await getCollection(collectionName);
  const result = await col.insertOne(document);
  return { ...document, _id: document._id || result.insertedId };
}

async function updateDocument(collectionName, query, updateData) {
  const col = await getCollection(collectionName);
  const result = await col.updateOne(query, { $set: updateData });
  if (result.matchedCount === 0) {
    return null;
  }
  return await col.findOne(query);
}

async function deleteDocument(collectionName, query) {
  const col = await getCollection(collectionName);
  const result = await col.deleteOne(query);
  return result.deletedCount > 0;
}

async function countDocuments(collectionName, query = {}) {
  const col = await getCollection(collectionName);
  return await col.countDocuments(query);
}

module.exports = {
  getCollection,
  findDocuments,
  findOneDocument,
  insertDocument,
  updateDocument,
  deleteDocument,
  countDocuments
};
