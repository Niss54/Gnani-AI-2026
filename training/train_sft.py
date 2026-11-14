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
    from training.model_policy import validate_model_policy
    config = read_json(config_path)
    validate_model_policy(config)
    if mode not in {"smoke", "full"} or max_examples is not None and (mode != "smoke" or max_examples < 1):
        raise ValueError("invalid_training_mode_or_limit")
    run_id = config.get("run_id", "revclaim-sft-001")
    output_dir = resolve_path(config.get("output_dir", f"artifacts/training/{run_id}")) / mode
    output_dir.mkdir(parents=True, exist_ok=True)
    # Use a kernel lock that is released automatically if the process dies.
    with (output_dir / ".training.lock").open("a+b") as lock:
        try:
            if os.name == "nt":
                import msvcrt
                lock.seek(0)
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            return {"status": "blocked", "blocker": "training_run_in_progress"}
        receipt = output_dir / "run_receipt.json"
        if (output_dir / "adapter_model.safetensors").exists() or (receipt.exists() and read_json(receipt).get("status") == "passed"):
            return {"status": "blocked", "blocker": "existing_training_output_requires_new_run_directory"}
        if resume_checkpoint:
            checkpoint = resolve_path(resume_checkpoint)
            snapshot = output_dir / "training_inputs.json"
            if (checkpoint.parent != output_dir or not checkpoint.name.startswith("checkpoint-")
                    or not (checkpoint / "trainer_state.json").is_file() or not snapshot.is_file()
                    or read_json(snapshot) != training_inputs(config_path, config, mode, max_examples)):
                return {"status": "blocked", "blocker": "checkpoint_or_training_inputs_mismatch"}
        elif any(output_dir.glob("checkpoint-*")):
            return {"status": "blocked", "blocker": "existing_checkpoint_requires_resume_or_new_run"}
        return _execute(config_path, config, mode, output_dir, max_examples, resume_checkpoint)


def training_inputs(config_path, config, mode, max_examples):
    return {"config_hash": file_hash(config_path), "dataset_manifest_hash": file_hash(config["dataset_manifest"]),
            "mode": mode, "max_examples": max_examples}


def _execute(config_path, config, mode, output_dir, max_examples, resume_checkpoint):
    run_id = config["run_id"]
    env = check_environment(config_path=config_path, check_compute=False)

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
        inputs = training_inputs(config_path, config, mode, max_examples)
        atomic_json(output_dir / "training_inputs.json", inputs)
        (output_dir / "training_config.json").write_bytes(resolve_path(config_path).read_bytes())
        start_time = time.monotonic()
        measured = train_adapter(config, output_dir, mode, max_examples, resume_checkpoint)
        if inputs != training_inputs(config_path, config, mode, max_examples):
            raise ValueError("training_inputs_changed_during_run")
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
