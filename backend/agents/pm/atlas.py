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
from config.settings import settings

person = settings.person_name
ATLAS_SYSTEM = """You are ATLAS, the Project Manager agent inside NEXUS — built for {person}.

- Strategic not just executional
- You know his active projects: {projects}

{person}'s working hours: 9AM-6:30PM IST. Weekends: no work.
His risk: starting too many parallel projects. Call this out when it happens.

Your job:
- Break goals into concrete, completable tasks and CREATE them in the DB
- Update task status (todo -> done) when {person} says he's finished something
- Detect and name blockers explicitly
- Give sharp 9AM briefings and 6:30PM summaries
- Push him toward shipping, not perfecting
- When he's overbuilding, say: "This is overbuilding. Finish X first."
- Format: STRICT MARKDOWN. Use headers, bolding, and lists.
- Use DONE for done, BLOCKED for blocked, WIP for in-progress
 
- Use DONE for done, BLOCKED for blocked, WIP for in-progress
 
POWER: You can CREATE and UPDATE tasks. When asked to add a task, call the create_task action. When he finishes something, call update_task.

Thinking Process:
1. Identify the user's project context (which active project?).
2. Determine if this is a query, update, or creation request.
3. Check for blockers or dependencies.
4. Execute the DB action (create/update) if needed.
"""

BRIEFING_PROMPT = """Generate {person}'s morning briefing for {date}.

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

SUMMARY_PROMPT = """Generate {person}'s evening summary for {date}.

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

TASK_BREAKDOWN_PROMPT = """Break down this goal into concrete tasks for {person}.

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
            "create_task":      self._create_task_handler,
            "update_task":      self._update_task_handler,
            "create_project":   self._create_project_handler,
            "delete_project":   self._delete_project_handler,
            "query":            self._general_query,
        }
        handler = actions.get(action, self._general_query)
        return await handler(input)

    async def _general_query(self, input: Dict) -> Dict[str, Any]:
        """Answer general questions with full project context."""
        message = input.get("message", "")
        db_context = await self.get_db_context()
        
        context_prompt = (
            f"\n\nContext:\n"
            f"Projects: {db_context.get('projects')}\n"
            f"Tasks: {db_context.get('tasks')}\n"
        )
        
        # RAG Context
        rag_context = await self.retrieve_context(message)
        if rag_context:
            context_prompt += f"\nRelevant Knowledge Base:\n{rag_context}\n"

        # Time Context
        time_context = f"\nCurrent Date/Time: {datetime.now().strftime('%A, %B %d, %Y %I:%M %p')}\n"
        
        # Format System Prompt
        projects_text = db_context.get("projects", "No active projects found.")
        system_prompt = ATLAS_SYSTEM.format(projects=projects_text, person=person) + time_context

        response = await llm_call(message + context_prompt, system=system_prompt)
        return {"output": response, "agent": "ATLAS", "success": True}
        
    async def morning_briefing(self) -> str:
        result = await self._do_morning_briefing({})
        return result["output"]

    async def _do_morning_briefing(self, input: Dict) -> Dict[str, Any]:
        date = datetime.now().strftime("%A, %B %d %Y")
        github_activity = await self._get_github_summary()
        db_context = await self.get_db_context()
        prompt = BRIEFING_PROMPT.format(
            date=date,
            project_status=db_context.get("projects", "No projects found"),
            github_activity=github_activity,
        )
        # Format System Prompt
        projects_text = db_context.get("projects", "No active projects found.")
        system_prompt = ATLAS_SYSTEM.format(projects=projects_text, person=person)

        response = await llm_call(prompt, system=system_prompt)
        await self._push_telegram(f"Morning Briefing\n\n{response}")
        return {"output": response, "agent": "ATLAS", "success": True}

    async def evening_summary(self) -> str:
        result = await self._do_evening_summary({})
        return result["output"]

    async def _do_evening_summary(self, input: Dict) -> Dict[str, Any]:
        date = datetime.now().strftime("%A, %B %d %Y")
        commits = await self._get_todays_commits()
        db_context = await self.get_db_context()
        prompt = SUMMARY_PROMPT.format(
            date=date,
            planned_tasks=db_context.get("tasks", "Not tracked today"),
            commits=commits,
        )
        # Format System Prompt
        projects_text = db_context.get("projects", "No projects found.")
        system_prompt = ATLAS_SYSTEM.format(projects=projects_text, person=person)
        
        response = await llm_call(prompt, system=system_prompt)
        await self._push_telegram(f"Evening Summary\n\n{response}")
        await self._auto_export_notion(date, response)
        return {"output": response, "agent": "ATLAS", "success": True}

    async def _break_down_goal(self, input: Dict) -> Dict[str, Any]:
        db_context = await self.get_db_context()
        project_name = input.get("project", "General")
        
        # Get tasks specifically for this project if possible
        from memory.structured.models import Project
        proj = await Project.find_one(Project.name == project_name)
        tasks_context = db_context.get("tasks", "")
        if proj:
            from core.db_context import get_tasks_context
            tasks_context = await get_tasks_context(project_id=str(proj.id))

        prompt = TASK_BREAKDOWN_PROMPT.format(
            goal=input.get("goal", input.get("message", "")),
            project=f"{project_name} (Current tasks: {tasks_context})",
            available_time=input.get("available_time", "Full workday 9AM-6:30PM"),
        )
        # Format System Prompt
        projects_text = db_context.get("projects", "No projects found.")
        system_prompt = ATLAS_SYSTEM.format(projects=projects_text, person=person)

        response = await llm_call(prompt, system=system_prompt)
        
        # Proactively offer to create these tasks
        if " [ ] " in response:
            response += "\n\nI can add these tasks to NEXUS for you. Say 'add them' or 'create all' to proceed."
            
        return {"output": response, "agent": "ATLAS", "success": True}

    async def _create_task_handler(self, input: Dict) -> Dict[str, Any]:
        """Parse LLM intent and create task using MCP Tool."""
        message = input.get("message", "")
        projects = await self.get_project_list()
        project_list_str = ", ".join([f"'{p}'" for p in projects])
        
        # Ask LLM to extract JSON for the task, enforcing existing projects
        extraction_prompt = f"""
        Extract task details from this message: '{message}'.
        
        Available Projects: [{project_list_str}]
        
        Rules:
        1. If the user mentions a project similar to one in Available Projects, USE THE EXACT NAME from the list.
        2. If no project is mentioned, use 'General'.
        3. If a NEW project is clearly requested, use that new name.
        
        Respond ONLY with a JSON LIST: [{{\"project\": \"project_name\", \"title\": \"task title\", \"description\": \"optional\", \"priority\": \"low/medium/high\"}}, ...]
        """
        json_resp = await llm_call(extraction_prompt, system="You are a data extractor. Respond ONLY with JSON.", task_type="routing")
        
        try:
            import json
            from mcp.registry import MCPRegistry
            
            # handle potential markdown code blocks
            clean_json = json_resp.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_json)
            
            if isinstance(data, dict):
                data = [data]
            
            created_tasks = []
            errors = []
            
            tool = MCPRegistry.get_tool("tasks")
            if not tool:
                 return {"output": "❌ Tasks tool not found.", "agent": "ATLAS", "success": False}

            for item in data:
                result = await tool.run(
                    "create",
                    project_name=item.get("project", "General"),
                    title=item.get("title", "New Task"),
                    description=item.get("description", ""),
                    priority=item.get("priority", "medium")
                )
                
                if result["success"]:
                    created_tasks.append(f"{item['title']} ({item.get('project')})")
                else:
                    errors.append(f"❌ Failed: {item['title']} - {result['output']}")

            output_lines = []
            if created_tasks:
                output_lines.append(f"✅ Created {len(created_tasks)} tasks:\n" + "\n".join([f"- {t}" for t in created_tasks]))
            if errors:
                output_lines.append("\n".join(errors))
                
            return {"output": "\n\n".join(output_lines), "agent": "ATLAS", "success": len(errors) == 0}

        except Exception as e:
            return {"output": f"❌ Error parsing task details: {e}", "agent": "ATLAS", "success": False}

    async def _update_task_handler(self, input: Dict) -> Dict[str, Any]:
        """Parse LLM intent and update task using MCP Tool."""
        message = input.get("message", "")
        
        # Fetch recent tasks to help fuzzy match
        ctx = await self.get_db_context()
        recent_tasks = ctx.get("tasks", "No recent tasks.")
        
        extraction_prompt = f"""
        Extract status update from: '{message}'.
        
        Recent Tasks Context:
        {recent_tasks}
        
        Rules:
        1. Match the user's description to one of the Recent Tasks if possible.
        2. Status must be one of: todo, in_progress, blocked, done.
        3. If the user wants to update ALL tasks, set "task" to "ALL".
        4. If the user specifies a project for "ALL", set "project" to that name.
        
        Respond ONLY with JSON: {{\"task\": \"task title or id OR 'ALL'\", \"status\": \"status\", \"project\": \"project_name (optional)\"}}
        """
        json_resp = await llm_call(extraction_prompt, system="You are a data extractor.", task_type="routing")
        
        try:
            import json
            from mcp.registry import MCPRegistry
            
            data = json.loads(json_resp)
            if isinstance(data, list):
                data = data[0] if data else {}

            target_task = data.get("task")
            new_status = data.get("status")
            target_project = data.get("project")
            
            tool = MCPRegistry.get_tool("tasks")
            if not tool:
                 return {"output": "❌ Tasks tool not found.", "agent": "ATLAS", "success": False}

            if target_task == "ALL":
                # BULK UPDATE via Tool
                result = await tool.run("update_all", project_name=target_project, status=new_status)
                if result["success"]:
                     return {"output": f"✅ {result['output']}", "agent": "ATLAS", "success": True}
                else:
                     return {"output": f"❌ {result['output']}", "agent": "ATLAS", "success": False}

            # SINGLE UPDATE via Tool
            # We don't have task ID usually from LLM, so we pass title
            result = await tool.run("update_status", title=target_task, status=new_status)
            
            if result["success"]:
                return {"output": f"✅ {result['output']}", "agent": "ATLAS", "success": True}
            return {"output": f"❌ Failed to update task: {result.get('output')}", "agent": "ATLAS", "success": False}

        except Exception as e:
            return {"output": f"❌ Error parsing update details: {e}", "agent": "ATLAS", "success": False}

    async def _delete_project_handler(self, input: Dict) -> Dict[str, Any]:
        """Parse LLM intent and delete project using MCP Tool."""
        message = input.get("message", "")
        # Get current project list for context
        projects = await self.get_project_list()
        project_list_str = ", ".join([f"'{p}'" for p in projects])

        extraction_prompt = f"""
        Extract the project name to DELETE from: '{message}'.
        
        Available Projects: [{project_list_str}]
        
        Respond ONLY with JSON: {{\"name\": \"Exact Project Name\"}}
        """
        json_resp = await llm_call(extraction_prompt, system="You are a data extractor.", task_type="routing")
        
        try:
            import json
            from mcp.registry import MCPRegistry
            
            data = json.loads(json_resp)
            project_name = data.get("name")
            
            # Use MCP Tool
            tool = MCPRegistry.get_tool("projects")
            if not tool:
                return {"output": "❌ Projects tool not found.", "agent": "ATLAS", "success": False}
                
            result = await tool.run("delete", name=project_name)
            
            if result["success"]:
                return {"output": f"✅ {result['output']}", "agent": "ATLAS", "success": True}
            else:
                return {"output": f"❌ {result['output']}", "agent": "ATLAS", "success": False}
            
        except Exception as e:
            return {"output": f"❌ Error deleting project: {e}", "agent": "ATLAS", "success": False}

    async def _create_project_handler(self, input: Dict) -> Dict[str, Any]:
        """Parse LLM intent and create project using MCP Tool."""
        message = input.get("message", "")
        extraction_prompt = f"Extract project details from: '{message}'. Respond ONLY with JSON: {{\"name\": \"Project Name\", \"description\": \"optional\"}}"
        json_resp = await llm_call(extraction_prompt, system="You are a data extractor.", task_type="routing")
        
        try:
            import json
            from mcp.registry import MCPRegistry
            
            data = json.loads(json_resp)
            
            # Use MCP Tool
            tool = MCPRegistry.get_tool("projects")
            if not tool:
                return {"output": "❌ Projects tool not found.", "agent": "ATLAS", "success": False}
                
            result = await tool.run("create", name=data.get("name", "New Project"), description=data.get("description", ""))
            
            if result["success"]:
                return {"output": f"✅ {result['output']}", "agent": "ATLAS", "success": True}
            else:
                return {"output": f"❌ {result['output']}", "agent": "ATLAS", "success": False}
                
        except Exception as e:
            return {"output": f"❌ Error: {e}", "agent": "ATLAS", "success": False}

    async def _detect_blockers(self, input: Dict) -> Dict[str, Any]:
        prompt = BLOCKER_DETECTION_PROMPT.format(
            tasks=input.get("tasks", "No tasks provided"),
            context=input.get("context", "No context provided"),
        )
        # Fetch DB context for projects
        db_context = await self.get_db_context()
        projects_text = db_context.get("projects", "No projects found.")
        system_prompt = ATLAS_SYSTEM.format(projects=projects_text, person=person)

        response = await llm_call(prompt, system=system_prompt)
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

    async def _get_project_status_text(self) -> str:
        from core.db_context import get_projects_context
        return await get_projects_context()

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
