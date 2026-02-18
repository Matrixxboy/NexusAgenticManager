"""
Notion Integration — NEXUS
Used to export ATLAS daily summaries and ORACLE research notes.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime
from loguru import logger
from config import settings


class NotionClient:
    """
    Wrapper around notion-client for NEXUS.
    Pushes daily logs, research notes, and project summaries to Notion.
    """

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not settings.notion_api_key:
                raise RuntimeError("NOTION_API_KEY not set in .env")
            from notion_client import Client
            self._client = Client(auth=settings.notion_api_key)
            logger.info("Notion client initialized")
        return self._client

    # ── Daily Log ──────────────────────────────────────────────────
    async def create_daily_log(
        self,
        date: str,
        morning_briefing: str,
        evening_summary: str,
        tasks_completed: int,
        database_id: str,
    ) -> Dict[str, Any]:
        """Create a daily log entry in a Notion database."""
        client = self._get_client()
        try:
            page = client.pages.create(
                parent={"database_id": database_id},
                properties={
                    "Name": {"title": [{"text": {"content": f"Daily Log — {date}"}}]},
                    "Date": {"date": {"start": date}},
                    "Tasks Completed": {"number": tasks_completed},
                    "Status": {"select": {"name": "Done"}},
                },
                children=[
                    self._heading("☀️ Morning Briefing"),
                    self._paragraph(morning_briefing),
                    self._divider(),
                    self._heading("🌆 Evening Summary"),
                    self._paragraph(evening_summary),
                ],
            )
            logger.info(f"Notion daily log created: {date}")
            return {"success": True, "page_id": page["id"], "url": page["url"]}
        except Exception as e:
            logger.error(f"Notion create_daily_log error: {e}")
            return {"success": False, "error": str(e)}

    # ── Research Notes ─────────────────────────────────────────────
    async def create_research_note(
        self,
        title: str,
        summary: str,
        source: str,
        tags: List[str],
        database_id: str,
    ) -> Dict[str, Any]:
        """Save an ORACLE research summary to Notion."""
        client = self._get_client()
        try:
            page = client.pages.create(
                parent={"database_id": database_id},
                properties={
                    "Name": {"title": [{"text": {"content": title}}]},
                    "Source": {"url": source} if source.startswith("http") else {"rich_text": [{"text": {"content": source}}]},
                    "Tags": {"multi_select": [{"name": t} for t in tags]},
                    "Date Added": {"date": {"start": datetime.utcnow().date().isoformat()}},
                },
                children=[
                    self._heading("📝 Summary"),
                    self._paragraph(summary),
                    self._heading("🔗 Source"),
                    self._paragraph(source),
                ],
            )
            logger.info(f"Notion research note created: {title}")
            return {"success": True, "page_id": page["id"], "url": page["url"]}
        except Exception as e:
            logger.error(f"Notion create_research_note error: {e}")
            return {"success": False, "error": str(e)}

    # ── Project Update ─────────────────────────────────────────────
    async def update_project_page(
        self,
        page_id: str,
        update_text: str,
    ) -> Dict[str, Any]:
        """Append an update block to an existing project page."""
        client = self._get_client()
        try:
            timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            client.blocks.children.append(
                block_id=page_id,
                children=[
                    self._heading(f"Update — {timestamp}", level=3),
                    self._paragraph(update_text),
                    self._divider(),
                ],
            )
            return {"success": True}
        except Exception as e:
            logger.error(f"Notion update_project_page error: {e}")
            return {"success": False, "error": str(e)}

    # ── Search ─────────────────────────────────────────────────────
    async def search_pages(self, query: str, limit: int = 5) -> List[Dict]:
        """Search Notion workspace."""
        client = self._get_client()
        try:
            results = client.search(query=query, page_size=limit)
            pages = []
            for r in results["results"]:
                title = "Untitled"
                if r.get("properties", {}).get("Name", {}).get("title"):
                    title = r["properties"]["Name"]["title"][0]["text"]["content"]
                pages.append({
                    "id": r["id"],
                    "title": title,
                    "url": r.get("url", ""),
                    "type": r["object"],
                })
            return pages
        except Exception as e:
            logger.error(f"Notion search error: {e}")
            return []

    # ── Block helpers ──────────────────────────────────────────────
    def _heading(self, text: str, level: int = 2) -> Dict:
        tag = f"heading_{level}"
        return {
            "object": "block",
            "type": tag,
            tag: {"rich_text": [{"type": "text", "text": {"content": text}}]},
        }

    def _paragraph(self, text: str) -> Dict:
        # Notion has 2000 char limit per text block
        return {
            "object": "block",
            "type": "paragraph",
            "paragraph": {"rich_text": [{"type": "text", "text": {"content": text[:2000]}}]},
        }

    def _divider(self) -> Dict:
        return {"object": "block", "type": "divider", "divider": {}}

    def is_configured(self) -> bool:
        return bool(settings.notion_api_key)


notion_client = NotionClient()
