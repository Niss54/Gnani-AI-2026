"""Root ASGI application entrypoint for Render and cloud web hosts.

Ensures seamless deployment whether Root Directory is repository root or backend/.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

for directory in [ROOT_DIR, BACKEND_DIR]:
    path_str = str(directory)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)

from backend.main import app  # noqa: E402

# Explicit health check for Render web service monitors
@app.get("/health", tags=["Health"])
def render_health():
    return {
        "status": "healthy",
        "service": "RevClaim AI Telephony & Revenue Recovery API",
        "version": "1.0.0",
    }
