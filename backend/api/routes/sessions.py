"""Sessions CRUD endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from memory.structured.models import Session
from protogrid import make_response
from beanie import PydanticObjectId

router = APIRouter()

class SessionOut(BaseModel):
    id: str
    session_id: str
    agent_name: str
    messages: List[dict]
    created_at: str
    last_active: str

    class Config:
        from_attributes = True

class SessionUpdate(BaseModel):
    title: Optional[str] = None # In case we add title later
    agent_name: Optional[str] = None


@router.get("/sessions")
async def list_sessions():
    try:
        # Sort by last_active descending
        sessions = await Session.find_all().sort("-last_active").to_list()
        return make_response(
            payload = sessions,
            status = 200,
            message = "Sessions list retrieved successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "session list retrieval failed"
        )

@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session by custom session_id (UUID), not MongoDB _id"""
    try:
        session = await Session.find_one(Session.session_id == session_id)
        if not session:
            # Try searching by _id if uuid fails
            try:
                if PydanticObjectId.is_valid(session_id):
                     session = await Session.get(PydanticObjectId(session_id))
            except:
                pass
        
        if not session:
             raise HTTPException(status_code=404, detail="Session not found")

        return make_response(
            payload = session,
            status = 200,
            message = "Session retrieved successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "session retrieval failed"
        )

@router.post("/sessions")
async def create_session(data: dict):
    # Usually created via chat, but manual creation endpoint provided
    try:
        import uuid
        session_id = data.get("session_id") or str(uuid.uuid4())
        agent_name = data.get("agent_name", "NEXUS")
        
        session = Session(session_id=session_id, agent_name=agent_name)
        await session.insert()
        
        return make_response(
            payload = session,
            status = 200,
            message = "Session created successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "session creation failed"
        )

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    try:
        # Try finding by session_id first
        session = await Session.find_one(Session.session_id == session_id)
        
        # Then by _id
        if not session and PydanticObjectId.is_valid(session_id):
            session = await Session.get(PydanticObjectId(session_id))

        if not session:
             raise HTTPException(status_code=404, detail="Session not found")

        await session.delete()
        return make_response(
            payload = {"success": True},
            status = 200,
            message = "Session deleted successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "session deletion failed"
        )
