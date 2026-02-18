"""Research (ORACLE) API routes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from agents.research import oracle
from protogrid import make_response

router = APIRouter()


class IngestRequest(BaseModel):
    content: str
    title: str
    source: str = "manual"
    tags: List[str] = []


class SearchRequest(BaseModel):
    query: str
    n_results: int = 5


class LearningPathRequest(BaseModel):
    topic: str


class SummarizeRequest(BaseModel):
    content: str
    source: str = "unknown"


@router.post("/research/ingest")
async def ingest_content(req: IngestRequest):
    try:
        result = await oracle.ingest(
            content=req.content,
            source=req.source,
            title=req.title,
            tags=req.tags,
        )
        return make_response(
            payload = result,
            status = 200,
            message = "Content ingested successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "ingestion failed"
        )


@router.post("/research/search")
async def search_knowledge(req: SearchRequest):
    try:
        result = await oracle.query(req.query)
        return make_response(
            payload = result,
            status = 200,
            message = "Search completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "search failed"
        )


@router.post("/research/learning-path")
async def learning_path(req: LearningPathRequest):
    try:
        result = await oracle.build_learning_path(req.topic)
        return make_response(
            payload = result,
            status = 200,
            message = "Learning path built successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "learning path failed"
        )


@router.post("/research/summarize")
async def summarize(req: SummarizeRequest):
    try:
        result = await oracle.summarize_content(req.content, req.source)
        return make_response(
            payload = result,
            status = 200,
            message = "Summary completed successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "summary failed"
        )


@router.get("/research/stats")
async def knowledge_stats():
    try:
        count = await oracle.store.count()
        return make_response(
            payload = {"total_documents": count, "collection": "nexus_knowledge"},
            status = 200,
            message = "Knowledge stats retrieved successfully"
        )
    except Exception as e:
        return make_response(
            payload = None,
            status = 500,
            message = str(e),
            error_details = "knowledge stats retrieval failed"
        )
