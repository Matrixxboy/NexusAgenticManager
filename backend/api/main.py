"""NEXUS FastAPI Backend — Main entry point."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from config import settings
from core.logger import setup_logger
from memory.structured.database import init_db
from api.routes import chat, projects, tasks, health, research, agents, sessions

setup_logger(settings.log_level)
os.makedirs("logs", exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 NEXUS Backend starting...")
    await init_db()
    logger.info(f"✅ NEXUS ready — model: {settings.ollama_model}")
    logger.info("Agents online: ATLAS · ORACLE · COMPASS · FORGE")
    yield
    logger.info("👋 NEXUS Backend shutting down")

app = FastAPI(
    title="NEXUS API",
    description="Personal Agentic AI OS — 5 Agents, Full Stack",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routes
app.include_router(health.router,    prefix="/api", tags=["health"])
app.include_router(chat.router,      prefix="/api", tags=["chat"])
app.include_router(projects.router,  prefix="/api", tags=["projects"])
app.include_router(tasks.router,     prefix="/api", tags=["tasks"])
app.include_router(sessions.router,  prefix="/api", tags=["sessions"])

# Agent-specific routes
app.include_router(research.router,  prefix="/api", tags=["oracle-research"])
app.include_router(agents.router,    prefix="/api", tags=["compass-career", "forge-code"])
