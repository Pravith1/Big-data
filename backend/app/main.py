from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import config, seed
from app.db import mongo, neo4j_db

app = FastAPI(title="Smart Sports Analytics Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
def shutdown():
    mongo.close()
    neo4j_db.close()


def _check(ping):
    try:
        ping()
        return {"connected": True, "error": None}
    except Exception as e:
        return {"connected": False, "error": str(e)}


@app.get("/api/health")
def health():
    return {
        "mongodb": {**_check(mongo.ping), "database": config.MONGO_DB},
        "neo4j": {**_check(neo4j_db.ping), "uri": config.NEO4J_URI},
    }


@app.post("/api/seed")
def seed_all():
    result = {}
    for name, fn in (("mongodb", seed.seed_mongo), ("neo4j", seed.seed_neo4j)):
        try:
            result[name] = {"ok": True, "inserted": fn()}
        except Exception as e:
            result[name] = {"ok": False, "error": str(e)}
    return result


@app.get("/api/mongo/overview")
def mongo_overview():
    try:
        db = mongo.get_db()
        collections = {name: db[name].count_documents({}) for name in sorted(db.list_collection_names())}
        players = list(db.players.find({}, {"_id": 0}).sort("player_id", 1))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"MongoDB: {e}")
    return {"collections": collections, "players": players}


@app.get("/api/neo4j/overview")
def neo4j_overview():
    try:
        labels = neo4j_db.run("MATCH (n) UNWIND labels(n) AS label RETURN label, count(*) AS count ORDER BY label")
        rels = neo4j_db.run("MATCH ()-[r]->() RETURN type(r) AS type, count(*) AS count ORDER BY type")
        players = neo4j_db.run(
            """
            MATCH (p:Player)
            OPTIONAL MATCH (p)-[:PLAYS_FOR]->(t:Team)
            OPTIONAL MATCH (c:Coach)-[:COACHES]->(p)
            RETURN p.playerId AS playerId, p.name AS name, p.sport AS sport,
                   p.fitnessScore AS fitnessScore, t.name AS team, c.name AS coach
            ORDER BY playerId
            """
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Neo4j: {e}")
    return {"labels": labels, "relationships": rels, "players": players}
