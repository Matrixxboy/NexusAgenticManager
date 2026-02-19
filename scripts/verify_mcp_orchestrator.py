import sys
import os
import asyncio

# Ensure backend is in path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from agents.orchestrator.orchestrator import OrchestratorAgent
from mcp.registry import MCPRegistry

async def verify():
    print("Initializing Orchestrator...")
    orchestrator = OrchestratorAgent()
    print("Orchestrator initialized.")

    # Check Registry
    modules = MCPRegistry.get_all_modules()
    print(f"Registered Modules: {[m.name for m in modules]}")
    
    assert "projects" in [m.name for m in modules]
    assert "time" in [m.name for m in modules]
    
    model = MCPRegistry.get_model("nexus_system_prompt")
    print(f"Registered Model: {model.name}")
    assert model is not None

    print("Verification Successful!")

if __name__ == "__main__":
    try:
        asyncio.run(verify())
    except Exception as e:
        print(f"Verification Failed: {e}")
        import traceback
        traceback.print_exc()
