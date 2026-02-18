
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../backend"))

from unittest.mock import MagicMock, patch, AsyncMock
from llm.llm_interface import llm_call
from config import settings

async def verify_routing():
    print("Verifying Multi-Model Routing...")
    
    # Mocking claude_client.chat to intercept the model argument
    with patch("llm.llm_interface.claude_client") as mock_client:
        mock_client.is_configured.return_value = True
        
        async def mock_chat_side_effect(prompt, system=None, model=None):
            return f"Mocked response from {model}"
            
        mock_client.chat = AsyncMock(side_effect=mock_chat_side_effect)
        
        # Test cases
        test_cases = [
            ("deep_reasoning", settings.model_reasoning),
            ("coding", settings.model_coding),
            ("long_context", settings.model_long_context),
            ("creative", settings.model_creative),
            ("budget", settings.model_budget),
            ("general", None) # Should use default behavior (which might be local or default cloud depending on length)
        ]
        
        with open("tests/verify_models.log", "w", encoding="utf-8") as f:
            for task_type, expected_model in test_cases:
                print(f"Testing task_type='{task_type}'...")
                
                if task_type == "general":
                    await llm_call("test prompt", task_type=task_type, force="cloud")
                else:
                    await llm_call("test prompt", task_type=task_type)
                
                args, kwargs = mock_client.chat.call_args
                actual_model = kwargs.get('model')
                
                if actual_model == expected_model:
                    msg = f"✅ Success: {task_type} -> {actual_model}"
                    print(msg)
                    f.write(msg + "\n")
                else:
                    msg = f"❌ Failure: {task_type} -> Expected {expected_model}, got {actual_model}"
                    print(msg)
                    f.write(msg + "\n")

if __name__ == "__main__":
    asyncio.run(verify_routing())
