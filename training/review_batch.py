"""Export the representative batch for a human reviewer. Machine checks cannot approve rows."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from training.review_data import export_packet

if __name__ == "__main__":
    print(export_packet("training/manifests/revclaim-v2-seed.json",
                        "artifacts/review/bilingual-batch.md", limit=70))
