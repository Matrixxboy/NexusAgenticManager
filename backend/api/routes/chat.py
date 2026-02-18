"""Chat endpoint — main NEXUS conversation route."""
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from agents.orchestrator import orchestrator
from protogrid import make_response

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    task_type: Optional[str] = "general"

class ChatResponse(BaseModel):
    response: str
    agent: str
    session_id: str
    success: bool

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())

    try:
        result = await orchestrator.run(
            input={"message": req.message},
            context={"session_id": session_id, "task_type": req.task_type}
        )
        return make_response(
            payload = result,
            status = 200,
            message = "Chat completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "chat failed"
        )
