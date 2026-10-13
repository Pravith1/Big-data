const express = require('express');
const router = express.Router();
const { getDb } = require('../config/mongodb');
const { getDriver } = require('../config/neo4j');

// ─── Seed Data ────────────────────────────────────────────────────────────────





const COACHES = [
  { _id: 'C101', name: 'Rahul Sharma', sport: 'Football', role: 'Head Coach', experienceYears: 12 },
  { _id: 'C102', name: 'Meena Iyer', sport: 'Badminton', role: 'High Performance Coach', experienceYears: 9 },
  { _id: 'C103', name: 'Suresh Menon', sport: 'Swimming', role: 'Aquatic Director', experienceYears: 15 }
];

const TEAMS = [
  { _id: 'TEAM01', name: 'National Football Squad', sport: 'Football', category: 'Senior National' },
  { _id: 'TEAM02', name: 'Chennai Cricket Academy', sport: 'Cricket', category: 'First Class' },
  { _id: 'TEAM03', name: 'Bangalore Shuttlers', sport: 'Badminton', category: 'Elite Circuit' },
  { _id: 'TEAM04', name: 'Aqua Swim Club', sport: 'Swimming', category: 'Aquatics Division' }
];

const TOURNAMENTS = [
  { _id: 'T501', name: 'National Football Championship', sport: 'Football', location: 'Delhi', startDate: '2026-11-01', endDate: '2026-11-10', status: 'Upcoming' },
  { _id: 'T502', name: 'All India Cricket Cup', sport: 'Cricket', location: 'Chennai', startDate: '2026-12-05', endDate: '2026-12-20', status: 'Upcoming' },
  { _id: 'T503', name: 'National Badminton Open', sport: 'Badminton', location: 'Bangalore', startDate: '2027-01-10', endDate: '2027-01-15', status: 'Upcoming' }
];

const PLAYERS = [
  { _id: 'P101', name: 'Pravith', age: 20, gender: 'Male', sport: 'Football', position: 'Midfielder', contact: { email: 'pravith@example.com', phone: '9876543210' }, joinedDate: '2025-06-10' },
  { _id: 'P102', name: 'Arjun', age: 22, gender: 'Male', sport: 'Football', position: 'Forward', contact: { email: 'arjun@example.com', phone: '9876543211' }, joinedDate: '2025-07-01' },
  { _id: 'P103', name: 'Sneha', age: 21, gender: 'Female', sport: 'Football', position: 'Defender', contact: { email: 'sneha@example.com', phone: '9876543212' }, joinedDate: '2025-08-15' },
  { _id: 'P104', name: 'Arun', age: 23, gender: 'Male', sport: 'Cricket', position: 'Batsman', contact: { email: 'arun@example.com', phone: '9876543213' }, joinedDate: '2025-05-20' },
  { _id: 'P105', name: 'Divya', age: 20, gender: 'Female', sport: 'Cricket', position: 'Bowler', contact: { email: 'divya@example.com', phone: '9876543214' }, joinedDate: '2025-06-25' },
  { _id: 'P106', name: 'Kiran', age: 24, gender: 'Male', sport: 'Cricket', position: 'All-Rounder', contact: { email: 'kiran@example.com', phone: '9876543215' }, joinedDate: '2025-04-10' },
  { _id: 'P107', name: 'Priya', age: 19, gender: 'Female', sport: 'Badminton', position: 'Singles', contact: { email: 'priya@example.com', phone: '9876543216' }, joinedDate: '2025-09-01' },
  { _id: 'P108', name: 'Rohan', age: 25, gender: 'Male', sport: 'Badminton', position: 'Doubles', contact: { email: 'rohan@example.com', phone: '9876543217' }, joinedDate: '2025-03-15' },
  { _id: 'P109', name: 'Ananya', age: 21, gender: 'Female', sport: 'Swimming', position: 'Freestyle', contact: { email: 'ananya@example.com', phone: '9876543218' }, joinedDate: '2025-07-20' },
  { _id: 'P110', name: 'Vikram', age: 26, gender: 'Male', sport: 'Swimming', position: 'Butterfly', contact: { email: 'vikram@example.com', phone: '9876543219' }, joinedDate: '2025-02-28' }
];

const TRAINING_SESSIONS = [
  { _id: 'TS1001', playerId: 'P101', date: '2026-10-01', durationMinutes: 120, metrics: { distanceKm: 8.7, steps: 12450, calories: 820, averageHeartRate: 142, maximumHeartRate: 178 }, fitnessScore: 8.4, coachFeedback: 'Good stamina and movement.' },
  { _id: 'TS1002', playerId: 'P102', date: '2026-10-02', durationMinutes: 90, metrics: { distanceKm: 6.5, steps: 9800, calories: 650, averageHeartRate: 138, maximumHeartRate: 172 }, fitnessScore: 7.8, coachFeedback: 'Improve positioning in the final third.' },
  { _id: 'TS1003', playerId: 'P103', date: '2026-10-03', durationMinutes: 100, metrics: { distanceKm: 7.2, steps: 10500, calories: 710, averageHeartRate: 135, maximumHeartRate: 168 }, fitnessScore: 8.1, coachFeedback: 'Strong defensive work today.' },
  { _id: 'TS1004', playerId: 'P104', date: '2026-10-04', durationMinutes: 180, metrics: { distanceKm: 4.1, steps: 6200, calories: 550, averageHeartRate: 118, maximumHeartRate: 148 }, fitnessScore: 8.7, coachFeedback: 'Excellent batting technique.' },
  { _id: 'TS1005', playerId: 'P105', date: '2026-10-05', durationMinutes: 150, metrics: { distanceKm: 3.8, steps: 5900, calories: 490, averageHeartRate: 122, maximumHeartRate: 152 }, fitnessScore: 7.5, coachFeedback: 'Work on yorker delivery.' },
  { _id: 'TS1006', playerId: 'P106', date: '2026-10-06', durationMinutes: 160, metrics: { distanceKm: 5.0, steps: 7800, calories: 620, averageHeartRate: 130, maximumHeartRate: 162 }, fitnessScore: 8.9, coachFeedback: 'Best all-round session this month.' },
  { _id: 'TS1007', playerId: 'P107', date: '2026-10-07', durationMinutes: 80, metrics: { distanceKm: 3.2, steps: 8100, calories: 430, averageHeartRate: 145, maximumHeartRate: 182 }, fitnessScore: 9.1, coachFeedback: 'Excellent agility and court coverage.' },
  { _id: 'TS1008', playerId: 'P108', date: '2026-10-07', durationMinutes: 90, metrics: { distanceKm: 3.5, steps: 8500, calories: 460, averageHeartRate: 140, maximumHeartRate: 175 }, fitnessScore: 8.3, coachFeedback: 'Good sync with doubles partner.' },
  { _id: 'TS1009', playerId: 'P109', date: '2026-10-08', durationMinutes: 60, metrics: { distanceKm: 2.8, steps: 4200, calories: 380, averageHeartRate: 155, maximumHeartRate: 188 }, fitnessScore: 8.6, coachFeedback: 'Great freestyle timing.' },
  { _id: 'TS1010', playerId: 'P110', date: '2026-10-08', durationMinutes: 70, metrics: { distanceKm: 2.5, steps: 3900, calories: 350, averageHeartRate: 158, maximumHeartRate: 192 }, fitnessScore: 8.8, coachFeedback: 'Butterfly stroke is improving significantly.' }
];

const MEDICAL_RECORDS = [
  { _id: 'MR501', playerId: 'P101', injury: { type: 'Hamstring Strain', severity: 'Moderate', date: '2026-09-12' }, treatment: 'Physiotherapy', recoveryStatus: 'Recovering', fitnessAssessment: { score: 72, date: '2026-10-05' } },
  { _id: 'MR502', playerId: 'P102', injury: { type: 'Knee Sprain', severity: 'Mild', date: '2026-08-20' }, treatment: 'Rest and Ice', recoveryStatus: 'Fit', fitnessAssessment: { score: 88, date: '2026-09-30' } },
  { _id: 'MR503', playerId: 'P105', injury: { type: 'Shoulder Overuse', severity: 'Mild', date: '2026-09-01' }, treatment: 'Rest', recoveryStatus: 'Fit', fitnessAssessment: { score: 80, date: '2026-10-01' } }
];

const PERFORMANCE_RECORDS = [
  { _id: 'PR1001', playerId: 'P101', tournamentId: 'T501', matchesPlayed: 5, goals: 4, assists: 3, rating: 8.2 },
  { _id: 'PR1002', playerId: 'P102', tournamentId: 'T501', matchesPlayed: 5, goals: 6, assists: 2, rating: 8.7 },
  { _id: 'PR1003', playerId: 'P103', tournamentId: 'T501', matchesPlayed: 5, goals: 0, assists: 4, rating: 7.9 },
  { _id: 'PR1004', playerId: 'P104', tournamentId: 'T502', matchesPlayed: 4, goals: 0, assists: 0, rating: 8.5 },
  { _id: 'PR1005', playerId: 'P105', tournamentId: 'T502', matchesPlayed: 4, goals: 0, assists: 0, rating: 7.8 }
];

// ─── Seed Functions ───────────────────────────────────────────────────────────

async function seedMongo() {
  const db = await getDb();
  const results = {};

  const collections = {
    players: PLAYERS,
    coaches: COACHES,
    teams: TEAMS,
    training_sessions: TRAINING_SESSIONS,
    medical_records: MEDICAL_RECORDS,
    tournaments: TOURNAMENTS,
    performance_records: PERFORMANCE_RECORDS
  };

  for (const [name, docs] of Object.entries(collections)) {
    await db.collection(name).deleteMany({});
    if (docs.length > 0) {
      await db.collection(name).insertMany(docs.map(d => ({ ...d })));
    }
    results[name] = docs.length;
  }

  return results;
}

async function seedNeo4j() {
  const driver = getDriver();
  const session = driver.session();
  const results = {};

  try {
    // Clear existing nodes and relationships
    await session.run('MATCH (n) DETACH DELETE n');



    // Create Coaches (graph nodes only - id)
    for (const c of COACHES) {
      await session.run('CREATE (:Coach {id: $id})', { id: c._id });
    }
    results.coaches = COACHES.length;

    // Create Teams (graph nodes only - id)
    for (const t of TEAMS) {
      await session.run('CREATE (:Team {id: $id})', { id: t._id });
    }
    results.teams = TEAMS.length;

    // Create Tournaments (graph nodes only - id)
    for (const t of TOURNAMENTS) {
      await session.run('CREATE (:Tournament {id: $id})', { id: t._id });
    }
    results.tournaments = TOURNAMENTS.length;

    // Create Players (graph nodes only - id)
    for (const p of PLAYERS) {
      await session.run('CREATE (:Player {id: $id})', { id: p._id });
    }
    results.players = PLAYERS.length;

    // ── Relationships (Maintained strictly in Neo4j) ───────────────

    // Coach COACHES Team
    const coachTeam = [
      { coachId: 'C101', teamId: 'TEAM01' }, // Rahul Sharma → National Football Squad
      { coachId: 'C101', teamId: 'TEAM02' }, // Rahul Sharma → Chennai Cricket Academy
      { coachId: 'C102', teamId: 'TEAM03' }, // Meena Iyer → Bangalore Shuttlers
      { coachId: 'C103', teamId: 'TEAM04' }  // Suresh Menon → Aqua Swim Club
    ];
    for (const r of coachTeam) {
      await session.run(
        'MATCH (c:Coach {id: $coachId}) MATCH (t:Team {id: $teamId}) CREATE (c)-[:COACHES]->(t)',
        r
      );
    }

    // Player MEMBER_OF Team
    const playerTeam = [
      { playerId: 'P101', teamId: 'TEAM01' },
      { playerId: 'P102', teamId: 'TEAM01' },
      { playerId: 'P103', teamId: 'TEAM01' },
      { playerId: 'P104', teamId: 'TEAM02' },
      { playerId: 'P105', teamId: 'TEAM02' },
      { playerId: 'P106', teamId: 'TEAM02' },
      { playerId: 'P107', teamId: 'TEAM03' },
      { playerId: 'P108', teamId: 'TEAM03' },
      { playerId: 'P109', teamId: 'TEAM04' },
      { playerId: 'P110', teamId: 'TEAM04' }
    ];
    for (const r of playerTeam) {
      await session.run(
        'MATCH (p:Player {id: $playerId}) MATCH (t:Team {id: $teamId}) CREATE (p)-[:MEMBER_OF]->(t)',
        r
      );
    }

    // Team PARTICIPATES_IN Tournament
    const teamTournament = [
      { teamId: 'TEAM01', tournamentId: 'T501' },
      { teamId: 'TEAM02', tournamentId: 'T502' },
      { teamId: 'TEAM03', tournamentId: 'T503' }
    ];
    for (const r of teamTournament) {
      await session.run(
        'MATCH (t:Team {id: $teamId}) MATCH (tr:Tournament {id: $tournamentId}) CREATE (t)-[:PARTICIPATES_IN]->(tr)',
        r
      );
    }

    results.relationships = {
      COACHES: coachTeam.length,
      MEMBER_OF: playerTeam.length,
      PARTICIPATES_IN: teamTournament.length
    };

    return results;
  } finally {
    await session.close();
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

// POST /api/seed
router.post('/', async (req, res) => {
  const result = {};

  try {
    result.mongodb = { ok: true, inserted: await seedMongo() };
  } catch (err) {
    result.mongodb = { ok: false, error: err.message };
  }

  try {
    result.neo4j = { ok: true, inserted: await seedNeo4j() };
  } catch (err) {
    result.neo4j = { ok: false, error: err.message };
  }

  const anyOk = result.mongodb.ok || result.neo4j.ok;
  res.status(anyOk ? 200 : 500).json({
    success: anyOk,
    data: result,
    note: !result.neo4j.ok ? 'MongoDB seeded successfully; Neo4j requires valid credentials in .env' : 'Both databases seeded successfully'
  });
});

module.exports = router;
