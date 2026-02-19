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
from config.settings import settings
from datetime import datetime

person = settings.person_name
FORGE_SYSTEM = """You are FORGE, the Code Agent inside NEXUS — built for {person}, an AI/ML engineer.

{person}'s stack:
{stack_context}

His active projects:
{project_context}

Your rules:
- NEVER suggest solutions that break the existing architecture
- Always explain the WHY, not just the WHAT
- Prefer simple solutions that can be extended over complex ones that can't
- Call out bad patterns directly — no sugarcoating
- For AI/ML code: always consider memory efficiency, GPU utilization

Thinking Process:
1. Understand the goal and constraints (language, framework).
2. Plan the architecture/logic step-by-step.
3. Write the code (clean, typed, commented).
4. Review for potential bugs or edge cases.

- Format: code blocks with language tags, inline comments for key decisions
- If he asks for code, provide it in ```language blocks
- If he asks for architecture, give a high-level overview
- Be concise. Don't waste time on pleasantries.
- Format: STRICT MARKDOWN. Headers, code blocks, bold text.
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

DEBUG_PROMPT = """Debug this error for {person}.

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
- TODO markers for {person} to fill in custom logic"""

TECH_DECISION_PROMPT = """Help {person} make a technical decision.

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
        # Default stack if none in DB settings (could move to settings.py)
        self.stack = """- Backend: Python (FastAPI), Node.js
- Frontend: React, Tailwind, Vite
- AI: PyTorch, TensorFlow, OpenCV, Ollama
- DB: MongoDB, Redis, ChromaDB"""

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
            "update_task":   self._update_task_handler,
            "list_dir":      self._list_dir_handler,
            "run_cmd":       self._run_cmd_handler,
            "query":         self._general_query,
        }

        db_context = await self.get_db_context()
        input["db_context"] = db_context

        handler = actions.get(action, self._general_query)
        return await handler(input)

    async def _general_query(self, input: Dict) -> Dict[str, Any]:
        message = input.get("message", "")
        db_context = input.get("db_context", {})
        prompt_context = f"\nActive Projects (Context):\n{db_context.get('projects')}\n"
        if not prompt_context:
            prompt_context = "No specific code context provided."

        # RAG Context
        rag_context = await self.retrieve_context(message + " " + prompt_context)
        if rag_context:
            prompt_context += f"\n\nRelevant Knowledge Base:\n{rag_context}\n"

        # Time Context
        time_context = f"\nCurrent Date/Time: {datetime.now().strftime('%A, %B %d, %Y')}\n"
        
        # Format System Prompt
        # Projects are already in 'db_context' which we used for prompt_context,
        # but we also need to inject them into the System Prompt placeholders.
        projects_text = db_context.get("projects", "No specific projects listed.")
        
        system_prompt = FORGE_SYSTEM.format(
            stack_context=self.stack,
            project_context=projects_text,
            person=person
        ) + time_context

        response = await llm_call(
            f"User Query: {message}\n\nContext:\n{prompt_context}",
            system=system_prompt,
            task_type="coding"
        )
        return {"output": response, "agent": "FORGE", "success": True}

    async def _code_review(self, input: Dict) -> Dict[str, Any]:
        prompt = CODE_REVIEW_PROMPT.format(
            language=input.get("language", "python"),
            context=input.get("context", "general purpose"),
            code=input.get("code", ""),
        )

        # Dynamic System Prompt
        db_context = await self.get_db_context()
        projects_text = db_context.get("projects", "No projects found.")
        system_prompt = FORGE_SYSTEM.format(stack_context=self.stack, project_context=projects_text, person=person)

        response = await llm_call(prompt, system=system_prompt, task_type="code_review_deep")
        return {"output": response, "agent": "FORGE", "success": True}

    async def _debug(self, input: Dict) -> Dict[str, Any]:
        prompt = DEBUG_PROMPT.format(
            error=input.get("error", ""),
            language=input.get("language", "python"),
            code=input.get("code", ""),
            context=input.get("context", ""),
        )

        # Dynamic System Prompt
        db_context = await self.get_db_context()
        system_prompt = FORGE_SYSTEM.format(
            stack_context=self.stack, 
            project_context=db_context.get("projects", ""),
            person=person
        )
        
        response = await llm_call(prompt, system=system_prompt)
        return {"output": response, "agent": "FORGE", "success": True}

    async def _architecture_review(self, input: Dict) -> Dict[str, Any]:
        prompt = ARCHITECTURE_PROMPT.format(
            system_name=input.get("system_name", "Unknown System"),
            description=input.get("description", ""),
            architecture=input.get("architecture", ""),
        )

        # Dynamic System Prompt
        db_context = await self.get_db_context()
        system_prompt = FORGE_SYSTEM.format(
            stack_context=self.stack, 
            project_context=db_context.get("projects", ""),
            person=person
        )

        response = await llm_call(prompt, system=system_prompt, task_type="research_heavy")
        return {"output": response, "agent": "FORGE", "success": True}

    async def _refactor(self, input: Dict) -> Dict[str, Any]:
        prompt = REFACTOR_PROMPT.format(
            goal=input.get("goal", "improve readability and performance"),
            language=input.get("language", "python"),
            code=input.get("code", ""),
            constraints=input.get("constraints", "None specified"),
        )

        # Dynamic System Prompt
        db_context = await self.get_db_context()
        system_prompt = FORGE_SYSTEM.format(
            stack_context=self.stack, 
            project_context=db_context.get("projects", ""),
            person=person
        )

        response = await llm_call(prompt, system=system_prompt, task_type="code_review_deep")
        return {"output": response, "agent": "FORGE", "success": True}

    async def _boilerplate(self, input: Dict) -> Dict[str, Any]:
        prompt = BOILERPLATE_PROMPT.format(
            description=input.get("description", ""),
            stack=input.get("stack", "Python + FastAPI"),
            requirements="\n".join(
                f"- {r}" for r in input.get("requirements", ["production-ready", "type-safe"])
            ),
        )

        # Dynamic System Prompt
        db_context = await self.get_db_context()
        system_prompt = FORGE_SYSTEM.format(
            stack_context=self.stack, 
            project_context=db_context.get("projects", ""),
            person=person
        )

        response = await llm_call(prompt, system=system_prompt)
        return {"output": response, "agent": "FORGE", "success": True}

    async def _tech_decision(self, input: Dict) -> Dict[str, Any]:
        prompt = TECH_DECISION_PROMPT.format(
            options=" vs ".join(input.get("options", ["Option A", "Option B"])),
            use_case=input.get("use_case", ""),
            constraints=input.get("constraints", "None specified"),
        )

        # Dynamic System Prompt
        db_context = await self.get_db_context()
        system_prompt = FORGE_SYSTEM.format(
            stack_context=self.stack, 
            project_context=db_context.get("projects", ""),
            person=person
        )

        response = await llm_call(prompt, system=system_prompt, task_type="research_heavy")
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

    async def _update_task_handler(self, input: Dict) -> Dict[str, Any]:
        """Allow FORGE to mark tasks as done after fixing bugs."""
        message = input.get("message", "")
        
        # Fetch recent tasks
        ctx = await self.get_db_context()
        recent_tasks = ctx.get("tasks", "No recent tasks.")

        extraction_prompt = f"""
        Extract status update from: '{message}'.
        
        Recent Tasks (to match against):
        {recent_tasks}
        
        Respond ONLY with JSON: {{\"task\": \"task title or id\", \"status\": \"todo/in_progress/blocked/done\"}}
        """
        json_resp = await llm_call(extraction_prompt, system="You are a code agent data extractor.", task_type="routing")
        
        try:
            import json
            data = json.loads(json_resp)
            if isinstance(data, list):
                data = data[0] if data else {}

            result = await self.update_task_status(data["task"], data["status"])
            if result["success"]:
                return {"output": f"✅ FORGE updated task '{data['task']}' → {data['status']}", "agent": "FORGE", "success": True}
            return {"output": f"❌ FORGE failed to update task: {result.get('error')}", "agent": "FORGE", "success": False}
        except Exception as e:
            return {"output": f"❌ FORGE error parsing update: {e}", "agent": "FORGE", "success": False}

    async def _list_dir_handler(self, input: Dict) -> Dict[str, Any]:
        """List files in a directory."""
        path = input.get("path", ".")
        from core.system_tools import system_tools
        output = system_tools.list_dir(path)
        return {"output": f"📂 Files in {path}:\n```\n{output}\n```", "agent": "FORGE", "success": True}

    async def _run_cmd_handler(self, input: Dict) -> Dict[str, Any]:
        """Run a safe shell command."""
        cmd = input.get("command", "")
        from core.system_tools import system_tools
        output = system_tools.run_command(cmd)
        return {"output": f"💻 Command: `{cmd}`\n\n```bash\n{output}\n```", "agent": "FORGE", "success": True}
            
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
