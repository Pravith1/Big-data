const express = require('express');
const router = express.Router();
const xmlSchemaService = require('../services/xmlSchemaService');

// GET /api/schema
router.get('/', (req, res) => {
  try {
    const summary = xmlSchemaService.getSchemaSummary();
    res.json({
      success: true,
      description: 'Distributed Sports Management XML Global Schema metadata layer',
      ...summary
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
