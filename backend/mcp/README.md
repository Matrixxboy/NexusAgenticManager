# Model Context Protocol (MCP)

The MCP framework standardizes how agents interact with data (Context) and perform actions (Tools).

## Structure

### 1. Modules (`mcp/modules/`)

**Passive Context Providers.**

- Used to _read_ data from the system.
- Agents use these to understand the current state (e.g., "What are my active projects?", "What time is it?").
- Inherit from `BaseModuleContext`.

### 2. Tools (`mcp/tools/`)

**Active Action Executors.**

- Used to _change_ the state of the system.
- Agents use these to perform tasks (e.g., "Create a project", "Update task status").
- Inherit from `BaseTool`.
- Must handle their own parameters and validation.

### 3. Registry (`mcp/registry.py`)

**Central Management.**

- Registers all available modules and tools.
- Provides a unified interface for agents to retrieve tools or context.

## Usage

### Importing

```python
from mcp import MCPRegistry
from mcp.tools import ProjectsTool
from mcp.modules import TimeContext
```

### Registration (in Orchestrator)

```python
MCPRegistry.register_tool(ProjectsTool())
MCPRegistry.register_module(TimeContext())
```

### consumption (in Agents)

```python
# Get Context
context = await MCPRegistry.get_context("time")

# Execute Tool
tool = MCPRegistry.get_tool("projects")
result = await tool.run("create", name="New App")
```
