from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

class BaseModuleContext(ABC):
    """
    Base class for Module Context Protocols (Data Fetchers).
    These are responsible for fetching raw data from the system (DB, APIs, etc.).
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique name of the module context."""
        pass

    @abstractmethod
    async def get_context(self, **kwargs) -> Any:
        """
        Fetch the context data.
        Returns raw data (dict, list, string) that will be passed to the Model Context.
        """
        pass

class BaseModelContext(ABC):
    """
    Base class for Model Context Protocols (Prompt Formatters).
    These are responsible for formatting the raw data into a system prompt for the LLM.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique name of the model context."""
        pass

    @abstractmethod
    def format_context(self, context_data: Dict[str, Any], **kwargs) -> str:
        """
        Format the context data into a string system message.
        Args:
            context_data: A dictionary containing data from various Module Contexts.
        """
        pass

class BaseTool(ABC):
    """
    Base class for MCP Tools (Actions).
    These are responsible for executing side-effects (Create, Update, Delete) or complex queries.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique name of the tool."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what the tool does."""
        pass

    @abstractmethod
    async def run(self, **kwargs) -> Dict[str, Any]:
        """
        Execute the tool action.
        Returns a dictionary with at least {"success": bool, "output": str}.
        """
        pass

