const express = require('express');
const router = express.Router();
const queryService = require('../services/queryService');

// GET /api/teams/:id/players
//   → Neo4j: find all players who are MEMBER_OF this team

router.get('/:id/players', async (req, res) => {
  try {
    const players = await queryService.getPlayersByTeam(req.params.id);
    res.json({ success: true, count: players.length, data: players });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
