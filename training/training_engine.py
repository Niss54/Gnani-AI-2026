"""Actual local QLoRA optimization. Imports ML dependencies only when called."""
import math
import time
from pathlib import Path

from training.common import file_hash, resolve_path
from training.data_pipeline import load_manifest_records, training_example, tokenize_example, validate_dataset


def train_adapter(config, output_dir, mode, max_examples=None, resume_checkpoint=None):
    checked = validate_dataset(config["dataset_manifest"], require_human=True, require_complete=mode == "full")
    if checked["status"] != "passed":
        raise ValueError("human_approved_dataset_required")
    _, rows = load_manifest_records(config["dataset_manifest"])
    examples = [training_example(row, i) for row in rows if row["split"] == "train" for i in range(len(row["turns"]))]
    if mode == "smoke":
        examples = examples[:max_examples or 200]
    if not examples:
        raise ValueError("empty_training_split")
    if mode == "full" and max_examples is not None:
        raise ValueError("full_training_cannot_be_subsampled")
    import torch
    from datasets import Dataset
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, Trainer, TrainingArguments, TrainerCallback, set_seed
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

    set_seed(config["seed"])
    tokenizer = AutoTokenizer.from_pretrained(config["base_model"], revision=config["tokenizer_revision"], local_files_only=True, trust_remote_code=False)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenized = [tokenize_example(e, tokenizer, config["sequence_length"]) for e in examples]
    opt = config["optimization"]
    if not opt.get("assistant_only_loss"):
        raise ValueError("assistant_only_loss_required")
    use_bf16 = torch.cuda.is_bf16_supported()
    model = AutoModelForCausalLM.from_pretrained(
        config["base_model"], revision=config["base_revision"], local_files_only=True, trust_remote_code=False,
        device_map={"": torch.cuda.current_device()},
        quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16 if use_bf16 else torch.float16))
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=opt["gradient_checkpointing"])
    lora = config["lora"]
    model = get_peft_model(model, LoraConfig(r=lora["rank"], lora_alpha=lora["alpha"], lora_dropout=lora["dropout"], target_modules=lora["target_modules"], task_type="CAUSAL_LM"))
    model.config.use_cache = False

    def collate(batch):
        width = max(len(row["input_ids"]) for row in batch)
        return {key: torch.tensor([row[key] + [pad] * (width-len(row[key])) for row in batch])
                for key, pad in (("input_ids", tokenizer.pad_token_id), ("attention_mask", 0), ("labels", -100))}

    hours = float(config["compute"]["max_gpu_hours"])
    rate = float(config["compute"].get("hourly_rate", 0))
    spend = float(config["compute"].get("max_spend", 0))
    if hours <= 0 or (rate > 0 and spend <= 0):
        raise ValueError("positive_compute_budget_required")
    deadline = time.monotonic() + min(hours, spend / rate if rate > 0 else hours) * 3600

    class Budget(TrainerCallback):
        exhausted = False
        def on_step_end(self, args, state, control, **kwargs):
            if time.monotonic() >= deadline:
                self.exhausted = True
                control.should_training_stop = True
                control.should_save = True
            return control

    budget = Budget()
    args = TrainingArguments(output_dir=str(output_dir), per_device_train_batch_size=opt["micro_batch_size"],
        gradient_accumulation_steps=opt["gradient_accumulation_steps"], learning_rate=opt["learning_rate"],
        num_train_epochs=opt["epochs"], max_steps=2 if mode == "smoke" else -1,
        gradient_checkpointing=opt["gradient_checkpointing"], bf16=use_bf16, fp16=not use_bf16,
        save_steps=config["checkpoint_every_steps"], save_total_limit=2, logging_steps=1,
        report_to=[], seed=config["seed"], dataloader_num_workers=0)
    trainer = Trainer(model=model, args=args, train_dataset=Dataset.from_list(tokenized), data_collator=collate, callbacks=[budget])
    result = trainer.train(resume_from_checkpoint=resume_checkpoint)
    if budget.exhausted:
        raise RuntimeError("compute_budget_exhausted_checkpoint_saved_not_qualified")
    if trainer.state.global_step < 1 or not math.isfinite(result.training_loss):
        raise RuntimeError("training_did_not_produce_finite_loss_and_steps")
    model.save_pretrained(output_dir, safe_serialization=True)
    tokenizer.save_pretrained(output_dir)
    weights = Path(output_dir) / "adapter_model.safetensors"
    if not weights.is_file() or weights.stat().st_size == 0:
        raise RuntimeError("adapter_weights_missing_after_save")
    return {"completed_steps": trainer.state.global_step, "training_loss": result.training_loss,
            "adapter_sha256": file_hash(weights), "adapter_weights_generated": True,
            "training_examples": len(examples), "dataset_manifest_hash": file_hash(resolve_path(config["dataset_manifest"]))}
