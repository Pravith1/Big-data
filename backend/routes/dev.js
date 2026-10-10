const express = require('express');
const router = express.Router();
const devController = require('../controllers/devController');

// Developer / architecture demo endpoints only.
// These are NOT meant to be called by the frontend.
// They expose internal queryService operations for demo purposes.

// POST /api/dev/query
//   Body: { operation: "getCoachPlayerTraining", coachId: "Rahul" }
//   Directly invokes a queryService function by name
router.post('/query', devController.runDevQuery);

// GET /api/dev/schema
//   Returns the parsed globalSchema.xml as JSON
router.get('/schema', devController.getSchemaInfo);

// GET /api/dev/operations
//   Lists all supported queryService operations for demo
router.get('/operations', devController.listOperations);

module.exports = router;
