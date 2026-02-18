"""Career (COMPASS) + Code (FORGE) API routes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from agents.career import compass
from agents.code import forge
from protogrid import make_response

router = APIRouter()


# ── COMPASS — Career ───────────────────────────────────────────────

class SkillGapRequest(BaseModel):
    target_role: str = "Senior AI/ML Engineer"
    timeline: str = "6 months"


class WeeklyCheckinRequest(BaseModel):
    weekly_goals: str
    actual_progress: str


class JobAnalysisRequest(BaseModel):
    job_title: str
    company: str
    job_description: str


class ResumeReviewRequest(BaseModel):
    resume_section: str
    target_role: str = "AI/ML Engineer"


@router.post("/career/skill-gap")
async def skill_gap_analysis(req: SkillGapRequest):
    try:
        response = await compass.run(
            {"action": "skill_gap", "target_role": req.target_role, "timeline": req.timeline}
        )
        return make_response(
            payload = response,
            status = 200,
            message = "Skill gap analysis completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "skill gap analysis failed"
        )


@router.post("/career/weekly-checkin")
async def weekly_checkin(req: WeeklyCheckinRequest):
    try:
        response = await compass.run({
            "action": "weekly_checkin",
            "weekly_goals": req.weekly_goals,
            "actual_progress": req.actual_progress,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "Weekly check-in completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "weekly check-in failed"
        )


@router.post("/career/job-analysis")
async def job_analysis(req: JobAnalysisRequest):
    try:
        response = await compass.run({
            "action": "job_analysis",
            "job_title": req.job_title,
            "company": req.company,
            "job_description": req.job_description,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "Job analysis completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "job analysis failed"
        )


@router.post("/career/resume-review")
async def resume_review(req: ResumeReviewRequest):
    try:
        response = await compass.run({
            "action": "resume_review",
            "resume_section": req.resume_section,
            "target_role": req.target_role,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "Resume review completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "resume review failed"
        )


@router.get("/career/goals")
async def track_goals():
    try:
        response = await compass.run({"action": "goal_tracking"})
        return make_response(
            payload = response,
            status = 200,
            message = "Goal tracking completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "goal tracking failed"
        )


# ── FORGE — Code ───────────────────────────────────────────────────

class CodeReviewRequest(BaseModel):
    code: str
    language: str = "python"
    context: str = ""


class DebugRequest(BaseModel):
    error: str
    code: str
    language: str = "python"
    context: str = ""


class ArchitectureRequest(BaseModel):
    system_name: str
    description: str
    architecture: str


class RefactorRequest(BaseModel):
    code: str
    language: str = "python"
    goal: str = "improve readability and performance"
    constraints: str = "None"


class BoilerplateRequest(BaseModel):
    description: str
    stack: str = "Python + FastAPI"
    requirements: List[str] = ["production-ready", "type-safe"]


class TechDecisionRequest(BaseModel):
    options: List[str]
    use_case: str
    constraints: str = "None"


class FileReviewRequest(BaseModel):
    file_path: str


@router.post("/code/review")
async def code_review(req: CodeReviewRequest):
    try:
        response = await forge.run({
            "action": "review",
            "code": req.code,
            "language": req.language,
            "context": req.context,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "Code review completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "code review failed"
        )


@router.post("/code/debug")
async def debug_code(req: DebugRequest):
    try:
        response = await forge.run({
            "action": "debug",
            "error": req.error,
            "code": req.code,
            "language": req.language,
            "context": req.context,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "Code debugging completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "code debugging failed"
        )


@router.post("/code/architecture")
async def architecture_review(req: ArchitectureRequest):
    try:
        response = await forge.run({
            "action": "architecture",
            "system_name": req.system_name,
            "description": req.description,
            "architecture": req.architecture,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "Architecture review completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "architecture review failed"
        )


@router.post("/code/refactor")
async def refactor_code(req: RefactorRequest):
    try:
        response = await forge.run({
            "action": "refactor",
            "code": req.code,
            "language": req.language,
            "goal": req.goal,
            "constraints": req.constraints,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "Code refactoring completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "code refactoring failed"
        )


@router.post("/code/boilerplate")
async def generate_boilerplate(req: BoilerplateRequest):
    try:
        response = await forge.run({
            "action": "boilerplate",
            "description": req.description,
            "stack": req.stack,
            "requirements": req.requirements,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "Boilerplate generation completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "boilerplate generation failed"
        )


@router.post("/code/tech-decision")
async def tech_decision(req: TechDecisionRequest):
    try:
        response = await forge.run({
            "action": "tech_decision",
            "options": req.options,
            "use_case": req.use_case,
            "constraints": req.constraints,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "Tech decision completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "tech decision failed"
        )


@router.post("/code/review-file")
async def review_file(req: FileReviewRequest):
    try:
        response = await forge.run({
            "action": "read_file",
            "file_path": req.file_path,
        })
        return make_response(
            payload = response,
            status = 200,
            message = "File review completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "file review failed"
        )
