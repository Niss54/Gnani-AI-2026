"""Build bilingual offer-readback examples using the published Study 1 protocol acts."""
import csv
import hashlib
import json
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from training.common import ROOT, atomic_json, canonical_json, digest, file_hash, read_jsonl, write_jsonl

REVISION = "87aaeb208a7b67788ad0b1a3dd41670e72d6de26"
REPO = "https://huggingface.co/datasets/spectralbranding/negotiation-spec-experiment"
RAW = ROOT / "training/data/negotiation-study1"
OUT = ROOT / "training/data/offer-readback"
SOURCES = {
    "README.md": "b2440a164b95e1f506f82cc9792b336e6110f4620768bda6f72f1205293d6494",
    "outcomes/study1.csv": "d1e0437279de9abf76be2a73f258aa5b20c56b695979b8f531300c9c2f255163",
    "transcripts/study1.jsonl": "205cebe70ad81657b98d5eaed8ce32698b04b239fa00fbfd08f107ee611c1b52",
}
# Entire scenario families stay together, including both language renderings.
SPLIT = {"offer": "train", "rental": "development", "chair": "locked-test"}
FIELDS = {
    "salary_usd_annual": ("annual salary in dollars", "saal ki salary dollars mein"),
    "remote_days_per_week": ("remote days per week", "hafte mein remote days"),
    "start_weeks": ("weeks until start", "join karne tak ke hafte"),
    "rent_monthly_usd": ("monthly rent in dollars", "mahine ka rent dollars mein"),
    "lease_length_months": ("lease length in months", "lease ki duration mahino mein"),
    "repair_allowance_usd": ("repair allowance in dollars", "repair allowance dollars mein"),
    "price": ("price in dollars", "keemat dollars mein"),
}


def prepare():
    RAW.mkdir(parents=True, exist_ok=True)
    for location, checksum in SOURCES.items():
        path = RAW / Path(location).name
        if not path.exists():
            with urllib.request.urlopen(f"{REPO}/resolve/{REVISION}/{location}", timeout=60) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != checksum:
                raise ValueError("Download checksum mismatch")
            path.write_bytes(data)
        if file_hash(path) != checksum:
            raise ValueError(f"Source changed: {path.name}")
    with (RAW / "study1.csv").open(encoding="utf8", newline="") as stream:
        outcomes = {r["dyad_id"]: r for r in csv.DictReader(stream)}
    examples = defaultdict(list)
    seen = set()
    rows = read_jsonl(RAW / "study1.jsonl")
    if len(rows) != len(outcomes) or {r["dyad_id"] for r in rows} != set(outcomes):
        raise ValueError("Transcript and outcome IDs differ")
    for row in rows:
        if row["mock"] or outcomes[row["dyad_id"]]["scenario_id"] != row["scenario_id"]:
            raise ValueError("Unexpected study record")
        for index, turn in enumerate(row["turns"]):
            public = turn["text"].split("</think>")[-1]
            match = re.search(r'\bOFFER:\s*(\{[^{}]+\})\s*$', public)
            if not match or "<think>" in public:
                continue
            try:
                terms = json.loads(match[1])
            except ValueError:
                continue
            if not terms or not all(k in FIELDS and re.fullmatch(r"\d+", str(v)) for k, v in terms.items()):
                continue
            terms = {k: int(terms[k]) for k in sorted(terms)}
            key = digest(terms)
            if key in seen:
                continue
            seen.add(key)
            for lang in (0, 1):
                items = ", ".join(f"{FIELDS[k][lang]} {v}" for k, v in terms.items())
                utterance = ("Here is my proposal: " if lang == 0 else "Mera proposal hai: ") + items + "."
                system = "Extract the proposed terms as integer JSON fields. Do not record agreement. Field names: " + ", ".join(sorted(FIELDS))
                examples[SPLIT[row["scenario_id"]]].append({
                    "example_id": f"{key}-{'hi-en' if lang else 'en'}", "scenario_group_id": row["scenario_id"],
                    "source_dyad": row["dyad_id"], "source_turn": index, "language": "hi-en" if lang else "en",
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": utterance}],
                    "target": canonical_json({"status": "proposed", "terms": terms})})
    inventory = {}
    for split in SPLIT.values():
        if not examples[split]:
            raise ValueError(f"Empty split: {split}")
        path = OUT / f"{split}.jsonl"
        write_jsonl(path, examples[split])
        inventory[split] = {"rows": len(examples[split]), "sha256": file_hash(path)}
    atomic_json(OUT / "attribution.json", {"publisher": "spectralbranding", "title": "Negotiation Spec Experiment — Transcripts & Outcomes",
        "source": REPO, "revision": REVISION, "license": "https://creativecommons.org/licenses/by/4.0/",
        "changes": "Study 1 unique numeric proposals rendered as synthetic English and Hinglish extraction exercises.",
        "dialogues": len(rows), "scenario_splits": SPLIT, "files": inventory})
    return inventory


if __name__ == "__main__":
    print(json.dumps(prepare(), indent=2))
