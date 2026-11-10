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

  // Remove forced repetitive "theek hai?" at sentence ends
  cleaned = cleaned.replace(/\s*theek hai\s*\?\s*$/i, ".");
  cleaned = cleaned.replace(/\s*ठीक है\s*\?\s*$/, "।");

  // Fix currency symbols & special characters that cause TTS glitch
  cleaned = cleaned.replace(/[â‚¹₹]\s*(\d[\d,]*)/g, "$1 रुपये");
  cleaned = cleaned.replace(/[â‚¹₹]/g, " रुपये ");
  cleaned = cleaned.replace(/\b3x\b/gi, "तीन गुना");
  cleaned = cleaned.replace(/\bMSMED\b/gi, "M S M E D");
  cleaned = cleaned.replace(/\bMSME\b/gi, "MSME");

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
}): Promise<{ reply: string; isSettled: boolean; channel?: string | null; agreedAmount?: number; detectedLang: string }> {
  const { debtorSpeech, clientName, invoiceNumber, amount, deliverable, turn } = params;
  const groqKey = process.env.GROQ_API_KEY?.trim();

  const sysPrompt = `You are Sara from RevClaim AI accounts desk calling regarding invoice ${invoiceNumber} for ${deliverable}.
Total was 30,000, 20,000 paid, remaining balance is 10,000 overdue.

CRITICAL RULES:
1. YOU ARE SARA (NEVER SARAH).
2. DO NOT SAY "Nishant", "Nishant ji", or ANY person's name! Speak politely without naming the person.
3. Natural, Professional Indian Hindi (Devanagari): Output replies in clean, natural Devanagari script.
4. DO NOT ADD "Theek hai? Theek hai?" unnaturally to every sentence.
5. STRICT 5-STAGE PROGRESSION:
   - Stage 1 (Turn 1 - Debtor answers/confirms hearing you e.g. "haan", "sun raha hoon", "hello", "boliye"):
     DO NOT offer 5,000 yet! Ask for full 10,000:
     Reply: "जी, आपके प्रोजेक्ट का 10,000 रुपये का बकाया पेमेंट काफी समय से ओवरड्यू है। क्या हम आज इसे क्लियर कर सकते हैं?"
     (Set "isSettled": false, "agreedAmount": 10000).
   - Stage 2 (Turn 2 - Debtor makes excuse/delay/refusal e.g. "nahi", "paise nahi hain", "cash tight hai", "agle hafte"):
     NOW offer the structured 5,000 installment:
     Reply: "मैं समझ सकती हूँ। अगर पूरा 10,000 अभी संभव नहीं है, तो क्या आप 5,000 रुपये आज पे करके बाकी 5,000 अगले हफ्ते क्लियर कर सकते हैं?"
     (Set "isSettled": false, "agreedAmount": 5000).
   - Stage 3 (Turn 3 - Debtor stalls further e.g. "dekhte hain", "baad mein", "nahi dunga"):
     Citing MSME compliance:
     Reply: "देखिये, आगे डिले होने पर MSME नियमों के तहत पीनल इंटरेस्ट लग सकता है। हम चाहते हैं कि मामला शांति से सुलझ जाए। आज सिर्फ 5,000 रुपये देकर अकाउंट सेटल कर लीजिये।"
     (Set "isSettled": false, "agreedAmount": 5000).
   - Stage 4 (Agreement e.g. "theek hai", "pay kar dunga", "link bhej do", "haan kar dunga"):
     Reply: "बहुत अच्छा! मैं 5,000 रुपये का पेमेंट लिंक आपके व्हाट्सएप पर भेजूँ या ईमेल पर?"
     (Set "isSettled": false, "agreedAmount": 5000).
   - Stage 5 (Channel Selection):
     - If debtor chooses Email ("email", "mail", "ईमेल", "मेल"):
       Reply: "जी, 5,000 रुपये का सेटलमेंट पेमेंट लिंक आपके ईमेल पर भेज दिया गया है। आपका दिन शुभ हो, धन्यवाद!"
       (Set "isSettled": true, "channel": "email", "agreedAmount": 5000).
     - If debtor chooses WhatsApp ("whatsapp", "text", "व्हाट्सएप"):
       Reply: "जी, 5,000 रुपये का सेटलमेंट पेमेंट लिंक आपके व्हाट्सएप पर भेज दिया गया है। आपका दिन शुभ हो, धन्यवाद!"
       (Set "isSettled": true, "channel": "whatsapp", "agreedAmount": 5000).

Output MUST be strict JSON:
{"reply": "...", "isSettled": boolean, "channel": "email" | "whatsapp" | null, "agreedAmount": number, "detectedLang": "Hindi"}`;

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
        temperature: 0.2,
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
          agreedAmount: content.agreedAmount || (turn >= 2 ? 5000 : 10000),
          detectedLang: content.detectedLang || "Hindi",
        };
      }
    }
  } catch (err) {
    console.warn("[Groq Negotiation Turn Error]:", err);
  }

  // Reliable Fallback Stage Engine (Guarantees perfect logical dialogue)
  const lower = debtorSpeech.toLowerCase();
  const isEmail = lower.includes("email") || lower.includes("mail") || lower.includes("ईमेल") || lower.includes("मेल");
  if (isEmail) {
    return {
      reply: `जी, 5,000 रुपये का सेटलमेंट पेमेंट लिंक आपके ईमेल पर भेज दिया गया है। आपका दिन शुभ हो, धन्यवाद!`,
      isSettled: true,
      channel: "email",
      agreedAmount: 5000,
      detectedLang: "Hindi",
    };
  }

  const isWhatsApp = lower.includes("whatsapp") || lower.includes("whats app") || lower.includes("व्हाट्सएप") || lower.includes("message");
  if (isWhatsApp) {
    return {
      reply: `जी, 5,000 रुपये का सेटलमेंट पेमेंट लिंक आपके व्हाट्सएप पर भेज दिया गया है। आपका दिन शुभ हो, धन्यवाद!`,
      isSettled: true,
      channel: "whatsapp",
      agreedAmount: 5000,
      detectedLang: "Hindi",
    };
  }

  const isAgreement =
    lower.includes("theek hai") ||
    lower.includes("theek") ||
    lower.includes("bhej do") ||
    lower.includes("pay kar") ||
    lower.includes("kar dunga") ||
    lower.includes("okay") ||
    lower.includes("send link") ||
    lower.includes("ठीक है") ||
    lower.includes("भेज दो") ||
    lower.includes("पे कर");

  if (isAgreement) {
    return {
      reply: `बहुत अच्छा! मैं 5,000 रुपये का पेमेंट लिंक आपके व्हाट्सएप पर भेजूँ या ईमेल पर?`,
      isSettled: false,
      channel: null,
      agreedAmount: 5000,
      detectedLang: "Hindi",
    };
  }

  // Turn 1: Debtor confirms audibility ("हाँ", "सुन रहा हूँ", "hello", "boliye")
  if (turn === 1) {
    return {
      reply: `जी, आपके प्रोजेक्ट का 10,000 रुपये का बकाया पेमेंट काफी समय से ओवरड्यू है। क्या हम आज इसे क्लियर कर सकते हैं?`,
      isSettled: false,
      channel: null,
      agreedAmount: 10000,
      detectedLang: "Hindi",
    };
  }

  // Turn 2: Debtor gives first excuse / objection
  if (turn === 2) {
    return {
      reply: `मैं समझ सकती हूँ। अगर पूरा 10,000 अभी संभव नहीं है, तो क्या आप 5,000 रुपये आज पे करके बाकी 5,000 अगले हफ्ते क्लियर कर सकते हैं?`,
      isSettled: false,
      channel: null,
      agreedAmount: 5000,
      detectedLang: "Hindi",
    };
  }

  // Turn 3+: Debtor stalls or hesitates further
  return {
    reply: `देखिये, आगे डिले होने पर MSME नियमों के तहत पीनल इंटरेस्ट लग सकता है। हम चाहते हैं कि मामला शांति से सुलझ जाए। आज सिर्फ 5,000 रुपये देकर अकाउंट सेटल कर लीजिये।`,
    isSettled: false,
    channel: null,
    agreedAmount: 5000,
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

  // Handle Silence / Timeout
  if (!speechResult.trim()) {
    if (turn >= 4) {
      const finishText = `शायद आवाज़ नहीं आ पा रही है। मैं थोड़ी देर में दोबारा संपर्क करती हूँ। धन्यवाद!`;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.hi-IN-Neural2-A" language="hi-IN">${escapeXml(finishText)}</Say>
  <Hangup/>
</Response>`.trim();
      return new NextResponse(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
    }

    const promptText = `क्या आप सुन पा रहे हैं? कृपया बताइये क्या ज्वेलरी इनवॉइस का पेमेंट आज डिस्कस कर सकते हैं?`;
    const nextUrl = `${baseUrl}/api/twilio/voice/respond?clientName=${encodeURIComponent(clientName)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(amount)}&phone=${encodeURIComponent(phone)}&turn=${turn + 1}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${escapeXml(nextUrl)}" method="POST" speechTimeout="auto" timeout="8" language="hi-IN" hints="हाँ, ठीक है, लिंक भेज दो, पे कर दूंगा, अगले हफ्ते, पैसे, पेमेंट, ज्वेलरी, 5000, 10000, डिस्काउंट, कल, बाद में, ईमेल, व्हाट्सएप, haan, theek hai, link bhej do, email, whatsapp">
    <Say voice="Google.hi-IN-Neural2-A" language="hi-IN">${escapeXml(promptText)}</Say>
  </Gather>
  <Say voice="Google.hi-IN-Neural2-A" language="hi-IN">क्या आप सुन पा रहे हैं?</Say>
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
    // Agreed Token Settlement Amount (₹5,000 as agreed on the call)
    const settleAmount = aiTurn.agreedAmount || (turn >= 2 ? 5000 : 10000);
    const paymentUrl = `https://rzp.io/i/settle_${settleAmount}_${Date.now()}`;

    // STRICT USER RULE: Only dispatch email if debtor explicitly asked for email!
    if (isEmailExplicitlyRequested) {
      console.log(`[Resend] Debtor explicitly requested email. Sending agreed settlement (₹${settleAmount}) to nishantma05@gmail.com...`);
      sendRecoveryEmail({
        to: "nishantma05@gmail.com",
        clientName,
        amount: settleAmount,
        invoiceNumber,
        paymentLink: paymentUrl,
        subject: `Invoice #${invoiceNumber} Agreed Settlement Payment (₹${settleAmount.toLocaleString("en-IN")}) — RevClaim AI`,
        deliverable: `Custom Luxury Jewellery Website Development (Agreed 50% Token Settlement: ₹${settleAmount.toLocaleString("en-IN")} today, balance ₹${(10000 - settleAmount).toLocaleString("en-IN")} in 7 days)`,
      }).catch((e) => console.warn("[Resend Email Notice]:", e?.message));
    } else {
      console.log(`[Twilio Settle] Settled via WhatsApp / other channel. Email NOT sent.`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Google.hi-IN-Neural2-A" language="hi-IN">${escapeXml(aiTurn.reply)}</Say>
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
  <Gather input="dtmf speech" action="${escapedNextUrl}" method="POST" speechTimeout="auto" timeout="8" language="hi-IN" hints="हाँ, ठीक है, लिंक भेज दो, पे कर दूंगा, अगले हफ्ते, पैसे, पेमेंट, ज्वेलरी, 5000, 10000, डिस्काउंट, कल, बाद में, ईमेल, व्हाट्सएप, haan, theek hai, link bhej do, email, whatsapp">
    <Say voice="Google.hi-IN-Neural2-A" language="hi-IN">${escapeXml(aiTurn.reply)}</Say>
  </Gather>
  <Say voice="Google.hi-IN-Neural2-A" language="hi-IN">क्या आप सुन पा रहे हैं?</Say>
</Response>`.trim();

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
