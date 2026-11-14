"""Replay synthetic development transcripts through the call controller using isolated sqlite and inert tools."""
import argparse
import asyncio
import json
import os
import sys
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.contracts.voice import CreditorMandate, FinalTranscriptEvent, InvoiceContext, SessionSnapshot, ToolResult
from backend.services.conversation_controller import ConversationController
from backend.services.provider_registry import GeminiIntentProvider, OpenAICompatibleIntentProvider, ProviderRegistry
from backend.services.voice_repository import SqliteVoiceRepository
from training.common import PipelineError, atomic_json, file_hash, load_manifest_records, utc_now
from training.data_pipeline import validate_dataset


class RecordingExecutor:
    def __init__(self):
        self.requests = []

    async def execute(self, request, context):
        self.requests.append(request.tool)
        return ToolResult(request.operation_id, "failed", detail_status="development_replay_no_dispatch")


def registry(hosted):
    providers = []
    if hosted:
        from dotenv import load_dotenv
        load_dotenv(ROOT / "backend" / ".env")
        load_dotenv(ROOT / ".env")
        if os.getenv("GROQ_API_KEY"):
            providers.append(OpenAICompatibleIntentProvider(name="groq", endpoint="https://api.groq.com/openai/v1/chat/completions",
                                                            model=os.getenv("VOICE_GROQ_MODEL", "qwen/qwen3.8-27b"), api_key=os.environ["GROQ_API_KEY"]))
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if gemini_key:
            providers.append(GeminiIntentProvider(model=os.getenv("VOICE_GEMINI_MODEL", "gemini-2.5-flash"), api_key=gemini_key))
        if not providers:
            raise PipelineError("hosted_providers_unconfigured")
    return ProviderRegistry(providers, turn_timeout=2.0, attempt_timeout=1.0)


async def replay(manifest_path, output_path, *, hosted=False):
    validated = validate_dataset(manifest_path)
    if validated["status"] != "passed":
        raise PipelineError("invalid_dataset")
    _, rows = load_manifest_records(manifest_path)
    cases = [row for row in rows if row["split"] == "development"]
    if not cases or any(row["source"].get("synthetic") is not True for row in cases):
        raise PipelineError("synthetic_development_rows_required")
    results = []
    providers = registry(hosted)
    with tempfile.TemporaryDirectory(prefix="revclaim-replay-") as folder:
        repo = SqliteVoiceRepository(Path(folder) / "voice.db")
        for row in cases:
            for index, turn in enumerate(row["turns"]):
                identity = f'{row["example_id"]}-{index}'
                facts = turn["facts"]
                # Synthetic IDs and numeric placeholders are required by InvoiceContext. The replay
                # checks intent/attempted action only and does not qualify financial claims.
                context = InvoiceContext("replay", identity, identity, identity, facts.get("business_name", "Sample Business"),
                                         "Sample Contact", facts.get("amount_due_minor", 10000), facts.get("currency", "INR"),
                                         "replay-v1", CreditorMandate(authorized=True, version="replay-v1"))
                repo.seed_context(context)
                messages = turn["messages"]
                if messages[-1]["role"] != "user":
                    raise PipelineError("expected_final_user_message")
                snapshot = SessionSnapshot(identity, "replay", identity, identity, "en-IN" if row["language"] == "en" else "hi-en",
                                           state=turn["state"], identity_verified=facts.get("identity_verified") is True,
                                           pending_question=None, history=[{"role": "agent" if m["role"] == "assistant" else "client", "text": m["content"]} for m in messages[:-1]])
                await repo.create_session(snapshot, identity)
                recorder = RecordingExecutor()
                controller = ConversationController(repo, recorder, providers)
                result = await controller.handle_turn("replay", identity, FinalTranscriptEvent(identity, messages[-1]["content"], 0, 1))
                target = turn["target"]
                if recorder.requests:
                    actions = recorder.requests
                elif result.should_end_call:
                    actions = ["close"]
                elif result.intent == "clarify":
                    actions = ["clarify"]
                else:
                    actions = ["reply"]
                results.append({"example": identity, "language": row["language"], "expected_intent": target["intent"],
                                "intent": result.intent, "intent_match": result.intent == target["intent"],
                                "expected_action": target["proposed_action"], "observed_actions": actions,
                                "action_match": actions == [target["proposed_action"]], "route": result.route,
                                "model_used": result.model_used, "spoken_text": result.reply})
    report = {"status": "completed", "timestamp": utc_now(), "manifest_hash": file_hash(manifest_path),
              "scope": "development controller text replay with inert action executor",
              "hosted_enabled": hosted, "hosted_providers": [p.name for p in providers.providers], "cases": len(results),
              "intent_matches": sum(row["intent_match"] for row in results), "action_matches": sum(row["action_match"] for row in results),
              "route_counts": dict(Counter(row["route"] for row in results)), "production_qualified": False,
              "action_definition": "Actual attempted tool names, else close on termination, clarify on clarification intent, else reply.",
              "results": results}
    atomic_json(output_path, report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default="training/manifests/revclaim-v3-seed.json")
    parser.add_argument("--output", default="artifacts/evaluation/controller-development.json")
    parser.add_argument("--allow-hosted", action="store_true")
    args = parser.parse_args()
    result = asyncio.run(replay(args.manifest, args.output, hosted=args.allow_hosted))
    print(json.dumps({k: v for k, v in result.items() if k != "results"}, indent=2))


if __name__ == "__main__":
    main()
