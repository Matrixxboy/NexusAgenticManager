
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from memory.structured.models import Project
from config.settings import settings

async def list_db_projects():
    # Connect to DB
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    await init_beanie(database=db, document_models=[Project])

    print("\n--- Listing All Projects ---")
    projects = await Project.find_all().to_list()
    for p in projects:
        print(f"Name: {p.name}")
        print(f"ID: {p.id} (Type: {type(p.id)})")
        print(f"Dumped ID: {str(p.id)}")
        print("-" * 20)

if __name__ == "__main__":
    asyncio.run(list_db_projects())
