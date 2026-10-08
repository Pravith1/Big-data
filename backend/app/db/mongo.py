import certifi
from pymongo import MongoClient

from app import config

_client = None


def get_client():
    global _client
    if _client is None:
        if not config.MONGO_URI or "<db_password>" in config.MONGO_URI:
            raise RuntimeError("MONGO_URI is not set - fill in the password in backend/.env")
        # certifi's CA bundle avoids SSL errors against Atlas on macOS
        _client = MongoClient(config.MONGO_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=8000)
    return _client


def get_db():
    return get_client()[config.MONGO_DB]


def ping():
    get_client().admin.command("ping")


def close():
    global _client
    if _client is not None:
        _client.close()
        _client = None
