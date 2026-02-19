from typing import Any, Dict, List, Optional
from mcp.base import BaseTool
from memory.structured.models import Project, ProjectStatus
from loguru import logger
from beanie import PydanticObjectId
import re

class ProjectsTool(BaseTool):
    @property
    def name(self) -> str:
        return "projects"

    @property
    def description(self) -> str:
        return "Manage projects: create, delete, list. Handles fuzzy matching for project names."

    async def run(self, action: str, **kwargs) -> Dict[str, Any]:
        """
        Actions:
        - create: {name, description}
        - delete: {project_id OR name}
        - list: {}
        """
        if action == "create":
            return await self._create_project(kwargs.get("name"), kwargs.get("description", ""))
        elif action == "delete":
            return await self._delete_project(kwargs.get("project_id"), kwargs.get("name"))
        elif action == "list":
            return await self._list_projects()
        else:
            return {"success": False, "output": f"Unknown action: {action}"}

    async def _create_project(self, name: str, description: str) -> Dict[str, Any]:
        try:
            if not name:
                return {"success": False, "output": "Project name required."}
            
            # Check for existing
            existing = await Project.find_one(Project.name == name)
            if existing:
                return {"success": False, "output": f"Project '{name}' already exists."}

            project = Project(name=name, description=description, status=ProjectStatus.ACTIVE)
            await project.insert()
            return {"success": True, "output": f"Created project '{name}'."}
        except Exception as e:
            logger.error(f"Create project error: {e}")
            return {"success": False, "output": str(e)}

    async def _delete_project(self, project_id: Optional[str] = None, name: Optional[str] = None) -> Dict[str, Any]:
        try:
            project = None
            
            # 1. Try by ID
            if project_id:
                try:
                    project = await Project.get(PydanticObjectId(project_id))
                except:
                    pass
            
            # 2. Try by Exact Name
            if not project and name:
                project = await Project.find_one(Project.name == name)
            
            # 3. Try by Case-Insensitive Name
            if not project and name:
                # Beanie doesn't support regex easily in find_one without raw query, 
                # but we can fetch all and filter if list is small, or use regex query
                # Using regex for case insensitive
                project = await Project.find_one({"name": {"$regex":f"^{re.escape(name)}$", "$options": "i"}})

            if not project:
                return {"success": False, "output": f"Project not found (searched for id='{project_id}', name='{name}')"}

            deleted_name = project.name
            await project.delete()
            return {"success": True, "output": f"Deleted project '{deleted_name}'."}

        except Exception as e:
            logger.error(f"Delete project error: {e}")
            return {"success": False, "output": str(e)}

    async def _list_projects(self) -> Dict[str, Any]:
        try:
            projects = await Project.find(Project.status == ProjectStatus.ACTIVE).to_list()
            names = [p.name for p in projects]
            return {"success": True, "output": f"Active Projects: {', '.join(names)}"}
        except Exception as e:
            return {"success": False, "output": str(e)}
