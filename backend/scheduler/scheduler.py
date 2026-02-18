"""
NEXUS Scheduler — runs ATLAS briefings at 9AM and 6:30PM.
Uses APScheduler with asyncio.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger
from config import settings
from agents.pm import atlas

scheduler = AsyncIOScheduler()

async def morning_briefing_job():
    logger.info("⏰ Running morning briefing (ATLAS)")
    briefing = await atlas.morning_briefing()
    logger.info(f"Morning briefing:\n{briefing}")
    # TODO Phase 2: push to Telegram + Notion

async def evening_summary_job():
    logger.info("🌆 Running evening summary (ATLAS)")
    summary = await atlas.evening_summary()
    logger.info(f"Evening summary:\n{summary}")
    # TODO Phase 2: push to Telegram + Notion

def setup_scheduler():
    morning_hour, morning_min = settings.morning_briefing_time.split(":")
    evening_hour, evening_min = settings.evening_summary_time.split(":")

    scheduler.add_job(
        morning_briefing_job,
        CronTrigger(hour=int(morning_hour), minute=int(morning_min)),
        id="morning_briefing",
        replace_existing=True,
    )
    scheduler.add_job(
        evening_summary_job,
        CronTrigger(hour=int(evening_hour), minute=int(evening_min)),
        id="evening_summary",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"✅ Scheduler started — briefing at {settings.morning_briefing_time}, summary at {settings.evening_summary_time}")

def teardown_scheduler():
    scheduler.shutdown()
