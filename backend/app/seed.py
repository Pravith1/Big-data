"""Load the sample data from the lab report into MongoDB and Neo4j.

MongoDB follows the Experiment 5 / 5b collections (players, training_centers,
training_sessions, sensor_telemetry, media_highlights). Neo4j follows the
Experiment 6a/6b graph (Player, Team, Coach with PLAYS_FOR and COACHES).

Both databases use the same player IDs (P101, P102, ...) so a single query can
later join a player's MongoDB documents with their Neo4j relationships.

Run directly with:  python -m app.seed
"""
from datetime import datetime, timezone

from app.db import mongo, neo4j_db


def _dt(s):
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc)


PLAYERS = [
    {
        "player_id": "P101", "name": "Arun", "age": 21, "sport": "Cricket",
        "position": "Batsman", "team": "Chennai Cricket Academy", "active": True,
        "fitness": {"height_cm": 176, "weight_kg": 70, "bmi": 22.6, "body_fat_pct": 12.0, "resting_hr_bpm": 58},
        "stats": {"games_played": 42, "runs": 78, "strike_rate": 144, "stamina_rating": 85},
        "tags": ["starter", "top-order"],
    },
    {
        "player_id": "P102", "name": "Rahul", "age": 22, "sport": "Cricket",
        "position": "Bowler", "team": "Chennai Cricket Academy", "active": True,
        "fitness": {"height_cm": 181, "weight_kg": 74, "bmi": 22.6, "body_fat_pct": 11.0, "resting_hr_bpm": 55},
        "stats": {"games_played": 30, "wickets": 41, "economy": 6.2, "stamina_rating": 85},
        "tags": ["pace-bowler"],
    },
    {
        "player_id": "P103", "name": "Priya", "age": 21, "sport": "Badminton",
        "position": "Singles", "team": "Bangalore Shuttlers", "active": True,
        "fitness": {"height_cm": 168, "weight_kg": 57, "bmi": 20.2, "body_fat_pct": 16.5, "resting_hr_bpm": 50},
        "stats": {"matches_played": 30, "win_ratio": 0.73, "stamina_rating": 91},
        "tags": ["seed-top-10"],
    },
    {
        "player_id": "P104", "name": "Kiran", "age": 25, "sport": "Swimming",
        "position": "Freestyle", "team": "Independent", "active": True,
        "fitness": {"height_cm": 185, "weight_kg": 80, "bmi": 23.4, "body_fat_pct": 10.0, "resting_hr_bpm": 48},
        "stats": {"races": 18, "best_100m_free_sec": 51.8, "stamina_rating": 88},
        "tags": ["record-holder"],
    },
    {
        "player_id": "P105", "name": "Arjun", "age": 24, "sport": "Football",
        "position": "Forward", "team": "United FC", "active": False,
        "fitness": {"height_cm": 179, "weight_kg": 76, "bmi": 23.7, "body_fat_pct": 11.0, "resting_hr_bpm": 55},
        "stats": {"games_played": 18, "goals": 9, "stamina_rating": 72},
        "tags": ["recovering-injury"],
    },
]

TRAINING_CENTERS = [
    {
        "center_id": "TC-BLR-01", "name": "National High Performance Center", "city": "Bangalore",
        "location": {"type": "Point", "coordinates": [77.5946, 12.9716]},
        "supported_sports": ["Athletics", "Football", "Swimming", "Badminton"],
        "indoor_facilities": True,
    },
    {
        "center_id": "TC-CHN-01", "name": "Chennai Sports Complex", "city": "Chennai",
        "location": {"type": "Point", "coordinates": [80.2707, 13.0827]},
        "supported_sports": ["Cricket", "Volleyball"],
        "indoor_facilities": False,
    },
]

TRAINING_SESSIONS = [
    {
        "session_id": "SESS-2026-001", "center_id": "TC-BLR-01", "sport": "Football", "coach_id": "C103",
        "start_time": _dt("2026-08-20T06:00:00"), "end_time": _dt("2026-08-20T08:30:00"),
        "weather": {"temp_c": 24, "humidity_pct": 65, "condition": "Clear"},
        "drills": ["High-Intensity Interval Sprinting", "Tactical Positioning"],
        "attendance": [{"player_id": "P105", "status": "Present"}],
    },
    {
        "session_id": "SESS-2026-002", "center_id": "TC-CHN-01", "sport": "Cricket", "coach_id": "C101",
        "start_time": _dt("2026-08-21T07:00:00"), "end_time": _dt("2026-08-21T10:00:00"),
        "weather": {"temp_c": 31, "humidity_pct": 72, "condition": "Sunny"},
        "drills": ["Net Batting", "Death-Over Bowling", "Fielding Drills"],
        "attendance": [{"player_id": "P101", "status": "Present"}, {"player_id": "P102", "status": "Absent"}],
    },
]

SENSOR_TELEMETRY = [
    {
        "timestamp": _dt("2026-08-20T06:15:29"),
        "metadata": {"device_id": "BAND-X9", "player_id": "P105", "session_id": "SESS-2026-001"},
        "speed_kmh": 18.4, "gps_coordinates": [77.5948, 12.9718],
        "calories_burned": 420, "heart_rate_bpm": 172, "step_count": 5400, "battery_pct": 84,
    },
    {
        "timestamp": _dt("2026-08-21T07:40:00"),
        "metadata": {"device_id": "BAND-C2", "player_id": "P101", "session_id": "SESS-2026-002"},
        "speed_kmh": 9.1, "gps_coordinates": [80.2709, 13.0829],
        "calories_burned": 435, "heart_rate_bpm": 82, "step_count": 11250, "battery_pct": 61,
    },
]

MEDIA_HIGHLIGHTS = [
    {
        "highlight_id": "HL-404", "title": "Spectacular Header Goal - Semifinals", "sport": "Football",
        "featured_player_ids": ["P105"], "media_type": "short_video",
        "cdn_url": "https://cdn.sports.org/highlights/goal_404.mp4", "shares_count": 1240, "is_public": True,
    },
    {
        "highlight_id": "HL-405", "title": "Century in the Final Over", "sport": "Cricket",
        "featured_player_ids": ["P101"], "media_type": "short_video",
        "cdn_url": "https://cdn.sports.org/highlights/century_405.mp4", "shares_count": 980, "is_public": True,
    },
    {
        "highlight_id": "HL-406", "title": "Powerful Smash - Quarterfinal", "sport": "Badminton",
        "featured_player_ids": ["P103"], "media_type": "photo",
        "cdn_url": "https://cdn.sports.org/highlights/smash_406.jpg", "shares_count": 310, "is_public": True,
    },
]

# Neo4j graph (Experiment 6a/6b)
TEAMS = [
    {"teamId": "T101", "name": "Chennai Cricket Academy", "sport": "Cricket"},
    {"teamId": "T102", "name": "Bangalore Shuttlers", "sport": "Badminton"},
    {"teamId": "T103", "name": "United FC", "sport": "Football"},
]
COACHES = [
    {"coachId": "C101", "name": "Ravi Kumar"},
    {"coachId": "C102", "name": "Meena Iyer"},
    {"coachId": "C103", "name": "Suresh Das"},
]
GRAPH_PLAYERS = [
    {"playerId": "P101", "name": "Arun", "age": 21, "sport": "Cricket", "fitnessScore": 85, "teamId": "T101", "coachId": "C101"},
    {"playerId": "P102", "name": "Rahul", "age": 22, "sport": "Cricket", "fitnessScore": 85, "teamId": "T101", "coachId": "C101"},
    {"playerId": "P103", "name": "Priya", "age": 21, "sport": "Badminton", "fitnessScore": 91, "teamId": "T102", "coachId": "C102"},
    {"playerId": "P104", "name": "Kiran", "age": 25, "sport": "Swimming", "fitnessScore": 88, "teamId": None, "coachId": "C102"},
    {"playerId": "P105", "name": "Arjun", "age": 24, "sport": "Football", "fitnessScore": 72, "teamId": "T103", "coachId": "C103"},
]


def seed_mongo():
    db = mongo.get_db()
    data = {
        "players": PLAYERS,
        "training_centers": TRAINING_CENTERS,
        "training_sessions": TRAINING_SESSIONS,
        "sensor_telemetry": SENSOR_TELEMETRY,
        "media_highlights": MEDIA_HIGHLIGHTS,
    }
    counts = {}
    for name, docs in data.items():
        db[name].delete_many({})
        # copy so pymongo's added _id doesn't leak into the module-level lists
        db[name].insert_many([dict(d) for d in docs])
        counts[name] = len(docs)
    db.players.create_index("player_id", unique=True)
    db.training_centers.create_index([("location", "2dsphere")])
    return counts


def seed_neo4j():
    neo4j_db.run("MATCH (n) WHERE n:Player OR n:Team OR n:Coach DETACH DELETE n")
    neo4j_db.run("CREATE CONSTRAINT player_id IF NOT EXISTS FOR (p:Player) REQUIRE p.playerId IS UNIQUE")
    neo4j_db.run("UNWIND $rows AS row CREATE (:Team {teamId: row.teamId, name: row.name, sport: row.sport})", rows=TEAMS)
    neo4j_db.run("UNWIND $rows AS row CREATE (:Coach {coachId: row.coachId, name: row.name})", rows=COACHES)
    neo4j_db.run(
        """
        UNWIND $rows AS row
        CREATE (p:Player {playerId: row.playerId, name: row.name, age: row.age,
                          sport: row.sport, fitnessScore: row.fitnessScore})
        WITH p, row
        OPTIONAL MATCH (t:Team {teamId: row.teamId})
        OPTIONAL MATCH (c:Coach {coachId: row.coachId})
        FOREACH (_ IN CASE WHEN t IS NULL THEN [] ELSE [1] END | CREATE (p)-[:PLAYS_FOR]->(t))
        FOREACH (_ IN CASE WHEN c IS NULL THEN [] ELSE [1] END | CREATE (c)-[:COACHES]->(p))
        """,
        rows=GRAPH_PLAYERS,
    )
    return {"Team": len(TEAMS), "Coach": len(COACHES), "Player": len(GRAPH_PLAYERS)}


if __name__ == "__main__":
    print("MongoDB:", seed_mongo())
    print("Neo4j:", seed_neo4j())
