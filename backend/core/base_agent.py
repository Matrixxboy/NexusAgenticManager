"""Base class for all NEXUS agents."""
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from loguru import logger
from typing import List
from core import db_context

class BaseAgent(ABC):
    """Every agent inherits from this. Enforces interface consistency."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.logger = logger.bind(agent=name)

    async def get_db_context(self) -> Dict[str, str]:
        """Fetch live snapshot of system state from DB."""
        return await db_context.get_combined_context()

    async def create_task(self, project: str, title: str, description: str = "", priority: str = "medium") -> Dict[str, Any]:
        """Allow agents to create tasks directly."""
        return await db_context.create_task(project, title, description, priority)

    async def update_task_status(self, task_ref: str, status: str) -> Dict[str, Any]:
        """Allow agents to update task status."""
        return await db_context.update_task_status(task_ref, status)

    async def create_project(self, name: str, description: str = "") -> Dict[str, Any]:
        """Allow agents to create projects."""
        return await db_context.create_project(name, description)

    async def get_project_list(self) -> List[str]:
        """Get list of active project names."""
        return await db_context.get_project_list()

    async def retrieve_context(self, query: str, limit: int = 3) -> str:
        """Fetch relevant context from RAG memory."""
        try:
            from memory.vector.chroma_store import ChromaStore
            store = ChromaStore()
            results = await store.search(query, n_results=limit)
            if not results:
                return ""
            
            context_blocks = []
            for doc in results:
                meta = doc.get("metadata", {})
                source = meta.get("source", "unknown")
                date = meta.get("created_at", "")[:10]
                text = doc.get("text", "").strip()
                context_blocks.append(f"--- [Source: {source} | Date: {date}] ---\n{text}")
            
            return "\n\n".join(context_blocks)
        except Exception as e:
            logger.error(f"RAG Retrieval failed: {e}")
            return ""

    @abstractmethod
    async def run(self, input: Dict[str, Any], context: Optional[Dict] = None) -> Dict[str, Any]:
        """Main entry point for every agent. Must return a dict with 'output' key."""
        pass

    async def on_start(self):
        """Called when agent initializes. Override for setup."""
        self.logger.info(f"Agent {self.name} initialized")

    async def on_error(self, error: Exception) -> Dict[str, Any]:
        """Standard error handler. Can be overridden."""
        self.logger.error(f"Agent {self.name} error: {error}")
        return {"output": None, "error": str(error), "success": False}

    def __repr__(self):
        return f"<Agent:{self.name}>"
