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
            payload = [{**t.model_dump(mode='json'), "id": str(t.id), "_id": str(t.id)} for t in tasks],
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
            payload = {**task.model_dump(mode='json'), "id": str(task.id), "_id": str(task.id)},
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

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None

@router.patch("/tasks/{task_id}")
async def update_task(task_id: PydanticObjectId, data: TaskUpdate):
    try:
        task = await Task.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        updated = False
        if data.title is not None:
            task.title = data.title
            updated = True
        if data.description is not None:
            task.description = data.description
            updated = True
        if data.priority is not None:
            task.priority = data.priority
            updated = True
            
        if updated:
            await task.save()
        
        return make_response(
            payload = {**task.model_dump(mode='json'), "id": str(task.id), "_id": str(task.id)},
            status = 200,
            message = "Task updated successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "task update failed"
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

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: PydanticObjectId):
    try:
        task = await Task.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        await task.delete()
        return make_response(
            payload = None,
            status = 200,
            message = "Task deleted successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "task deletion failed"
        )
