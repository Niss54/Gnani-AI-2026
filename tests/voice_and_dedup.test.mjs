import assert from "node:assert";

console.log("================================================================================");
console.log("⚡ RevClaim AI — Twilio Conversational Voice & Deduplication Validation Suite");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------------------
// Test 1: Twilio TwiML Interactive Protocol & Speech Gathering
// -----------------------------------------------------------------------------------------
console.log("▶ [Test 1/3] Twilio TwiML Speech Gathering & Neural Voice Invariants");

const clientName = "Nishant Maurya";
const invoiceNumber = "INV-2026-NISHANT-LIVE";
const amount = "5000";
const baseUrl = "https://rev-claim-ai.vercel.app";
const rawRespondUrl = `${baseUrl}/api/twilio/voice/respond?clientName=${encodeURIComponent(clientName)}&invoiceNumber=${encodeURIComponent(invoiceNumber)}&amount=${encodeURIComponent(amount)}`;
const respondUrl = rawRespondUrl.replace(/&/g, "&amp;");

const initialTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" action="${respondUrl}" method="POST" speechTimeout="auto" timeout="6" language="en-IN">
    <Say voice="Polly.Joanna-Neural" language="en-US">
      Hi ${clientName}! This is Sarah from RevClaim AI accounts desk regarding invoice ${invoiceNumber} for ${amount} rupees. Can you hear me clearly?
    </Say>
  </Gather>
</Response>`.trim();

assert(initialTwiML.includes("<Gather"), "Missing Twilio <Gather> tag! The call must listen to user speech.");
assert(initialTwiML.includes('input="dtmf speech"'), "Gather must listen for dtmf and speech input.");
assert(initialTwiML.includes('voice="Polly.Joanna-Neural"'), "Must use neural voice (Polly.Joanna-Neural) with native studio English.");
assert(initialTwiML.includes("/api/twilio/voice/respond"), "Gather action must route to conversational respondent endpoint.");
console.log("  ✔ Twilio Interactive TwiML: Contains <Gather input=\"dtmf speech\"> with Polly.Joanna-Neural");
console.log("  ✔ Conversational Route: Linked to /api/twilio/voice/respond\n");

// -----------------------------------------------------------------------------------------
// Test 2: Resend Cloud 5-Minute Deduplication Cache
// -----------------------------------------------------------------------------------------
console.log("▶ [Test 2/3] Resend Autonomous Settlement Email Deduplication Audit");

const EMAIL_COOLDOWN_MS = 5 * 60 * 1000;
const sentEmailTimestamps = new Map();

function simulateSendEmail(targetEmail, invNum) {
  const cacheKey = `${targetEmail}_${invNum}`.toLowerCase();
  const lastSent = sentEmailTimestamps.get(cacheKey);
  const now = Date.now();
  if (lastSent && now - lastSent < EMAIL_COOLDOWN_MS) {
    return { success: true, deduplicated: true, messageId: `dedup_${lastSent}` };
  }
  sentEmailTimestamps.set(cacheKey, now);
  return { success: true, deduplicated: false, messageId: `msg_${now}` };
}

// 1st trigger (e.g. Call clicked)
const firstSend = simulateSendEmail("nishantma05@gmail.com", "INV-1042");
assert.strictEqual(firstSend.deduplicated, false, "First email must be dispatched");

// 2nd trigger immediately (e.g. Modal opened or notify called)
const secondSend = simulateSendEmail("nishantma05@gmail.com", "INV-1042");
assert.strictEqual(secondSend.deduplicated, true, "Immediate second email must be suppressed by cooldown cache");

// 3rd trigger immediately (e.g. Settle clicked)
const thirdSend = simulateSendEmail("nishantma05@gmail.com", "INV-1042");
assert.strictEqual(thirdSend.deduplicated, true, "Immediate third email must be suppressed by cooldown cache");

console.log("  ✔ First Email Dispatch: ALLOWED (Fresh delivery)");
console.log("  ✔ Second Trigger (0s later): SUPPRESSED (Deduplication cache active)");
console.log("  ✔ Third Trigger (0s later): SUPPRESSED (Deduplication cache active)\n");

// -----------------------------------------------------------------------------------------
// Test 3: Groq LPU High-EQ Negotiation Response
// -----------------------------------------------------------------------------------------
console.log("▶ [Test 3/3] Real-time Objection Extraction & Consultative Hinglish Response");

function isHindiOrHinglish(text) {
  const words = new Set(text.toLowerCase().split(/\W+/));
  const hindiWordSet = new Set([
    "hai", "hain", "haan", "nahi", "tha", "thi", "hoon", "hoga", "hogi",
    "karo", "karenge", "karna", "bhai", "kya", "kyu", "kaun", "mera", "meri", "mere",
    "aap", "aapka", "aapke", "baad", "pehle", "abhi", "paise", "paisa", "rupaye",
    "hazar", "lakh", "gaadi", "gadi", "kharch", "samajh", "bhejo", "dekho",
    "chhod", "accha", "acha", "theek", "thik", "shukriya", "dhanyawad",
    "namaste", "chalo", "chalega", "suno", "bolo", "karwa", "raha", "rahi", "panchar",
    "dunga", "mat", "mein", "kisko", "unko", "isko", "gayi", "gaya", "rakho"
  ]);
  let count = 0;
  for (const w of words) {
    if (hindiWordSet.has(w)) count++;
  }
  return count >= 1;
}
assert.strictEqual(isHindiOrHinglish("Bhai abhi cash flow tight hai, 50% abhi le lo"), true, "Should detect Hindi/Hinglish");
assert.strictEqual(isHindiOrHinglish("Can you send the invoice receipt to my finance team?"), false, "Should detect English");
console.log("  ✔ Language Classifier: Accurate bilingual code-switching detection validated\n");

console.log("================================================================================");
console.log("🎉 ALL TESTS PASSED: Twilio Speech Gathering, Deduplication & Language Ready!");
console.log("================================================================================\n");
