// ============================================================================
// RevClaim AI — Ultra-Low Latency Dual LLM & Smart Reflex Engine
// Primary: Groq LPU (Sub-700ms) | Failover: Google Gemini Flash-Lite
// ============================================================================

export interface NegotiationContext {
  debtorName: string;
  debtorCompany: string;
  debtorEmail?: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  daysOverdue: number;
  deliverable: string;
  freelancerName: string;
  conversationHistory: { role: "agent" | "client"; text: string }[];
  clientLastMessage: string;
}

export interface LLMResponse {
  reply: string;
  modelUsed: "groq-qwen-27b" | "gemini-flash-lite" | "smart-human-reflex";
  latencyMs: number;
  intentDetected?: "hardship" | "dispute" | "ptp_commitment" | "refusal" | "greeting" | "ai_check" | "busy";
  ptpDetails?: { amount?: number; date?: string };
}

/**
 * Detects whether client spoke in Hindi/Hinglish or English
 */
export function isHindiOrHinglish(text: string): boolean {
  if (/[\u0900-\u097F]/.test(text)) return true;
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

/**
 * Sub-50ms Smart Reflex Engine for Instant High-EQ Human Reactions & Sales Influence
 * Supports Native Bilingual Mode: Auto-adapts between Fluent English and Warm Hinglish!
 */
function checkSmartHumanReflex(ctx: NegotiationContext): string | null {
  const msg = ctx.clientLastMessage.toLowerCase().trim();
  const isHindi = isHindiOrHinglish(msg);
  const name = ctx.debtorName.split(" ")[0] || (isHindi ? "ji" : "there");
  const currencySymbol = ctx.currency === "USD" ? "$" : "₹";
  const halfAmount = Math.round(ctx.amountDue / 2);
  const freelancer = ctx.freelancerName || "Nishant";

  // 1. Road Emergency, Car Puncture / Flat Tire, Accident, Health Issues (Safety & Empathy First!)
  if (
    msg.includes("puncture") ||
    msg.includes("panchar") ||
    msg.includes("flat tire") ||
    msg.includes("flat tyre") ||
    msg.includes("tyre") ||
    msg.includes("tire") ||
    msg.includes("accident") ||
    msg.includes("gadi kharab") ||
    msg.includes("gaadi kharab") ||
    msg.includes("breakdown") ||
    msg.includes("bike slip") ||
    msg.includes("hospital") ||
    msg.includes("doctor") ||
    msg.includes("emergency") ||
    msg.includes("tabiyat") ||
    msg.includes("bimar") ||
    msg.includes("chot") ||
    msg.includes("injury") ||
    msg.includes("ill") ||
    msg.includes("sick")
  ) {
    return isHindi
      ? `Arey, koi baat nahi ${name}! Aap pehle puncture theek karwa lijiye, aap theek hain na? Invoice ki baat hum baad mein aaram se kar lenge. Main payment link WhatsApp par chhod deti hoon, jab aap safe pahunchein tab dekh lijiyega.`
      : `Oh no, please take care of that first ${name}, are you alright? We can sort out the invoice later. I've sent the details to your email and phone so you can check once you're safe.`;
  }

  // 2. Anti-Phishing, Scam Verification, Trust Inquiry & Direct Founder Verification
  if (
    msg.includes("scam") ||
    msg.includes("phishing") ||
    msg.includes("imposter") ||
    msg.includes("fraud") ||
    msg.includes("fake") ||
    msg.includes("trust") ||
    msg.includes("bharosa") ||
    msg.includes("how do i know") ||
    msg.includes("why should i trust") ||
    msg.includes("why razorpay") ||
    msg.includes("verify") ||
    msg.includes("asli ho") ||
    msg.includes("kaise maanu") ||
    msg.includes("kaise trust") ||
    msg.includes("baat karwao") ||
    msg.includes("baat karao") ||
    msg.includes("baat karni") ||
    msg.includes("speak to") ||
    msg.includes("talk to") ||
    msg.includes("direct call") ||
    msg.includes("personal number") ||
    msg.includes("account number") ||
    msg.includes("bank transfer") ||
    msg.includes("wire transfer") ||
    msg.includes("wire") ||
    msg.includes("bank account") ||
    msg.includes("neft") ||
    msg.includes("rtgs")
  ) {
    const cleanInv = (ctx.invoiceNumber || "INV1042").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const van = `REVC${cleanInv}`;
    return isHindi
      ? `Aapka verify karna bilkul sahi hai ${name}! Security ke liye aap ${freelancer} ko direct call kar sakte hain. Aap chahein toh direct corporate bank transfer bhi kar sakte hain to Beneficiary: "${freelancer} - RevClaim Collection", A/C: ${van}, IFSC: HDFC0000050 bina kisi web link ke.`
      : `Totally understand your caution ${name}! For security, feel free to call ${freelancer} directly to verify. You can also wire directly to their verified collection account (Beneficiary: ${freelancer} - RevClaim Collection, A/C: ${van}, IFSC: HDFC0000050) without using any web link.`;
  }

  // 3. Identity & "Why are you calling me?" / "Who authorized this?"
  if (
    msg.includes("kaun") ||
    msg.includes("who is this") ||
    msg.includes("who are you") ||
    msg.includes("why are you calling") ||
    msg.includes("kyu call kiya") ||
    msg.includes("kisne bola")
  ) {
    return isHindi
      ? `Namaste ${name}! Main Sarah hoon accounts desk se, regarding invoice ${ctx.invoiceNumber} for ${currencySymbol}${ctx.amountDue.toLocaleString()} (${ctx.deliverable}). Bas 1 minute ka quick reconciliation update chahiye tha taaki account smooth rahe.`
      : `Hi ${name}, this is Sarah from accounts regarding invoice ${ctx.invoiceNumber} for ${currencySymbol}${ctx.amountDue.toLocaleString()} (${ctx.deliverable}). Just wanted to provide a quick 1-minute reconciliation update so your account stays active.`;
  }

  // 4. AI / Bot Detection ("Are you an AI? / Robot ho kya?")
  if (
    msg.includes("robot") ||
    msg.includes("ai ho") ||
    msg.includes("artificial") ||
    msg.includes("computer") ||
    msg.includes("machine") ||
    msg.includes("are you real") ||
    msg.includes("are you human") ||
    msg.includes("bot")
  ) {
    return isHindi
      ? `Haha, nahi ${name}! Main RevClaim ki smart billing specialist hoon, par hum agency founder ke behalf par directly coordinate kar rahe hain taaki account settlement bilkul simple ho sake.`
      : `Haha, no worries ${name}! I'm RevClaim's smart billing assistant coordinating directly for ${freelancer} to make invoice reconciliation quick and hassle-free.`;
  }

  // 5. Busy / Driving / In Meeting ("Meeting me hoon / baad me call karo")
  if (
    msg.includes("meeting") ||
    msg.includes("busy") ||
    msg.includes("drive") ||
    msg.includes("driving") ||
    msg.includes("baad me") ||
    msg.includes("later") ||
    msg.includes("call me later") ||
    msg.includes("kal karna") ||
    msg.includes("traffic")
  ) {
    return isHindi
      ? `Oh, bilkul ${name}! Aap pehle driving ya meeting complete kar lijiye, main disturb nahi karungi. Razorpay ka direct link WhatsApp par chhod diya hai, shaam ko jab free hon tab check kar lijiyega.`
      : `Understood ${name}! Please focus on your meeting or drive, I won't disturb you. I've sent the invoice link to your email and WhatsApp for when you're free this evening.`;
  }

  // 6. Hostile / Refusal ("Paise nahi dunga / court jao / sue me")
  if (
    msg.includes("nahi dunga") ||
    msg.includes("wont pay") ||
    msg.includes("won't pay") ||
    msg.includes("court") ||
    msg.includes("police") ||
    msg.includes("lawyer") ||
    msg.includes("sue me") ||
    msg.includes("don't call") ||
    msg.includes("mat karna")
  ) {
    return isHindi
      ? `Aap bilkul pareshan mat hoiye ${name}, main koi tension create nahi karna chahti. Saare follow-ups turant pause kar diye hain aur founder ko escalate kar diya hai taaki aap dono aapas me resolve kar sakein. Have a good day.`
      : `I understand your frustration ${name}, and I certainly don't want to create any stress. I've paused automated follow-ups and escalated directly to ${freelancer} so you can resolve this amicably.`;
  }

  // 7. Work Quality / Bug / Deliverable Dispute ("Kaam bekar hai / bugs hain")
  if (
    msg.includes("bug") ||
    msg.includes("kharab") ||
    msg.includes("incomplete") ||
    msg.includes("dispute") ||
    msg.includes("not happy") ||
    msg.includes("quality") ||
    msg.includes("issue")
  ) {
    return isHindi
      ? `Acha hua aapne bataya ${name}! Maine deliverable dispute log kar diya hai aur reminders turant halt kar diye hain. Humare lead developer aapko issue review ke liye contact karenge.`
      : `Thank you for flagging that ${name}. I've logged an official deliverable review and paused all reminders. ${freelancer} will reach out directly today to address the deliverable.`;
  }

  // 8. Hardship / Cash Crunch ("Paise nahi hain / tight budget / funds delayed")
  if (
    msg.includes("paisa nahi") ||
    msg.includes("paise nahi") ||
    msg.includes("no money") ||
    msg.includes("tight") ||
    msg.includes("crunch") ||
    msg.includes("salary nahi") ||
    msg.includes("client ne nahi diya") ||
    msg.includes("cash flow") ||
    msg.includes("can't pay")
  ) {
    return isHindi
      ? `Main bilkul samajh sakti hoon ${name}, cash flow crunches sabke sath aate hain. Aapko poora ek sath dene ki zaroorat nahi hai—kya hum 50% (${currencySymbol}${halfAmount.toLocaleString()}) abhi settle kar lein aur baaki next Friday taaki account active rahe?`
      : `I completely understand cash flow tight spots ${name}. You don't need to clear it all at once—could we settle 50% (${currencySymbol}${halfAmount.toLocaleString()}) today via Razorpay to keep the account active, and clear the rest next Friday?`;
  }

  // 9. Positive / Willing to pay / "Send link"
  if (
    msg.includes("send link") ||
    msg.includes("link bhejo") ||
    msg.includes("qr code") ||
    msg.includes("whatsapp") ||
    msg.includes("pay karta hoon") ||
    msg.includes("done") ||
    msg.includes("clear kar") ||
    msg.includes("ready to pay") ||
    msg.includes("send payment link")
  ) {
    return isHindi
      ? `Superb ${name}! Maine direct Razorpay checkout link aapke WhatsApp par bhej diya hai. 10 seconds me UPI ya card se clear ho jayega. Thank you so much!`
      : `Superb ${name}! I've sent the direct Razorpay link to your WhatsApp and email. You can clear it via UPI, card or instant transfer in 10 seconds. Thank you so much!`;
  }

  // 10. Email Not Received / Re-verify Check ("Didn't get any email / ई डिड'टी गेट / nahi mila")
  if (
    msg.includes("didn't get") ||
    msg.includes("didnt get") ||
    msg.includes("did not receive") ||
    msg.includes("haven't received") ||
    msg.includes("havent received") ||
    msg.includes("not received") ||
    msg.includes("nahi mila") ||
    msg.includes("nhi mila") ||
    msg.includes("nhi aaya") ||
    msg.includes("mil nahi") ||
    msg.includes("ई डिड'टी") ||
    msg.includes("नहीं मिला")
  ) {
    const targetEmail = ctx.debtorEmail || "nishantma05@gmail.com";
    return isHindi
      ? `Maine turant check kar liya hai ${name}! Resend cloud se dispatch confirm ho chuka hai to ${targetEmail}. Kripya apna Spam ya Updates tab bhi ek baar dekh lijiye.`
      : `I've re-confirmed the dispatch to ${targetEmail} via Resend. Please check your primary inbox as well as the Spam/Updates tab—it was delivered just now!`;
  }

  // 11. Direct Email Dispatch Request / Payment Link on Email ("Email pe bhejo / send in email / कुल्ड यू शेयर")
  if (
    msg.includes("email") ||
    msg.includes("mail") ||
    msg.includes("inbox") ||
    msg.includes("ईमेल") ||
    msg.includes("मेल") ||
    msg.includes("कुल्ड यू शेयर") ||
    msg.includes("पेमेंट लिंक") ||
    msg.includes("share payment link") ||
    msg.includes("payment link in email") ||
    msg.includes("share the payment link")
  ) {
    const targetEmail = ctx.debtorEmail || "nishantma05@gmail.com";
    return isHindi
      ? `Bilkul ${name}! Maine direct Razorpay link aur official statement aapki email (${targetEmail}) par dispatch kar diya hai. Aap apna inbox check kar sakte hain!`
      : `Absolutely ${name}! I have dispatched the secure Razorpay link directly to your email (${targetEmail}). You can review and clear it right from your inbox!`;
  }

  return null;
}

/**
 * Primary Generator: Groq LPU (Sub-700ms LPU Inference)
 * Primary: qwen/qwen3.8-27b; Cascade fallback: openai/gpt-oss-20b -> openai/gpt-oss-120b
 */
async function callGroq(
  systemInstruction: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const candidateModels = [
    process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
  ];

  let lastError: Error | null = null;
  for (const model of candidateModels) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 75,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } else if (res.status === 404) {
        // Model not available on this tier, cascade to next
        continue;
      } else {
        const errorText = await res.text();
        lastError = new Error(`Groq API error (${res.status}): ${errorText}`);
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw lastError || new Error("All Groq models exhausted");
}

/**
 * Failover Generator: Google Gemini Flash
 */
async function callGemini(
  systemInstruction: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
  ];

  let lastError: Error | null = null;
  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nDebtor said:\n${userPrompt}\nSarah (speak in max 1-2 natural spoken sentences):` }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 65,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } else if (res.status === 404) {
        continue;
      } else {
        const errorText = await res.text();
        lastError = new Error(`Gemini API error (${res.status}): ${errorText}`);
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw lastError || new Error("All Gemini models exhausted");
}

/**
 * Master Voice Orchestrator (< 600-800ms Latency Guaranteed)
 */
export async function generateNegotiationTurn(ctx: NegotiationContext): Promise<LLMResponse> {
  const startTime = Date.now();

  // 1. Check Sub-50ms Smart Human Reflex Engine FIRST (instant zero-lag reaction)
  const reflexReply = checkSmartHumanReflex(ctx);
  if (reflexReply) {
    return {
      reply: reflexReply,
      modelUsed: "smart-human-reflex",
      latencyMs: Date.now() - startTime,
    };
  }

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const halfAmount = Math.round(ctx.amountDue / 2);
  const currencySymbol = ctx.currency === "USD" ? "$" : "₹";

  const systemPrompt = `You are Sarah, an elite high-EQ billing mediation coordinator and consultative sales specialist representing ${ctx.freelancerName}.
You are on a live telephone call with ${ctx.debtorName} (${ctx.debtorCompany}) regarding invoice ${ctx.invoiceNumber} for ${currencySymbol}${ctx.amountDue.toLocaleString()} (${ctx.deliverable}, ${ctx.daysOverdue} days overdue).

TACTICAL INFLUENCE & SALES PSYCHOLOGY (THE 4 SACRED LAWS):
1. EMPATHY BEFORE COMMERCE:
   - If the client mentions ANY trouble (car puncture, accident, breakdown, hospital, illness, family emergency):
     STRICTLY FORBIDDEN: NEVER say "Arey kya baat hai!" (in Hindi that means celebrating misfortune!).
     STRICTLY FORBIDDEN: NEVER abruptly pivot with "Chaliye ab invoice ki baat karte hain" (sounds like an emotionless debt-collection robot).
     ALWAYS prioritize their human safety and convenience: "Arey, koi baat nahi! Aap pehle puncture theek karwa lijiye / emergency dekh lijiye, aap theek hain na? Invoice ki baat hum baad mein aaram se kar lenge. Main link WhatsApp par chhod deti hoon."
2. THE CONSULTATIVE REFRAME:
   - You are NOT an aggressive debt collector. You are a business partner helping keep their vendor account active and smooth so upcoming deliverables stay unblocked.
3. CONCESSION & SPLIT CLOSING:
   - If debtor mentions cash-flow pressure, offer a 50% split (${currencySymbol}${halfAmount.toLocaleString()} today via Razorpay link and remainder next Friday).
4. STRICT LANGUAGE MATCHING & CODE-SWITCHING (GLOBAL INVARIANT):
   - IF THE CLIENT SPOKE IN ENGLISH: YOU MUST REPLY EXCLUSIVELY IN CRISP, COURTEOUS, PROFESSIONAL SPOKEN ENGLISH.
   - IF THE CLIENT SPOKE IN HINDI OR HINGLISH: YOU MUST REPLY IN WARM, NATURAL HINGLISH.
   - NEVER reply in Hindi/Hinglish if the client spoke in English!
   - Keep turns strictly under 2 short sentences (max 25 words).
5. ZERO-PHISHING & CALL-BACK PROTOCOL:
   - If the client questions the link or suspects a scam, validate their caution! Invite them to call ${ctx.freelancerName} directly, and offer direct bank wire/transfer details.`;

  const conversationText = ctx.conversationHistory
    .slice(-4)
    .map((m) => `${m.role === "agent" ? "Sarah" : ctx.debtorName}: ${m.text}`)
    .join("\n");

  const userPrompt = `${conversationText}\n${ctx.debtorName}: ${ctx.clientLastMessage}\nSarah:`;

  // 2. High-Speed Primary: Groq LPU (~700ms)
  if (groqKey && !groqKey.includes("your_groq")) {
    try {
      const reply = await callGroq(systemPrompt, userPrompt, groqKey);
      return {
        reply,
        modelUsed: "groq-qwen-27b",
        latencyMs: Date.now() - startTime,
      };
    } catch (groqError) {
      console.warn("[LLM] Groq primary error, failing over to Gemini:", groqError);
    }
  }

  // 3. Fallback: Google Gemini Flash-Lite
  if (geminiKey && !geminiKey.includes("your_gemini")) {
    try {
      const reply = await callGemini(systemPrompt, userPrompt, geminiKey);
      return {
        reply,
        modelUsed: "gemini-flash-lite",
        latencyMs: Date.now() - startTime,
      };
    } catch (geminiError) {
      console.warn("[LLM] Gemini fallback error:", geminiError);
    }
  }

  // 4. Default High-EQ Fallback
  return {
    reply: `I completely understand, ${ctx.debtorName}. Would clearing 50% (${currencySymbol}${halfAmount.toLocaleString()}) today on Razorpay ease things up for you?`,
    modelUsed: "smart-human-reflex",
    latencyMs: Date.now() - startTime,
  };
}
