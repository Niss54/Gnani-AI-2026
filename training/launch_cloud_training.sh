#!/usr/bin/env bash
# Run on an already-provisioned CUDA host, from the root of this project.
# Usage: bash training/launch_cloud_training.sh path/to/approved-config.json [smoke|full]
set -euo pipefail
config="${1:-training/configs/revclaim-sft.json}"
stage="${2:-smoke}"
case "$stage" in smoke|full) ;; *) echo "Choose smoke or full" >&2; exit 2 ;; esac

# Reject missing, draft or inconsistent data before installing packages or downloading weights.
manifest=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["dataset_manifest"])' "$config")
run=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["output_dir"])' "$config")
complete=()
if [[ "$stage" == full ]]; then complete+=(--require-complete); fi
python3 training/validate_data.py --manifest "$manifest" --require-human-approved "${complete[@]}"
nvidia-smi
python3 -m pip install -r training/requirements.txt
python3 training/doctor.py --config "$config" --check-compute
python3 - "$config" <<'PY'
import sys
from huggingface_hub import snapshot_download
from training.common import read_json
from training.model_policy import validate_model_policy
config = read_json(sys.argv[1])
validate_model_policy(config)
snapshot_download(config["base_model"], revision=config["base_revision"],
                  allow_patterns=["*.json", "*.txt", "*.jinja", "*.safetensors", "LICENSE"])
PY

if [[ "$stage" == smoke ]]; then
  python3 training/train_sft.py --config "$config" --mode smoke --max-examples 200
  python3 training/package_model.py --run "$run/smoke" --verify-reload
else
  python3 training/train_sft.py --config "$config" --mode full
  python3 training/evaluate.py --run "$run/full" --split development --compare candidate,base --output "$run/full/development.json"
  python3 training/package_model.py --run "$run/full" --verify-reload --freeze-candidate
  python3 training/evaluate.py --run "$run/full" --split locked-test --require-freeze --compare candidate,base --output artifacts/evaluation/locked-test.json
fi
