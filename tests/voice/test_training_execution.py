import json
from pathlib import Path
from urllib.error import HTTPError

import pytest

from training import evaluate
from training.artifacts import verify_artifacts
from training.common import PipelineError, atomic_json, file_hash, read_json
from training.scoring import score_prediction
from training.train_sft import run_training


def test_baseline_provider_outages_do_not_count_as_model_responses(monkeypatch, tmp_path):
    class Failing:
        model = "synthetic-fixture"
        def __init__(self, provider):
            pass
        def predict(self, messages):
            raise HTTPError("redacted", 404, "", {}, None)
        def close(self):
            pass

    monkeypatch.setattr(evaluate, "HostedPredictor", Failing)
    report = evaluate.evaluate_baseline(models=["hosted-gemini"], max_cases=2, allow_hosted=True, output_path=tmp_path / "out.json")
    assert report["status"] == "blocked"
    assert report["metrics"] == {}
    assert report["attempted_predictions"] == 1 and report["completed_predictions"] == 0
    assert report["errors_by_model"] == {"hosted-gemini": {"provider_http_404": 1}}


def test_development_can_evaluate_local_base_before_candidate_training(monkeypatch, tmp_path):
    class Base:
        def __init__(self, config, adapter):
            assert adapter is None
        def predict(self, messages):
            assert all(m["role"] != "assistant" for m in messages)
            return "{}"
        def close(self):
            pass
    monkeypatch.setattr(evaluate, "LocalPredictor", Base)
    report = evaluate.evaluate_baseline(models=["base"], max_cases=2, output_path=tmp_path / "out.json")
    assert report["status"] == "passed" and report["completed_predictions"] == 2
    assert report["metrics"]["base"]["overall"]["schema_valid_rate"] == 0
    assert report["human_approved"] == 0 and not report["model_qualified"]


def test_baseline_cannot_bypass_locked_test_freeze(tmp_path):
    with pytest.raises(PipelineError):
        evaluate.evaluate_baseline(models=["base"], split="locked-test", output_path=tmp_path / "locked.json")
    assert not (tmp_path / "locked.json").exists()


def test_scoring_rejects_nonfinite_json_without_aborting_eval():
    target = {"language": "en", "turn_id": "T0", "intent": "clarify", "proposed_action": "clarify",
              "candidate_slots": {}, "required_fact_refs": [], "needs_clarification": True, "tool_request": None}
    for raw in ['{"candidate_slots": {"amount": NaN}}', '{"candidate_slots":{"amount":1e999}}']:
        score = score_prediction(raw, target, allowed=["clarify"], facts={})
        assert score["schema_valid"] is False and score["prediction"] is None


def test_retry_preserves_successful_receipt_even_without_gpu(tmp_path):
    config = read_json(evaluate.DEFAULT_CONFIG)
    config["output_dir"] = str(tmp_path / "runs")
    atomic_json(tmp_path / "config.json", config)
    run = tmp_path / "runs" / "smoke"
    run.mkdir(parents=True)
    prior = {"status": "passed", "completed_steps": 2}
    atomic_json(run / "run_receipt.json", prior)
    report = run_training(tmp_path / "config.json")
    assert report["status"] == "blocked"
    assert read_json(run / "run_receipt.json") == prior


def test_adapter_binds_to_the_training_dataset(tmp_path):
    config = read_json(evaluate.DEFAULT_CONFIG)
    config["dataset_manifest"] = str(tmp_path / "manifest.json")
    atomic_json(config["dataset_manifest"], {})
    atomic_json(tmp_path / "training_config.json", config)
    for name in ("adapter_model.safetensors", "tokenizer_config.json", "tokenizer.json", "runtime_requirements.txt"):
        (tmp_path / name).write_text("synthetic-test-data")
    atomic_json(tmp_path / "adapter_config.json", {"base_model_name_or_path": config["base_model"], "revision": config["base_revision"]})
    atomic_json(tmp_path / "run_receipt.json", {"status": "passed", "completed_steps": 1, "adapter_weights_generated": True,
                "base_model": config["base_model"], "base_revision": config["base_revision"],
                "adapter_sha256": file_hash(tmp_path / "adapter_model.safetensors"), "config_hash": file_hash(tmp_path / "training_config.json"),
                "dataset_manifest_hash": file_hash(config["dataset_manifest"])})
    verify_artifacts(tmp_path)
    atomic_json(config["dataset_manifest"], {"changed": True})
    with pytest.raises(PipelineError, match="training_dataset_hash_mismatch"):
        verify_artifacts(tmp_path)
