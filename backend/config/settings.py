from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List

class Settings(BaseSettings):
    # App
    app_name: str = "NEXUS"
    debug: bool = True
    log_level: str = "INFO"
    secret_key: str = "change-me"

    person_name: str = "Utsav Lankapati"
    # LLM - Local
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    # LLM - Cloud
    openrouter_api_key: str = "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"
    claude_model: str = "anthropic/claude-3-haiku" # Default main model
    
    # specialized models
    model_reasoning: str = "anthropic/claude-3-haiku"
    model_coding: str = "deepseek/deepseek-v3.1-terminus"
    model_long_context: str = "google/gemini-1.5-pro"
    model_creative: str = "tngtech/deepseek-r1t2-chimera"
    model_budget: str = "deepseek/deepseek-v3.2-speciale"

    # Router
    local_token_threshold: int = 2000
    cloud_task_types: List[str] = ["research_heavy", "career_analysis", "code_review_deep"]

    # Database
    mongo_uri: str = "mongodb+srv://utsav:__utsav_14_7_2004$bhai@maincluster.a6pddlh.mongodb.net/"
    mongo_db_name: str = "nexus"
    chroma_db_path: str = "./chroma_db"
    redis_url: str = "redis://localhost:6379"

    # Integrations
    github_token: str = ""
    github_username: str = ""
    notion_api_key: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    site_url: str = "http://localhost:8000"
    site_name: str = "NEXUS"

    # Scheduler
    morning_briefing_time: str = "09:00"
    evening_summary_time: str = "18:30"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        protected_namespaces=('settings_',),
    )

settings = Settings()

# ─── Notion DB IDs (optional) ──────────────────────────────────
notion_daily_log_db: str = ""
notion_research_db: str = ""
