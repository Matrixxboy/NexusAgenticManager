"""Beanie ODM models for MongoDB."""
from typing import List, Optional
from datetime import datetime
from beanie import Document, Link
from pydantic import BaseModel, Field
import enum

class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Project(Document):
    name: str
    description: str = ""
    status: ProjectStatus = ProjectStatus.ACTIVE
    github_repo: str = ""
    notion_page_id: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "projects"

class Task(Document):
    project_id: str  # Reference to Project ID
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_ai_generated: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tasks"

class Session(Document):
    session_id: str
    agent_name: str
    messages: List[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "sessions"

class DailyLog(Document):
    date: str  # YYYY-MM-DD
    morning_briefing: str = ""
    evening_summary: str = ""
    tasks_completed: int = 0
    mood_note: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "daily_logs"

class KnowledgeEntry(Document):
    title: str
    source_url: str = ""
    content_type: str = "note"
    tags: List[str] = []
    chroma_doc_id: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "knowledge_entries"

class CareerGoal(Document):
    title: str
    target_date: Optional[datetime] = None
    current_level: str = ""
    target_level: str = ""
    progress_notes: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "career_goals"

class Profile(Document):
    name: str = "User"
    role: str = "Developer"
    bio: str = ""
    api_keys: dict = {}  # { "openai": "sk-...", "anthropic": "sk-..." }
    preferences: dict = {}  # { "theme": "dark", "notifications": true }
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "profile"
