"""
FORGE — Code Assistant Agent
Handles: code review, debugging, architecture review,
         refactoring, boilerplate generation, tech decisions.
"""
import os
import ast
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional
from loguru import logger
from core.base_agent import BaseAgent
from llm import llm_call

FORGE_SYSTEM = """You are FORGE, the Code Agent inside NEXUS — built for Utsav, an AI/ML engineer.

Utsav's stack:
- Backend: Python (FastAPI, Flask, Django), Node.js, Laravel/PHP
- Frontend: React, Tailwind CSS, Vite
- AI/ML: PyTorch, TensorFlow, OpenCV, Hugging Face, LangChain, LangGraph
- Infra: Docker, Git, Linux, Ollama
- DB: SQLite, PostgreSQL, Redis, ChromaDB

His projects you know about:
- NEXUS (this system) — Tauri + React + FastAPI + LangGraph
- AI Palm Reading — OpenCV + MediaPipe + Grad-CAM + segmentation
- Vedic Astrology engine — Swiss Ephemeris + Python
- Voice cloning — TTS + speaker embeddings
- RAG systems — ChromaDB + Ollama

Your rules:
- NEVER suggest solutions that break the existing architecture
- Always explain the WHY, not just the WHAT
- Prefer simple solutions that can be extended over complex ones that can't
- Call out bad patterns directly — no sugarcoating
- For AI/ML code: always consider memory efficiency, GPU utilization
- Format: code blocks with language tags, inline comments for key decisions
- If the problem is architectural, say so — don't patch bad foundations"""

CODE_REVIEW_PROMPT = """Review this code for an AI/ML engineer.

Language/Framework: {language}
Context: {context}

```{language}
{code}
```

Review for:
1. BUGS — actual errors or likely runtime failures
2. PERFORMANCE — bottlenecks, unnecessary ops, memory issues
3. ARCHITECTURE — does this fit well in a larger system?
4. AI/ML SPECIFIC — if relevant: GPU usage, tensor ops, model loading patterns
5. QUICK WINS — top 3 changes with highest impact

Then provide the IMPROVED VERSION with inline comments explaining changes."""

DEBUG_PROMPT = """Debug this error for Utsav.

Error:
```
{error}
```

Code causing the error:
```{language}
{code}
```

Context: {context}

Provide:
1. ROOT CAUSE — exactly what went wrong and why
2. FIX — corrected code with explanation
3. PREVENTION — how to avoid this class of error in future
4. RELATED ISSUES — any other problems you see nearby"""

ARCHITECTURE_PROMPT = """Review this system architecture and give honest feedback.

System: {system_name}
Description: {description}

Architecture:
{architecture}

Analyze:
1. STRENGTHS — what's well designed
2. WEAKNESSES — real problems, not nitpicks
3. SCALABILITY — will it hold up? Where does it break?
4. MISSING PIECES — what's not there that should be
5. SPECIFIC RECOMMENDATIONS — ranked by priority

Be an architect, not a code reviewer."""

REFACTOR_PROMPT = """Refactor this code. Goal: {goal}

Current code:
```{language}
{code}
```

Constraints:
- Must maintain existing API/interface
- {constraints}

Provide:
1. REFACTORED CODE — clean, production-ready
2. CHANGES MADE — bulleted list of what changed and why
3. MIGRATION NOTES — anything caller code needs to update"""

BOILERPLATE_PROMPT = """Generate production-ready boilerplate for: {description}

Stack: {stack}
Requirements:
{requirements}

Generate complete, working code with:
- Proper error handling
- Type hints (Python) / TypeScript types
- Inline comments for non-obvious decisions
- TODO markers for Utsav to fill in custom logic"""

TECH_DECISION_PROMPT = """Help Utsav make a technical decision.

Choosing between: {options}
Use case: {use_case}
Constraints: {constraints}

For each option:
1. PROS for this specific use case
2. CONS for this specific use case
3. ECOSYSTEM maturity and community support

RECOMMENDATION: Clear winner with reasoning.
Don't hedge — make a call."""


class ForgeAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="FORGE",
            description="Code agent — review, debug, architecture, refactor, boilerplate"
        )

    async def run(self, input: Dict[str, Any], context: Optional[Dict] = None) -> Dict[str, Any]:
        action = input.get("action", "query")

        actions = {
            "review":        self._code_review,
            "debug":         self._debug,
            "architecture":  self._architecture_review,
            "refactor":      self._refactor,
            "boilerplate":   self._boilerplate,
            "tech_decision": self._tech_decision,
            "read_file":     self._read_and_review_file,
            "query":         self._general_query,
        }

        handler = actions.get(action, self._general_query)
        return await handler(input)

    async def _general_query(self, input: Dict) -> Dict[str, Any]:
        message = input.get("message", "")
        response = await llm_call(message, system=FORGE_SYSTEM)
        return {"output": response, "agent": "FORGE", "success": True}

    async def _code_review(self, input: Dict) -> Dict[str, Any]:
        prompt = CODE_REVIEW_PROMPT.format(
            language=input.get("language", "python"),
            context=input.get("context", "general purpose"),
            code=input.get("code", ""),
        )
        response = await llm_call(prompt, system=FORGE_SYSTEM, task_type="code_review_deep")
        return {"output": response, "agent": "FORGE", "success": True}

    async def _debug(self, input: Dict) -> Dict[str, Any]:
        prompt = DEBUG_PROMPT.format(
            error=input.get("error", ""),
            language=input.get("language", "python"),
            code=input.get("code", ""),
            context=input.get("context", ""),
        )
        response = await llm_call(prompt, system=FORGE_SYSTEM)
        return {"output": response, "agent": "FORGE", "success": True}

    async def _architecture_review(self, input: Dict) -> Dict[str, Any]:
        prompt = ARCHITECTURE_PROMPT.format(
            system_name=input.get("system_name", "Unknown System"),
            description=input.get("description", ""),
            architecture=input.get("architecture", ""),
        )
        response = await llm_call(prompt, system=FORGE_SYSTEM, task_type="research_heavy")
        return {"output": response, "agent": "FORGE", "success": True}

    async def _refactor(self, input: Dict) -> Dict[str, Any]:
        prompt = REFACTOR_PROMPT.format(
            goal=input.get("goal", "improve readability and performance"),
            language=input.get("language", "python"),
            code=input.get("code", ""),
            constraints=input.get("constraints", "None specified"),
        )
        response = await llm_call(prompt, system=FORGE_SYSTEM, task_type="code_review_deep")
        return {"output": response, "agent": "FORGE", "success": True}

    async def _boilerplate(self, input: Dict) -> Dict[str, Any]:
        prompt = BOILERPLATE_PROMPT.format(
            description=input.get("description", ""),
            stack=input.get("stack", "Python + FastAPI"),
            requirements="\n".join(
                f"- {r}" for r in input.get("requirements", ["production-ready", "type-safe"])
            ),
        )
        response = await llm_call(prompt, system=FORGE_SYSTEM)
        return {"output": response, "agent": "FORGE", "success": True}

    async def _tech_decision(self, input: Dict) -> Dict[str, Any]:
        prompt = TECH_DECISION_PROMPT.format(
            options=" vs ".join(input.get("options", ["Option A", "Option B"])),
            use_case=input.get("use_case", ""),
            constraints=input.get("constraints", "None specified"),
        )
        response = await llm_call(prompt, system=FORGE_SYSTEM, task_type="research_heavy")
        return {"output": response, "agent": "FORGE", "success": True}

    async def _read_and_review_file(self, input: Dict) -> Dict[str, Any]:
        """Read a file from disk and review it."""
        file_path = input.get("file_path", "")
        if not file_path or not Path(file_path).exists():
            return {
                "output": f"❌ File not found: {file_path}",
                "agent": "FORGE",
                "success": False,
            }

        try:
            content = Path(file_path).read_text(encoding="utf-8")
            ext = Path(file_path).suffix.lstrip(".")
            lang_map = {
                "py": "python", "ts": "typescript", "tsx": "typescript",
                "js": "javascript", "jsx": "javascript", "rs": "rust",
                "php": "php", "html": "html", "css": "css",
            }
            language = lang_map.get(ext, ext or "text")

            return await self._code_review({
                "language": language,
                "code": content[:8000],  # cap at 8k chars
                "context": f"File: {file_path}",
            })
        except Exception as e:
            return {"output": f"❌ Error reading file: {e}", "agent": "FORGE", "success": False}

    def analyze_python_syntax(self, code: str) -> Dict[str, Any]:
        """Quick static analysis — no LLM needed."""
        try:
            tree = ast.parse(code)
            functions = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
            classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
            imports = [
                ast.dump(n) for n in ast.walk(tree)
                if isinstance(n, (ast.Import, ast.ImportFrom))
            ]
            return {
                "valid": True,
                "functions": functions,
                "classes": classes,
                "import_count": len(imports),
                "line_count": len(code.splitlines()),
            }
        except SyntaxError as e:
            return {"valid": False, "error": str(e), "line": e.lineno}


forge = ForgeAgent()
