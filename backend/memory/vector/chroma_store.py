"""
ChromaDB Vector Store — NEXUS Knowledge Base
Used by ORACLE for RAG. Stores embeddings of all ingested content.
"""
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from loguru import logger
from config import settings


class ChromaStore:
    """
    Wrapper around ChromaDB with lazy initialization.
    Uses local sentence-transformers for embeddings (no API cost).
    """

    def __init__(self, collection_name: str = "nexus_knowledge"):
        self.collection_name = collection_name
        self._client = None
        self._collection = None

    def _get_client(self):
        """Lazy init — only imports chromadb when first used."""
        if self._client is None:
            import os
            os.environ["ANONYMIZED_TELEMETRY"] = "False"
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            self._client = chromadb.PersistentClient(
                path=settings.chroma_db_path,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"ChromaDB initialized → collection: {self.collection_name}")
        return self._client, self._collection

    async def add(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
        doc_id: Optional[str] = None,
    ) -> str:
        """Add a document to the vector store. Returns doc_id."""
        _, collection = self._get_client()
        doc_id = doc_id or str(uuid.uuid4())
        meta = {
            "created_at": datetime.utcnow().isoformat(),
            **(metadata or {}),
        }
        # Ensure all metadata values are strings (ChromaDB requirement)
        meta = {k: str(v) for k, v in meta.items()}

        collection.add(documents=[text], metadatas=[meta], ids=[doc_id])
        logger.debug(f"ChromaDB added doc: {doc_id[:8]}... | {meta.get('title', 'untitled')}")
        return doc_id

    async def search(
        self,
        query: str,
        n_results: int = 5,
        where: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        """Semantic search. Returns list of {text, metadata, distance}."""
        _, collection = self._get_client()

        try:
            kwargs = {"query_texts": [query], "n_results": min(n_results, collection.count())}
            if where:
                kwargs["where"] = where

            if collection.count() == 0:
                return []

            results = collection.query(**kwargs)
            output = []
            for i, doc in enumerate(results["documents"][0]):
                output.append({
                    "text": doc,
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i],
                    "id": results["ids"][0][i],
                })
            return output

        except Exception as e:
            logger.error(f"ChromaDB search error: {e}")
            return []

    async def delete(self, doc_id: str) -> bool:
        """Delete a document by ID."""
        _, collection = self._get_client()
        try:
            collection.delete(ids=[doc_id])
            return True
        except Exception as e:
            logger.error(f"ChromaDB delete error: {e}")
            return False

    async def list_recent(self, days: int = 7, limit: int = 20) -> List[Dict]:
        """List recently added documents."""
        _, collection = self._get_client()
        try:
            if collection.count() == 0:
                return []
            cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
            results = collection.get(
                where={"created_at": {"$gte": cutoff}},
                limit=limit,
                include=["documents", "metadatas"],
            )
            output = []
            for i, doc in enumerate(results["documents"]):
                output.append({
                    "text": doc,
                    "metadata": results["metadatas"][i],
                    "id": results["ids"][i],
                })
            return output
        except Exception as e:
            logger.warning(f"ChromaDB list_recent fallback: {e}")
            return []

    async def count(self) -> int:
        """Total documents in collection."""
        _, collection = self._get_client()
        return collection.count()

    async def reset(self) -> bool:
        """Nuclear option — wipe the collection."""
        client, _ = self._get_client()
        try:
            client.delete_collection(self.collection_name)
            self._collection = None
            self._client = None
            logger.warning(f"ChromaDB collection '{self.collection_name}' wiped")
            return True
        except Exception as e:
            logger.error(f"ChromaDB reset error: {e}")
            return False
