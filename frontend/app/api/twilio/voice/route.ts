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
    process.env.TUNNEL_URL ||
    (host && !host.includes("localhost")
      ? `${proto}://${host}`
      : "https://thumbnail-depend-moments-postage.trycloudflare.com");

  const rawRespondUrl = `${baseUrl}/api/twilio/voice/respond?clientName=${encodeURIComponent(clientName)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(amount)}&phone=${encodeURIComponent(phone)}&turn=1`;
  const escapedRespondUrl = escapeXml(rawRespondUrl);

  const firstName = clientName.trim().split(" ")[0] || "Nishant";

  // Natural Indic greeting spoken by Sarah (Gnani.ai Timbre v3.0 Shivani Voice)
  let greetingText = "";
  let audioLang = "Hindi";

  if (reqLang.toLowerCase().includes("mar") || reqLang === "mr") {
    greetingText = `Namaskar ${firstName} ji! Me Sarah bolat ahe RevClaim accounts desk varun. Aaplya jewellery website invoice chya 10,000 rupaye balance baddal bolayche hote. Aawaz yetoy ka maza?`;
    audioLang = "Marathi";
  } else if (reqLang.toLowerCase().includes("guj") || reqLang === "gu") {
    greetingText = `Namaste ${firstName} bhai! Hu Sarah bolu chu RevClaim accounts desk mathi. Tamari jewellery website na 10,000 rupiya baaki che. Shu tame mane sambhli sako cho?`;
    audioLang = "Gujarati";
  } else if (reqLang.toLowerCase().includes("eng") || reqLang === "en") {
    greetingText = `Hello ${firstName}! This is Sarah from RevClaim AI accounts desk regarding your jewellery website invoice for 10,000 rupees balance. Can you hear me clearly?`;
    audioLang = "English";
  } else {
    // Default: Natural conversational Hinglish/Hindi
    greetingText = `Namaste ${firstName} ji! Main Sarah bol rahi hoon RevClaim AI accounts desk se aapke jewellery website development invoice ke silsile mein. Baki amount 10,000 rupaye pending hai. Kya aap mujhe sun pa rahe hain?`;
    audioLang = "Hindi";
  }

  const audioUrl = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(greetingText)}&lang=${encodeURIComponent(audioLang)}&voice=Shivani`;
  const escapedAudioUrl = escapeXml(audioUrl);

  const repeatText = `Ji ${firstName}, kya aap sun pa rahe hain? Please bataiye kya abhi settle kar sakte hain?`;
  const repeatAudioUrl = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(repeatText)}&lang=Hindi&voice=Shivani`;
  const escapedRepeatAudioUrl = escapeXml(repeatAudioUrl);

  const fallbackText = `Theek hai Nishant ji, maine direct payment link aapke WhatsApp aur email par share kar diya hai. Dhanyavaad!`;
  const fallbackAudioUrl = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(fallbackText)}&lang=Hindi&voice=Shivani`;
  const escapedFallbackAudioUrl = escapeXml(fallbackAudioUrl);

  // Twilio TwiML using native Indian Voice (Polly.Aditi) for zero-latency telephony
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${escapedRespondUrl}" method="POST" speechTimeout="auto" timeout="8" language="hi-IN" hints="haan, theek hai, link bhej do, pay kar dunga, agle hafte, paise, payment, jewellery, split, discount, kal, baad mein, ho me karto, aapi daish, email, whatsapp">
    <Say voice="Polly.Aditi" language="hi-IN">${escapeXml(greetingText)}</Say>
  </Gather>
  <Gather input="dtmf speech" action="${escapedRespondUrl}" method="POST" speechTimeout="auto" timeout="6" language="hi-IN" hints="haan, theek hai, link bhej do, pay kar dunga, email, whatsapp">
    <Say voice="Polly.Aditi" language="hi-IN">${escapeXml(repeatText)}</Say>
  </Gather>
  <Say voice="Polly.Aditi" language="hi-IN">${escapeXml(fallbackText)}</Say>
  <Hangup/>
</Response>`.trim();

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
