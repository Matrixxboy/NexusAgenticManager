
import asyncio
import sys
# Ensure current directory is in path for imports
sys.path.append('.')

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from memory.structured.models import Project
from config.settings import settings

async def check_project():
    print(f"Connecting to MongoDB: {settings.MONGO_URI}")
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    await init_beanie(database=db, document_models=[Project])

    print(f"\n--- Searching for project named 'test' ---")
    project = await Project.find_one(Project.name == "test")
    
    if project:
        print(f"FOUND: {project.name}")
        print(f"ID: {project.id}")
        print(f"ID Type: {type(project.id)}")
        print(f"ID Dump: {project.id!r}")
        
        # Test find by ID
        print(f"\n--- Testing Find by ID ---")
        try:
            by_id_obj = await Project.get(project.id)
            print(f"Found by object ID? {by_id_obj is not None}")
        except Exception as e:
            print(f"Error finding by Object ID: {e}")
        
        by_id_str = await Project.find_one({"_id": str(project.id)})
        print(f"Found by string ID? {by_id_str is not None}")
    else:
        print("Project 'test' NOT FOUND in DB.")
        
    print("\n--- All Projects ---")
    all_p = await Project.find_all().to_list()
    for p in all_p:
        print(f"- {p.name} ({p.id}) Type: {type(p.id)}")

if __name__ == "__main__":
    asyncio.run(check_project())
