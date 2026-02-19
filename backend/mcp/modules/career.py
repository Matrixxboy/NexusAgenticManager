from typing import Any
from mcp.base import BaseModuleContext
from memory.structured.models import CareerGoal
from loguru import logger

class CareerContext(BaseModuleContext):
    
    @property
    def name(self) -> str:
        return "career_goals"

    async def get_context(self, **kwargs) -> str:
        """Get active career goals and progress."""
        try:
            goals = await CareerGoal.find(CareerGoal.is_active == True).to_list()
            if not goals:
                return "No active career goals."
            
            lines = []
            for g in goals:
                lines.append(f"- {g.title}: {g.progress_notes or 'No notes'}")
            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Error fetching career context: {e}")
            return "Error fetching career goals."
