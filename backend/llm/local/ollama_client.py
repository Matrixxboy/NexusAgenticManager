"""Local Ollama LLM client."""
import httpx
from typing import AsyncGenerator, Optional
from loguru import logger
from config import settings

class OllamaClient:
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model

    async def chat(self, prompt: str, system: Optional[str] = None) -> str:
        """Single turn chat with local Ollama model."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=120.0) as client:
            logger.info(f"Ollama Request: {self.base_url}/api/chat | model={self.model}")
            try:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={"model": self.model, "messages": messages, "stream": False},
                )
                response.raise_for_status()
                data = response.json()
                logger.info("Ollama Response received")
                return data["message"]["content"]
            except Exception as e:
                logger.error(f"Ollama Error: {e}")
                raise e

    async def stream_chat(self, prompt: str, system: Optional[str] = None) -> AsyncGenerator[str, None]:
        """Streaming chat with local Ollama model."""
        import json
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={"model": self.model, "messages": messages, "stream": True},
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        if not chunk.get("done"):
                            yield chunk["message"]["content"]

    async def is_available(self) -> bool:
        """Health check — is Ollama running?"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

ollama_client = OllamaClient()
