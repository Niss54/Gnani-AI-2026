import { NextRequest, NextResponse } from "next/server";

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

async function handleRespond(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientName = searchParams.get("clientName") || "there";
  const invoiceNumber = searchParams.get("invoiceNumber") || "INV-1042";
  const amount = searchParams.get("amount") || "5000";
  const phone = searchParams.get("phone") || "+918840301998";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://rev-claim-ai.vercel.app";

  const rawNextRespondUrl = `${baseUrl}/api/twilio/voice/respond?clientName=${encodeURIComponent(clientName)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(amount)}&phone=${encodeURIComponent(phone)}`;
  const escapedNextRespondUrl = escapeXml(rawNextRespondUrl);
  const firstName = clientName.trim().split(" ")[0] || "there";
  const escapedName = escapeXml(firstName);
  const escapedInvoice = escapeXml(invoiceNumber);
  const formattedAmount = Number(amount) ? Number(amount).toLocaleString("en-IN") : amount;
  const escapedAmount = escapeXml(formattedAmount);

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

  console.log(`[Twilio Conversational AI] Client spoken/dtmf input: "${speechResult}"`);

  // If user said nothing or silence timed out
  if (!speechResult.trim()) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${escapedNextRespondUrl}" method="POST" speechTimeout="auto" timeout="5" language="en-IN">
    <Say voice="Polly.Joanna-Neural" language="en-US">
      Hi ${escapedName}, I couldn't hear you clearly. Are you ready to settle this invoice today?
    </Say>
  </Gather>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    No problem at all! I have dispatched your direct payment link to your WhatsApp and email. Thank you!
  </Say>
  <Hangup/>
</Response>`.trim();

    return new NextResponse(xml, {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }

  // Determine intent for demo video (split, objection, or agreement)
  const isHardshipOrSplit = /half|split|part|later|discount|kal|next week|kam|thoda/i.test(speechResult);

  let replyText = "";
  if (isHardshipOrSplit) {
    replyText = `I completely understand, ${escapedName}. I've unlocked a flexible 50 percent split settlement option and sent the updated Razorpay link directly to your WhatsApp and email.`;
  } else {
    replyText = `That's fantastic, ${escapedName}! I have instantly generated your secure Razorpay checkout link and sent it straight to your WhatsApp and email. You can complete the payment in just one tap.`;
  }

  const escapedReply = escapeXml(replyText);

  // Buttery-smooth conclusion for demo video
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    ${escapedReply}
  </Say>
  <Pause length="1"/>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Thank you so much, and have a wonderful day ahead!
  </Say>
  <Hangup/>
</Response>`.trim();

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
