from typing import Any, Dict, List, Optional
from mcp.base import BaseTool
from memory.structured.models import Task, TaskStatus, Project, TaskPriority
from loguru import logger
from beanie import PydanticObjectId
import re

class TasksTool(BaseTool):
    @property
    def name(self) -> str:
        return "tasks"

    @property
    def description(self) -> str:
        return "Manage tasks: create, update, list. Handles project resolution."

    async def run(self, action: str, **kwargs) -> Dict[str, Any]:
        """
        Actions:
        - create: {project_name, title, description, priority}
        - update_status: {task_id OR title, status}
        - list: {project_name}
        """
        if action == "create":
            return await self._create_task(
                kwargs.get("project_name", "General"),
                kwargs.get("title"),
                kwargs.get("description", ""),
                kwargs.get("priority", "medium")
            )
        elif action == "update_status":
            return await self._update_status(
                kwargs.get("task_id"),
                kwargs.get("title"),
                kwargs.get("status")
            )
        elif action == "update_all":
            return await self._update_all(
                kwargs.get("project_name"),
                kwargs.get("status")
            )
        elif action == "list":
            return await self._list_tasks(kwargs.get("project_name"))
        else:
            return {"success": False, "output": f"Unknown action: {action}"}

    async def _resolve_project(self, name: str) -> Optional[Project]:
        # Exact
        proj = await Project.find_one(Project.name == name)
        if proj: return proj
        
        # Case-insensitive
        proj = await Project.find_one({"name": {"$regex":f"^{re.escape(name)}$", "$options": "i"}})
        if proj: return proj
        
        # 'General' fallback creation? No, let's return None and handle logic
        return None

    async def _update_all(self, project_name: Optional[str], status: str) -> Dict[str, Any]:
        try:
            # Map status
            s_map = {"todo": TaskStatus.TODO, "in_progress": TaskStatus.IN_PROGRESS, "done": TaskStatus.DONE, "blocked": TaskStatus.BLOCKED}
            s_val = s_map.get(status.lower())
            if not s_val:
                return {"success": False, "output": f"Invalid status: {status}"}
            
            query = {}
            if project_name:
                project = await self._resolve_project(project_name)
                if project:
                    query[Task.project_id] = str(project.id)
            
            # If setting to done, maybe exclude already done? 
            if s_val == TaskStatus.DONE:
                query[Task.status] = {"$ne": TaskStatus.DONE}

            tasks_to_update = await Task.find(query).to_list()
            if not tasks_to_update:
                return {"success": False, "output": "No tasks found to update."}

            count = 0
            for t in tasks_to_update:
                t.status = s_val
                if t.status == TaskStatus.DONE:
                    from datetime import datetime
                    t.completed_at = datetime.utcnow()
                await t.save()
                count += 1
            
            return {"success": True, "output": f"Bulk updated {count} tasks to '{status}'."}

        except Exception as e:
            logger.error(f"Bulk update error: {e}")
            return {"success": False, "output": str(e)}


    async def _create_task(self, project_name: str, title: str, description: str, priority: str) -> Dict[str, Any]:
        try:
            if not title:
                return {"success": False, "output": "Task title required."}

            project = await self._resolve_project(project_name)
            if not project:
                # Auto-create 'General' if missing? Or error?
                # Let's error to be safe, or auto-create if it is 'General'
                if project_name.lower() == "general":
                    project = Project(name="General", description="Default project")
                    await project.insert()
                else:
                    return {"success": False, "output": f"Project '{project_name}' not found."}

            # Map priority
            p_map = {"low": TaskPriority.LOW, "medium": TaskPriority.MEDIUM, "high": TaskPriority.HIGH, "critical": TaskPriority.CRITICAL}
            p_val = p_map.get(priority.lower(), TaskPriority.MEDIUM)

            task = Task(
                project_id=str(project.id),
                title=title,
                description=description,
                priority=p_val,
                status=TaskStatus.TODO
            )
            await task.insert()
            return {"success": True, "output": f"Created task '{title}' in '{project.name}'."}

        except Exception as e:
            logger.error(f"Create task error: {e}")
            return {"success": False, "output": str(e)}

    async def _update_status(self, task_id: str, title: str, status: str) -> Dict[str, Any]:
        try:
            task = None
            if task_id:
                try: task = await Task.get(PydanticObjectId(task_id))
                except: pass
            
            if not task and title:
                # Find task by title (fuzzy?)
                # Risk: multiple tasks with same title. Pick most recent Active one.
                # Regex match
                tasks = await Task.find({"title": {"$regex":f"^{re.escape(title)}$", "$options": "i"}}).sort("-created_at").to_list()
                # filter for non-done if possible, or just take first
                if tasks: task = tasks[0]

            if not task:
                return {"success": False, "output": f"Task not found."}

            # Map status
            s_map = {"todo": TaskStatus.TODO, "in_progress": TaskStatus.IN_PROGRESS, "done": TaskStatus.DONE, "blocked": TaskStatus.BLOCKED}
            s_val = s_map.get(status.lower())
            if not s_val:
                return {"success": False, "output": f"Invalid status: {status}"}

            task.status = s_val
            await task.save()
            return {"success": True, "output": f"Updated task '{task.title}' to {s_val}."}

        except Exception as e:
            logger.error(f"Update task error: {e}")
            return {"success": False, "output": str(e)}

    async def _list_tasks(self, project_name: Optional[str]) -> Dict[str, Any]:
        try:
            if project_name:
                project = await self._resolve_project(project_name)
                if not project:
                    return {"success": False, "output": f"Project '{project_name}' not found."}
                tasks = await Task.find(Task.project_id == str(project.id)).to_list()
                prefix = f"Tasks for '{project.name}':"
            else:
                # List all active tasks? Limit to 20
                tasks = await Task.find(Task.status != TaskStatus.DONE).limit(20).to_list()
                prefix = "Recent active tasks:"

            if not tasks:
                 return {"success": True, "output": f"{prefix} None found."}

            lines = [f"- [{t.status}] {t.title} ({t.priority})" for t in tasks]
            return {"success": True, "output": f"{prefix}\n" + "\n".join(lines)}

        except Exception as e:
            return {"success": False, "output": str(e)}
