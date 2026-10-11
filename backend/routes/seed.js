const express = require('express');
const router = express.Router();
const { getDb } = require('../config/mongodb');
const { getDriver } = require('../config/neo4j');

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SPORTS = [
  { id: 'SPORT01', name: 'Football' },
  { id: 'SPORT02', name: 'Cricket' },
  { id: 'SPORT03', name: 'Badminton' },
  { id: 'SPORT04', name: 'Swimming' }
];

const TRAINING_CENTERS = [
  { id: 'TC01', name: 'Bangalore High Performance Center', city: 'Bangalore' },
  { id: 'TC02', name: 'Chennai Sports Complex', city: 'Chennai' },
  { id: 'TC03', name: 'Delhi Sports Authority Center', city: 'Delhi' }
];

const COACHES = [
  { id: 'C101', name: 'Rahul' },
  { id: 'C102', name: 'Meena' },
  { id: 'C103', name: 'Suresh' }
];

const TEAMS = [
  { id: 'TEAM01', name: 'National Football Team', sport: 'Football' },
  { id: 'TEAM02', name: 'Chennai Cricket Academy', sport: 'Cricket' },
  { id: 'TEAM03', name: 'Bangalore Shuttlers', sport: 'Badminton' },
  { id: 'TEAM04', name: 'Aqua Swim Club', sport: 'Swimming' }
];

const TOURNAMENTS = [
  { _id: 'T501', name: 'National Football Championship', sport: 'Football', location: 'Delhi', startDate: '2026-11-01', endDate: '2026-11-10', status: 'Upcoming' },
  { _id: 'T502', name: 'All India Cricket Cup', sport: 'Cricket', location: 'Chennai', startDate: '2026-12-05', endDate: '2026-12-20', status: 'Upcoming' },
  { _id: 'T503', name: 'National Badminton Open', sport: 'Badminton', location: 'Bangalore', startDate: '2027-01-10', endDate: '2027-01-15', status: 'Upcoming' }
];

const PLAYERS = [
  { _id: 'P101', name: 'Pravith', age: 20, gender: 'Male', sport: 'Football', position: 'Midfielder', trainingCenterId: 'TC01', contact: { email: 'pravith@example.com', phone: '9876543210' }, joinedDate: '2025-06-10' },
  { _id: 'P102', name: 'Arjun', age: 22, gender: 'Male', sport: 'Football', position: 'Forward', trainingCenterId: 'TC01', contact: { email: 'arjun@example.com', phone: '9876543211' }, joinedDate: '2025-07-01' },
  { _id: 'P103', name: 'Sneha', age: 21, gender: 'Female', sport: 'Football', position: 'Defender', trainingCenterId: 'TC03', contact: { email: 'sneha@example.com', phone: '9876543212' }, joinedDate: '2025-08-15' },
  { _id: 'P104', name: 'Arun', age: 23, gender: 'Male', sport: 'Cricket', position: 'Batsman', trainingCenterId: 'TC02', contact: { email: 'arun@example.com', phone: '9876543213' }, joinedDate: '2025-05-20' },
  { _id: 'P105', name: 'Divya', age: 20, gender: 'Female', sport: 'Cricket', position: 'Bowler', trainingCenterId: 'TC02', contact: { email: 'divya@example.com', phone: '9876543214' }, joinedDate: '2025-06-25' },
  { _id: 'P106', name: 'Kiran', age: 24, gender: 'Male', sport: 'Cricket', position: 'All-Rounder', trainingCenterId: 'TC02', contact: { email: 'kiran@example.com', phone: '9876543215' }, joinedDate: '2025-04-10' },
  { _id: 'P107', name: 'Priya', age: 19, gender: 'Female', sport: 'Badminton', position: 'Singles', trainingCenterId: 'TC01', contact: { email: 'priya@example.com', phone: '9876543216' }, joinedDate: '2025-09-01' },
  { _id: 'P108', name: 'Rohan', age: 25, gender: 'Male', sport: 'Badminton', position: 'Doubles', trainingCenterId: 'TC01', contact: { email: 'rohan@example.com', phone: '9876543217' }, joinedDate: '2025-03-15' },
  { _id: 'P109', name: 'Ananya', age: 21, gender: 'Female', sport: 'Swimming', position: 'Freestyle', trainingCenterId: 'TC03', contact: { email: 'ananya@example.com', phone: '9876543218' }, joinedDate: '2025-07-20' },
  { _id: 'P110', name: 'Vikram', age: 26, gender: 'Male', sport: 'Swimming', position: 'Butterfly', trainingCenterId: 'TC03', contact: { email: 'vikram@example.com', phone: '9876543219' }, joinedDate: '2025-02-28' }
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
    // Clear existing nodes
    await session.run('MATCH (n) DETACH DELETE n');

    // Create Sports
    for (const s of SPORTS) {
      await session.run('CREATE (:Sport {id: $id, name: $name})', s);
    }
    results.sports = SPORTS.length;

    // Create Training Centers
    for (const tc of TRAINING_CENTERS) {
      await session.run('CREATE (:TrainingCenter {id: $id, name: $name, city: $city})', tc);
    }
    results.trainingCenters = TRAINING_CENTERS.length;

    // Create Coaches
    for (const c of COACHES) {
      await session.run('CREATE (:Coach {id: $id, name: $name})', c);
    }
    results.coaches = COACHES.length;

    // Create Teams
    for (const t of TEAMS) {
      await session.run('CREATE (:Team {id: $id, name: $name, sport: $sport})', t);
    }
    results.teams = TEAMS.length;

    // Create Tournaments
    for (const t of TOURNAMENTS) {
      await session.run('CREATE (:Tournament {id: $id, name: $name})', { id: t._id, name: t.name });
    }
    results.tournaments = TOURNAMENTS.length;

    // Create Players (graph nodes only — id and name)
    for (const p of PLAYERS) {
      await session.run('CREATE (:Player {id: $id, name: $name, sport: $sport})', { id: p._id, name: p.name, sport: p.sport });
    }
    results.players = PLAYERS.length;

    // ── Relationships ──────────────────────────────────────────────

    // Coach COACHES Team
    const coachTeam = [
      { coachId: 'C101', teamId: 'TEAM01' }, // Rahul → Football
      { coachId: 'C101', teamId: 'TEAM02' }, // Rahul → Cricket
      { coachId: 'C102', teamId: 'TEAM03' }, // Meena → Badminton
      { coachId: 'C103', teamId: 'TEAM04' }  // Suresh → Swimming
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

    // Player COACHED_BY Coach
    const playerCoach = [
      { playerId: 'P101', coachId: 'C101' },
      { playerId: 'P102', coachId: 'C101' },
      { playerId: 'P103', coachId: 'C101' },
      { playerId: 'P104', coachId: 'C101' },
      { playerId: 'P105', coachId: 'C101' },
      { playerId: 'P106', coachId: 'C101' },
      { playerId: 'P107', coachId: 'C102' },
      { playerId: 'P108', coachId: 'C102' },
      { playerId: 'P109', coachId: 'C103' },
      { playerId: 'P110', coachId: 'C103' }
    ];
    for (const r of playerCoach) {
      await session.run(
        'MATCH (p:Player {id: $playerId}) MATCH (c:Coach {id: $coachId}) CREATE (p)-[:COACHED_BY]->(c)',
        r
      );
    }

    // Player PLAYS Sport
    const playerSport = [
      { playerId: 'P101', sportId: 'SPORT01' },
      { playerId: 'P102', sportId: 'SPORT01' },
      { playerId: 'P103', sportId: 'SPORT01' },
      { playerId: 'P104', sportId: 'SPORT02' },
      { playerId: 'P105', sportId: 'SPORT02' },
      { playerId: 'P106', sportId: 'SPORT02' },
      { playerId: 'P107', sportId: 'SPORT03' },
      { playerId: 'P108', sportId: 'SPORT03' },
      { playerId: 'P109', sportId: 'SPORT04' },
      { playerId: 'P110', sportId: 'SPORT04' }
    ];
    for (const r of playerSport) {
      await session.run(
        'MATCH (p:Player {id: $playerId}) MATCH (s:Sport {id: $sportId}) CREATE (p)-[:PLAYS]->(s)',
        r
      );
    }

    // Player TRAINS_AT TrainingCenter
    const playerTC = [
      { playerId: 'P101', tcId: 'TC01' },
      { playerId: 'P102', tcId: 'TC01' },
      { playerId: 'P103', tcId: 'TC03' },
      { playerId: 'P104', tcId: 'TC02' },
      { playerId: 'P105', tcId: 'TC02' },
      { playerId: 'P106', tcId: 'TC02' },
      { playerId: 'P107', tcId: 'TC01' },
      { playerId: 'P108', tcId: 'TC01' },
      { playerId: 'P109', tcId: 'TC03' },
      { playerId: 'P110', tcId: 'TC03' }
    ];
    for (const r of playerTC) {
      await session.run(
        'MATCH (p:Player {id: $playerId}) MATCH (tc:TrainingCenter {id: $tcId}) CREATE (p)-[:TRAINS_AT]->(tc)',
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

    // Player PARTICIPATES_IN Tournament
    const playerTournament = [
      { playerId: 'P101', tournamentId: 'T501' },
      { playerId: 'P102', tournamentId: 'T501' },
      { playerId: 'P103', tournamentId: 'T501' },
      { playerId: 'P104', tournamentId: 'T502' },
      { playerId: 'P105', tournamentId: 'T502' }
    ];
    for (const r of playerTournament) {
      await session.run(
        'MATCH (p:Player {id: $playerId}) MATCH (t:Tournament {id: $tournamentId}) CREATE (p)-[:PARTICIPATES_IN]->(t)',
        r
      );
    }

    results.relationships = {
      COACHES: coachTeam.length,
      MEMBER_OF: playerTeam.length,
      COACHED_BY: playerCoach.length,
      PLAYS: playerSport.length,
      TRAINS_AT: playerTC.length,
      PARTICIPATES_IN: teamTournament.length + playerTournament.length
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
