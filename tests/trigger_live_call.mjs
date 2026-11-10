import fs from "node:fs";
import path from "node:path";

// Read frontend/.env
const envContent = fs.readFileSync(path.resolve("frontend/.env"), "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx > 0) {
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    process.env[k] = v;
  }
}

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
const targetNumber = "+918840301998";
const baseUrl = process.env.TUNNEL_URL || "https://thumbnail-depend-moments-postage.trycloudflare.com";

const voiceUrl = `${baseUrl}/api/twilio/voice?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=${encodeURIComponent(targetNumber)}&deliverable=${encodeURIComponent("Custom Jewellery E-Commerce Website")}&lang=Hindi`;

console.log("Triggering live phone call via Twilio:");
console.log("- From:", fromNumber);
console.log("- To:", targetNumber);
console.log("- Voice Webhook URL:", voiceUrl);

const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
const formData = new URLSearchParams();
formData.append("To", targetNumber);
formData.append("From", fromNumber);
formData.append("Url", voiceUrl);

const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
  method: "POST",
  headers: {
    Authorization: authHeader,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: formData.toString(),
});

const data = await res.json();
console.log("\nTwilio API Response Status:", res.status);
console.log(JSON.stringify(data, null, 2));
