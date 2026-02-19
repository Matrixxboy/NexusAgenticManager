"""
Smart LLM Router — decides: Ollama local OR Claude API cloud.
Rule: local first, cloud only when task complexity demands it.
"""
import tiktoken
from typing import Literal, Dict, Any
from loguru import logger
from config import settings

LLMTarget = Literal["local", "cloud"]

def count_tokens(text: str) -> int:
    """Approximate token count using cl100k_base encoding."""
    try:
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        # Fallback: rough estimate
        return len(text.split()) * 4 // 3

def route(prompt: str, task_type: str = "general") -> LLMTarget:
    """
    Routing logic:
    - Cloud if: task_type in CLOUD_TASK_TYPES
    - Cloud if: prompt tokens > LOCAL_TOKEN_THRESHOLD
    - Local otherwise (default)
    """
    # Rule 1: task type override
    # Extended list of cloud-mandatory tasks
    cloud_mandatory = settings.cloud_task_types + [
        "deep_reasoning", "coding", "long_context", "creative", "budget", "routing"
    ]
    
    if task_type in cloud_mandatory:
        logger.debug(f"Router → CLOUD (task_type: {task_type})")
        return "cloud"

    # Rule 2: token length
    token_count = count_tokens(prompt)
    if token_count > settings.local_token_threshold:
        logger.debug(f"Router → CLOUD (tokens: {token_count} > {settings.local_token_threshold})")
        return "cloud"

    logger.debug(f"Router → LOCAL (tokens: {token_count}, task: {task_type})")
    return "local"

def get_routing_info(prompt: str, task_type: str = "general") -> Dict[str, Any]:
    """Returns routing decision with full context — useful for logging."""
    token_count = count_tokens(prompt)
    target = route(prompt, task_type)
    return {
        "target": target,
        "token_count": token_count,
        "task_type": task_type,
        "reason": "task_type_override" if task_type in settings.cloud_task_types
                  else "token_threshold" if token_count > settings.local_token_threshold
                  else "default_local"
    }
