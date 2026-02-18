"""Tasks CRUD endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from memory.structured.models import Task, TaskStatus, TaskPriority
from protogrid import make_response
from beanie import PydanticObjectId

router = APIRouter()

class TaskCreate(BaseModel):
    project_id: str
    title: str
    description: str = ""
    priority: str = "medium"

class TaskOut(BaseModel):
    id: str
    project_id: str
    title: str
    status: str
    priority: str

    class Config:
        from_attributes = True

@router.get("/tasks/{project_id}")
async def list_tasks(project_id: str):
    try:
        tasks = await Task.find(Task.project_id == project_id).to_list()
        return make_response(
            payload = tasks,
            status = 200,
            message = "Tasks list retrieved successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "task list retrieval failed"
        )

@router.post("/tasks")
async def create_task(data: TaskCreate):
    try:
        task = Task(**data.model_dump())
        await task.insert()
        return make_response(
            payload = task,
            status = 200,
            message = "Task created successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "task creation failed"
        )

@router.patch("/tasks/{task_id}/status")
async def update_task_status(task_id: PydanticObjectId, status: str):
    try:
        task = await Task.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task.status = TaskStatus(status)
        await task.save()
        
        return make_response(
            payload = {"success": True},
            status = 200,
            message = "Task status updated successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "task status update failed"
        )
