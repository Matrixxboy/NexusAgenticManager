from typing import Any
from mcp.base import BaseModuleContext
from memory.structured.models import Task, TaskStatus
from loguru import logger

class TasksContext(BaseModuleContext):
    
    @property
    def name(self) -> str:
        return "tasks"

    async def get_context(self, project_id: str = None, limit: int = 20, **kwargs) -> str:
        """Get summarized list of pending tasks."""
        try:
            query = Task.status != TaskStatus.DONE
            if project_id:
                query = query & (Task.project_id == project_id)
                
            tasks = await Task.find(query).sort("-priority").limit(limit).to_list()
            if not tasks:
                return "No pending tasks."
            
            lines = []
            for t in tasks:
                lines.append(f"- [{t.status}] {t.title} (Priority: {t.priority})")
            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Error fetching tasks context: {e}")
            return "Error fetching tasks."
