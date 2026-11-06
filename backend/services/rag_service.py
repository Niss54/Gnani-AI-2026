"""RevClaim AI — BM25 RAG 2.0 Statutory & Debt Recovery Knowledge Engine.

Indexes legal statutory guidelines (MSMED Act 2006, Section 15 & 16, Income Tax Section 43B(h),
Promise-To-Pay concession policies, and regional Indic business etiquette) to ground AI voice
negotiations in verifiable facts with sub-millisecond retrieval.
"""

from __future__ import annotations

import logging
import math
import os
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

logger = logging.getLogger("rag_service")

KNOWLEDGE_DIR = os.getenv(
    "RECOVERY_KNOWLEDGE_DIR",
    str(Path(__file__).parent.parent / "data" / "knowledge"),
)


@dataclass
class LegalKnowledgeChunk:
    doc_title: str
    section_title: str
    content: str
    tokens: List[str]


class StatutoryKnowledgeBase:
    """High-speed BM25 search engine for Indian debt recovery statutes & policies."""

    def __init__(self, knowledge_dir: str = KNOWLEDGE_DIR) -> None:
        self.knowledge_dir = Path(knowledge_dir)
        self.chunks: List[LegalKnowledgeChunk] = []
        self.doc_freqs: Counter[str] = Counter()
        self.num_chunks: int = 0
        self.avg_chunk_len: float = 0.0
        self._load_and_index()

    def _tokenize(self, text: str) -> List[str]:
        cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
        tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 1]
        return tokens

    def _load_and_index(self) -> None:
        if not self.knowledge_dir.exists():
            logger.warning("Knowledge directory %s not found", self.knowledge_dir)
            return

        total_tokens = 0
        for md_file in sorted(self.knowledge_dir.glob("*.md")):
            try:
                text = md_file.read_text(encoding="utf-8")
                doc_title = md_file.stem.replace("_", " ").title()

                # Split by markdown headers (# or ##)
                sections = re.split(r"\n(?=#{1,3}\s)", text)
                for section in sections:
                    lines = section.strip().splitlines()
                    if not lines:
                        continue
                    first_line = lines[0]
                    section_title = first_line.lstrip("#").strip()
                    content = (
                        "\n".join(lines[1:]).strip() if len(lines) > 1 else first_line
                    )
                    if not content:
                        content = section_title

                    tokens = self._tokenize(f"{doc_title} {section_title} {content}")
                    if not tokens:
                        continue

                    chunk = LegalKnowledgeChunk(
                        doc_title=doc_title,
                        section_title=section_title,
                        content=content,
                        tokens=tokens,
                    )
                    self.chunks.append(chunk)
                    total_tokens += len(tokens)

                    for t in set(tokens):
                        self.doc_freqs[t] += 1
            except Exception as e:
                logger.error("Failed indexing knowledge doc %s: %s", md_file, e)

        self.num_chunks = len(self.chunks)
        self.avg_chunk_len = (
            total_tokens / self.num_chunks if self.num_chunks > 0 else 1.0
        )
        logger.info("Indexed %d statutory debt recovery chunks into BM25 engine", self.num_chunks)

    def search(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """Search legal knowledge base using BM25 relevance scoring."""
        if not self.chunks or not query.strip():
            return []

        query_tokens = self._tokenize(query)
        if not query_tokens:
            return []

        k1 = 1.5
        b = 0.75
        scores: List[Tuple[float, LegalKnowledgeChunk]] = []

        for chunk in self.chunks:
            score = 0.0
            chunk_len = len(chunk.tokens)
            chunk_counts = Counter(chunk.tokens)

            for token in query_tokens:
                if token not in chunk_counts:
                    continue

                tf = chunk_counts[token]
                df = self.doc_freqs.get(token, 0)
                # Robertson-Spärck Jones IDF with smoothing
                idf = math.log((self.num_chunks - df + 0.5) / (df + 0.5) + 1.0)
                denom = tf + k1 * (1.0 - b + b * (chunk_len / self.avg_chunk_len))
                score += idf * (tf * (k1 + 1.0)) / denom

            if score > 0.0:
                scores.append((score, chunk))

        scores.sort(key=lambda x: x[0], reverse=True)
        top_results = scores[:top_k]

        results = []
        for sc, chunk in top_results:
            results.append({
                "score": round(sc, 3),
                "doc_title": chunk.doc_title,
                "section_title": chunk.section_title,
                "content": chunk.content,
            })

        return results

    def get_grounding_context(self, query: str, top_k: int = 2) -> str:
        """Convenience method returning formatted statutory grounding string for LLM prompts."""
        results = self.search(query, top_k=top_k)
        if not results:
            return ""

        parts = []
        for r in results:
            parts.append(f"[{r['doc_title']} - {r['section_title']}]:\n{r['content']}")
        return "\n\n".join(parts)


# Global singleton instance
statutory_rag_engine = StatutoryKnowledgeBase()
