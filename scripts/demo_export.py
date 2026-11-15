"""Export a self-contained walkthrough from the current controller and recorded TTS."""
import argparse
import asyncio
import base64
import html
import json
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from training.common import file_hash, load_manifest_records
from training.replay_controller import replay

SEED = "training/manifests/revclaim-v3-seed.json"
DEFAULT_AUDIO = ROOT / "artifacts/evaluation/listening/70f92b7b-5663-4161-b468-1a413b377feb/listening.json"
TITLES = {"tentative": "A possible payment", "listen": "A caller wants to finish",
          "trust": "A question about trust", "dispute": "A disputed balance",
          "safety_close": "A caller at the wheel"}


def audio_section(manifest_path):
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    players = []
    if manifest["capture"] != "provider_sample":
        raise ValueError("Expected a provider-generated voice sample")
    for clip in manifest["clips"]:
        path = manifest_path.parent / clip["path"]
        if file_hash(path) != clip["sha256"]:
            raise ValueError("Listening clip hash mismatch")
        with wave.open(str(path)) as wav:
            if not wav.getnframes() or wav.getframerate() <= 0:
                raise ValueError("Empty listening clip")
        language = {"en-IN": "English", "hi-en": "Hinglish"}[clip["language"]]
        source = base64.b64encode(path.read_bytes()).decode("ascii")
        players.append(f'<article><h3>{language}</h3><p>{html.escape(clip["reference"])}</p>'
                       f'<audio aria-label="{language} sample" controls preload="none" src="data:audio/wav;base64,{source}"></audio></article>')
    if {c["language"] for c in manifest["clips"]} != {"en-IN", "hi-en"}:
        raise ValueError("Both language clips are required")
    return "".join(players)


def render_case(result, utterance):
    language = "English" if result["language"] == "en" else "Hinglish"
    actions = ", ".join(result["observed_actions"])
    return (f'<article><h3>{language}</h3><small>Caller</small><p>{html.escape(utterance)}</p>'
            f'<small>RevClaim</small><p>{html.escape(result["spoken_text"])}</p>'
            f'<footer>Intent <code>{html.escape(result["intent"])}</code><br>'
            f'Observed action <code>{html.escape(actions)}</code></footer></article>')


async def export(output, audio):
    output.parent.mkdir(parents=True, exist_ok=True)
    report = await replay(SEED, str(output.parent / "controller-replay.json"))
    _, rows = load_manifest_records(SEED)
    callers = {f'{r["example_id"]}-{i}': t["messages"][-1]["content"]
               for r in rows for i, t in enumerate(r["turns"]) if r["split"] == "development"}
    groups = {}
    for result in report["results"]:
        group = result["example"].split("-")[1]
        groups.setdefault(group, []).append(render_case(result, callers[result["example"]]))
    sections = []
    shown = set()
    for intent, title in TITLES.items():
        for result in report["results"]:
            group = result["example"].split("-")[1]
            if result["expected_intent"] != intent or group in shown:
                continue
            opened = " open" if not sections else ""
            sections.append(f'<details{opened}><summary>{title}</summary><div class="pair">{"".join(groups[group])}</div></details>')
            shown.add(group)
    if set(groups) != shown:
        raise ValueError("Unmapped scenario: update titles before exporting")
    clips = audio_section(audio)
    content = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RevClaim | Call walkthrough</title>
<style>
*{{box-sizing:border-box}}body{{margin:0;background:#f4f3ef;color:#172a30;font:17px/1.55 system-ui,sans-serif}}main{{width:min(58rem,92%);margin:2rem auto 4rem}}header{{border-bottom:2px solid #173c43;padding-bottom:1.5rem}}
h1,h2,h3,p{{margin:0 0 .7rem}}h1{{font-family:Georgia,serif;font-size:clamp(2.4rem,7vw,4.6rem);letter-spacing:-.045em;line-height:1.06;color:#16424a}}
h2{{font:2rem Georgia,serif;margin-top:2rem}}h3{{font-size:1.05rem}}small,footer{{color:#3c555c}}small{{display:block;font-weight:650}}details{{border:1px solid #b7c6c6;margin:.6rem 0;background:white;border-radius:.6rem;overflow:hidden}}summary{{cursor:pointer;padding:1rem;font-weight:650;background:#e6eeec}}summary:focus-visible{{outline:3px solid #cd600c;outline-offset:-4px}}.pair{{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:1rem}}article{{background:white;padding:1rem;min-width:0;border-radius:.5rem}}code{{overflow-wrap:anywhere}}audio{{width:100%}}
</style></head><body><main><header><p>RevClaim / Offline walkthrough</p><h1>Listening on a billing call</h1><p>Open a case to see what the caller said, how the billing assistant answered, and which action the controller chose.</p></header>
<section><h2>Conversation replay</h2><p>These synthetic development cases ran through the project's policy controller. The replay executor records attempted actions locally. A failed tool request appears in the response; no external contact or payment occurs.</p>
{''.join(sections)}</section><section><h2>Voice samples</h2><p>These prerecorded synthesis examples ask the caller to clarify an amount. They are separate from the controller transcripts above.</p><div class="pair">{clips}</div></section>
<section><h2>Run evidence</h2><p>{report["intent_matches"]} of {report["cases"]} expected intents and {report["action_matches"]} of {report["cases"]} expected actions matched on the development replay. The controller used deterministic rules with hosted inference disabled. Naturalness and phone-call timing require separate testing.</p></section></main></body></html>"""
    output.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts/demo/RevClaim-walkthrough.html")
    parser.add_argument("--audio-manifest", type=Path, default=DEFAULT_AUDIO)
    args = parser.parse_args()
    asyncio.run(export(args.output.resolve(), args.audio_manifest.resolve()))
    print(args.output.resolve())
