"""Async MongoDB connection via Beanie."""
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from config import settings
from loguru import logger
from .models import Project, Task, Session, DailyLog, KnowledgeEntry, CareerGoal

async def init_db():
    """Initialize Beanie ODM with MongoDB."""
    client = AsyncIOMotorClient(settings.mongo_uri)
    await init_beanie(
        database=client[settings.mongo_db_name],
        document_models=[
            Project,
            Task,
            Session,
            DailyLog,
            KnowledgeEntry,
            CareerGoal
        ],
    )
    logger.info(f"✅ MongoDB initialized: {settings.mongo_db_name}")
