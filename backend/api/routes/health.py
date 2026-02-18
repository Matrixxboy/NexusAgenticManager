from fastapi import APIRouter
from llm.local import ollama_client
from protogrid import make_response

router = APIRouter()

@router.get("/health")
async def health():
    try:
        ollama_ok = await ollama_client.is_available()
        return make_response(
            payload = {
                "status": "ok",
                "nexus": "online",
                "ollama": "connected" if ollama_ok else "disconnected",
            },
            status = 200,
            message = "Health check completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "health check failed"
        )
