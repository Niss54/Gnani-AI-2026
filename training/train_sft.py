"""Supervised Fine-Tuning execution script for RevClaim AI voice negotiation model.

Supports:
- --mode smoke (small validation run) and --mode full
- Pinned hyperparameters and compute resource constraints
- Hardware detection and honest reporting:
  If CUDA/Torch/Transformers are missing, outputs explicit blocker receipt with exact unblock and resume command,
  rather than fabricating pseudo-weights.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from training.common import atomic_json, file_hash, read_json, resolve_path, utc_now
from training.doctor import check_environment


def run_training(config_path: str | Path, mode: str = "smoke", max_examples: int | None = None, resume_checkpoint: str | None = None) -> dict[str, Any]:
    config = read_json(config_path)
    env = check_environment(config_path=config_path, check_compute=False)

    run_id = config.get("run_id", "revclaim-sft-001")
    output_dir = resolve_path(config.get("output_dir", f"artifacts/training/{run_id}")) / mode
    output_dir.mkdir(parents=True, exist_ok=True)

    has_gpu = env["compute"]["cuda_available"]
    has_ml_stack = all(env["packages"].get(p) for p in ("transformers", "peft", "accelerate", "datasets", "bitsandbytes"))

    receipt_path = output_dir / "run_receipt.json"

    # If full ML environment is not available, record honest compute blocker
    if not (has_gpu and has_ml_stack):
        receipt = {
            "run_id": f"{run_id}-{mode}",
            "mode": mode,
            "status": "blocked",
            "milestone": "COMPUTE_BLOCKED",
            "fixture_only": True,
            "timestamp": utc_now(),
            "config_hash": file_hash(config_path),
            "base_model": config["base_model"],
            "base_revision": config["base_revision"],
            "blocker": {
                "id": "COMPUTE_UNAVAILABLE",
                "reason": "Compatible GPU (CUDA) and ML libraries (torch, transformers, peft, accelerate, datasets, bitsandbytes) are required for active model weights training.",
                "observed_hardware": env["compute"],
                "missing_packages": [p for p in ("transformers", "peft", "accelerate", "datasets", "bitsandbytes") if not env["packages"].get(p)],
                "unblock_requirement": "Provision GPU instance with PyTorch >= 2.4, CUDA >= 12.1, and run pip install -r training/requirements.txt",
                "exact_resume_command": f"python training/train_sft.py --config {config_path} --mode {mode}" + (f" --max-examples {max_examples}" if max_examples else ""),
            },
            "output_directory": str(output_dir),
            "completed_steps": 0,
            "adapter_weights_generated": False,
        }
        atomic_json(receipt_path, receipt)
        return receipt

    # If ML environment is present, execute training loop
    try:
        from training.training_engine import train_adapter
        start_time = time.monotonic()
        measured = train_adapter(config, output_dir, mode, max_examples, resume_checkpoint)
        receipt = {
            "run_id": f"{run_id}-{mode}",
            "mode": mode,
            "status": "passed",
            "milestone": "SMOKE_TRAINED" if mode == "smoke" else "CANDIDATE_TRAINED",
            "timestamp": utc_now(),
            "config_hash": file_hash(config_path),
            "base_model": config["base_model"],
            "base_revision": config["base_revision"],
            "output_directory": str(output_dir),
            "elapsed_seconds": round(time.monotonic() - start_time, 2),
            **measured,
        }
        atomic_json(receipt_path, receipt)
        return receipt

    except Exception as exc:
        receipt = {
            "run_id": f"{run_id}-{mode}",
            "mode": mode,
            "status": "failed",
            "timestamp": utc_now(),
            "error": str(exc),
            "output_directory": str(output_dir),
        }
        atomic_json(receipt_path, receipt)
        return receipt


def main() -> int:
    parser = argparse.ArgumentParser(description="Run SFT model training (smoke or full).")
    parser.add_argument("--config", default="training/configs/revclaim-sft.json", help="Path to training config")
    parser.add_argument("--mode", choices=["smoke", "full"], default="smoke", help="Training mode")
    parser.add_argument("--max-examples", type=int, default=None, help="Maximum examples for smoke mode")
    parser.add_argument("--resume", default=None, help="Checkpoint path to resume from")

    args = parser.parse_args()
    receipt = run_training(args.config, mode=args.mode, max_examples=args.max_examples, resume_checkpoint=args.resume)

    print(json.dumps(receipt, indent=2))
    return 0 if receipt.get("status") == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
