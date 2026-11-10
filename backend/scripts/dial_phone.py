"""RevClaim AI — Outbound Debt Recovery Telephony Dispatcher.

Initiates live interactive AI phone calls over Twilio / LiveKit SIP trunks
to reach debtors directly on Indian mobile networks (+91...).

Usage:
    python backend/scripts/dial_phone.py +919876543210 "INV-2026-001" "45000"
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
for env_file in [ROOT_DIR / ".env.local", ROOT_DIR / ".env", ROOT_DIR / "backend" / ".env"]:
    if env_file.exists():
        load_dotenv(env_file)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Live interactive conversational AI telephony webhook
VOICE_URL = os.getenv(
    "INTERACTIVE_VOICE_URL",
    "https://words-sharp-cos-podcasts.trycloudflare.com/api/twilio/voice",
)


def dial_debtor(
    phone: str,
    invoice_ref: str = "INV-2026-NISHANT-LIVE",
    amount: str = "45000",
    custom_voice_url: str = "",
) -> dict:
    """Trigger outbound phone call to debtor."""
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN):
        print("[!] Notice: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not configured in .env.local")
        print(f"[*] In simulation mode: Outbound call would ring {phone} regarding Invoice {invoice_ref} (₹{amount}).")
        return {
            "status": "simulated",
            "phone": phone,
            "invoice": invoice_ref,
            "amount": amount,
            "agent": "Sarah (Indic Settlement Specialist)",
        }

    url = custom_voice_url or VOICE_URL
    print(f"[*] Initiating RevClaim AI voice call to {phone} from {TWILIO_PHONE_NUMBER}...")
    print(f"[*] Invoice Reference: {invoice_ref} | Amount: ₹{amount}")
    print(f"[*] Voice Webhook: {url}")

    with httpx.Client(
        auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), timeout=15.0
    ) as client:
        resp = client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json",
            data={
                "To": phone,
                "From": TWILIO_PHONE_NUMBER,
                "Url": url,
            },
        )
        if resp.status_code not in (200, 201):
            print(f"[!] Twilio call initiation failed (HTTP {resp.status_code}): {resp.text}")
            return {"status": "error", "response": resp.json()}

        data = resp.json()
        print(f"[+] Call queued successfully! SID: {data.get('sid')}, Status: {data.get('status')}")
        return {"status": "ok", "sid": data.get("sid"), "call": data}


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "+918840301998"
    ref = sys.argv[2] if len(sys.argv) > 2 else "INV-2026-NISHANT-LIVE"
    amt = sys.argv[3] if len(sys.argv) > 3 else "45000"
    dial_debtor(target, ref, amt)
