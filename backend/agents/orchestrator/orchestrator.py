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

NEXUS_SYSTEM_PROMPT = """You are NEXUS, a highly intelligent personal AI assistant built for Utsav — an AI/ML engineer and system architect from Surat, India.

Personality (Vermeil-style):
- Sharp, direct, no fluff or filler
- Structured responses with clear hierarchy
- Deep technical competence
- Strategic not just executional
- You know his projects: Palm AI, Vedic Astrology engine, Local LLM, Voice cloning, NEXUS itself
- You know his hours: 9AM-6:30PM, deep focus mode
- You push toward finishing, not overbuilding

Active agents you coordinate:
- ATLAS: project management, tasks, deadlines, GitHub sync
- ORACLE: research, papers, RAG knowledge base
- COMPASS: career strategy, skill gaps, growth
- FORGE: code review, debugging, architecture

Response style:
- Bullet points for lists
- Code blocks with language tags
- Direct and honest, even when uncomfortable
- Reference his actual projects when relevant"""

ROUTING_PROMPT = """Classify this user message to the correct NEXUS agent.

Message: "{message}"

Agents:
- ATLAS: project management, tasks, kanban, daily briefing, blockers, GitHub sync, Notion
- ORACLE: research, papers, learning, knowledge base, documentation, study paths
- COMPASS: career goals, job strategy, skill gaps, resume, growth planning, salary
- FORGE: code help, debugging, architecture review, refactoring, tech decisions, boilerplate
- SELF: general conversation, greetings, system questions, philosophy, anything else

Reply with ONLY the agent name. Example: FORGE"""

AgentName = Literal["ATLAS", "ORACLE", "COMPASS", "FORGE", "SELF"]


def _extract_action(message: str, agent: str) -> str:
    """Infer the action type from message content."""
    msg = message.lower()
    if agent == "ATLAS":
        if any(w in msg for w in ["break down", "breakdown", "split", "subtask"]):
            return "break_down_goal"
        if any(w in msg for w in ["blocker", "blocked", "stuck"]):
            return "detect_blockers"
        if any(w in msg for w in ["github", "repo", "issue", "commit"]):
            return "sync_github"
        if any(w in msg for w in ["notion", "export", "save to notion"]):
            return "export_notion"
    if agent == "ORACLE":
        if any(w in msg for w in ["learning path", "how to learn", "study plan", "roadmap"]):
            return "learning_path"
        if any(w in msg for w in ["summarize", "summary of", "tldr"]):
            return "summarize"
        if any(w in msg for w in ["save", "ingest", "add to knowledge", "remember this"]):
            return "ingest"
    if agent == "COMPASS":
        if any(w in msg for w in ["skill gap", "skills i need", "what skills"]):
            return "skill_gap"
        if any(w in msg for w in ["weekly check", "check in", "progress review"]):
            return "weekly_checkin"
        if any(w in msg for w in ["job", "posting", "jd ", "job description"]):
            return "job_analysis"
        if any(w in msg for w in ["resume", "cv ", "portfolio"]):
            return "resume_review"
        if any(w in msg for w in ["goal", "goals", "track", "progress"]):
            return "goal_tracking"
    if agent == "FORGE":
        if any(w in msg for w in ["review", "check this code", "look at this"]):
            return "review"
        if any(w in msg for w in ["error", "bug", "exception", "traceback", "fails", "crash"]):
            return "debug"
        if any(w in msg for w in ["architecture", "design", "structure", "system design"]):
            return "architecture"
        if any(w in msg for w in ["refactor", "clean up", "improve this code"]):
            return "refactor"
        if any(w in msg for w in ["boilerplate", "template", "generate", "scaffold"]):
            return "boilerplate"
        if any(w in msg for w in ["vs ", "versus", "or ", "choose between", "which is better"]):
            return "tech_decision"
    return "query"


class OrchestratorAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="NEXUS CORE",
            description="Master orchestrator — routes to 5 specialized agents"
        )

    async def _route(self, message: str) -> AgentName:
        prompt = ROUTING_PROMPT.format(message=message)
        response = await llm_call(prompt, task_type="general")
        agent = response.strip().upper().split()[0]  # handle any extra text
        valid = {"ATLAS", "ORACLE", "COMPASS", "FORGE", "SELF"}
        if agent not in valid:
            logger.warning(f"Invalid route '{agent}', defaulting to SELF")
            return "SELF"
        logger.info(f"Routed → {agent}")
        return agent

    async def run(self, input: Dict[str, Any], context: Optional[Dict] = None) -> Dict[str, Any]:
        message = input.get("message", "")
        logger.info(f"Orchestrator received message: {message}")
        agent_name = await self._route(message)
        logger.info(f"Orchestrator routed to: {agent_name}")

        if agent_name == "SELF":
            response = await llm_call(message, system=NEXUS_SYSTEM_PROMPT)
            return {"output": response, "agent": "NEXUS", "success": True}

        action = _extract_action(message, agent_name)
        agent_input = {**input, "action": action}

        agent_response = None

        logger.info(f"Executing agent: {agent_name} with input: {agent_input}")

        # ─── EXECUTION ────────────────────────────────────────────────
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

        # ─── PERSISTENCE ──────────────────────────────────────────────
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
