"""Chat endpoint — main NEXUS conversation route."""
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from agents.orchestrator import orchestrator
from protogrid import make_response

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    task_type: Optional[str] = "general"

class ChatPayload(BaseModel):
    response: str
    agent: str
    session_id: str
class ChatResponse(BaseModel):
    success: bool
    message: str
    http_code: int
    payload: Optional[ChatPayload] = None
    error: Optional[Any] = None
    meta: Optional[Any] = None
    pagination: Optional[Any] = None

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        session_id = req.session_id or str(uuid.uuid4())
        result = await orchestrator.run(
            input={"message": req.message},
            context={"session_id": session_id, "task_type": req.task_type}
        )
        # Construct payload matching ChatPayload model
        payload = {
            "response": result.get("output", ""),
            "agent": result.get("agent", "NEXUS"),
            "session_id": session_id
        }
        
        return make_response(
            payload = payload,
            status = 200,
            message = "Chat completed successfully",
            include_meta=False
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "chat failed"
        )
