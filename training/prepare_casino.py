"""Prepare CaSiNo strategy supervision from the publisher's pinned dialogue splits."""
import json
import sys
import urllib.request
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from training.common import ROOT, atomic_json, file_hash, read_json, write_jsonl

REVISION = "2f6ed4a6a55110152a7699fbaa8150d6036314be"
URL = f"https://raw.githubusercontent.com/kushalchawla/CaSiNo/{REVISION}/"
RAW = ROOT / "training/data/casino-upstream"
OUT = ROOT / "training/data/casino-strategy"
HASHES = {
    "casino.json": "4f2c4560a0070906ed018c3f0766e35f8f8f31b36274ebf35b608621915744ab",
    "casino_train.json": "6b953d153fc8c78f27e911c1439b93b9b3519357e3ba825091b2e567845ba3a7",
    "casino_valid.json": "91f2d1f09accedf98667ac081fd5083752738390734e991601b036643da077e0",
    "casino_test.json": "bf6da2d7c105396300d85a65819c04d99304ac9abb8a590ba342fd0c86b4dd12",
    "LICENSE": "f5b745ef98087f531e719ee8ca6a96809444573ecc7173c6fa68eaad39b3cc3f",
}


def acquire():
    import hashlib
    RAW.mkdir(parents=True, exist_ok=True)
    for name, checksum in HASHES.items():
        target = RAW / name
        if not target.exists():
            location = name if name == "LICENSE" else ("data/" if name == "casino.json" else "data/split/") + name
            with urllib.request.urlopen(URL + location, timeout=60) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != checksum:
                raise ValueError(f"Unexpected download for {name}")
            target.write_bytes(data)
        if file_hash(target) != checksum:
            raise ValueError(f"Source mismatch in {name}")


def prepare():
    acquire()
    master = {row["dialogue_id"]: row for row in read_json(RAW / "casino.json")}
    seen = set()
    report = {}
    for part, split in (("train", "train"), ("valid", "development"), ("test", "locked-test")):
        examples = []
        rows = read_json(RAW / f"casino_{part}.json")
        for row in rows:
            group = row["dialogue_id"]
            if group in seen or master.get(group) != row:
                raise ValueError("Split overlap or upstream record mismatch")
            seen.add(group)
            history = []
            annotations = dict(row["annotations"])
            frequency = Counter(x["text"] for x in row["chat_logs"])
            for index, message in enumerate(row["chat_logs"]):
                utterance = message["text"]
                history.append({"speaker": message["id"], "text": utterance})
                if utterance not in annotations or frequency[utterance] != 1:
                    continue
                labels = sorted(set(annotations[utterance].split(",")))
                examples.append({"example_id": f"{group}:{index}", "scenario_group_id": group,
                                 "messages": [{"role": "system", "content": "Identify negotiation strategies in the last speaker turn. Return a JSON list of strategy labels."},
                                              {"role": "user", "content": json.dumps(history, ensure_ascii=False)}],
                                 "target": json.dumps(labels)})
        path = OUT / f"{split}.jsonl"
        write_jsonl(path, examples)
        report[split] = {"dialogues": len(rows), "examples": len(examples), "sha256": file_hash(path)}
    if seen != set(master):
        raise ValueError("Split coverage incomplete")
    (OUT / "LICENSE").write_bytes((RAW / "LICENSE").read_bytes())
    metadata = {"authors": "Kushal Chawla, Jaysa Ramirez, Rene Clever, Gale Lucas, Jonathan May, Jonathan Gratch",
                "title": "CaSiNo: A Corpus of Campsite Negotiation Dialogues for Automatic Negotiation Systems",
                "paper": "https://aclanthology.org/2021.naacl-main.254/", "revision": REVISION,
                "source": "https://github.com/kushalchawla/CaSiNo", "license": "CC-BY-4.0",
                "changes": "Derived context-to-strategy examples. Participant profiles omitted. Ambiguous repeated utterances omitted.",
                "splits": report, "task": "auxiliary_strategy_classification", "language": "English"}
    atomic_json(OUT / "attribution.json", metadata)
    print(report)


if __name__ == "__main__":
    prepare()
