import sys
import os
import tempfile
import atexit
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
_test_storage = tempfile.TemporaryDirectory(prefix="revclaim-voice-tests-")
atexit.register(_test_storage.cleanup)
os.environ["VOICE_DB_PATH"] = str(Path(_test_storage.name) / "bootstrap.db")

for p in (ROOT, BACKEND):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))
