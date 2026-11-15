"""Fit intent centroids on training groups only, then score the development split."""
import argparse
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.services.intent_index import IntentIndex
from training.common import atomic_json, file_hash, load_manifest_records
from training.data_pipeline import validate_dataset


def fit(manifest, output):
    checked = validate_dataset(manifest)
    if checked["status"] != "passed":
        raise ValueError("Dataset validation failed")
    _, rows = load_manifest_records(manifest)
    splits = {"train": [], "development": []}
    for row in rows:
        if row["split"] not in splits:
            continue
        for turn in row["turns"]:
            caller = next((m for m in reversed(turn["messages"]) if m["role"] == "user"), None)
            if caller:
                splits[row["split"]].append((row["language"], turn["target"]["intent"], caller["content"]))
    index = IntentIndex(splits["train"])
    results = [index.classify(lang, text) for lang, _, text in splits["development"]]
    correct = sum(pred == row[1] for pred, row in zip(results, splits["development"]))
    report = {"manifest_sha256": file_hash(manifest), "training_turns": len(splits["train"]),
              "development_turns": len(results), "correct": correct, "abstained": results.count(None),
              "human_approved": checked["human_approved"], "qualified": False}
    atomic_json(Path(output) / "centroids.json", index.centroids)
    atomic_json(Path(output) / "evaluation.json", report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default="training/manifests/revclaim-v3-seed.json")
    parser.add_argument("--output", default="artifacts/training/intent-index")
    args = parser.parse_args()
    print(fit(args.manifest, args.output))
