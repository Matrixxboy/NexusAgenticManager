"""
NEXUS CORE — Master Orchestrator Agent
Routes requests to all 5 specialized agents.
Maintains conversation state and Vermeil personality layer.
"""
from typing import Any, Dict, Optional, Literal
from loguru import logger
from core.base_agent import BaseAgent
from llm import llm_call
from datetime import datetime
from memory.structured.models import Session
from beanie import PydanticObjectId
from config.settings import settings
from mcp.registry import MCPRegistry
from mcp.modules import ProjectsContext, TimeContext
from mcp.models import NexusModelContext

person = settings.person_name



AgentName = Literal["ATLAS", "ORACLE", "COMPASS", "FORGE", "SELF"]

ROUTING_PROMPT = """
You are the routing layer for NEXUS.

Your job is to classify the user message to EXACTLY ONE agent.

Message:
"{message}"

────────────────────────────
AGENT DEFINITIONS
────────────────────────────

ATLAS
- Task creation, updating, completion
- Project creation
- Deadlines, scheduling
- Daily briefings
- Blockers
- GitHub sync
- Notion/Kanban
- Operational tracking

ORACLE
- Research papers
- Learning paths
- Study plans
- Knowledge ingestion
- Documentation analysis
- Summaries
- RAG / knowledge base

COMPASS
- Career strategy
- Job analysis
- Resume/CV
- Skill gaps
- Salary positioning
- Growth roadmap
- Professional branding

FORGE
- Code debugging
- Errors / exceptions
- Architecture design
- Refactoring
- Tech comparisons
- Boilerplate generation
- Code review

SELF
- Greetings
- Philosophy
- System questions
- Casual talk
- Meta questions about NEXUS

────────────────────────────
CRITICAL DECISION RULES
────────────────────────────

1. If user says CREATE / ADD / UPDATE task or project → ATLAS
2. If message includes error, traceback, bug → FORGE
3. If message includes resume, CV, job, skills → COMPASS
4. If message asks to summarize, research, learn → ORACLE
5. If message mixes career + tasks → prioritize COMPASS
6. If message mixes code + project tracking → prioritize FORGE
7. If unclear but execution-related → ATLAS
8. If none apply → SELF

────────────────────────────
OUTPUT RULE
────────────────────────────

Reply with ONLY the agent name.
No explanation.
No formatting.
No punctuation.

Valid outputs:
ATLAS
ORACLE
COMPASS
FORGE
SELF
"""



def _extract_action(message: str, agent: str) -> str:
    """
    Infer structured action intent from natural language message.
    Uses prioritized keyword groups to reduce false positives.
    """

    msg = message.lower().strip()

    def contains_any(keywords):
        return any(k in msg for k in keywords)

    
    # ATLAS – Project / Task Execution Intelligence
    
    if agent == "ATLAS":

        
        # Analytical / Query Intent
        
        if contains_any([
            "analyze", "analysis", "evaluate", "inspect",
            "what should i", "what next", "recommend",
            "which task", "suggest task",
            "show me", "display", "list",
            "status of", "progress of",
            "overview", "summary of project",
            "current state"
        ]):
            return "query"

        
        # Project Creation & Deletion
        
        if contains_any([
            "create project", "start a project",
            "start new project", "initialize project",
            "kickoff project", "launch project",
            "new project for", "setup project",
            "add project"
        ]):
            return "create_project"

        if contains_any([
            "delete project", "remove project",
            "kill project", "destroy project",
            "archive project"
        ]):
            return "delete_project"

        
        # Goal Breakdown
        
        if contains_any([
            "break down goal", "break this down",
            "split into tasks", "divide into steps",
            "decompose goal", "convert to tasks",
            "create subtasks from",
            "expand this goal"
        ]):
            return "break_down_goal"

        
        # Task Creation
        
        if contains_any([
            "create task", "add task",
            "new task", "add todo",
            "create todo", "add subtask",
            "log task", "register task",
            "plan task", "schedule task"
        ]):
            return "create_task"

        # Generic fallback (only if no project context)
        if contains_any(["create", "add", "make", "new "]):
            return "create_task"

        
        # Task Updates & Bulk Completion
        
        if contains_any([
            "update task", "edit task",
            "modify task", "change task",
            "mark complete", "mark done",
            "set status", "change status",
            "complete task", "finish task",
            "close task", "reopen task",
            "archive task",
            "all done", "everything done",
            "mark all", "complete all",
            "finish all"
        ]):
            return "update_task"

        
        # Blockers Detection
        
        if contains_any([
            "blocked", "blocker", "i am stuck",
            "cannot proceed", "not progressing",
            "dependency issue", "waiting on",
            "delayed due to", "issue blocking"
        ]):
            return "detect_blockers"

        
        # GitHub Sync
        
        if contains_any([
            "github", "repository", "repo",
            "sync repo", "pull commits",
            "push updates", "commit history",
            "open issue", "create issue",
            "linked issue", "pr ", "pull request"
        ]):
            return "sync_github"


    
    # ORACLE – Knowledge & Learning Intelligence
    
    if agent == "ORACLE":

        if contains_any(["learning path", "learning roadmap",
            "study plan", "how to learn",
            "guide me", "curriculum",
            "roadmap", "step by step learning",
            "structured learning", "training plan"
        ]):
            return "learning_path"

        if contains_any([
            "summarize", "summary of",
            "tldr", "brief this",
            "condense", "short version",
            "key points", "extract highlights"
        ]):
            return "summarize"

        if contains_any([
            "save this", "remember this",
            "store this", "add to knowledge",
            "ingest", "record this",
            "learn this", "add to memory"
        ]):
            return "ingest"


    
    # COMPASS – Career & Growth Intelligence
    
    if agent == "COMPASS":

        if contains_any([
            "skill gap", "missing skills",
            "what skills do i need",
            "required skills", "competency gap",
            "skills analysis"
        ]):
            return "skill_gap"

        if contains_any([
            "weekly check", "weekly review",
            "progress review", "check in",
            "status review", "performance review",
            "self assessment"
        ]):
            return "weekly_checkin"

        if contains_any([
            "job posting", "job description",
            "jd ", "analyze job",
            "job role", "position requirement",
            "hiring requirement"
        ]):
            return "job_analysis"

        if contains_any([
            "resume review", "review my resume",
            "cv review", "improve resume",
            "optimize resume", "portfolio feedback",
            "resume analysis"
        ]):
            return "resume_review"

        if contains_any([
            "goal tracking", "track progress",
            "career goals", "long term goals",
            "milestone tracking", "goal update"
        ]):
            return "goal_tracking"


    
    # FORGE – Engineering & Code Intelligence
    
    if agent == "FORGE":

        if contains_any([
            "review this", "code review",
            "check my code", "audit code",
            "inspect this implementation",
            "feedback on code"
        ]):
            return "review"

        if contains_any([
            "error", "bug", "exception",
            "traceback", "fails", "crash",
            "not working", "unexpected behavior",
            "debug this", "fix this issue"
        ]):
            return "debug"

        if contains_any([
            "architecture", "system design",
            "design pattern", "structure this",
            "high level design", "scalable design",
            "microservices vs", "monolith vs"
        ]):
            return "architecture"

        if contains_any([
            "refactor", "clean up",
            "optimize code", "improve this code",
            "make this cleaner", "rewrite this"
        ]):
            return "refactor"

        if contains_any([
            "boilerplate", "template",
            "generate scaffold", "scaffold project",
            "starter code", "initialize structure",
            "code skeleton"
        ]):
            return "boilerplate"

        if contains_any([
            "vs ", "versus", "or ",
            "choose between", "which is better",
            "compare", "pros and cons",
            "should i use"
        ]):
            return "tech_decision"

    # Default fallback
    return "query"


class OrchestratorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="NEXUS CORE",
            description="Master orchestrator — routes to 5 specialized agents"
        )
        # Register MCP components
        from mcp.modules import ProjectsContext, TimeContext
        # MCPRegistry is likely imported at top, but if not:
        from mcp import MCPRegistry

        MCPRegistry.register_module(ProjectsContext())
        MCPRegistry.register_module(TimeContext())
        MCPRegistry.register_model(NexusModelContext())
        
        # Register MCP Tools
        from mcp.tools import ProjectsTool, TasksTool
        
        MCPRegistry.register_tool(ProjectsTool())
        MCPRegistry.register_tool(TasksTool())


    async def _route(self, message: str) -> AgentName:
        prompt = ROUTING_PROMPT.format(message=message)
        # Force cloud/OpenRouter for routing to ensure highest accuracy
        response = await llm_call(prompt, task_type="routing")
        agent = response.strip().upper().split()[0]  # handle any extra text
        valid = {"ATLAS", "ORACLE", "COMPASS", "FORGE", "SELF"}
        if agent not in valid:
            logger.warning(f"Invalid route '{agent}', defaulting to SELF")
            return "SELF"
        logger.info(f"Routed → {agent}")
        return agent

    async def run(self, input: Dict[str, Any], context: Optional[Dict] = None) -> Dict[str, Any]:
        message = input.get("message", "")
        # Inject time context
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message_with_time = f"[{current_time}] {message}"
        
        logger.info(f"Orchestrator received message: {message}")
        agent_name = await self._route(message)
        logger.info(f"Orchestrator routed to: {agent_name}")

        if agent_name == "SELF":
            # Retrieve recent history
            session_id = context.get("session_id")
            history_text = ""
            if session_id:
                try:
                    session = await Session.find_one(Session.session_id == session_id)
                    if session and session.messages:
                        # Get last 10 messages, exclude current one if already appended (unlikely here)
                        recent = session.messages[-10:]
                        for msg in recent:
                            role = msg.get("role", "unknown").upper()
                            content = msg.get("content", "")
                            history_text += f"{role}: {content}\n"
                except Exception as e:
                    logger.warning(f"Failed to fetch history: {e}")

            if not history_text:
                history_text = "No previous conversation."

            # MCP: Fetch Context & Format Prompt
            context_data = await MCPRegistry.get_global_context(["projects", "time"])
            nexus_model = MCPRegistry.get_model("nexus_system_prompt")
            
            system_prompt = nexus_model.format_context(
                context_data=context_data,
                history=history_text
            )
            
            response = await llm_call(message, system=system_prompt)
            return {"output": response, "agent": "NEXUS", "success": True}

        action = _extract_action(message, agent_name)
        agent_input = {**input, "action": action}

        agent_response = None

        logger.info(f"Executing agent: {agent_name} with input: {agent_input}")

        # ─── EXECUTION ────────────────────
        try:
            if agent_name == "ATLAS":
                from agents.pm import atlas
                agent_response = await atlas.run(agent_input, context)

            elif agent_name == "ORACLE":
                from agents.research import oracle
                agent_response = await oracle.run(agent_input, context)

            elif agent_name == "COMPASS":
                from agents.career import compass
                agent_response = await compass.run(agent_input, context)

            elif agent_name == "FORGE":
                from agents.code import forge
                agent_response = await forge.run(agent_input, context)
            
            if not agent_response:
                 agent_response = {"output": "Unknown routing error", "agent": "NEXUS", "success": False}

        except Exception as e:
            logger.error(f"Agent {agent_name} error: {e}")
            return {
                "output": f"❌ {agent_name} encountered an error: {str(e)}",
                "agent": agent_name,
                "success": False,
            }

        # ─── PERSISTENCE ──────────────────
        try:
            logger.info(f"Saving session {context.get('session_id')}...")
            # Find existing session or create new
            session_id = context.get("session_id")
            session = await Session.find_one(Session.session_id == session_id)
            
            if not session:
                session = Session(
                    session_id=session_id,
                    agent_name="NEXUS",
                    messages=[]
                )

            # Append interactions
            timestamp = datetime.utcnow().isoformat()
            
            # User message
            session.messages.append({
                "role": "user",
                "content": message,
                "timestamp": timestamp
            })

            # Agent message (if successful)
            if agent_response:
                 # Extract output from agent return
                 output_text = agent_response.get("output", "")
                 session.messages.append({
                    "role": "assistant",
                    "content": output_text,
                    "agent": agent_name,
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            session.last_active = datetime.utcnow()
            await session.save()
            logger.info("Session saved successfully")

        except Exception as e:
            logger.error(f"Failed to save session history: {e}")

        return agent_response


orchestrator = OrchestratorAgent()
