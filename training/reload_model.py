"""Fresh-process adapter load and generation check; never a quality qualification."""
import argparse
import json
import sys
from pathlib import Path

if str(Path(__file__).resolve().parents[1]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from training.artifacts import verify_artifacts
from training.common import atomic_json, digest, resolve_path, utc_now


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", required=True)
    args = parser.parse_args()
    run = resolve_path(args.run)
    result = {"status": "failed", "timestamp": utc_now(), "reloaded_verified": False}
    predictor = None
    try:
        from training.inference import LocalPredictor
        config, inventory = verify_artifacts(run)
        predictor = LocalPredictor(config, run)
        reply = predictor.predict([{"role": "system", "content": "You are an AI assistant. Answer briefly."}, {"role": "user", "content": "Identify yourself as an AI billing assistant without inventing invoice details."}])
        if not reply.strip():
            raise ValueError("empty_generation")
        result.update(status="passed", reloaded_verified=True, artifact_digest=digest(inventory), generated_characters=len(reply))
    except Exception as exc:
        result["error_type"] = type(exc).__name__
    finally:
        if predictor:
            predictor.close()
    atomic_json(run / "reload_receipt.json", result)
    print(json.dumps(result))
    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
