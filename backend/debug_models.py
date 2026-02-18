
import asyncio
from memory.structured.models import Project, ProjectStatus
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def test_serialization():
    # Mock a project
    p = Project(name="Test Project", description="Desc")
    # Simulate saving (we won't actually save to DB to avoid config issues, just dump)
    # But wait, to get an ID it usually needs to be saved or manually set.
    # Beanie assigns ID on insert.
    
    # Let's just create a complete dict manually to see what model_dump does with default values
    # actually, verifying with a real DB connection is best, but might be overkill/slow.
    
    # Converting to dict
    dumped = p.model_dump(mode='json')
    print(f"Dumped keys: {dumped.keys()}")
    print(f"Dumped content: {dumped}")

    # Check query result simulation
    # If I manually add an ID
    from bson import ObjectId
    p.id = PydanticObjectId()
    
    dumped_with_id = p.model_dump(mode='json')
    print(f"Dumped with ID keys: {dumped_with_id.keys()}")
    
    # The frontend expects '_id'. 
    if '_id' not in dumped_with_id:
        print("CRITICAL: _id is MISSING from model_dump!")
    else:
        print("OK: _id is present.")

if __name__ == "__main__":
    from beanie import PydanticObjectId
    asyncio.run(test_serialization())
