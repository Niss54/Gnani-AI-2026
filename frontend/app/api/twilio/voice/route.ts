import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function logCall(msg: string) {
  try {
    const logLine = `[${new Date().toISOString()}] [Voice Route] ${msg}\n`;
    fs.appendFileSync(path.resolve("twilio_calls.log"), logLine, "utf8");
    console.log(logLine.trim());
  } catch {}
}

export async function POST(req: NextRequest) {
  return handleVoice(req);
}

export async function GET(req: NextRequest) {
  return handleVoice(req);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function handleVoice(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  logCall(`Incoming ${req.method} from Twilio: ${req.url}`);
  const clientName = searchParams.get("clientName") || "Nishant Maurya";
  const invoiceNumber = searchParams.get("invoiceNumber") || "INV-2026-JEWEL-1042";
  const amount = searchParams.get("amount") || "10000";
  const phone = searchParams.get("phone") || "+918840301998";
  const deliverable = searchParams.get("deliverable") || "jewellery website development";
  const reqLang = searchParams.get("lang") || "Hindi";

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl =
    process.env.TUNNEL_URL && !process.env.TUNNEL_URL.includes("trycloudflare.com")
      ? process.env.TUNNEL_URL
      : (host && !host.includes("localhost")
        ? `${proto}://${host}`
        : "https://rev-claim-ai.vercel.app");

  const rawRespondUrl = `${baseUrl}/api/twilio/voice/respond?clientName=${encodeURIComponent(clientName)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(amount)}&phone=${encodeURIComponent(phone)}&turn=1`;
  const escapedRespondUrl = escapeXml(rawRespondUrl);

  const firstName = clientName.trim().split(" ")[0] || "Nishant";

  // Natural Indic greeting spoken by Sara (Fast, fluent corporate cadence)
  let greetingText = "";
  let audioLang = "Hindi";

  if (reqLang.toLowerCase().includes("mar") || reqLang === "mr") {
    greetingText = `नमस्कार! मी सारा बोलत आहे रेव्ह-क्लेम अकाउंट्स डेस्कवरून. तुमच्या ज्वेलरी वेबसाइट इनव्हॉइसच्या 10,000 रुपये बाकी पेमेंटबद्दल बोलायचे होते. माझा आवाज येतोय का?`;
    audioLang = "Marathi";
  } else if (reqLang.toLowerCase().includes("guj") || reqLang === "gu") {
    greetingText = `નમસ્તે! હું સારા બોલું છું રેવ-ક્લેમ એકાઉન્ટ્સ ડેસ્ક પરથી. તમારી જ્વેલરી વેબસાઇટના 10,000 રૂપિયા બાકી છે. શું તમે મને સાંભળી શકો છો?`;
    audioLang = "Gujarati";
  } else if (reqLang.toLowerCase().includes("eng") || reqLang === "en") {
    greetingText = `Hello! This is Sara from RevClaim accounts desk regarding your jewellery website invoice for 10,000 rupees balance. Can you hear me clearly?`;
    audioLang = "English";
  } else {
    // Default: Fluent corporate Hindi in Devanagari for Google Neural2 / Indian voice engine
    greetingText = `नमस्ते! मैं सारा बोल रही हूँ रेव-क्लेम अकाउंट्स डेस्क से, आपके ज्वेलरी वेबसाइट इनवॉइस के बारे में। क्या आप मुझे सुन पा रहे हैं?`;
    audioLang = "Hindi";
  }

  const audioUrl = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(greetingText)}&lang=${encodeURIComponent(audioLang)}&voice=Shivani`;
  const escapedAudioUrl = escapeXml(audioUrl);

  const repeatText = `क्या आप सुन पा रहे हैं? कृपया बताइये क्या आप अभी बात कर सकते हैं?`;
  const repeatAudioUrl = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(repeatText)}&lang=Hindi&voice=Shivani`;
  const escapedRepeatAudioUrl = escapeXml(repeatAudioUrl);

  const fallbackText = `शायद आपकी आवाज़ नहीं आ पा रही है। मैं थोड़ी देर में दोबारा संपर्क करती हूँ। धन्यवाद!`;
  const fallbackAudioUrl = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(fallbackText)}&lang=Hindi&voice=Shivani`;
  const escapedFallbackAudioUrl = escapeXml(fallbackAudioUrl);

  // Twilio TwiML using Google Neural2 Hindi Female Voice (Ultra-fluent, natural Indian cadence)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${escapedRespondUrl}" method="POST" speechTimeout="auto" timeout="8" language="hi-IN" hints="हाँ, ठीक है, लिंक भेज दो, पे कर दूंगा, अगले हफ्ते, पैसे, पेमेंट, ज्वेलरी, 5000, 10000, डिस्काउंट, कल, बाद में, ईमेल, व्हाट्सएप, haan, theek hai, link bhej do, email, whatsapp">
    <Say voice="Google.hi-IN-Neural2-A" language="hi-IN">${escapeXml(greetingText)}</Say>
  </Gather>
  <Gather input="dtmf speech" action="${escapedRespondUrl}" method="POST" speechTimeout="auto" timeout="6" language="hi-IN" hints="हाँ, ठीक है, लिंक भेज दो, पे कर दूंगा, ईमेल, व्हाट्सएप">
    <Say voice="Google.hi-IN-Neural2-A" language="hi-IN">${escapeXml(repeatText)}</Say>
  </Gather>
  <Say voice="Google.hi-IN-Neural2-A" language="hi-IN">${escapeXml(fallbackText)}</Say>
  <Hangup/>
</Response>`.trim();

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
