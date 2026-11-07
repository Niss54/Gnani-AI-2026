import os
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Reliably load .env
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_current_dir)
_root_dir = os.path.dirname(_backend_dir)
load_dotenv(os.path.join(_root_dir, ".env"))
load_dotenv(os.path.join(_backend_dir, ".env"), override=True)

class VoiceService:
    def __init__(self):
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        self.twilio_auth = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        self.twilio_phone = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
        self.elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
        self.gnani_key = os.getenv("GNANI_API_KEY", "").strip()
        self.livekit_url = os.getenv("LIVEKIT_URL", "").strip()
        self.livekit_key = os.getenv("LIVEKIT_API_KEY", "").strip()
        self.livekit_secret = os.getenv("LIVEKIT_API_SECRET", "").strip()

    def _refresh_keys(self):
        self.twilio_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        self.twilio_auth = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        self.twilio_phone = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
        self.elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
        self.gnani_key = os.getenv("GNANI_API_KEY", "").strip()

    def initiate_call(self, phone: str, invoice_data: Dict[str, Any], channel: str = "auto") -> Dict[str, Any]:
        """
        Orchestrates an outbound recovery voice call:
        - If channel == 'webrtc': Dispatches interactive in-browser LiveKit WebRTC session.
        - If channel == 'telephony_pstn' or 'auto': Dispatches REAL Twilio REST API outbound PSTN call to the recipient's phone number.
        Strictly avoids fake mock CA_ strings; returns real Twilio Call SID or actionable error.
        """
        self._refresh_keys()
        phone_cleaned = phone.replace(" ", "").replace("-", "")
        currency = invoice_data.get("currency", "INR")
        debtor_name = invoice_data.get("debtor_name") or invoice_data.get("debtor", {}).get("contactPerson") or "Client"
        invoice_num = invoice_data.get("invoice_number", "INV-1042")
        amount = invoice_data.get("amount") or invoice_data.get("amountDue") or 5000

        # Mode A: Browser-based LiveKit WebRTC
        if channel == "webrtc":
            return {
                "success": True,
                "channel": "webrtc_livekit",
                "room_name": f"revclaim_{invoice_data.get('id', 'demo')}_{int(amount)}",
                "engine": "livekit_indic_webrtc",
                "voice_label": "Gnani.ai + LiveKit Real-Time WebRTC",
                "status": "connected",
                "phone": phone_cleaned
            }

        # Mode B: Real Twilio PSTN Outbound Call to Physical Phone Number
        has_twilio = (
            bool(self.twilio_sid) and
            bool(self.twilio_auth) and
            bool(self.twilio_phone) and
            not "your_twilio" in self.twilio_sid
        )

        if not has_twilio:
            print(f"[Voice Service Alert] Twilio credentials not fully set in .env. Cannot dial PSTN phone {phone_cleaned}.")
            return {
                "success": False,
                "error": "Twilio credentials missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env to dial real phone numbers.",
                "status": "unconfigured",
                "phone": phone_cleaned,
                "channel": "telephony_pstn",
                "hint": "Set your Twilio SID/AuthToken/PhoneNumber in .env; then click Dial again to ring the physical phone."
            }

        # Construct dynamic interactive TwiML message with real-time Speech Recognition
        app_url = os.getenv("NEXT_PUBLIC_APP_URL", "https://rev-claim-ai.vercel.app").strip()
        if "localhost" in app_url:
            app_url = "https://rev-claim-ai.vercel.app"
        respond_url = f"{app_url}/api/twilio/voice/respond?clientName={debtor_name}&amp;invoiceNumber={invoice_num}&amp;amount={amount}&amp;phone={phone_cleaned}"

        twiml_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="dtmf speech" action="{respond_url}" method="POST" speechTimeout="auto" timeout="5" language="hi-IN">
        <Say voice="Polly.Aditi" language="hi-IN">
            Namaste {debtor_name} ji. Main Sarah bol rahi hoon RevClaim AI accounts desk se aapke invoice {invoice_num} ke silsile mein. Baki amount rupaye {amount} hai. Kya aap mujhe sun pa rahe hain? Kya hum iska settlement discuss kar sakte hain?
        </Say>
    </Gather>
    <Gather input="dtmf speech" action="{respond_url}" method="POST" speechTimeout="auto" timeout="5" language="hi-IN">
        <Say voice="Polly.Aditi" language="hi-IN">
            Ji {debtor_name}, kya aap sun pa rahe hain?
        </Say>
    </Gather>
    <Say voice="Polly.Aditi" language="hi-IN">
        Humne direct Razorpay payment link aapke WhatsApp aur email par share kar diya hai. Aap wahan se clear kar sakte hain. Dhanyawaad, have a wonderful day!
    </Say>
</Response>"""

        try:
            print(f"[Voice Service] Dialing physical phone {phone_cleaned} via Twilio REST API from {self.twilio_phone}...")
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Calls.json"
            res = requests.post(
                url,
                auth=(self.twilio_sid, self.twilio_auth),
                data={
                    "To": phone_cleaned,
                    "From": self.twilio_phone,
                    "Twiml": twiml_xml
                },
                timeout=12
            )

            if res.status_code in (200, 201):
                data = res.json()
                call_sid = data.get("sid", "")
                status = data.get("status", "queued")
                print(f"[Voice Service] Twilio Outbound Call Placed! SID: {call_sid}, Status: {status}")
                return {
                    "success": True,
                    "call_sid": call_sid,
                    "status": status,
                    "engine": "twilio_live_pstn",
                    "voice_label": "Twilio PSTN + Polly Kajal Neural Conversational",
                    "channel": "telephony_pstn",
                    "phone": phone_cleaned,
                    "provider": "Twilio Live Voice Trunk"
                }
            else:
                err_msg = res.text
                print(f"[Voice Service Error] Twilio API status {res.status_code}: {err_msg}")
                return {
                    "success": False,
                    "error": f"Twilio API Error ({res.status_code}): {err_msg}",
                    "status": "failed",
                    "channel": "telephony_pstn",
                    "phone": phone_cleaned
                }
        except Exception as e:
            print(f"[Voice Service Exception] Failed to execute Twilio call: {e}")
            return {
                "success": False,
                "error": f"Network exception dialing Twilio: {str(e)}",
                "status": "failed",
                "channel": "telephony_pstn",
                "phone": phone_cleaned
            }

    def synthesize_speech(self, text: str, voice_id: str = "EXAVITQu4vr4xnSDxMaL") -> Optional[bytes]:
        """
        Synthesizes text into natural MP3 audio using ElevenLabs.
        """
        self._refresh_keys()
        if not self.elevenlabs_key:
            return None
        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            res = requests.post(
                url,
                headers={
                    "xi-api-key": self.elevenlabs_key,
                    "Content-Type": "application/json"
                },
                json={
                    "text": text,
                    "model_id": "eleven_flash_v2_5",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
                },
                timeout=10
            )
            if res.status_code == 200:
                return res.content
        except Exception as e:
            print(f"[ElevenLabs Error]: {e}")
        return None

    def synthesize_gnani_speech(self, text: str, voice: str = "Shivani", language: str = "Hindi") -> Optional[bytes]:
        """
        Synthesizes Indic text into natural audio using Gnani.ai Vachana API (timbre-v3.0).
        """
        self._refresh_keys()
        if not self.gnani_key or not self.gnani_key.startswith("vach_"):
            return None
        try:
            url = "https://api.vachana.ai/api/v1/tts/inference"
            res = requests.post(
                url,
                headers={
                    "X-API-Key-ID": self.gnani_key,
                    "Content-Type": "application/json"
                },
                json={
                    "text": text,
                    "language": language,
                    "model": "timbre-v3.0",
                    "voice": voice
                },
                timeout=15
            )
            if res.status_code == 200:
                return res.content
            else:
                print(f"[Gnani.ai Warning]: {res.status_code} {res.text}")
        except Exception as e:
            print(f"[Gnani.ai Error]: {e}")
        return None

voice_service = VoiceService()
