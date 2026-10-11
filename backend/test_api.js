require('dotenv').config();
const app = require('./app');

async function runTests() {
  const PORT = 8009;
  const server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}`;

  console.log(`\n==================================================`);
  console.log(`Running Route Verification Tests on ${baseUrl}`);
  console.log(`==================================================\n`);

  let passed = 0;
  let failed = 0;

  async function check(name, url, options = {}, expectStatus = [200], validator = null) {
    const statuses = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
    try {
      const res = await fetch(`${baseUrl}${url}`, options);
      const data = await res.json().catch(() => null);

      if (!statuses.includes(res.status)) {
        console.error(`❌ [FAIL] ${name}: Expected status in [${statuses.join(', ')}], got ${res.status}`);
        if (data && data.error) console.error(`   Error: ${data.error}`);
        failed++;
        return;
      }

      if (validator && !validator(data)) {
        console.error(`❌ [FAIL] ${name}: Response payload validation failed`);
        failed++;
        return;
      }

      console.log(`✅ [PASS] ${name} (${res.status})`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}: Network/Server error: ${err.message}`);
      failed++;
    }
  }

  // 1. Health Check (200 if both connected, 503 if Neo4j cloud instance is unauthenticated/down)
  await check('GET /api/health', '/api/health', {}, [200, 503], d => d.services && d.services.xmlSchema.loaded);

  // 2. XML Schema Metadata (Pure XML-driven)
  await check('GET /api/schema', '/api/schema', {}, 200, d => d.mongodbEntities && d.mongodbEntities.length > 0);

  // 3. Seed Databases (MongoDB seeded)
  await check('POST /api/seed', '/api/seed', { method: 'POST' }, 200, d => d.data && d.data.mongodb.ok);

  // 4. Dedicated Player Routes
  await check('GET /api/players/getAllPlayers', '/api/players/getAllPlayers', {}, 200, d => Array.isArray(d.data) && d.data.length > 0);
  await check('GET /players/getAllPlayers (Root Alias)', '/players/getAllPlayers', {}, 200, d => Array.isArray(d.data) && d.data.length > 0);
  await check('GET /api/players/getPlayerById/P101', '/api/players/getPlayerById/P101', {}, 200, d => d.data && d.data._id === 'P101');
  await check('GET /api/players/getPlayerFull/P101', '/api/players/getPlayerFull/P101', {}, 200, d => d.data && d.data._id === 'P101');
  await check('GET /api/players/getPlayerTraining/P101', '/api/players/getPlayerTraining/P101', {}, 200, d => Array.isArray(d.data));

  // 5. Coach Player Training (User explicit requirement)
  await check('GET /api/players/getCoachPlayerTraining?coachId=C101', '/api/players/getCoachPlayerTraining?coachId=C101', {}, 200, d => Array.isArray(d.data));
  await check('GET /players/getCoachPlayerTraining?coachId=C101 (Root Alias)', '/players/getCoachPlayerTraining?coachId=C101', {}, 200, d => Array.isArray(d.data));
  await check('GET /api/players/getCoachPlayers?coachId=C101', '/api/players/getCoachPlayers?coachId=C101', {}, 200, d => Array.isArray(d.data));

  // 6. Create, Update, Delete Player with XML schema validation
  const newPlayerPayload = {
    _id: 'P999',
    name: 'Alex Hunter',
    age: 22,
    gender: 'Male',
    sport: 'Football',
    position: 'Striker'
  };
  await check('POST /api/players/createPlayer', '/api/players/createPlayer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newPlayerPayload)
  }, 201, d => d.data && d.data._id === 'P999');

  await check('PUT /api/players/updatePlayer/P999', '/api/players/updatePlayer/P999', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position: 'Forward' })
  }, 200, d => d.data && d.data.position === 'Forward');

  await check('DELETE /api/players/deletePlayer/P999', '/api/players/deletePlayer/P999', {
    method: 'DELETE'
  }, 200, d => d.success);

  // 7. Tournaments
  await check('GET /api/tournaments/getAllTournaments', '/api/tournaments/getAllTournaments', {}, 200, d => Array.isArray(d.data));
  await check('GET /api/tournaments/getTournamentById/T501', '/api/tournaments/getTournamentById/T501', {}, 200, d => d.data && d.data._id === 'T501');
  await check('GET /api/tournaments/getTournamentPlayers/T501', '/api/tournaments/getTournamentPlayers/T501', {}, 200, d => Array.isArray(d.data));

  // 8. Training Sessions
  await check('GET /api/training/getTrainingByPlayer/P101', '/api/training/getTrainingByPlayer/P101', {}, 200, d => Array.isArray(d.data));

  // 9. Coaches
  await check('GET /api/coaches/getCoachPlayers/C101', '/api/coaches/getCoachPlayers/C101', {}, 200, d => Array.isArray(d.data));
  await check('GET /api/coaches/getCoachTeams/C101', '/api/coaches/getCoachTeams/C101', {}, 200, d => Array.isArray(d.data));
  await check('GET /api/coaches/getCoachPlayerTraining/C101', '/api/coaches/getCoachPlayerTraining/C101', {}, 200, d => Array.isArray(d.data));

  // 10. Teams
  await check('GET /api/teams/TEAM01/players', '/api/teams/TEAM01/players', {}, 200, d => Array.isArray(d.data));

  console.log(`\n==================================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`==================================================\n`);

  server.close();
  process.exit(failed === 0 ? 0 : 1);
}

runTests();
