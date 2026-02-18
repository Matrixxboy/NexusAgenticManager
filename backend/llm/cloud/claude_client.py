from typing import Optional
from loguru import logger
from config import settings
from openai import AsyncOpenAI

class ClaudeClient:
    def __init__(self):
        self.model = settings.claude_model
        self.api_key = settings.openrouter_api_key
        self.base_url = "https://openrouter.ai/api/v1"

    async def chat(self, prompt: str, system: Optional[str] = None, model: Optional[str] = None) -> str:
        """Single turn chat via OpenRouter API."""
        client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        # Use the passed model, or fall back to the default configured model
        target_model = model if model else self.model

        response = await client.chat.completions.create(
            model=target_model,
            messages=messages,
            extra_headers={
                "HTTP-Referer": settings.site_url, 
                "X-Title": settings.site_name,
            }
        )
        return response.choices[0].message.content

    def is_configured(self) -> bool:
        return bool(self.api_key and "sk-or-" in self.api_key)

claude_client = ClaudeClient()