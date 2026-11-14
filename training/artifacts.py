"""Hash-bound trained artifact and candidate freeze verification."""
from pathlib import Path
from typing import Any
from training.common import PipelineError, digest, file_hash, read_json
from training.model_policy import validate_model_policy


def verify_artifacts(run: Path) -> tuple[dict[str, Any], dict[str, str]]:
    required = ("run_receipt.json", "training_config.json", "adapter_model.safetensors", "adapter_config.json", "tokenizer_config.json", "tokenizer.json", "runtime_requirements.txt")
    if any(not (run / name).is_file() or (run / name).stat().st_size == 0 for name in required):
        raise PipelineError("trained_artifacts_missing")
    receipt = read_json(run / "run_receipt.json")
    config = read_json(run / "training_config.json")
    validate_model_policy(config)
    if receipt.get("status") != "passed" or type(receipt.get("completed_steps")) is not int or receipt["completed_steps"] <= 0 or receipt.get("adapter_weights_generated") is not True:
        raise PipelineError("successful_training_receipt_required")
    if receipt.get("adapter_sha256") != file_hash(run / "adapter_model.safetensors"):
        raise PipelineError("adapter_hash_mismatch")
    if receipt.get("config_hash") != file_hash(run / "training_config.json"):
        raise PipelineError("training_config_hash_mismatch")
    if receipt.get("dataset_manifest_hash") != file_hash(config["dataset_manifest"]):
        raise PipelineError("training_dataset_hash_mismatch")
    if receipt.get("base_model") != config["base_model"] or receipt.get("base_revision") != config["base_revision"]:
        raise PipelineError("base_model_receipt_mismatch")
    adapter = read_json(run / "adapter_config.json")
    if adapter.get("base_model_name_or_path") != config["base_model"] or adapter.get("revision") != config["base_revision"]:
        raise PipelineError("adapter_base_model_mismatch")
    inventory = {name: file_hash(run / name) for name in required}
    return config, inventory


def verify_freeze(run: Path, inventory: dict[str, str], manifest_hash: str) -> dict[str, Any]:
    freeze = read_json(run / "freeze_receipt.json")
    if freeze.get("artifact_digest") != digest(inventory) or freeze.get("manifest_hash") != manifest_hash or freeze.get("reloaded_verified") is not True:
        raise PipelineError("freeze_artifact_or_dataset_mismatch")
    return freeze
