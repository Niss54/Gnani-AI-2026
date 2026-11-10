import { NextRequest, NextResponse } from "next/server";
import { sendRecoveryEmail } from "@/lib/resend";
import fs from "node:fs";
import path from "node:path";

function logCall(msg: string) {
  try {
    const logLine = `[${new Date().toISOString()}] [Respond Route] ${msg}\n`;
    fs.appendFileSync(path.resolve("twilio_calls.log"), logLine, "utf8");
    console.log(logLine.trim());
  } catch {}
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req: NextRequest) {
  return handleRespond(req);
}

export async function GET(req: NextRequest) {
  return handleRespond(req);
}

function cleanAndSanitizeReply(text: string, clientName: string): string {
  let cleaned = (text || "").normalize("NFC");

  // Force persona name strictly to Sara (not Sarah / साराह)
  cleaned = cleaned.replace(/\bSarah\b/gi, "Sara");
  cleaned = cleaned.replace(/साराह/g, "सारा");
  cleaned = cleaned.replace(/रेवक्लेम/g, "रेव-क्लेम");

  // Fix currency symbols & special characters that cause TTS glitch / stutter
  cleaned = cleaned.replace(/[â‚¹₹]\s*(\d[\d,]*)/g, "$1 rupaye");
  cleaned = cleaned.replace(/[â‚¹₹]/g, " rupaye ");
  cleaned = cleaned.replace(/\b3x\b/gi, "teen guna");
  cleaned = cleaned.replace(/\bMSMED\b/gi, "M S M E D");
  cleaned = cleaned.replace(/\bMSME\b/gi, "M S M E");

  // STRICT USER CONSTRAINT: Strip out debtor name repetitions ("Nishant ji", "Nishant", "निशांत जी", etc.)
  const names = [
    clientName,
    clientName.split(" ")[0],
    "Nishant",
    "Nishant ji",
    "Nishantji",
    "निशांत",
    "निशांत जी",
    "निशांतजी",
  ].filter(Boolean);

  for (const n of names) {
    const re = new RegExp(`\\b${n}\\s*(ji|jee|sahab|साहब|जी)?\\s*[,!-]?\\s*`, "gi");
    cleaned = cleaned.replace(re, "");
  }

  // Remove leading commas or punctuation left over from name stripping
  cleaned = cleaned.replace(/^[\s,!-]+/, "");

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned.trim();
}

async function getAiNegotiationTurn(params: {
  debtorSpeech: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  deliverable: string;
  turn: number;
}): Promise<{ reply: string; isSettled: boolean; channel?: string | null; detectedLang: string }> {
  const { debtorSpeech, clientName, invoiceNumber, amount, deliverable, turn } = params;
  const groqKey = process.env.GROQ_API_KEY?.trim();

  const sysPrompt = `You are Sara from RevClaim AI accounts desk calling regarding invoice ${invoiceNumber} for ${deliverable}.
Total was 30,000 rupaye, 20,000 already paid, remaining balance is ${amount} rupaye overdue by 21 days.
This is negotiation Turn ${turn} of 5.

CRITICAL RULES:
1. YOU ARE SARA (NEVER SARAH).
2. DO NOT SAY "Nishant", "Nishant ji", "sir", or ANY name! Never address the person by name. Speak like a brisk corporate officer.
3. Fast & Fluent Delivery: Keep replies short (10-15 words max), crisp and natural.
4. No Symbols: Never write symbols like ₹ or $. Always write "rupaye" (e.g. "5000 rupaye").
5. Spoken Acronyms: Write "M S M E D Act" and "teen guna penal interest".
6. Multi-Lingual: Reply in the exact same language mix spoken by debtor (Hinglish / Hindi / Marathi / Gujarati / English).
7. Flow:
   - Excuses/Delay (Turn 1-2): "Deliverables complete hain. Aaj 5000 rupaye clear kar lijiye aur baaki agle hafte de dena. Theek hai?"
   - Pushback/Delay (Turn 3-4): "M S M E D Act mein teen guna penal interest lagta hai. Aaj 5000 rupaye se matter close kar lijiye."
   - Agreement / Commitment ("theek hai / haan / pay kar dunga / link bhej do / ho me karto"):
     "Theek hai, main payment link aapke WhatsApp par bhejun ya Email par?" (Set "isSettled": false).
   - If debtor chooses Email ("email / mail / ईमेल"):
     "Theek hai, payment link aapke email par bhej diya hai. Dhanyavaad, aapka din shubh ho!" (Set "isSettled": true, "channel": "email").
   - If debtor chooses WhatsApp ("whatsapp / text / व्हाट्सएप"):
     "Theek hai, payment link aapke WhatsApp par bhej diya hai. Dhanyavaad, aapka din shubh ho!" (Set "isSettled": true, "channel": "whatsapp").

Output MUST be strict JSON:
{"reply": "...", "isSettled": boolean, "channel": "email" | "whatsapp" | null, "detectedLang": "Hindi" | "Marathi" | "Gujarati" | "English" | "Hinglish"}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: debtorSpeech },
        ],
        response_format: { type: "json_object" },
        temperature: 0.25,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = JSON.parse(data.choices[0].message.content);
      if (content.reply) {
        return {
          reply: content.reply,
          isSettled: Boolean(content.isSettled),
          channel: content.channel || null,
          detectedLang: content.detectedLang || "Hindi",
        };
      }
    }
  } catch (err) {
    console.warn("[Groq Negotiation Turn Error]:", err);
  }

  // Fallback intelligent heuristics if LLM network hiccups
  const lower = debtorSpeech.toLowerCase();
  const mentionsEmail = lower.includes("email") || lower.includes("mail") || lower.includes("ईमेल");
  if (mentionsEmail) {
    return {
      reply: `Theek hai, payment link aapke email par bhej diya hai. Dhanyavaad, aapka din shubh ho!`,
      isSettled: true,
      channel: "email",
      detectedLang: "Hindi",
    };
  }

  const mentionsWhatsApp = lower.includes("whatsapp") || lower.includes("whats app") || lower.includes("message");
  if (mentionsWhatsApp) {
    return {
      reply: `Theek hai, payment link aapke WhatsApp par bhej diya hai. Dhanyavaad, aapka din shubh ho!`,
      isSettled: true,
      channel: "whatsapp",
      detectedLang: "Hindi",
    };
  }

  const isAgreement =
    lower.includes("theek hai") ||
    lower.includes("bhej do") ||
    lower.includes("pay kar") ||
    lower.includes("karto") ||
    lower.includes("kar dunga") ||
    lower.includes("aapi daish") ||
    lower.includes("okay") ||
    lower.includes("send link") ||
    lower.includes("haan");

  if (isAgreement) {
    return {
      reply: `Theek hai, main settlement link aapke WhatsApp par bhejun ya Email par?`,
      isSettled: false,
      channel: null,
      detectedLang: "Hindi",
    };
  }

  return {
    reply: `Samajh sakti hoon, par deliverables complete hain. Kya aap aaj 5,000 clear kar sakte hain aur baki agle hafte?`,
    isSettled: false,
    channel: null,
    detectedLang: "Hindi",
  };
}

async function handleRespond(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientName = searchParams.get("clientName") || "Nishant Maurya";
  const invoiceNumber = searchParams.get("invoiceNumber") || "INV-2026-JEWEL-1042";
  const amount = searchParams.get("amount") || "10000";
  const phone = searchParams.get("phone") || "+918840301998";
  const deliverable = searchParams.get("deliverable") || "jewellery website development";
  const turn = Number(searchParams.get("turn") || "1");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl =
    process.env.TUNNEL_URL ||
    (host && !host.includes("localhost")
      ? `${proto}://${host}`
      : "https://thumbnail-depend-moments-postage.trycloudflare.com");

  let speechResult = "";

  if (req.method === "POST") {
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("form")) {
        const formData = await req.formData();
        speechResult = (formData.get("SpeechResult") as string) || (formData.get("Digits") as string) || "";
      } else if (contentType.includes("json")) {
        const json = await req.json();
        speechResult = json.SpeechResult || json.speechResult || json.Digits || "";
      }
    } catch (e) {
      console.warn("[Twilio Respond] Could not parse body:", e);
    }
  }

  if (!speechResult) {
    speechResult = searchParams.get("SpeechResult") || searchParams.get("Digits") || "";
  }

  console.log(`[Twilio Voice AI] Turn ${turn} Input from ${clientName}: "${speechResult}"`);
  logCall(`Turn ${turn} SpeechResult from ${clientName}: "${speechResult}"`);

  const firstName = clientName.trim().split(" ")[0] || "Nishant";

  // Handle Silence / Timeout
  if (!speechResult.trim()) {
    if (turn >= 4) {
      const finishText = `Lagta hai connection toot gaya. Maine payment link aapke WhatsApp aur email par bhej diya hai. Dhanyavaad!`;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="hi-IN">${escapeXml(finishText)}</Say>
  <Hangup/>
</Response>`.trim();
      return new NextResponse(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
    }

    const promptText = `Main aapki aawaz nahi sun paayi. Kya aap jewellery website invoice ka payment discuss kar sakte hain?`;
    const nextUrl = `${baseUrl}/api/twilio/voice/respond?clientName=${encodeURIComponent(clientName)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(amount)}&phone=${encodeURIComponent(phone)}&turn=${turn + 1}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${escapeXml(nextUrl)}" method="POST" speechTimeout="auto" timeout="8" language="hi-IN" hints="haan, theek hai, link bhej do, pay kar dunga, agle hafte, paise, payment, jewellery, split, discount, kal, baad mein, ho me karto, aapi daish, email, whatsapp">
    <Say voice="Polly.Aditi" language="hi-IN"><prosody rate="118%">${escapeXml(promptText)}</prosody></Say>
  </Gather>
  <Say voice="Polly.Aditi" language="hi-IN"><prosody rate="118%">Kya aap sun pa rahe hain?</prosody></Say>
</Response>`.trim();
    return new NextResponse(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
  }

  // Execute Dynamic LLM Multi-Lingual Negotiation Turn
  const aiTurn = await getAiNegotiationTurn({
    debtorSpeech: speechResult,
    clientName,
    invoiceNumber,
    amount,
    deliverable,
    turn,
  });

  // Strict Sanitizer: Clean out name repetitions, corrupt symbols, and verify Sara persona
  aiTurn.reply = cleanAndSanitizeReply(aiTurn.reply, clientName);

  console.log(`[Twilio Voice AI] Turn ${turn} AI Response (Sanitized):`, aiTurn);

  const lowerSpeech = speechResult.toLowerCase();
  const isWhatsApp = lowerSpeech.includes("whatsapp") || lowerSpeech.includes("whats app") || lowerSpeech.includes("व्हाट्सएप") || aiTurn.channel === "whatsapp";
  const isEmailExplicitlyRequested =
    !isWhatsApp &&
    (lowerSpeech.includes("email") ||
      lowerSpeech.includes("mail") ||
      lowerSpeech.includes("ईमेल") ||
      lowerSpeech.includes("मेल") ||
      aiTurn.channel === "email");

  // If Debtor Agreed OR max rounds reached: Send WhatsApp/Email payment link and gracefully exit
  if (aiTurn.isSettled || turn >= 5) {
    const paymentUrl = `https://rzp.io/i/demo_jewel_${Date.now()}`;

    // STRICT USER RULE: Only dispatch email if debtor explicitly asked for email!
    if (isEmailExplicitlyRequested) {
      console.log(`[Resend] Debtor explicitly requested email. Sending to nishantma05@gmail.com...`);
      sendRecoveryEmail({
        to: "nishantma05@gmail.com",
        clientName,
        amount: Number(amount) || 10000,
        invoiceNumber,
        paymentLink: paymentUrl,
        subject: `Invoice #${invoiceNumber} Settlement Commitment (₹${Number(amount).toLocaleString("en-IN")}) — RevClaim AI`,
      }).catch((e) => console.warn("[Resend Email Notice]:", e?.message));
    } else {
      console.log(`[Twilio Settle] Settled via WhatsApp / other channel. Email NOT sent.`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="hi-IN"><prosody rate="118%">${escapeXml(aiTurn.reply)}</prosody></Say>
  <Pause length="1"/>
  <Hangup/>
</Response>`.trim();

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  // If Still Negotiating (Turns 1 to 4): Keep the call alive! Gather next round!
  const nextRespondUrl = `${baseUrl}/api/twilio/voice/respond?clientName=${encodeURIComponent(clientName)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(amount)}&phone=${encodeURIComponent(phone)}&turn=${turn + 1}`;
  const escapedNextUrl = escapeXml(nextRespondUrl);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${escapedNextUrl}" method="POST" speechTimeout="auto" timeout="8" language="hi-IN" hints="haan, theek hai, link bhej do, pay kar dunga, agle hafte, paise, payment, jewellery, split, discount, kal, baad mein, ho me karto, aapi daish, email, whatsapp">
    <Say voice="Polly.Aditi" language="hi-IN"><prosody rate="118%">${escapeXml(aiTurn.reply)}</prosody></Say>
  </Gather>
  <Say voice="Polly.Aditi" language="hi-IN"><prosody rate="118%">Kya aap sun pa rahe hain?</prosody></Say>
</Response>`.trim();

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
