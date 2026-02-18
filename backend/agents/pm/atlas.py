"""
ATLAS — Project Manager Agent (Full Version)
Handles: tasks, projects, kanban, daily briefings,
         GitHub issue sync, Notion export, blocker detection.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime
from loguru import logger
from core.base_agent import BaseAgent
from llm import llm_call

ATLAS_SYSTEM = """You are ATLAS, the Project Manager agent inside NEXUS — built for Utsav Desai.

You manage his projects with precision and honesty. You know his active projects:
- AI Palm Reading system (OpenCV + MediaPipe + Grad-CAM + segmentation)
- Vedic Astrology engine (Swiss Ephemeris + Python + Dasha system)
- Local LLM assistant (Vermeil personality + RAG)
- Voice cloning system (TTS + speaker embeddings)
- NEXUS itself (this system)
- React + Laravel + Node web projects

Utsav's working hours: 9AM-6:30PM IST. Weekends: no work.
His risk: starting too many parallel projects. Call this out when it happens.

Your job:
- Break goals into concrete, completable tasks (not vague items)
- Detect and name blockers explicitly
- Give sharp 9AM briefings and 6:30PM summaries
- Push him toward shipping, not perfecting
- When he's overbuilding, say: "This is overbuilding. Finish X first."
- Format: structured bullets, use DONE for done, BLOCKED for blocked, WIP for in-progress"""

BRIEFING_PROMPT = """Generate Utsav's morning briefing for {date}.

Active projects status:
{project_status}

GitHub activity (last 24h):
{github_activity}

Format as:
Morning Briefing — {date}

Top 3 Priorities Today:
1. [most important task]
2. [second priority]
3. [third priority]

Watch Out For:
- [blockers or risks]

Reminder:
- [one strategic reminder — keep him focused]

Be sharp. Under 200 words."""

SUMMARY_PROMPT = """Generate Utsav's evening summary for {date}.

What was planned: {planned_tasks}
GitHub commits today: {commits}

Format as:
Evening Summary — {date}

Done Today:
- [completed items]

Carries Forward:
- [unfinished items for tomorrow]

Pattern Alert:
- [any recurring issue — be honest]

Tomorrow's #1 Priority:
- [single most important thing]

Be honest, under 150 words."""

TASK_BREAKDOWN_PROMPT = """Break down this goal into concrete tasks for Utsav.

Goal: {goal}
Project: {project}
Available time: {available_time}

Rules:
- Each task completable in 1-3 hours max
- Tasks in correct dependency order
- Include testing/verification steps
- Flag tasks needing external input

Format each task: - [ ] Task title (Xh) | Priority: HIGH/MED/LOW

Max 8 tasks. If more needed, say so."""

BLOCKER_DETECTION_PROMPT = """Analyze these tasks and identify blockers.

Tasks: {tasks}
Context: {context}

Identify:
1. HARD BLOCKERS - cannot proceed
2. SOFT BLOCKERS - slowed but can continue
3. DEPENDENCIES - waiting on other tasks
4. RECOMMENDATIONS - how to unblock each"""


class ATLASAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ATLAS",
            description="Project Manager — tasks, deadlines, GitHub sync, Notion export"
        )

    async def run(self, input: Dict[str, Any], context: Optional[Dict] = None) -> Dict[str, Any]:
        message = input.get("message", "")
        action = input.get("action", "query")
        actions = {
            "morning_briefing": self._do_morning_briefing,
            "evening_summary":  self._do_evening_summary,
            "break_down_goal":  self._break_down_goal,
            "detect_blockers":  self._detect_blockers,
            "sync_github":      self._sync_github,
            "export_notion":    self._export_to_notion,
            "query":            self._general_query,
        }
        handler = actions.get(action, self._general_query)
        return await handler(input)

    async def _general_query(self, input: Dict) -> Dict[str, Any]:
        response = await llm_call(input.get("message", ""), system=ATLAS_SYSTEM)
        return {"output": response, "agent": "ATLAS", "success": True}

    async def morning_briefing(self) -> str:
        result = await self._do_morning_briefing({})
        return result["output"]

    async def _do_morning_briefing(self, input: Dict) -> Dict[str, Any]:
        date = datetime.now().strftime("%A, %B %d %Y")
        github_activity = await self._get_github_summary()
        prompt = BRIEFING_PROMPT.format(
            date=date,
            project_status=self._get_project_status_text(),
            github_activity=github_activity,
        )
        response = await llm_call(prompt, system=ATLAS_SYSTEM)
        await self._push_telegram(f"Morning Briefing\n\n{response}")
        return {"output": response, "agent": "ATLAS", "success": True}

    async def evening_summary(self) -> str:
        result = await self._do_evening_summary({})
        return result["output"]

    async def _do_evening_summary(self, input: Dict) -> Dict[str, Any]:
        date = datetime.now().strftime("%A, %B %d %Y")
        commits = await self._get_todays_commits()
        prompt = SUMMARY_PROMPT.format(
            date=date,
            planned_tasks=input.get("planned_tasks", "Not tracked today"),
            commits=commits,
        )
        response = await llm_call(prompt, system=ATLAS_SYSTEM)
        await self._push_telegram(f"Evening Summary\n\n{response}")
        await self._auto_export_notion(date, response)
        return {"output": response, "agent": "ATLAS", "success": True}

    async def _break_down_goal(self, input: Dict) -> Dict[str, Any]:
        prompt = TASK_BREAKDOWN_PROMPT.format(
            goal=input.get("goal", input.get("message", "")),
            project=input.get("project", "General"),
            available_time=input.get("available_time", "Full workday 9AM-6:30PM"),
        )
        response = await llm_call(prompt, system=ATLAS_SYSTEM)
        return {"output": response, "agent": "ATLAS", "success": True}

    async def _detect_blockers(self, input: Dict) -> Dict[str, Any]:
        prompt = BLOCKER_DETECTION_PROMPT.format(
            tasks=input.get("tasks", "No tasks provided"),
            context=input.get("context", "No context provided"),
        )
        response = await llm_call(prompt, system=ATLAS_SYSTEM)
        return {"output": response, "agent": "ATLAS", "success": True}

    async def _sync_github(self, input: Dict) -> Dict[str, Any]:
        try:
            from integrations.github import github_client
            if not github_client.is_configured():
                return {"output": "GitHub not configured. Set GITHUB_TOKEN in .env", "agent": "ATLAS", "success": False}
            repo = input.get("repo", "")
            if not repo:
                repos = await github_client.list_repos(limit=10)
                repo_list = "\n".join([f"- {r['name']} ({r['open_issues']} issues)" for r in repos])
                return {"output": f"Your repos:\n{repo_list}\n\nSpecify a repo to sync.", "agent": "ATLAS", "success": True}
            summary = await github_client.get_project_summary(repo)
            output = f"{summary['name']} — {summary.get('description', '')}\n"
            output += f"Open issues: {summary['open_issues']} | Commits: {summary['recent_commits']}\n"
            if summary.get("issues"):
                output += "\nTop Issues:\n"
                for issue in summary["issues"][:5]:
                    output += f"- #{issue['number']}: {issue['title']}\n"
            return {"output": output, "agent": "ATLAS", "success": True}
        except Exception as e:
            return {"output": f"GitHub sync error: {e}", "agent": "ATLAS", "success": False}

    async def _export_to_notion(self, input: Dict) -> Dict[str, Any]:
        try:
            from integrations.notion import notion_client
            if not notion_client.is_configured():
                return {"output": "Notion not configured. Set NOTION_API_KEY in .env", "agent": "ATLAS", "success": False}
            database_id = input.get("database_id", "")
            if not database_id:
                return {"output": "Provide notion database_id to export.", "agent": "ATLAS", "success": False}
            date = datetime.now().date().isoformat()
            result = await notion_client.create_daily_log(
                date=date,
                morning_briefing=input.get("morning_briefing", ""),
                evening_summary=input.get("evening_summary", ""),
                tasks_completed=input.get("tasks_completed", 0),
                database_id=database_id,
            )
            if result["success"]:
                return {"output": f"Exported to Notion: {result.get('url', '')}", "agent": "ATLAS", "success": True}
            return {"output": f"Notion export failed: {result.get('error')}", "agent": "ATLAS", "success": False}
        except Exception as e:
            return {"output": f"Notion export error: {e}", "agent": "ATLAS", "success": False}

    def _get_project_status_text(self) -> str:
        return """- AI Palm Reading: In progress (segmentation phase)
- Vedic Astrology Engine: In progress (Dasha calculation)
- Local LLM / Vermeil: Active (NEXUS is live)
- Voice Cloning: Paused
- NEXUS: Active development"""

    async def _get_github_summary(self) -> str:
        try:
            from integrations.github import github_client
            if not github_client.is_configured():
                return "GitHub not configured"
            repos = await github_client.list_repos(limit=5)
            return "\n".join([f"- {r['name']}: {r['open_issues']} open issues" for r in repos])
        except Exception:
            return "GitHub unavailable"

    async def _get_todays_commits(self) -> str:
        try:
            from integrations.github import github_client
            if not github_client.is_configured():
                return "GitHub not configured"
            repos = await github_client.list_repos(limit=5)
            commits = []
            for repo in repos[:3]:
                c = await github_client.get_recent_commits(repo["name"], days=1)
                commits.extend([f"[{repo['name']}] {x['message']}" for x in c[:2]])
            return "\n".join(commits) if commits else "No commits today"
        except Exception:
            return "GitHub unavailable"

    async def _push_telegram(self, message: str) -> None:
        try:
            from integrations.telegram import telegram_bot
            if telegram_bot.is_configured():
                await telegram_bot.push_message(message)
        except Exception as e:
            logger.warning(f"Telegram push failed: {e}")

    async def _auto_export_notion(self, date: str, summary: str) -> None:
        try:
            from integrations.notion import notion_client
            from config import settings
            db_id = getattr(settings, "notion_daily_log_db", "")
            if notion_client.is_configured() and db_id:
                await notion_client.create_daily_log(
                    date=date, morning_briefing="",
                    evening_summary=summary, tasks_completed=0,
                    database_id=db_id,
                )
        except Exception as e:
            logger.warning(f"Auto Notion export failed: {e}")


atlas = ATLASAgent()
