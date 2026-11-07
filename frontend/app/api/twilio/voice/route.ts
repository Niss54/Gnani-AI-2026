import { NextRequest, NextResponse } from "next/server";

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
  const clientName = searchParams.get("clientName") || "there";
  const invoiceNumber = searchParams.get("invoiceNumber") || "INV-1042";
  const amount = searchParams.get("amount") || "5000";
  const phone = searchParams.get("phone") || "+918840301998";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://rev-claim-ai.vercel.app";

  const rawRespondUrl = `${baseUrl}/api/twilio/voice/respond?clientName=${encodeURIComponent(clientName)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(amount)}&phone=${encodeURIComponent(phone)}`;
  const escapedRespondUrl = escapeXml(rawRespondUrl);
  const escapedName = escapeXml(clientName);
  const escapedInvoice = escapeXml(invoiceNumber);
  const formattedAmount = Number(amount) ? Number(amount).toLocaleString("en-IN") : amount;
  const escapedAmount = escapeXml(formattedAmount);

  // Ultra-natural, buttery smooth English opening with Amazon Polly Joanna-Neural
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${escapedRespondUrl}" method="POST" speechTimeout="auto" timeout="6" language="en-IN">
    <Say voice="Polly.Joanna-Neural" language="en-US">
      Hi ${escapedName}! This is Sarah from RevClaim AI accounts desk regarding invoice ${escapedInvoice} for ${escapedAmount} rupees. Can you hear me clearly?
    </Say>
  </Gather>
  <Gather input="dtmf speech" action="${escapedRespondUrl}" method="POST" speechTimeout="auto" timeout="5" language="en-IN">
    <Say voice="Polly.Joanna-Neural" language="en-US">
      Hi ${escapedName}, are you still there? Please let me know if you can hear me.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    No worries! I've dispatched your direct Razorpay settlement link straight to your WhatsApp and email. Have a wonderful day!
  </Say>
</Response>`.trim();

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
