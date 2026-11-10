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

async function getAiNegotiationTurn(params: {
  debtorSpeech: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  deliverable: string;
  turn: number;
}): Promise<{ reply: string; isSettled: boolean; detectedLang: string }> {
  const { debtorSpeech, clientName, invoiceNumber, amount, deliverable, turn } = params;
  const groqKey = process.env.GROQ_API_KEY?.trim();

  const sysPrompt = `You are Sarah from RevClaim AI accounts desk calling ${clientName} for overdue invoice ${invoiceNumber}.
Context: ${deliverable}. Total was ₹30,000, ₹20,000 already paid, remaining balance is ₹${amount} overdue by 21 days. Contract is signed.
This is negotiation Turn ${turn} of 5.

CRITICAL RULES:
1. Multilingual Adaptability: Detect the debtor's spoken language (Hinglish, Hindi, Marathi, Gujarati, or English). Reply in that EXACT SAME language and conversational mix.
2. High-EQ Negotiation Strategy:
   - If debtor gives an excuse, cash crunch, or asks for delay (Turn 1-2):
     Empathize warmly, but explain that the freelancer has completed the website deliverables. Offer a 50% split (₹5,000 today via WhatsApp link, remaining ₹5,000 in 7 days).
   - If debtor stalls or argues (Turn 3-4):
     Politely explain statutory MSMED Act Section 16 compliance (delays attract compound penal interest at 3x RBI rate), so clearing ₹5,000 today protects their business reputation and avoids legal escalation.
   - If debtor agrees ("theek hai bhej do / main pay kar dunga / link bhej do / ho me karto / hu aapi daish"):
     Set "isSettled": true. Thank them warmly and confirm the payment link is sent to their WhatsApp.
3. Keep response concise (under 25-30 words) so it sounds natural on phone.
Output MUST be strict JSON:
{"reply": "...", "isSettled": boolean, "detectedLang": "Hindi" | "Marathi" | "Gujarati" | "English" | "Hinglish"}`;

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
          detectedLang: content.detectedLang || "Hindi",
        };
      }
    }
  } catch (err) {
    console.warn("[Groq Negotiation Turn Error]:", err);
  }

  // Fallback intelligent heuristics if LLM network hiccups
  const lower = debtorSpeech.toLowerCase();
  const isAgreement =
    lower.includes("theek hai") ||
    lower.includes("bhej do") ||
    lower.includes("pay kar") ||
    lower.includes("karto") ||
    lower.includes("kar dunga") ||
    lower.includes("aapi daish") ||
    lower.includes("okay") ||
    lower.includes("send link");

  if (isAgreement) {
    return {
      reply: `Bahut badhiya Nishant ji! Maine instant settlement link aapke WhatsApp aur email par bhej diya hai. Dhanyavaad!`,
      isSettled: true,
      detectedLang: "Hindi",
    };
  }

  return {
    reply: `Samajh sakti hoon Nishant ji. Par freelancer ke deliverables complete hain. Kya aap aaj 5,000 clear kar sakte hain aur baki agle hafte?`,
    isSettled: false,
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
      const finishText = `Lagta hai connection toot gaya. Maine Razorpay payment link aapke WhatsApp aur email par bhej diya hai. Dhanyavaad!`;
      const finishAudio = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(finishText)}&lang=Hindi&voice=Shivani`;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapeXml(finishAudio)}</Play>
  <Hangup/>
</Response>`.trim();
      return new NextResponse(xml, { headers: { "Content-Type": "text/xml; charset=utf-8" } });
    }

    const promptText = `Nishant ji, main aapki aawaz nahi sun paayi. Kya aap jewellery website invoice ka payment discuss kar sakte hain?`;
    const promptAudio = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(promptText)}&lang=Hindi&voice=Shivani`;
    const nextUrl = `${baseUrl}/api/twilio/voice/respond?clientName=${encodeURIComponent(clientName)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(amount)}&phone=${encodeURIComponent(phone)}&turn=${turn + 1}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${escapeXml(nextUrl)}" method="POST" speechTimeout="auto" timeout="6" language="hi-IN">
    <Play>${escapeXml(promptAudio)}</Play>
  </Gather>
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

  console.log(`[Twilio Voice AI] Turn ${turn} AI Response:`, aiTurn);

  // Generate real Gnani.ai Shivani voice URL
  const audioUrl = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(aiTurn.reply)}&lang=${encodeURIComponent(aiTurn.detectedLang)}&voice=Shivani`;
  const escapedAudioUrl = escapeXml(audioUrl);

  // If Debtor Agreed OR max rounds reached: Send WhatsApp/Email payment link and gracefully exit
  if (aiTurn.isSettled || turn >= 5) {
    const paymentUrl = `https://rzp.io/i/demo_jewel_${Date.now()}`;

    // Dispatch real email via Resend
    sendRecoveryEmail({
      to: "nishantma05@gmail.com",
      clientName,
      amount: Number(amount) || 10000,
      invoiceNumber,
      paymentLink: paymentUrl,
      subject: `Invoice #${invoiceNumber} Settlement Commitment (₹${Number(amount).toLocaleString("en-IN")}) — RevClaim AI`,
    }).catch((e) => console.warn("[Resend Email Notice]:", e?.message));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapedAudioUrl}</Play>
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

  const silencePrompt = `Nishant ji, kya aap mujhe sun pa rahe hain?`;
  const silenceAudio = `${baseUrl}/api/gnani/audio?text=${encodeURIComponent(silencePrompt)}&lang=Hindi&voice=Shivani`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${escapedNextUrl}" method="POST" speechTimeout="auto" timeout="7" language="hi-IN" hints="haan, theek hai, link bhej do, pay kar dunga, agle hafte, paise, payment, jewellery, split, discount, kal, baad mein, ho me karto, aapi daish">
    <Play>${escapedAudioUrl}</Play>
  </Gather>
  <Play>${escapeXml(silenceAudio)}</Play>
</Response>`.trim();

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
