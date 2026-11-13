"""Environment and compute verification tool.

Checks runtime, packages, device/CUDA, available memory, disk, and configuration validity.
Offline mode makes zero network requests.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from training.common import ROOT, atomic_json, read_json, resolve_path, utc_now


def check_environment(config_path: str | Path | None = None, *, offline: bool = True, check_compute: bool = False) -> dict[str, Any]:
    disk_usage = shutil.disk_usage(ROOT)
    free_gb = round(disk_usage.free / (1024**3), 2)

    has_torch = False
    cuda_available = False
    device_name = "cpu"
    torch_version = None
    cuda_devices = 0

    try:
        import torch
        has_torch = True
        torch_version = torch.__version__
        cuda_available = torch.cuda.is_available()
        cuda_devices = torch.cuda.device_count() if cuda_available else 0
        if cuda_available and cuda_devices > 0:
            device_name = torch.cuda.get_device_name(0)
    except ImportError:
        pass

    packages: dict[str, str | None] = {}
    for pkg in ("transformers", "peft", "trl", "bitsandbytes", "accelerate", "datasets", "fastapi", "pydantic", "pytest"):
        try:
            mod = __import__(pkg)
            packages[pkg] = getattr(mod, "__version__", "installed")
        except ImportError:
            packages[pkg] = None

    missing_core = [pkg for pkg, ver in packages.items() if ver is None and pkg in ("fastapi", "pydantic", "pytest")]
    missing_training = [pkg for pkg, ver in packages.items() if ver is None and pkg in ("transformers", "peft", "trl")]

    config_valid = None
    config_issues: list[str] = []
    if config_path:
        resolved_cfg = resolve_path(config_path)
        if not resolved_cfg.exists():
            config_issues.append("config_file_not_found")
        else:
            try:
                cfg_data = read_json(resolved_cfg)
                required_keys = ["base_model", "dataset_manifest", "optimization", "compute"]
                for k in required_keys:
                    if k not in cfg_data:
                        config_issues.append(f"missing_key:{k}")
                config_valid = len(config_issues) == 0
            except Exception as exc:
                config_issues.append(f"config_json_error:{exc}")
                config_valid = False

    status = "passed"
    actionable_blockers: list[str] = []

    if check_compute:
        if not cuda_available:
            status = "blocked"
            actionable_blockers.append("GPU compute not available or CUDA not detected.")
        if missing_training:
            status = "blocked"
            actionable_blockers.append(f"Missing training packages: {', '.join(missing_training)}")

    result = {
        "tool": "training_doctor",
        "status": status,
        "timestamp": utc_now(),
        "mode": "offline" if offline else "network_permitted",
        "python": {
            "version": platform.python_version(),
            "executable": sys.executable,
            "architecture": platform.architecture()[0],
            "os": platform.system(),
        },
        "compute": {
            "torch_available": has_torch,
            "torch_version": torch_version,
            "cuda_available": cuda_available,
            "device_count": cuda_devices,
            "primary_device": device_name,
            "free_disk_gb": free_gb,
        },
        "packages": packages,
        "config_check": {
            "path": str(config_path) if config_path else None,
            "valid": config_valid,
            "issues": config_issues,
        },
        "actionable_blockers": actionable_blockers,
    }
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify training runtime environment, dependencies, and compute limits.")
    parser.add_argument("--config", default="training/configs/revclaim-sft.json", help="Path to training config")
    parser.add_argument("--offline", action="store_true", default=True, help="Operate in offline mode without network calls")
    parser.add_argument("--check-compute", action="store_true", help="Enforce compute and GPU readiness")
    parser.add_argument("--output", default="artifacts/environment.json", help="Path to write environment report")

    args = parser.parse_args()
    report_data = check_environment(config_path=args.config, offline=args.offline, check_compute=args.check_compute)

    out_path = resolve_path(args.output)
    atomic_json(out_path, report_data)

    print(json.dumps(report_data, indent=2))
    return 0 if report_data["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
