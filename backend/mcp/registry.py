from typing import Dict, Type, List
from .base import BaseModuleContext, BaseModelContext
from loguru import logger
from typing import Any

class MCPRegistry:
    _modules: Dict[str, BaseModuleContext] = {}
    _models: Dict[str, BaseModelContext] = {}

    @classmethod
    def register_module(cls, module: BaseModuleContext):
        """Register a module context provider."""
        if module.name in cls._modules:
            logger.warning(f"Overwriting existing module context: {module.name}")
        cls._modules[module.name] = module
        logger.debug(f"Registered MCP Module: {module.name}")

    @classmethod
    def register_model(cls, model: BaseModelContext):
        """Register a model context provider."""
        if model.name in cls._models:
            logger.warning(f"Overwriting existing model context: {model.name}")
        cls._models[model.name] = model
        logger.debug(f"Registered MCP Model: {model.name}")

    @classmethod
    def get_module(cls, name: str) -> BaseModuleContext:
        return cls._modules.get(name)

    @classmethod
    def get_model(cls, name: str) -> BaseModelContext:
        return cls._models.get(name)

    @classmethod
    def get_all_modules(cls) -> List[BaseModuleContext]:
        return list(cls._modules.values())

    @classmethod
    async def get_global_context(cls, module_names: List[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Aggregates context from specified modules (or all if None).
        Returns a dictionary mapping module_name -> context_data.
        """
        context_data = {}
        target_modules = [cls._modules[name] for name in module_names] if module_names else cls._modules.values()
        
        for module in target_modules:
            try:
                data = await module.get_context(**kwargs)
                context_data[module.name] = data
            except Exception as e:
                logger.error(f"Failed to fetch context from module '{module.name}': {e}")
                context_data[module.name] = f"Error fetching {module.name}"
        
        return context_data

    # ─── TOOLS ──────────────────────────────────────────────────────────

    _tools: Dict[str, Any] = {}  # Type: Dict[str, BaseTool]

    @classmethod
    def register_tool(cls, tool: Any):
        """Register an MCP tool."""
        if tool.name in cls._tools:
            logger.warning(f"Overwriting existing tool: {tool.name}")
        cls._tools[tool.name] = tool
        logger.debug(f"Registered MCP Tool: {tool.name}")

    @classmethod
    def get_tool(cls, name: str) -> Any:
        return cls._tools.get(name)

    @classmethod
    def get_all_tools(cls) -> List[Any]:
        return list(cls._tools.values())

