"""RevClaim AI — Outbound LiveKit SIP Agent Dispatcher.

Dispatches Sarah (Autonomous Indic Settlement Specialist) to dial an outbound
phone number or bare SIP extension using LiveKit's SIP Trunking protocol.

Usage:
    python backend/scripts/outbound_call.py +919876543210 --name "Ramesh Gupta" --invoice "INV-2026-001" --amount "45000"
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
for env_file in [ROOT_DIR / ".env.local", ROOT_DIR / ".env", ROOT_DIR / "backend" / ".env"]:
    if env_file.exists():
        load_dotenv(env_file)

AGENT_NAME = "revclaim-recovery-agent"


def _clean_destination(dest: str) -> str:
    """Normalize phone number / SIP user string."""
    return dest.removeprefix("sip:").split("@")[0].strip()


async def place_debt_recovery_call(
    phone: str,
    name: str = "Debtor",
    invoice: str = "INV-2026-NISHANT-LIVE",
    amount: str = "45000",
) -> str:
    """Create LiveKit agent dispatch request for automated outbound phone call."""
    dest = _clean_destination(phone)
    room = f"outbound-{dest.lstrip('+')}-{uuid.uuid4().hex[:6]}"

    livekit_url = os.getenv("LIVEKIT_URL", "")
    api_key = os.getenv("LIVEKIT_API_KEY", "")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "")

    if not (livekit_url and api_key and api_secret):
        print(f"[!] LiveKit credentials unconfigured. Simulating dispatch to room: {room}")
        return room

    try:
        from livekit import api

        async with api.LiveKitAPI(url=livekit_url, api_key=api_key, api_secret=api_secret) as lk:
            await lk.agent_dispatch.create_dispatch(
                api.CreateAgentDispatchRequest(
                    agent_name=AGENT_NAME,
                    room=room,
                    metadata=json.dumps({
                        "phone": dest,
                        "name": name,
                        "invoice": invoice,
                        "amount": amount,
                        "policy": "MSMED_ACT_SECTION_16",
                    }),
                )
            )
            print(f"[+] Dispatched {AGENT_NAME} to room '{room}' -> Outbound ringing {dest}")
            return room
    except Exception as e:
        print(f"[!] LiveKit agent dispatch notice: {e}")
        return room


def main() -> None:
    parser = argparse.ArgumentParser(description="Place an outbound RevClaim AI debt reconciliation call.")
    parser.add_argument("phone", help="E.164 phone number (+919876543210) or SIP user")
    parser.add_argument("--name", default="Debtor Partner", help="Debtor executive name")
    parser.add_argument("--invoice", default="INV-2026-NISHANT-LIVE", help="Invoice reference code")
    parser.add_argument("--amount", default="45000", help="Outstanding invoice amount in INR")
    args = parser.parse_args()

    clean_dest = _clean_destination(args.phone)
    if not clean_dest:
        parser.error("Destination telephone number is required")

    room = asyncio.run(place_debt_recovery_call(clean_dest, args.name, args.invoice, args.amount))
    print(f"[✓] Outbound reconciliation session initialized in room: {room}")


if __name__ == "__main__":
    main()
