# API Query Execution Guide & Database Routing Reference

This technical document details how every API endpoint in the **Smart Sports Management & Analytics Platform** executes queries across the distributed architecture, which database engine is queried, the exact Cypher or MongoDB Query Language (MQL) statements executed, and how cross-database queries merge results in memory.

---

## 1. Architecture Overview: Query Routing Flow

```
Client (HTTP Request)
       │
       ▼
Express Route Handler (e.g., /api/players/getCoachPlayerTraining)
       │
       ▼
Controller Layer (Validates input against globalSchema.xml via xmlSchemaService)
       │
       ▼
QueryService Layer (Determines routing: MongoDB, Neo4j, or Cross-DB Merge)
       ├─────────────────────────────────┬─────────────────────────────────┐
       ▼                                 ▼                                 ▼
MongoDB Document Engine           Neo4j Graph Engine              Cross-Database Join
- Collection Name via XML         - Node Labels via XML          1. Query Neo4j Graph
- Primary / Foreign Key via XML   - Cypher Relationship Traversal 2. Extract Key Set (e.g. playerIds)
- MQL find / insert / update      - Returns Graph Projections    3. Query Mongo Collection
                                                                 4. Merge & Project unified JSON
```

---

## 2. Route-by-Route Query Execution Reference

### 2.1 Players API

#### `GET /api/players/getAllPlayers`
- **Target Database**: MongoDB only
- **Step-by-Step Flow**:
  1. `xmlSchemaService.getEntitySchema('Player')` resolves collection name `players`.
  2. Constructs filter: `{ sport: req.query.sport }` if `?sport=...` query param is provided, else `{}`.
  3. Executes MongoDB query:
     ```javascript
     db.collection('players').find(query).toArray();
     ```
  4. Returns array of player document profiles.

---

#### `GET /api/players/getPlayerById/:id`
- **Target Database**: MongoDB only
- **Step-by-Step Flow**:
  1. Resolves collection name `players` and primary key `_id` from XML schema.
  2. Executes MongoDB query:
     ```javascript
     db.collection('players').findOne({ _id: req.params.id });
     ```
  3. Returns single player profile or 404 if not found.

---

#### `GET /api/players/getPlayerFull/:id`
- **Target Database**: **Cross-Database (MongoDB + Neo4j)**
- **Step-by-Step Flow**:
  1. **Step 1 (MongoDB)**: Fetch athlete profile document:
     ```javascript
     const profile = await db.collection('players').findOne({ _id: playerId });
     ```
  2. **Step 2 (Neo4j)**: Fetch connected entities and relationships using Cypher:
     ```cypher
     MATCH (p:Player {id: $playerId})
     OPTIONAL MATCH (p)-[:MEMBER_OF]->(t:Team)
     OPTIONAL MATCH (p)-[:COACHED_BY]->(c:Coach)
     OPTIONAL MATCH (p)-[:PLAYS]->(s:Sport)
     OPTIONAL MATCH (p)-[:TRAINS_AT]->(tc:TrainingCenter)
     RETURN
       p.id AS playerId, p.name AS playerName,
       t.id AS teamId, t.name AS teamName,
       c.id AS coachId, c.name AS coachName,
       s.id AS sportId, s.name AS sport,
       tc.id AS trainingCenterId, tc.name AS trainingCenterName
     ```
  3. **Step 3 (Merge)**: In-memory join merges MongoDB `profile` with Neo4j `graph` relationship objects:
     ```json
     {
       "_id": "P101",
       "name": "Pravith",
       "age": 20,
       "sport": "Football",
       "contact": { "email": "pravith@example.com", "phone": "9876543210" },
       "graph": {
         "team": { "id": "TEAM01", "name": "National Football Team" },
         "coach": { "id": "C101", "name": "Rahul" },
         "sport": { "id": "SPORT01", "name": "Football" },
         "trainingCenter": { "id": "TC01", "name": "Bangalore High Performance Center" }
       }
     }
     ```

---

#### `GET /api/players/getPlayerTraining/:id`
- **Target Database**: MongoDB only
- **Step-by-Step Flow**:
  1. Resolves collection `training_sessions` and foreign key `playerId` from XML schema.
  2. Executes MongoDB query:
     ```javascript
     db.collection('training_sessions').find({ playerId: req.params.id }).toArray();
     ```
  3. Returns chronological list of workout telemetry sessions for the athlete.

---

#### `GET /api/players/getPlayerRelationships/:id`
- **Target Database**: Neo4j only
- **Step-by-Step Flow**:
  1. Executes graph traversal matching `(p:Player {id: $id})` and optional hops across `MEMBER_OF`, `COACHED_BY`, `PLAYS`, `TRAINS_AT`.
  2. Returns graph connectivity payload.

---

#### `GET /api/players/getCoachPlayerTraining?coachId=C101`
- **Target Database**: **Cross-Database (Neo4j -> MongoDB -> Joined Aggregation)**
- **Step-by-Step Flow**:
  1. **Step 1 (XML Lookup)**: Checks relationships `COACHES`, `MEMBER_OF`, and entity `TrainingSession` (collection `training_sessions`, foreignKey `playerId`).
  2. **Step 2 (Neo4j Graph Traversal)**: Traverses coach node to teams, then team members to identify coached athletes:
     ```cypher
     MATCH (c:Coach)
     WHERE c.name = $coachParam OR c.id = $coachParam
     OPTIONAL MATCH (c)-[:COACHES]->(t:Team)<-[:MEMBER_OF]-(p:Player)
     OPTIONAL MATCH (p)-[:COACHED_BY]->(c)
     WITH DISTINCT p, t, c
     WHERE p IS NOT NULL
     RETURN p.id AS playerId, p.name AS playerName, p.sport AS sport,
            t.id AS teamId, t.name AS teamName, c.name AS coachName
     ```
  3. **Step 3 (Key Extraction)**: Extracts array of unique player IDs: `playerIds = ['P101', 'P102', 'P103']`.
  4. **Step 4 (MongoDB Batch Retrieval)**: Fetches training documents in one batch using `$in` query:
     ```javascript
     db.collection('training_sessions').find({
       playerId: { $in: playerIds }
     }).toArray();
     ```
  5. **Step 5 (In-Memory Join)**: Aggregates training session objects under their respective player:
     ```javascript
     return graphPlayers.map(player => ({
       playerId: player.playerId,
       playerName: player.playerName,
       sport: player.sport,
       team: player.teamName,
       coachName: player.coachName,
       trainingSessions: trainingSessions.filter(ts => ts.playerId === player.playerId)
     }));
     ```

---

#### `POST /api/players/createPlayer`
- **Target Database**: **Dual-Write (MongoDB Document + Neo4j Graph Node)**
- **Step-by-Step Flow**:
  1. **XML Schema Validation**: `xmlSchemaService.validateDocument('Player', req.body)` validates required fields, types, and constraints.
  2. **Document Building**: `xmlSchemaService.buildMongoDocument('Player', req.body)` applies XML default values (e.g. `CURRENT_DATE`, `age: 20`, `gender: 'Male'`).
  3. **MongoDB Write**:
     ```javascript
     await db.collection('players').insertOne(doc);
     ```
  4. **Neo4j Node Sync**: `xmlSchemaService.buildNeo4jNode('Player', req.body)` extracts `{ id, name, sport, age }` and executes:
     ```cypher
     MERGE (n:Player {id: $id})
     SET n += $properties
     RETURN n
     ```
  5. Returns created player document with HTTP 201.

---

#### `PUT /api/players/updatePlayer/:id`
- **Target Database**: Dual-Write (MongoDB + Neo4j)
- **Step-by-Step Flow**:
  1. Updates document in MongoDB:
     ```javascript
     await db.collection('players').updateOne({ _id: id }, { $set: updates });
     ```
  2. Syncs updated properties into Neo4j `:Player` node.

---

#### `DELETE /api/players/deletePlayer/:id`
- **Target Database**: Dual-Delete (MongoDB + Neo4j)
- **Step-by-Step Flow**:
  1. Deletes document from MongoDB:
     ```javascript
     await db.collection('players').deleteOne({ _id: id });
     ```
  2. Deletes graph node and detaches all connected edges in Neo4j:
     ```cypher
     MATCH (n:Player {id: $id}) DETACH DELETE n
     ```

---

### 2.2 Coaches API

#### `GET /api/coaches/getCoachPlayers/:id`
- **Target Database**: Neo4j (or Cross-DB if `?full=true`)
- **Cypher Query**:
  ```cypher
  MATCH (c:Coach)
  WHERE c.name = $coachId OR c.id = $coachId
  OPTIONAL MATCH (c)-[:COACHES]->(t:Team)<-[:MEMBER_OF]-(p:Player)
  OPTIONAL MATCH (p)-[:COACHED_BY]->(c)
  WITH DISTINCT p, t, c
  WHERE p IS NOT NULL
  RETURN p.id AS playerId, p.name AS playerName, p.sport AS sport,
         t.id AS teamId, t.name AS teamName, c.name AS coachName
  ```

#### `GET /api/coaches/getCoachTeams/:id`
- **Target Database**: Neo4j
- **Cypher Query**:
  ```cypher
  MATCH (c:Coach)
  WHERE c.name = $coachId OR c.id = $coachId
  MATCH (c)-[:COACHES]->(t:Team)
  RETURN t.id AS teamId, t.name AS teamName, c.id AS coachId, c.name AS coachName
  ```

---

### 2.3 Tournaments API

#### `GET /api/tournaments/getAllTournaments`
- **Target Database**: MongoDB only
- **Query**:
  ```javascript
  db.collection('tournaments').find({}).toArray();
  ```

#### `GET /api/tournaments/getTournamentPlayers/:id`
- **Target Database**: Neo4j only
- **Cypher Query**:
  ```cypher
  MATCH (p:Player)-[:PARTICIPATES_IN]->(t:Tournament {id: $tournamentId})
  RETURN p.id AS playerId, p.name AS playerName
  ```

#### `GET /api/tournaments/getTournamentTeams/:id`
- **Target Database**: Neo4j only
- **Cypher Query**:
  ```cypher
  MATCH (t:Team)-[:PARTICIPATES_IN]->(tr:Tournament {id: $tournamentId})
  RETURN t.id AS teamId, t.name AS teamName
  ```

---

### 2.4 Teams API

#### `GET /api/teams/:id/players`
- **Target Database**: Neo4j only
- **Cypher Query**:
  ```cypher
  MATCH (t:Team)
  WHERE t.id = $teamParam OR t.name = $teamParam
  MATCH (p:Player)-[:MEMBER_OF]->(t)
  RETURN p.id AS playerId, p.name AS playerName, t.id AS teamId, t.name AS teamName
  ```

---

### 2.5 Relationships API

#### `POST /api/relationships/player-team`
- **Target Database**: Neo4j only
- **Payload**: `{ "playerId": "P101", "teamId": "TEAM01" }`
- **Cypher Query**:
  ```cypher
  MATCH (a:Player {id: $playerId})
  MATCH (b:Team {id: $teamId})
  MERGE (a)-[r:MEMBER_OF]->(b)
  RETURN a.id AS fromId, type(r) AS relationship, b.id AS toId
  ```

---

## 3. Summary Matrix

| Endpoint | Method | Target DB | Primary Operation |
| :--- | :---: | :---: | :--- |
| `/api/players/getAllPlayers` | `GET` | MongoDB | `find({})` |
| `/api/players/getPlayerById/:id` | `GET` | MongoDB | `findOne({ _id })` |
| `/api/players/getPlayerFull/:id` | `GET` | MongoDB + Neo4j | Mongo Profile + Neo4j Relationships |
| `/api/players/getPlayerTraining/:id` | `GET` | MongoDB | `find({ playerId })` |
| `/api/players/getCoachPlayerTraining`| `GET` | Neo4j -> MongoDB | Traversal -> Batch `$in` -> In-Memory Merge |
| `/api/players/createPlayer` | `POST` | MongoDB + Neo4j | XML Validate -> Mongo Insert -> Neo4j Merge Node |
| `/api/tournaments/getAllTournaments` | `GET` | MongoDB | `find({})` |
| `/api/tournaments/getTournamentPlayers`| `GET`| Neo4j | `MATCH (p)-[:PARTICIPATES_IN]->(t)` |
| `/api/coaches/getCoachPlayers/:id` | `GET` | Neo4j | `MATCH (c)-[:COACHES]->(t)<-[:MEMBER_OF]-(p)` |
| `/api/teams/:id/players` | `GET` | Neo4j | `MATCH (p)-[:MEMBER_OF]->(t)` |
