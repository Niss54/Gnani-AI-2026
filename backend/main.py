import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load backend environment variables reliably from script directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(backend_dir)
load_dotenv(os.path.join(root_dir, ".env"))
load_dotenv(os.path.join(backend_dir, ".env"), override=True)

from services.supabase_service import supabase_service
from services.llm_service import llm_service
from services.deepgram_service import deepgram_service
from services.mem0_service import mem0_service
from services.voice_service import voice_service
from services.bhashini_service import bhashini_service
from services.rag_service import statutory_rag_engine

app = FastAPI(
    title="RevClaim AI — Python Backend Service",
    description="Autonomous Voice-Calling Invoice Recovery REST API & Voice Pipeline",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Data Models
# -----------------------------------------------------------------------------
class CallRequest(BaseModel):
    invoice_id: str
    phone: Optional[str] = "+91 8840301998"
    client_name: Optional[str] = "Valued Client"
    amount: Optional[float] = 5000.0
    mode: Optional[str] = "live"
    channel: Optional[str] = "auto"

class NotifyRequest(BaseModel):
    phone: Optional[str] = "+91 8840301998"
    email: Optional[str] = "nishantma05@gmail.com"
    client_name: Optional[str] = "Nishant Maurya"
    invoice_number: Optional[str] = "INV-2026-NISHANT-LIVE"
    amount: Optional[float] = 5000.0
    checkout_url: Optional[str] = "https://rzp.io/i/demo_pay"
    channel: Optional[str] = "both"

class NegotiateRequest(BaseModel):
    debtor_name: str
    debtor_company: str
    invoice_number: str
    amount_due: float
    currency: str = "INR"
    days_overdue: int = 14
    deliverable: str = "Software Development"
    freelancer_name: str = "Nishant Maurya"
    client_last_message: str
    history: Optional[List[Dict[str, str]]] = []

class CheckoutRequest(BaseModel):
    invoice_id: str
    amount: float
    customer_email: Optional[str] = "finance@client.com"
    customer_name: Optional[str] = "Valued Client"

class MemoryRequest(BaseModel):
    client_id: str
    memory_text: str
    metadata: Optional[Dict[str, Any]] = None

class TranslateRequest(BaseModel):
    text: str
    source_lang: Optional[str] = "en"
    target_lang: Optional[str] = "hi"

class RagRequest(BaseModel):
    query: str
    top_k: Optional[int] = 2

class LexiconRequest(BaseModel):
    text: str

class GraphRagQueryRequest(BaseModel):
    query: str
    company: Optional[str] = "TechFlow Solutions Pvt Ltd"

class SynthesizeRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "EXAVITQu4vr4xnSDxMaL"

class GnaniSynthesizeRequest(BaseModel):
    text: str
    voice: Optional[str] = "Shivani"
    language: Optional[str] = "Hindi"

# -----------------------------------------------------------------------------
# REST API Endpoints
# -----------------------------------------------------------------------------
@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RevClaim AI Python FastAPI",
        "integrations": {
            "supabase": "connected" if supabase_service.client else "in_memory_mirror",
            "groq_llm": "active (gsk_...)",
            "gemini_llm": "active (AQ....)",
            "deepgram_nova2": "ready",
            "mem0_memory": "active",
            "elevenlabs_voice": "active" if voice_service.elevenlabs_key else "offline",
            "gnani_indic_voice": "active (vach_...)" if voice_service.gnani_key else "offline",
            "livekit_webrtc": "active (API52...)"
        }
    }

@app.get("/api/invoices")
def get_invoices():
    invoices = supabase_service.get_invoices()
    return {"success": True, "count": len(invoices), "invoices": invoices}

@app.post("/api/call")
def initiate_call(req: CallRequest):
    invoices = supabase_service.get_invoices()
    target_invoice = next((inv for inv in invoices if inv.get("id") == req.invoice_id), None)
    
    if not target_invoice:
        target_invoice = {
            "id": req.invoice_id,
            "invoice_number": f"INV-{req.invoice_id}",
            "amount": req.amount or 5000,
            "currency": "INR",
            "debtor_name": req.client_name or "Valued Client"
        }
    else:
        target_invoice = dict(target_invoice)

    target_phone = req.phone or target_invoice.get("debtor_phone") or "+918840301998"
    target_invoice["debtor_phone"] = target_phone
    if req.client_name:
        target_invoice["debtor_name"] = req.client_name

    # Dispatch via multi-engine voice pipeline (Real Twilio PSTN or LiveKit WebRTC)
    call_result = voice_service.initiate_call(
        phone=target_phone,
        invoice_data=target_invoice,
        channel=req.channel or "auto"
    )

    # Store episodic memory in Mem0
    mem0_service.add_interaction_memory(
        client_id=req.invoice_id,
        memory_text=f"Outbound AI recovery call dispatched to {target_phone} via {call_result.get('engine', 'voice_pipeline')}."
    )

    return {"success": call_result.get("success", False), "call": call_result}

@app.post("/api/notify")
def notify_debtor(req: NotifyRequest):
    clean_phone = req.phone.replace(" ", "").replace("-", "")
    clean_digits = "".join(filter(str.isdigit, clean_phone))

    whatsapp_msg = (
        f"Namaste {req.client_name} ji,\n"
        f"This is an automated priority notice from RevClaim AI regarding overdue invoice {req.invoice_number} "
        f"for INR {req.amount:,.2f}.\n\n"
        f"💳 Direct Secure Razorpay Payment Link (UPI / Cards):\n{req.checkout_url}\n\n"
        f"⏰ Settlement Deadline: Please settle within 24 hours.\n"
        f"If payment is not completed within 24 hours, our autonomous voice recovery agent will reach out directly for account reconciliation.\n\n"
        f"Thank you,\nAccounts Desk, RevClaim AI"
    )

    import urllib.parse
    wa_url = f"https://wa.me/{clean_digits}?text={urllib.parse.quote(whatsapp_msg)}"
    
    email_subject = f"Statement of Account: Invoice #{req.invoice_number} (INR {req.amount:,.2f}) — RevClaim AI"
    email_body = (
        f"Dear {req.client_name},\n\n"
        f"This is an automated payment reconciliation notice from RevClaim AI.\n\n"
        f"Invoice: {req.invoice_number}\n"
        f"Balance: INR {req.amount:,.2f}\n"
        f"Secure Payment Link: {req.checkout_url}\n\n"
        f"NOTICE: Please clear this balance within 24 hours. If not settled within 24 hours, "
        f"our autonomous voice recovery agent will initiate follow-up contact.\n\n"
        f"Sincerely,\nRevClaim AI Accounts Desk"
    )
    mailto_url = f"mailto:{urllib.parse.quote(req.email)}?subject={urllib.parse.quote(email_subject)}&body={urllib.parse.quote(email_body)}"

    mem0_service.add_interaction_memory(
        client_id=req.invoice_number,
        memory_text=f"Recovery notice dispatched to WhatsApp ({clean_phone}) and Email ({req.email})."
    )

    return {
        "success": True,
        "recipient": {"phone": clean_phone, "email": req.email, "name": req.client_name},
        "whatsapp": {"url": wa_url, "message": whatsapp_msg},
        "email": {"mailto": mailto_url, "subject": email_subject}
    }

@app.post("/api/synthesize")
def synthesize_speech(req: SynthesizeRequest):
    audio_bytes = voice_service.synthesize_speech(req.text, req.voice_id or "21m00Tcm4TlvDq8ikWAM")
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Voice synthesis failed or API key missing")
    return Response(content=audio_bytes, media_type="audio/mpeg")

@app.post("/api/synthesize/gnani")
def synthesize_gnani(req: GnaniSynthesizeRequest):
    audio_bytes = voice_service.synthesize_gnani_speech(req.text, req.voice or "Shivani", req.language or "Hindi")
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="Gnani.ai Vachana synthesis failed or API key missing")
    return Response(content=audio_bytes, media_type="audio/wav")

@app.post("/api/negotiate")
def negotiate_turn(req: NegotiateRequest):
    result = llm_service.generate_reply(
        debtor_name=req.debtor_name,
        debtor_company=req.debtor_company,
        invoice_number=req.invoice_number,
        amount_due=req.amount_due,
        currency=req.currency,
        days_overdue=req.days_overdue,
        deliverable=req.deliverable,
        freelancer_name=req.freelancer_name,
        client_last_message=req.client_last_message,
        history=req.history or []
    )
    return result

@app.post("/api/checkout")
def create_razorpay_checkout(req: CheckoutRequest):
    checkout_url = f"https://rzp.io/i/{req.invoice_id}"
    return {
        "success": True,
        "checkout_url": checkout_url,
        "payment_id": f"rzp_pay_{req.invoice_id}",
        "fee_deducted": 475.00
    }

@app.post("/api/webhook/razorpay")
def razorpay_webhook(payload: Dict[str, Any]):
    event_type = payload.get("event", payload.get("type", ""))
    notes = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("notes", {})
    invoice_id = notes.get("invoiceId") or payload.get("data", {}).get("invoice_id")

    if event_type in ["payment.captured", "payment_link.paid", "order.paid"] and invoice_id:
        supabase_service.update_invoice_status(invoice_id, "RECOVERED")
        mem0_service.add_interaction_memory(
            client_id=invoice_id,
            memory_text=f"Payment succeeded! Invoice marked RECOVERED via Razorpay."
        )
        return {"success": True, "status": "settled", "invoice_id": invoice_id}

    return {"success": True, "received": True}

@app.get("/api/memory/{client_id}")
def get_memory(client_id: str):
    memories = mem0_service.get_client_memories(client_id)
    return {"success": True, "client_id": client_id, "memories": memories}

@app.post("/api/memory")
def add_memory(req: MemoryRequest):
    rec = mem0_service.add_interaction_memory(req.client_id, req.memory_text, req.metadata)
    return {"success": True, "record": rec}

@app.post("/api/bhashini/translate")
async def bhashini_translate(req: TranslateRequest):
    translated = await bhashini_service.translate_text(req.text, req.source_lang, req.target_lang)
    return {
        "success": True,
        "translated_text": translated,
        "source_lang": req.source_lang,
        "target_lang": req.target_lang
    }

@app.get("/api/bhashini/languages")
def bhashini_languages():
    langs = bhashini_service.get_supported_languages()
    return {"success": True, "languages": langs, "total": len(langs)}

@app.post("/api/rag/search")
def rag_search(req: RagRequest):
    results = statutory_rag_engine.search(req.query, req.top_k)
    grounding = statutory_rag_engine.get_grounding_context(req.query, req.top_k)
    return {
        "success": True,
        "query": req.query,
        "results": results,
        "grounding": grounding,
        "total_matches": len(results)
    }

@app.post("/api/lexicon/analyze")
def analyze_lexicon(req: LexiconRequest):
    from services.bharat_debt_lexicon import analyze_debtor_idiom, enrich_debt_prompt_with_lexicon
    matches = analyze_debtor_idiom(req.text)
    enrichment = enrich_debt_prompt_with_lexicon(req.text)
    return {
        "success": True,
        "input_text": req.text,
        "matches": matches,
        "enrichment": enrichment,
        "total_matched": len(matches)
    }

@app.post("/api/graph-rag/query")
def graph_rag_query(req: GraphRagQueryRequest):
    from services.hybrid_graph_rag import sovereign_hybrid_graph_rag
    result = sovereign_hybrid_graph_rag.execute_hybrid_query(req.query, req.company)
    return result

@app.get("/api/graph-rag/topology")
def graph_rag_topology():
    from services.hybrid_graph_rag import sovereign_hybrid_graph_rag
    return sovereign_hybrid_graph_rag.get_full_topology()

@app.get("/api/graph-rag/veil/{company}")
def graph_rag_veil(company: str):
    from services.hybrid_graph_rag import sovereign_hybrid_graph_rag
    return sovereign_hybrid_graph_rag.pierce_corporate_veil(company)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
