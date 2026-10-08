from neo4j import GraphDatabase

from app import config

_driver = None


def get_driver():
    global _driver
    if _driver is None:
        if not config.NEO4J_URI or "<" in config.NEO4J_URI or "<" in config.NEO4J_PASSWORD:
            raise RuntimeError("NEO4J_URI / NEO4J_PASSWORD are not set - fill them in backend/.env")
        _driver = GraphDatabase.driver(config.NEO4J_URI, auth=(config.NEO4J_USER, config.NEO4J_PASSWORD))
    return _driver


def run(query, **params):
    """Run a Cypher query and return the records as plain dicts."""
    records, _, _ = get_driver().execute_query(query, params)
    return [r.data() for r in records]


def ping():
    get_driver().verify_connectivity()


def close():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None
