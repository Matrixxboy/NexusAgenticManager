"""
COMPASS — Career Strategy Agent
Handles: skill tracking, goal alignment, job market analysis,
         growth planning, weekly career check-ins.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime
from loguru import logger
from core.base_agent import BaseAgent
from llm import llm_call

COMPASS_SYSTEM = """You are COMPASS, the Career Strategy Agent inside NEXUS — built for Utsav Desai.

Utsav's profile:
- Location: Surat, India
- Education: Diploma in Computer Engineering (Bhagwan Mahavir Polytechnic)
- Current role: AI/ML Engineer
- Past: Drone developer, Freelancer
- Goal: Long-term — research-level AI work, possibly PhD track
- Wants: Growth + independence + stability + long-term leverage. NOT just money.

His active projects (career-relevant):
- AI Palm Reading system (shows CV + ML depth)
- Vedic Astrology engine (shows niche + math + domain expertise)
- Local LLM system (shows infrastructure + AI systems depth)
- Voice cloning (shows audio AI breadth)

His strengths: System thinking, long-term vision, AI/ML hands-on, Python
His risks: Overbuilding before finishing, parallel projects, high self-expectations

Your job:
- Be a brutally honest career strategist, not a cheerleader
- Track skills vs target roles, identify real gaps
- Suggest what to BUILD for maximum career leverage
- Keep him focused — less projects finished > more projects started
- Give strategic advice grounded in Indian AI job market + global remote opportunities
- Push toward PhD track awareness when relevant"""

SKILL_GAP_PROMPT = """Analyze Utsav's skill profile vs his target role: {target_role}

Current skills: {current_skills}
Active projects: {projects}
Experience: {experience}

Provide:
1. MATCH SCORE (0-100) with brief reasoning
2. CRITICAL GAPS (must fix in 3 months)
3. NICE-TO-HAVE GAPS (6-12 month horizon)
4. WHAT TO BUILD NEXT (one specific project that fills the most gaps)
5. HONEST ASSESSMENT — is this role realistic in {timeline}?

Be direct. No sugarcoating."""

WEEKLY_CHECKIN_PROMPT = """Run Utsav's weekly career check-in.

Goals this week: {weekly_goals}
What actually happened: {actual_progress}
Active projects: {projects}
Target role: {target_role}

Provide:
1. REALITY CHECK — Did he move toward his goal this week? (Yes/No/Partial)
2. PATTERN ALERT — Any recurring issues? (overbuilding, distraction, etc.)
3. NEXT WEEK FOCUS — Single most important career action
4. MOMENTUM SCORE (1-10) with brief explanation

Be a tough but fair mentor."""

JOB_ANALYSIS_PROMPT = """Analyze this job posting for Utsav's fit:

JOB: {job_title} at {company}
DESCRIPTION: {job_description}

Analyze:
1. FIT SCORE (0-100)
2. SKILLS HE HAS that match
3. SKILLS HE'S MISSING (be specific)
4. RED FLAGS (things to watch out for)
5. INTERVIEW PREP — top 3 technical topics to study
6. APPLY OR SKIP — with clear reason

Keep it sharp. Under 300 words."""

RESUME_REVIEW_PROMPT = """Review and improve this resume section for an AI/ML engineer role.

Current text:
{resume_section}

Target role: {target_role}

Rewrite to:
- Lead with impact metrics where possible
- Use strong AI/ML action verbs
- Highlight system-thinking and architecture decisions
- Compress fluff, expand technical substance
- Make it ATS-friendly

Provide: improved version + 3 specific changes made."""


class CompassAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="COMPASS",
            description="Career strategy agent — goals, skill gaps, job analysis, growth tracking"
        )
        # Utsav's profile — updated as career evolves
        self.profile = {
            "current_role": "AI/ML Engineer",
            "location": "Surat, India",
            "experience_years": 2,
            "education": "Diploma in Computer Engineering",
            "skills": [
                "Python", "OpenCV", "PyTorch", "TensorFlow", "FastAPI",
                "React", "Laravel", "Node.js", "Docker", "Git",
                "LLM systems", "RAG pipelines", "Computer Vision",
                "Drone systems", "Freelancing"
            ],
            "projects": [
                "AI Palm Reading (OpenCV + Grad-CAM)",
                "Vedic Astrology Engine (Swiss Ephemeris)",
                "Local LLM System (Ollama + RAG)",
                "Voice Cloning System",
                "React + Laravel web projects"
            ],
            "target_roles": [
                "Senior AI/ML Engineer",
                "Computer Vision Engineer",
                "AI Research Engineer",
                "ML Systems Engineer"
            ],
            "long_term_goal": "Research-level AI work / PhD track",
        }

    async def run(self, input: Dict[str, Any], context: Optional[Dict] = None) -> Dict[str, Any]:
        message = input.get("message", "")
        action = input.get("action", "query")

        actions = {
            "skill_gap":      self._skill_gap_analysis,
            "weekly_checkin": self._weekly_checkin,
            "job_analysis":   self._job_analysis,
            "resume_review":  self._resume_review,
            "goal_tracking":  self._goal_tracking,
            "query":          self._general_query,
        }

        handler = actions.get(action, self._general_query)
        return await handler(input)

    async def _general_query(self, input: Dict) -> Dict[str, Any]:
        message = input.get("message", "")
        context = f"\nUtsav's Profile:\n{self._profile_summary()}"
        response = await llm_call(
            message + context,
            system=COMPASS_SYSTEM,
            task_type="career_analysis"
        )
        return {"output": response, "agent": "COMPASS", "success": True}

    async def _skill_gap_analysis(self, input: Dict) -> Dict[str, Any]:
        target = input.get("target_role", "Senior AI/ML Engineer")
        timeline = input.get("timeline", "6 months")

        prompt = SKILL_GAP_PROMPT.format(
            target_role=target,
            current_skills=", ".join(self.profile["skills"]),
            projects=", ".join(self.profile["projects"]),
            experience=f"{self.profile['experience_years']} years",
            timeline=timeline,
        )
        response = await llm_call(prompt, system=COMPASS_SYSTEM, task_type="career_analysis")
        return {
            "output": response,
            "agent": "COMPASS",
            "success": True,
            "target_role": target,
        }

    async def _weekly_checkin(self, input: Dict) -> Dict[str, Any]:
        prompt = WEEKLY_CHECKIN_PROMPT.format(
            weekly_goals=input.get("weekly_goals", "Not specified"),
            actual_progress=input.get("actual_progress", "Not specified"),
            projects=", ".join(self.profile["projects"]),
            target_role=self.profile["target_roles"][0],
        )
        response = await llm_call(prompt, system=COMPASS_SYSTEM, task_type="career_analysis")
        return {"output": response, "agent": "COMPASS", "success": True}

    async def _job_analysis(self, input: Dict) -> Dict[str, Any]:
        prompt = JOB_ANALYSIS_PROMPT.format(
            job_title=input.get("job_title", "AI/ML Engineer"),
            company=input.get("company", "Unknown Company"),
            job_description=input.get("job_description", ""),
        )
        response = await llm_call(prompt, system=COMPASS_SYSTEM, task_type="career_analysis")
        return {"output": response, "agent": "COMPASS", "success": True}

    async def _resume_review(self, input: Dict) -> Dict[str, Any]:
        prompt = RESUME_REVIEW_PROMPT.format(
            resume_section=input.get("resume_section", ""),
            target_role=input.get("target_role", self.profile["target_roles"][0]),
        )
        response = await llm_call(prompt, system=COMPASS_SYSTEM, task_type="career_analysis")
        return {"output": response, "agent": "COMPASS", "success": True}

    async def _goal_tracking(self, input: Dict) -> Dict[str, Any]:
        goals = input.get("goals", self.profile["target_roles"])
        prompt = f"""Track Utsav's career goals and give a progress assessment.

Goals: {goals}
Long-term target: {self.profile['long_term_goal']}
Current skills: {', '.join(self.profile['skills'])}
Active projects: {', '.join(self.profile['projects'])}

Provide:
1. PROGRESS TOWARD EACH GOAL (% estimate + reasoning)
2. BIGGEST BLOCKER right now
3. ONE THING to do this week that moves the needle most
4. TIMELINE REALITY CHECK — are his goals achievable in the expected timeframe?"""

        response = await llm_call(prompt, system=COMPASS_SYSTEM, task_type="career_analysis")
        return {"output": response, "agent": "COMPASS", "success": True}

    def _profile_summary(self) -> str:
        return f"""Role: {self.profile['current_role']} | Location: {self.profile['location']}
Skills: {', '.join(self.profile['skills'][:8])}
Projects: {', '.join(self.profile['projects'][:3])}
Target: {self.profile['target_roles'][0]}"""

    def update_profile(self, updates: Dict) -> None:
        """Update Utsav's career profile dynamically."""
        self.profile.update(updates)
        logger.info(f"COMPASS profile updated: {list(updates.keys())}")


compass = CompassAgent()
