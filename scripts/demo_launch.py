"""Start the local judge demo. Stop with Ctrl+C."""
import argparse
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def app():
    from fastapi import FastAPI
    from backend.api.demo_router import router
    service = FastAPI(title="RevClaim demo")
    service.include_router(router)
    return service


def free_port(port):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", port))


def launch(api_port, web_port):
    if api_port == web_port:
        raise ValueError("Choose separate API and frontend ports")
    for port in (api_port, web_port):
        free_port(port)
    node = shutil.which("node")
    # Resolve Next from the frontend workspace so the compiler and renderer match.
    next_bin = Path(subprocess.check_output(
        [node, "-p", "require.resolve('next/dist/bin/next')"], cwd=ROOT / "frontend", text=True
    ).strip()) if node else None
    if not next_bin or not next_bin.is_file():
        raise SystemExit("Install project Node dependencies with npm ci at the repository root.")
    api_url = f"http://127.0.0.1:{api_port}"
    env = dict(os.environ, VOICE_BACKEND_URL=api_url, NEXT_PUBLIC_BACKEND_URL=api_url,
               BACKEND_URL=api_url, NEXT_TELEMETRY_DISABLED="1")
    commands = [
        ([sys.executable, "-m", "uvicorn", "scripts.demo_launch:app", "--factory", "--host", "127.0.0.1", "--port", str(api_port)], ROOT),
        ([node, str(next_bin), "dev", "--hostname", "127.0.0.1", "--port", str(web_port)], ROOT / "frontend"),
    ]
    processes = []
    try:
        for cmd, cwd in commands:
            processes.append(subprocess.Popen(cmd, cwd=cwd, env=env))
        print(f"Open http://127.0.0.1:{web_port}/demo after the frontend is ready.", flush=True)
        while all(proc.poll() is None for proc in processes):
            time.sleep(1)
        raise SystemExit(next(proc.returncode for proc in processes if proc.returncode is not None))
    except KeyboardInterrupt:
        pass
    finally:
        for proc in reversed(processes):
            if proc.poll() is None:
                if os.name == "nt":
                    subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)
                else:
                    proc.terminate()
                proc.wait(timeout=10)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-port", default=8030, type=int)
    parser.add_argument("--web-port", default=3030, type=int)
    args = parser.parse_args()
    launch(args.api_port, args.web_port)
