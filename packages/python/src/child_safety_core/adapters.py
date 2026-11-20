import os
from functools import lru_cache

import motor.motor_asyncio
from typing import List, Optional
from .domain import ChildProfile
from .ports import IdentityVaultPort


@lru_cache
def get_mongo_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    """One client (and connection pool) per process; safe to call repeatedly."""
    connection_string = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    return motor.motor_asyncio.AsyncIOMotorClient(connection_string, uuidRepresentation="standard")


async def close_mongo_client() -> None:
    if get_mongo_client.cache_info().currsize:
        get_mongo_client().close()
        get_mongo_client.cache_clear()


class MongoIdentityVaultAdapter(IdentityVaultPort):
    def __init__(self, database_name: str):
        self.client = get_mongo_client()
        self.db = self.client[database_name]
        self.collection = self.db["profiles"]

    async def save_profile(self, profile: ChildProfile) -> ChildProfile:
        profile_dict = profile.model_dump()
        if profile.id:
            await self.collection.replace_one({"id": profile.id}, profile_dict, upsert=True)
        else:
            # Simple ID generation for demo
            import uuid
            profile_dict["id"] = str(uuid.uuid4())
            await self.collection.insert_one(profile_dict)
            profile.id = profile_dict["id"]
        return profile

    async def get_profile(self, profile_id: str) -> Optional[ChildProfile]:
        data = await self.collection.find_one({"id": profile_id})
        if data:
            return ChildProfile(**data)
        return None

    async def list_profiles(self) -> List[ChildProfile]:
        profiles = []
        async for data in self.collection.find():
            profiles.append(ChildProfile(**data))
        return profiles
