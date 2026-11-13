"""Minimal voice entrypoint without importing legacy provider singletons."""
import os
import sys
from pathlib import Path

# Add backend and parent directories to sys.path
_HERE = Path(__file__).resolve().parent
for _p in [str(_HERE), str(_HERE.parent)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    from backend.api.voice_router import router
except ImportError:
    from api.voice_router import router

app = FastAPI(title="RevClaim shared voice controller")
app.include_router(router)
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in os.getenv("VOICE_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if x.strip()], allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"], allow_credentials=False)

@app.get("/health")
def health():
    return {"status": "ok", "service": "voice-controller", "model_qualified": False, "production_ready": False}
