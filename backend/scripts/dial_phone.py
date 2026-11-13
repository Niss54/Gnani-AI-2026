"""RevClaim AI — Outbound Debt Recovery Telephony Dispatcher.

Initiates live interactive AI phone calls over Twilio
to reach debtors directly on Indian mobile networks (+91...).

Usage:
    python backend/scripts/dial_phone.py +918840301998 "INV-2026-NISHANT-LIVE" "45000"
"""

from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
for env_file in [ROOT_DIR / ".env.local", ROOT_DIR / ".env", ROOT_DIR / "backend" / ".env", ROOT_DIR / "frontend" / ".env"]:
    if env_file.exists():
        load_dotenv(env_file)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "").strip()

PUBLIC_TUNNEL_URL = os.getenv("VOICE_PUBLIC_BASE_URL") or os.getenv("TUNNEL_URL") or "https://november-puzzles-advise-vector.trycloudflare.com"
BACKEND_URL = os.getenv("BACKEND_URL") or "http://127.0.0.1:8000"


def dial_debtor(
    phone: str = "+918840301998",
    invoice_ref: str = "INV-2026-NISHANT-LIVE",
    amount: str = "45000",
    language_mode: str = "hi-en",
) -> dict:
    """Create authoritative session and trigger outbound phone call to debtor."""
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER):
        print("[!] Notice: Twilio credentials not configured in environment.")
        return {"status": "unconfigured"}

    clean_phone = phone.replace(" ", "").strip()
    if not clean_phone.startswith("+"):
        clean_phone = f"+91{clean_phone}"

    print(f"[*] Step 1: Initializing authoritative voice session on backend for {invoice_ref}...")
    request_id = f"dial_{uuid.uuid4().hex[:8]}"

    try:
        with httpx.Client(timeout=10.0) as client:
            session_resp = client.post(
                f"{BACKEND_URL}/v1/voice/sessions",
                headers={
                    "X-Voice-Internal-Key": "revclaim-voice-internal-secret-2026",
                    "X-Voice-Tenant-Id": "default_tenant",
                },
                json={
                    "invoice_id": invoice_ref,
                    "contact_id": None,
                    "language_mode": language_mode,
                    "transport": "twilio",
                    "request_id": request_id,
                },
            )
            if session_resp.status_code != 200:
                print(f"[!] Failed to create backend voice session ({session_resp.status_code}): {session_resp.text}")
                return {"status": "error", "error": session_resp.text}

            session_data = session_resp.json()
            session_id = session_data["session_id"]
            print(f"[+] Voice Session created: {session_id}")
            print(f"[*] Agent Greeting: {session_data.get('reply')}")

    except Exception as exc:
        print(f"[!] Backend connection failed: {exc}")
        return {"status": "error", "error": str(exc)}

    # Construct the public webhook URL
    webhook_url = f"{PUBLIC_TUNNEL_URL.rstrip('/')}/api/twilio/voice?sessionId={session_id}"
    print(f"[*] Step 2: Placing Twilio outbound call to {clean_phone} from {TWILIO_PHONE_NUMBER}...")
    print(f"[*] Voice Webhook URL: {webhook_url}")

    try:
        with httpx.Client(auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), timeout=15.0) as client:
            resp = client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json",
                data={
                    "To": clean_phone,
                    "From": TWILIO_PHONE_NUMBER,
                    "Url": webhook_url,
                },
            )

            if resp.status_code not in (200, 201):
                print(f"[!] Twilio call initiation failed (HTTP {resp.status_code}): {resp.text}")
                return {"status": "error", "response": resp.json()}

            data = resp.json()
            call_sid = data.get("sid")
            status = data.get("status")
            print(f"[+] SUCCESS! Outbound Call Queued and Ringing!")
            print(f"    Call SID: {call_sid}")
            print(f"    Status:   {status}")
            print(f"    To:       {clean_phone}")
            print(f"    From:     {TWILIO_PHONE_NUMBER}")
            return {"status": "ok", "call_sid": call_sid, "session_id": session_id, "call": data}

    except Exception as exc:
        print(f"[!] Telephony call dispatch error: {exc}")
        return {"status": "error", "error": str(exc)}


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "+918840301998"
    ref = sys.argv[2] if len(sys.argv) > 2 else "INV-2026-NISHANT-LIVE"
    amt = sys.argv[3] if len(sys.argv) > 3 else "45000"
    dial_debtor(target, ref, amt)
