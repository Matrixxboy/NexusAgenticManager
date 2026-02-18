"""Base class for all NEXUS agents."""
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from loguru import logger

class BaseAgent(ABC):
    """Every agent inherits from this. Enforces interface consistency."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.logger = logger.bind(agent=name)

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
