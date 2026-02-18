"""Projects CRUD endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from memory.structured.models import Project, ProjectStatus
from protogrid import make_response
from beanie import PydanticObjectId

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
        return make_response(
            payload = [{**p.model_dump(mode='json'), "id": str(p.id), "_id": str(p.id)} for p in projects],
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
            payload = {**project.model_dump(mode='json'), "id": str(project.id), "_id": str(project.id)},
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


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    print(f"DELETE REQUEST: '{project_id}'")
    clean_id = project_id.strip()
    print(f"DELETE REQUEST: '{project_id}' -> '{clean_id}'")
    
    project = None
    
    # 1. Try as PydanticObjectId
    try:
        oid = PydanticObjectId(clean_id)
        project = await Project.get(oid)
    except Exception as e:
        print(f"Could not cast to ObjectId: {e}")
    
    # 2. If not found, try as raw string
    if not project:
        print("Trying to find by string ID...")
        project = await Project.find_one({"_id": clean_id})

    try:
        if not project:
            # DEBUG: Try to find ANY project to see if connection works
            count = await Project.count()
            msg = f"Project '{clean_id}' not found. Total projects: {count}. ID Type: {type(clean_id)}"
            print(msg)
            raise HTTPException(status_code=404, detail=msg)
        
        await project.delete()
        print(f"Project {project_id} deleted.")
        return make_response(
            payload = None,
            status = 200,
            message = "Project deleted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"DELETE ERROR: {e}")
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "project deletion failed"
        )
@router.get("/projects/debug/test_project")
async def debug_test_project():
    try:
        project = await Project.find_one(Project.name == "test")
        if not project:
            return {"found": False, "message": "Project 'test' not found"}
        
        return {
            "found": True,
            "name": project.name,
            "id": str(project.id),
            "id_type": str(type(project.id)),
            "dump": project.model_dump(mode='json'),
            "raw_doc": str(await Project.get_motor_collection().find_one({"name": "test"}))
        }
    except Exception as e:
        return {"error": str(e)}