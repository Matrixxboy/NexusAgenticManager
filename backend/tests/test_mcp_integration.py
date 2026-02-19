import pytest
import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from mcp.registry import MCPRegistry
from mcp.modules import ProjectsContext, TasksContext, CareerContext, TimeContext
from mcp.models import NexusModelContext
from unittest.mock import MagicMock, patch, AsyncMock
from typing import Any, Dict, List

@pytest.mark.asyncio
async def test_mcp_registry_and_execution():
    # 1. Register Modules
    MCPRegistry.register_module(ProjectsContext())
    MCPRegistry.register_module(TasksContext())
    MCPRegistry.register_module(CareerContext())
    MCPRegistry.register_module(TimeContext())

    # 2. Register Model
    MCPRegistry.register_model(NexusModelContext())

    # 3. Verify Registration
    assert MCPRegistry.get_module("projects") is not None
    assert MCPRegistry.get_module("tasks") is not None
    assert MCPRegistry.get_module("career_goals") is not None
    assert MCPRegistry.get_module("time") is not None
    assert MCPRegistry.get_model("nexus_system_prompt") is not None

    # 4. Test Global Context Fetching (Mocked DB)
    # We patch the entire Project class so that Project.status (cls attribute) exists
    with patch("mcp.modules.projects.Project") as MockProject:
        # 1. Setup MockProject.status to be a simple string or mock
        MockProject.status = "active"
        
        # 2. Setup find() -> limit() -> to_list()
        mock_cursor = MagicMock()
        mock_cursor.limit.return_value.to_list = AsyncMock(return_value=[])
        
        # When Project.find(...) is called, return the cursor
        MockProject.find.return_value = mock_cursor
        
        # Test projects context
        context_data = await MCPRegistry.get_global_context(["projects", "time"])
        
        # Debugging output if assertions fail
        print(f"Context Data: {context_data}")
        
        assert "projects" in context_data
        assert "time" in context_data
        assert context_data["projects"] == "No active projects found."
        assert "[Time:" in context_data["time"]

    # 5. Test Model Formatting
    model = MCPRegistry.get_model("nexus_system_prompt")
    formatted_prompt = model.format_context(
        context_data={
            "projects": "Project Alpha: Ongoing",
            "time": "\n[Time: 2025-10-27 10:00]\n"
        },
        history="User: Hello\nAI: Hi"
    )

    assert "Project Alpha: Ongoing" in formatted_prompt
    assert "User: Hello" in formatted_prompt
    assert "AI: Hi" in formatted_prompt
    assert "IDENTITY & CONTEXT" in formatted_prompt

if __name__ == "__main__":
    asyncio.run(test_mcp_registry_and_execution())
