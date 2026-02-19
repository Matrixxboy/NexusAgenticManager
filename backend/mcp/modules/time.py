from typing import Any
from mcp.base import BaseModuleContext
from datetime import datetime

class TimeContext(BaseModuleContext):
    
    @property
    def name(self) -> str:
        return "time"

    async def get_context(self, **kwargs) -> str:
        """Get current time formatted string."""
        return f"\n[Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}]\n"
