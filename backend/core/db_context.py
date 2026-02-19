"""Database context utilities for NEXUS agents."""
from typing import List, Dict, Any
from memory.structured.models import Project, Task, CareerGoal, ProjectStatus, TaskStatus
from loguru import logger

async def get_projects_context(limit: int = 10) -> str:
    """Get summarized status of active projects."""
    try:
        projects = await Project.find(Project.status == ProjectStatus.ACTIVE).limit(limit).to_list()
        if not projects:
            return "No active projects found."
        
        lines = []
        for p in projects:
            lines.append(f"- {p.name}: {p.description or 'No description'}")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Error fetching projects context: {e}")
        return "Error fetching projects."

async def get_project_list() -> List[str]:
    """Get list of active project names."""
    try:
        projects = await Project.find(Project.status == ProjectStatus.ACTIVE).to_list()
        return [p.name for p in projects]
    except Exception as e:
        logger.error(f"Error fetching project list: {e}")
        return []

async def get_tasks_context(project_id: str = None, limit: int = 20) -> str:
    """Get summarized list of pending tasks."""
    try:
        query = Task.status != TaskStatus.DONE
        if project_id:
            query = query & (Task.project_id == project_id)
            
        tasks = await Task.find(query).sort("-priority").limit(limit).to_list()
        if not tasks:
            return "No pending tasks."
        
        lines = []
        for t in tasks:
            lines.append(f"- [{t.status}] {t.title} (Priority: {t.priority})")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Error fetching tasks context: {e}")
        return "Error fetching tasks."

async def get_career_goals_context() -> str:
    """Get active career goals and progress."""
    try:
        goals = await CareerGoal.find(CareerGoal.is_active == True).to_list()
        if not goals:
            return "No active career goals."
        
        lines = []
        for g in goals:
            lines.append(f"- {g.title}: {g.progress_notes or 'No notes'}")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Error fetching career context: {e}")
        return "Error fetching career goals."

async def get_combined_context() -> Dict[str, str]:
    """Get a full snapshot of the system state for agent context."""
    return {
        "projects": await get_projects_context(),
        "tasks": await get_tasks_context(),
        "career_goals": await get_career_goals_context(),
    }

# ─── WRITE UTILITIES ──────────────────────────────────────────

async def create_task(project_name: str, title: str, description: str = "", priority: str = "medium") -> Dict[str, Any]:
    """Create a new task in a project."""
    try:
        from memory.structured.models import Task, Project, TaskPriority
        proj = await Project.find_one(Project.name == project_name)
        if not proj:
            return {"success": False, "error": f"Project '{project_name}' not found."}
        
        task = Task(
            project_id=str(proj.id),
            title=title,
            description=description,
            priority=getattr(TaskPriority, priority.upper(), TaskPriority.MEDIUM)
        )
        await task.insert()
        return {"success": True, "task_id": str(task.id)}
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        return {"success": False, "error": str(e)}

async def update_task_status(task_id_or_title: str, status: str) -> Dict[str, Any]:
    """Update task status by ID or Title."""
    try:
        from memory.structured.models import Task, TaskStatus
        # Try finding by ID first
        task = await Task.get(task_id_or_title)
        if not task:
            task = await Task.find_one(Task.title == task_id_or_title)
        
        if not task:
            return {"success": False, "error": f"Task '{task_id_or_title}' not found."}
        
        task.status = getattr(TaskStatus, status.upper(), TaskStatus.TODO)
        if task.status == TaskStatus.DONE:
            from datetime import datetime
            task.completed_at = datetime.utcnow()
            
        await task.save()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def create_project(name: str, description: str = "") -> Dict[str, Any]:
    """Create a new project."""
    try:
        from memory.structured.models import Project, ProjectStatus
        existing = await Project.find_one(Project.name == name)
        if existing:
            return {"success": False, "error": f"Project '{name}' already exists."}
            
        project = Project(
            name=name,
            description=description,
            status=ProjectStatus.ACTIVE
        )
        await project.insert()
        return {"success": True, "project_id": str(project.id)}
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        return {"success": False, "error": str(e)}
