"""Real predictors for evaluation. No calls, tools or payments can be dispatched here."""
from __future__ import annotations
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from training.common import PipelineError, ROOT
from training.model_policy import validate_model_policy


class LocalPredictor:
    def __init__(self, config: dict[str, Any], adapter: Path | None = None):
        validate_model_policy(config)
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
        if not torch.cuda.is_available():
            raise PipelineError("cuda_inference_host_required")
        self.torch, self.config = torch, config
        tokenizer_source = str(adapter) if adapter else config["base_model"]
        self.tokenizer = AutoTokenizer.from_pretrained(tokenizer_source, revision=config["tokenizer_revision"], local_files_only=True, trust_remote_code=False)
        model = AutoModelForCausalLM.from_pretrained(config["base_model"], revision=config["base_revision"],
            local_files_only=True, trust_remote_code=False, device_map={"": torch.cuda.current_device()},
            quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16))
        if adapter:
            from peft import PeftModel
            model = PeftModel.from_pretrained(model, str(adapter), local_files_only=True, is_trainable=False)
        self.model = model.eval()

    def predict(self, messages: list[dict[str, str]]) -> str:
        inputs = self.tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_dict=True, return_tensors="pt")
        if inputs["input_ids"].shape[-1] > self.config["sequence_length"]:
            raise PipelineError("evaluation_context_exceeds_training_limit")
        inputs = inputs.to(self.model.device)
        with self.torch.inference_mode():
            output = self.model.generate(**inputs, do_sample=False, max_new_tokens=768,
                pad_token_id=self.tokenizer.eos_token_id)
        return self.tokenizer.decode(output[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)

    def close(self) -> None:
        del self.model
        self.torch.cuda.empty_cache()


class HostedPredictor:
    def __init__(self, provider: str):
        if provider not in {"groq", "gemini"}:
            raise PipelineError("unsupported_hosted_provider")
        try:
            from dotenv import load_dotenv
            load_dotenv(ROOT / "backend" / ".env")
            load_dotenv(ROOT / ".env")
        except ImportError:
            pass
        self.provider = provider
        self.key = os.getenv("GROQ_API_KEY") if provider == "groq" else os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        default_model = "qwen/qwen3.8-27b" if provider == "groq" else "gemini-flash-lite-latest"
        self.model = os.getenv("VOICE_GROQ_MODEL" if provider == "groq" else "VOICE_GEMINI_MODEL") or default_model
        if not self.key or not self.model:
            raise PipelineError("hosted_evaluation_requires_explicit_key_and_model")

    def predict(self, messages: list[dict[str, str]]) -> str:
        time.sleep(1.2)  # Pacing delay to avoid provider free-tier rate limits
        if self.provider == "groq":
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "User-Agent": "RevClaim-AI-Evaluator/1.0",
            }
            body = {"model": self.model, "messages": messages, "temperature": 0, "max_tokens": 768,
                    "response_format": {"type": "json_object"}}
        else:
            from urllib.parse import quote
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{quote(self.model, safe='')}:generateContent"
            headers = {
                "x-goog-api-key": self.key,
                "Content-Type": "application/json",
                "User-Agent": "RevClaim-AI-Evaluator/1.0",
            }
            body = {"systemInstruction": {"parts": [{"text": messages[0]["content"]}]},
                    "contents": [{"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]} for m in messages[1:]],
                    "generationConfig": {"temperature": 0, "maxOutputTokens": 768, "responseMimeType": "application/json"}}
        request = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
        result = None
        for attempt in range(4):
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    result = json.loads(response.read(262144))
                break
            except urllib.error.HTTPError as exc:
                if attempt >= 3 or exc.code not in {429, 503}:
                    raise
                retry_after = exc.headers.get("retry-after", "")
                wait_sec = int(retry_after) if retry_after.isdigit() and int(retry_after) <= 30 else 3 * (attempt + 1)
                exc.close()
                time.sleep(wait_sec)
        if self.provider == "groq":
            answer = result["choices"][0]["message"]["content"]
        else:
            parts = result["candidates"][0]["content"]["parts"]
            answer = "".join(part.get("text", "") for part in parts if not part.get("thought"))
        if not isinstance(answer, str) or not answer.strip():
            raise PipelineError("provider_returned_no_text")
        return answer

    def close(self) -> None:
        pass
