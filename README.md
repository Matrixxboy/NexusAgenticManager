# NEXUS — Neural EXecution & Understanding System
> Personal Agentic AI OS for Utsav Desai

## Architecture
- **Desktop**: Tauri 2.0 (Rust) + React + Tailwind
- **Backend**: FastAPI + LangGraph (Python)
- **Local LLM**: Ollama (Llama 3.1 8B / Qwen2.5)
- **Cloud LLM**: Claude API (sonnet-4-5, fallback only)
- **Memory**: ChromaDB (vectors) + SQLite (structured) + Redis (sessions)

## Agents
| Agent | Name | Priority |
|-------|------|----------|
| Orchestrator | NEXUS CORE | Master router |
| Project Manager | ATLAS | #1 |
| Research | ORACLE | #2 |
| Career | COMPASS | #3 |
| Code | FORGE | #4 |

## Quick Start
```bash
# 1. Backend
cd backend && python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# 2. Desktop
cd desktop && npm install
npm run tauri dev
```

## Build Phases
- **Phase 1** (Weeks 1-2): Core shell + Ollama chat
- **Phase 2** (Weeks 3-4): ATLAS PM Agent
- **Phase 3** (Weeks 5-6): ORACLE Research + RAG Memory
- **Phase 4** (Weeks 7-10): COMPASS + FORGE + Integrations


```python
>>> from fastapi import APIRouter
>>> router = APIRouter()
>>> @router.get('/health', response_model=bool)
... def health_check():
... return {'status': True}
>>> resp = requests.get('http://localhost:8000/health')
>>> print(resp.json()) # {'status': True}
```