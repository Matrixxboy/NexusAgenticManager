from typing import Any, List
from mcp.base import BaseModuleContext
from memory.structured.models import Project, ProjectStatus
from loguru import logger

class ProjectsContext(BaseModuleContext):
    
    @property
    def name(self) -> str:
        return "projects"

    async def get_context(self, limit: int = 10, **kwargs) -> str:
        """Get summarized status of active projects."""
        try:
            projects = await Project.find(Project.status == ProjectStatus.ACTIVE).limit(limit).to_list()
            if not projects:
                return "No active projects found."
            
            lines = []
            for p in projects:
                lines.append(f"- {p.name}: {p.description or 'No description'}")
            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Error fetching projects context: {e}")
            return "Error fetching projects."

class ProjectListContext(BaseModuleContext):
    @property
    def name(self) -> str:
        return "project_list"
    
    async def get_context(self, **kwargs) -> List[str]:
        """Get list of active project names."""
        try:
            projects = await Project.find(Project.status == ProjectStatus.ACTIVE).to_list()
            return [p.name for p in projects]
        except Exception as e:
            logger.error(f"Error fetching project list: {e}")
            return []
