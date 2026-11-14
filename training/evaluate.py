"""Measure response plans against held-out examples without dispatching their actions."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from training.artifacts import verify_artifacts, verify_freeze
from training.common import PipelineError, atomic_json, digest, file_hash, load_manifest_records, read_json, resolve_path, utc_now, write_jsonl
from training.data_pipeline import training_example, validate_dataset
from training.inference import HostedPredictor, LocalPredictor
from training.scoring import score_prediction, summarize

DEFAULT_CONFIG = "training/configs/revclaim-sft.json"
DEFAULT_RUN = "artifacts/training/revclaim-sft-candidate-001/full"
SEED = "training/manifests/revclaim-v3-seed.json"
SUPPORTED = {"candidate", "base", "hosted-groq", "hosted-gemini"}


def error_label(exc):
    if isinstance(exc, HTTPError):
        return f"provider_http_{exc.code}"
    if isinstance(exc, URLError):
        return "provider_connection_error"
    if isinstance(exc, PipelineError):
        return str(exc)
    return type(exc).__name__


def evaluate_run(run_dir, split="development", compare_models=None, require_freeze=False,
                 output_path="artifacts/evaluation/dialogue.json", *, config_path=DEFAULT_CONFIG,
                 manifest_path=None, max_cases=None, allow_hosted=False):
    models = ["candidate", "base"] if compare_models is None else compare_models
    run = resolve_path(run_dir)
    report = {"tool": "dialogue_evaluator", "schema_version": 2, "status": "blocked", "split": split,
              "timestamp": utc_now(), "models_requested": models, "models_evaluated": [],
              "metrics": {}, "errors_by_model": {}, "model_ids": {}, "model_qualified": False, "voice_qualified": False}
    records = []
    try:
        if split not in {"development", "locked-test"} or not models or len(set(models)) != len(models) or not set(models) <= SUPPORTED:
            raise PipelineError("invalid_split_or_model_selection")
        if max_cases is not None and (max_cases < 1 or split == "locked-test"):
            raise PipelineError("invalid_or_locked_test_sample_limit")
        locked = require_freeze or split == "locked-test"
        if "candidate" in models or locked:
            config, inventory = verify_artifacts(run)
            manifest = config["dataset_manifest"]
            if manifest_path is not None and file_hash(manifest_path) != file_hash(manifest):
                raise PipelineError("evaluation_manifest_differs_from_training")
            report["artifact_digest"] = digest(inventory)
            if locked:
                verify_freeze(run, inventory, file_hash(manifest))
        else:
            config = read_json(config_path)
            manifest = manifest_path or config["dataset_manifest"]
        checked = validate_dataset(manifest, require_human=locked or "candidate" in models, require_complete=split == "locked-test")
        if checked["status"] != "passed":
            raise PipelineError("evaluation_dataset_validation_failed")
        _, rows = load_manifest_records(manifest)
        cases = [(row, index) for row in rows if row["split"] == split for index in range(len(row["turns"]))][:max_cases]
        if not cases:
            raise PipelineError("empty_evaluation_split")
        hosted = any(model.startswith("hosted-") for model in models)
        if hosted and not (allow_hosted or os.getenv("VOICE_ALLOW_HOSTED_EVALUATION") == "1"):
            raise PipelineError("hosted_evaluation_requires_explicit_opt_in")
        if hosted and any(row["source"].get("synthetic") is not True for row, _ in cases):
            raise PipelineError("hosted_evaluation_requires_synthetic_cases")
        report.update(expected_examples=len(cases), manifest_hash=file_hash(manifest), manifest_path=str(manifest),
                      human_approved=checked["human_approved"], dataset_dialogues=checked["counts"]["dialogues"])
        for model in models:
            scores, failures = [], Counter()
            predictor = None
            try:
                if model.startswith("hosted-"):
                    predictor = HostedPredictor(model.removeprefix("hosted-"))
                    report["model_ids"][model] = predictor.model
                else:
                    predictor = LocalPredictor(config, run if model == "candidate" else None)
                    report["model_ids"][model] = config["base_model"] + "@" + config["base_revision"]
                for row, index in cases:
                    example = training_example(row, index)
                    turn = row["turns"][index]
                    record = {"example_id": example["example_id"], "prompt_hash": digest(example["messages"]),
                              "model": model, "language": row["language"],
                              "family": row["family_id"], "critical": turn["critical"]}
                    start = time.monotonic()
                    try:
                        raw = predictor.predict(example["messages"])
                    except (OSError, PipelineError, ValueError, KeyError, IndexError) as exc:
                        reason = error_label(exc)
                        failures[reason] += 1
                        records.append({**record, "inference_status": "failed", "error": reason})
                        # Wrong credentials, retired models or unavailable network affect every example.
                        if isinstance(exc, (HTTPError, URLError)) and getattr(exc, "code", None) not in {429, 500, 502, 503, 504}:
                            break
                        continue
                    score = score_prediction(raw, turn["target"], facts=turn["facts"], allowed=turn["allowed_actions"])
                    score.update(record, latency_ms=round((time.monotonic() - start) * 1000, 3), inference_status="returned")
                    scores.append(score)
                    records.append(score)
            except (OSError, PipelineError, ImportError) as exc:
                failures[error_label(exc)] += 1
            finally:
                if predictor is not None:
                    predictor.close()
            if failures:
                report["errors_by_model"][model] = dict(failures)
            if scores:
                groups = defaultdict(list)
                for score in scores:
                    groups["language:" + score["language"]].append(score)
                    groups["family:" + score["family"]].append(score)
                report["metrics"][model] = {"overall": summarize(scores), "groups": {key: summarize(vals) for key, vals in groups.items()}}
                report["models_evaluated"].append(model)
        returned = sum(record["inference_status"] == "returned" for record in records)
        report["status"] = "passed" if returned == len(cases) * len(models) else "partial" if returned else "blocked"
        report["summary"] = "Scores cover returned response plans. No call or human listening evaluation is included."
    except (OSError, ImportError, ValueError, KeyError) as exc:
        report["blocker"] = error_label(exc)
    predictions = resolve_path(output_path).with_suffix(".predictions.jsonl")
    write_jsonl(predictions, records)
    report.update(predictions_path=str(predictions), predictions_sha256=file_hash(predictions),
                  attempted_predictions=len(records), completed_predictions=sum(r["inference_status"] == "returned" for r in records))
    atomic_json(output_path, report)
    return report


def evaluate_baseline(manifest_path=SEED, models=None, split="development",
                      output_path="artifacts/evaluation/hosted-development.json", max_cases=None, *, allow_hosted=False):
    models = ["hosted-groq", "hosted-gemini"] if models is None else models
    if split != "development" or "candidate" in models:
        raise PipelineError("standalone_baseline_requires_development_and_no_candidate")
    return evaluate_run(DEFAULT_RUN, split, models, output_path=output_path, manifest_path=manifest_path,
                        max_cases=max_cases, allow_hosted=allow_hosted)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", default=DEFAULT_RUN)
    parser.add_argument("--config", default=DEFAULT_CONFIG)
    parser.add_argument("--split", choices=["development", "locked-test"], default="development")
    parser.add_argument("--compare")
    parser.add_argument("--require-freeze", action="store_true")
    parser.add_argument("--baseline-only", action="store_true")
    parser.add_argument("--allow-hosted", action="store_true", help="Send selected synthetic prompts to the requested providers")
    parser.add_argument("--output")
    parser.add_argument("--manifest")
    parser.add_argument("--max-cases", type=int)
    args = parser.parse_args()
    models = [m.strip() for m in args.compare.split(",")] if args.compare else None
    if args.baseline_only and (args.split != "development" or args.require_freeze or (models and "candidate" in models)):
        parser.error("Standalone baseline requires the development split and base or hosted models.")
    if args.baseline_only:
        models = models or ["hosted-groq", "hosted-gemini"]
    output = args.output or ("artifacts/evaluation/hosted-development.json" if args.baseline_only else "artifacts/evaluation/dialogue.json")
    report = evaluate_run(args.run, args.split, models, args.require_freeze, output, config_path=args.config,
                          manifest_path=args.manifest or (SEED if args.baseline_only else None),
                          max_cases=args.max_cases, allow_hosted=args.allow_hosted)
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
