"""Explicit base-model provenance gate. Unknown or research-only candidates fail closed."""
from typing import Any
from training.common import PipelineError, read_json, config_errors


def validate_model_policy(config: dict[str, Any]) -> dict[str, Any]:
    errors = config_errors(config)
    if errors:
        raise PipelineError("invalid_training_config:" + ",".join(errors))
    entry = read_json("training/model_registry.json").get(config["base_model"])
    if not entry or entry["license"] != "Apache-2.0":
        raise PipelineError("base_model_not_commercially_allowlisted")
    if config["base_revision"] != entry["revision"] or config["tokenizer_revision"] != entry["revision"]:
        raise PipelineError("base_model_revision_not_verified")
    return entry
