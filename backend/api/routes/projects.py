"""Projects CRUD endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from memory.structured.models import Project, ProjectStatus
from protogrid import make_response

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    github_repo: str = ""

class ProjectOut(BaseModel):
    id: str  # MongoDB inputs ID as string (Pydantic ObjectId handling)
    name: str
    description: str
    status: str
    github_repo: str

    class Config:
        from_attributes = True

@router.get("/projects")
async def list_projects():
    try:
        projects = await Project.find(Project.status == ProjectStatus.ACTIVE).to_list()
        # Convert ObjectId to string for response consistency if needed, 
        # but Beanie/Pydantic usually handles it.
        return make_response(
            payload = projects,
            status = 200,
            message = "Projects list retrieved successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "project list retrieval failed"
        )

@router.post("/projects")
async def create_project(data: ProjectCreate):
    try:
        project = Project(**data.model_dump())
        await project.insert()
        return make_response(
            payload = project,
            status = 200,
            message = "Project created successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "project creation failed"
        )
