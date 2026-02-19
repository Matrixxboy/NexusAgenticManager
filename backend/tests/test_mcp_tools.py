import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from mcp.tools.projects import ProjectsTool
from mcp.tools.tasks import TasksTool
from memory.structured.models import Project, Task, TaskStatus

@pytest.mark.asyncio
async def test_projects_tool_crud():
    tool = ProjectsTool()
    
    # 1. Create
    res = await tool.run("create", name="TestProject123", description="A test project")
    assert res["success"] is True
    assert "Created project 'TestProject123'" in res["output"]
    
    # Verify in DB
    proj = await Project.find_one(Project.name == "TestProject123")
    assert proj is not None

    # 2. Duplicate Create (should fail)
    res = await tool.run("create", name="TestProject123")
    assert res["success"] is False

    # 3. List
    res = await tool.run("list")
    assert "TestProject123" in res["output"]

    # 4. Fuzzy Delete (case insensitive)
    # create another one with weird case
    await tool.run("create", name="FuzzyProject")
    
    res = await tool.run("delete", name="fuzzyproject") # lowercase
    assert res["success"] is True
    assert "Deleted project 'FuzzyProject'" in res["output"]
    
    # Verify it's gone
    proj = await Project.find_one(Project.name == "FuzzyProject")
    assert proj is None

    # Cleanup
    await tool.run("delete", name="TestProject123")

@pytest.mark.asyncio
async def test_tasks_tool_crud():
    p_tool = ProjectsTool()
    t_tool = TasksTool()
    
    # Setup project
    await p_tool.run("create", name="TaskProject")
    
    # 1. Create Task
    res = await t_tool.run("create", project_name="TaskProject", title="Task 1", priority="high")
    assert res["success"] is True
    
    # 2. List Tasks
    res = await t_tool.run("list", project_name="TaskProject")
    assert "Task 1" in res["output"]
    
    # 3. Update Status
    res = await t_tool.run("update_status", title="Task 1", status="in_progress")
    assert res["success"] is True
    
    # Verify
    task = await Task.find_one(Task.title == "Task 1")
    assert task.status == TaskStatus.IN_PROGRESS
    
    # 4. Bulk Update
    await t_tool.run("create", project_name="TaskProject", title="Task 2")
    res = await t_tool.run("update_all", project_name="TaskProject", status="done")
    assert res["success"] is True
    assert "Bulk updated" in res["output"]
    
    # Verify both are done
    tasks = await Task.find(Task.status == TaskStatus.DONE).to_list()
    titles = [t.title for t in tasks]
    assert "Task 1" in titles
    assert "Task 2" in titles

    # Cleanup
    await p_tool.run("delete", name="TaskProject")
    await Task.find(Task.title == "Task 1").delete()
    await Task.find(Task.title == "Task 2").delete()
