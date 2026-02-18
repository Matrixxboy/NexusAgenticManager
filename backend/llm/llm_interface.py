"""
Unified LLM interface.
Automatically routes to local or cloud based on smart_router.
Call this from agents — never call ollama/claude directly.
"""
from typing import Optional
from loguru import logger
from llm.router import route, get_routing_info
from llm.local import ollama_client
from llm.cloud import claude_client

async def llm_call(
    prompt: str,
    system: Optional[str] = None,
    task_type: str = "general",
    force: Optional[str] = None,  # "local" | "cloud" | None
) -> str:
    """
    Main LLM entry point for all agents.
    Args:
        prompt: User/agent prompt
        system: System prompt override
        task_type: Hint for router ("general", "research_heavy", etc.)
        force: Override routing if needed
    """
    info = get_routing_info(prompt, task_type)
    target = force if force else info["target"]

    logger.debug(f"LLM call → {target.upper()} | tokens={info['token_count']} | task={task_type}")

    if target == "local":
        available = await ollama_client.is_available()
        if not available:
            logger.warning("Ollama not available, falling back to Claude API")
            target = "cloud"
        else:
            return await ollama_client.chat(prompt, system)

    if target == "cloud":
        if not claude_client.is_configured():
            raise RuntimeError("Claude API not configured. Set OPENROUTER_API_KEY in .env")
        
        # Select model based on task type
        model_id = None
        from config import settings
        
        if task_type == "deep_reasoning":
            model_id = settings.model_reasoning
        elif task_type == "coding":
            model_id = settings.model_coding
        elif task_type == "long_context":
            model_id = settings.model_long_context
        elif task_type == "creative":
            model_id = settings.model_creative
        elif task_type == "budget":
            model_id = settings.model_budget
        
        logger.debug(f"Cloud Call: {model_id or 'default'} | task={task_type}")
        return await claude_client.chat(prompt, system, model=model_id)

    raise RuntimeError(f"Unknown LLM target: {target}")
