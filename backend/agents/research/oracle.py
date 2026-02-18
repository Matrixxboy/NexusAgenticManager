"""
ORACLE — Research Agent
Handles: research queries, paper search, knowledge base RAG,
         learning paths, web content ingestion.
"""
from typing import Any, Dict, List, Optional
from loguru import logger
from core.base_agent import BaseAgent
from llm import llm_call
from memory.vector.chroma_store import ChromaStore

ORACLE_SYSTEM = """You are ORACLE, the Research Agent inside NEXUS — built for Utsav, an AI/ML engineer.

Your expertise:
- AI/ML, Computer Vision, Deep Learning, NLP
- Vedic computation systems, mathematical models
- System architecture and software design
- Scientific papers and technical documentation

Your job:
- Answer questions using Utsav's personal knowledge base first (RAG)
- Summarize papers and technical content sharply — no fluff
- Build structured learning paths when asked
- Always cite sources when using retrieved context
- Format: use bullet points, code blocks where relevant, be dense not verbose

Utsav's active research areas:
- Palm reading AI (OpenCV, MediaPipe, Grad-CAM, segmentation)
- Local LLM systems (Ollama, quantization, RAG)
- Vedic Astrology computation (Swiss Ephemeris, Dasha systems)
- Voice cloning (TTS, speaker embeddings)
- Computer Vision (segmentation, classification pipelines)"""

SUMMARY_PROMPT = """Summarize this content for a technical AI/ML engineer.
Be sharp and structured. Extract:
1. Core concept / what it does
2. Key technical details (methods, architecture, results)
3. Practical application for AI/ML work
4. 3-5 key takeaways as bullets

Content:
{content}

Source: {source}"""

LEARNING_PATH_PROMPT = """Create a structured learning path for: {topic}

Utsav's background: Diploma in Computer Engineering, working AI/ML engineer,
strong in Python, OpenCV, basic ML. Wants PhD-level depth eventually.

Format:
- Phase 1: Foundation (1-2 weeks)
- Phase 2: Core Concepts (2-4 weeks)
- Phase 3: Advanced / Research level (ongoing)

For each phase: specific resources, projects to build, concepts to master.
Be concrete — actual paper names, library docs, project ideas."""

SEARCH_PROMPT = """Based on this research query, provide a comprehensive technical answer.
Use the retrieved context below if relevant. Always be precise.

Query: {query}

Retrieved Context:
{context}

If context is not relevant, answer from your training knowledge and say so."""


class OracleAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="ORACLE",
            description="Research agent — RAG, paper search, knowledge base, learning paths"
        )
        self.store = ChromaStore(collection_name="nexus_knowledge")

    async def run(self, input: Dict[str, Any], context: Optional[Dict] = None) -> Dict[str, Any]:
        message = input.get("message", "")
        action = input.get("action", "query")  # query | ingest | learning_path | summarize

        if action == "ingest":
            return await self.ingest(
                content=input.get("content", ""),
                source=input.get("source", "manual"),
                title=input.get("title", "Untitled"),
                tags=input.get("tags", []),
            )
        elif action == "learning_path":
            return await self.build_learning_path(input.get("topic", message))
        elif action == "summarize":
            return await self.summarize_content(
                content=input.get("content", message),
                source=input.get("source", "unknown"),
            )
        else:
            return await self.query(message)

    async def query(self, question: str) -> Dict[str, Any]:
        """RAG query — retrieve from knowledge base then answer."""
        retrieved = await self.store.search(question, n_results=5)
        context_text = self._format_retrieved(retrieved)

        prompt = SEARCH_PROMPT.format(query=question, context=context_text)
        response = await llm_call(prompt, system=ORACLE_SYSTEM, task_type="research_heavy")

        return {
            "output": response,
            "agent": "ORACLE",
            "success": True,
            "sources": [r["metadata"].get("source", "unknown") for r in retrieved],
            "retrieved_count": len(retrieved),
        }

    async def ingest(
        self,
        content: str,
        source: str,
        title: str,
        tags: List[str] = [],
    ) -> Dict[str, Any]:
        """Ingest content into the vector knowledge base."""
        # Chunk content if too long (>1000 chars per chunk)
        chunks = self._chunk_text(content, chunk_size=800, overlap=100)
        doc_ids = []

        for i, chunk in enumerate(chunks):
            doc_id = await self.store.add(
                text=chunk,
                metadata={
                    "source": source,
                    "title": title,
                    "tags": ",".join(tags),
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }
            )
            doc_ids.append(doc_id)

        logger.info(f"ORACLE ingested: '{title}' → {len(chunks)} chunks")
        return {
            "output": f"✅ Ingested '{title}' into knowledge base ({len(chunks)} chunks)",
            "agent": "ORACLE",
            "success": True,
            "doc_ids": doc_ids,
            "chunks": len(chunks),
        }

    async def summarize_content(self, content: str, source: str) -> Dict[str, Any]:
        """Summarize external content and optionally ingest it."""
        prompt = SUMMARY_PROMPT.format(content=content[:6000], source=source)
        summary = await llm_call(prompt, system=ORACLE_SYSTEM, task_type="research_heavy")
        return {
            "output": summary,
            "agent": "ORACLE",
            "success": True,
        }

    async def build_learning_path(self, topic: str) -> Dict[str, Any]:
        """Generate a structured learning path for a topic."""
        prompt = LEARNING_PATH_PROMPT.format(topic=topic)
        path = await llm_call(prompt, system=ORACLE_SYSTEM, task_type="research_heavy")
        return {
            "output": path,
            "agent": "ORACLE",
            "success": True,
            "topic": topic,
        }

    async def weekly_digest(self) -> str:
        """Generate a weekly research digest from the knowledge base."""
        recent = await self.store.list_recent(days=7, limit=20)
        if not recent:
            return "No new entries in knowledge base this week."
        titles = "\n".join([f"- {r['metadata'].get('title', 'Untitled')}" for r in recent])
        prompt = f"Create a brief weekly digest of these knowledge base entries:\n{titles}\n\nHighlight patterns, connections, and what Utsav should explore next."
        return await llm_call(prompt, system=ORACLE_SYSTEM)

    def _format_retrieved(self, results: List[Dict]) -> str:
        if not results:
            return "No relevant context found in knowledge base."
        parts = []
        for i, r in enumerate(results, 1):
            source = r["metadata"].get("source", "unknown")
            title = r["metadata"].get("title", "Untitled")
            parts.append(f"[{i}] Source: {title} ({source})\n{r['text']}")
        return "\n\n---\n\n".join(parts)

    def _chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
        if len(text) <= chunk_size:
            return [text]
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            # Try to break at sentence boundary
            last_period = chunk.rfind(". ")
            if last_period > chunk_size // 2:
                chunk = chunk[:last_period + 1]
            chunks.append(chunk.strip())
            start += len(chunk) - overlap
        return [c for c in chunks if c]


oracle = OracleAgent()
