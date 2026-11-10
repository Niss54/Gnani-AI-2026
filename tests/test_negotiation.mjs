import assert from "node:assert";

import fs from "node:fs";
import path from "node:path";

let groqKey = process.env.GROQ_API_KEY;
if (!groqKey) {
  try {
    const envContent = fs.readFileSync(path.resolve("frontend/.env"), "utf8");
    const match = envContent.match(/GROQ_API_KEY=([^\r\n]+)/);
    if (match) groqKey = match[1].trim();
  } catch {}
}

const sysPrompt = `You are Sarah from RevClaim AI accounts desk calling Nishant Maurya for overdue payment on invoice INV-2026-JEWEL-1042.
Context: Custom luxury jewellery website development. Total was 30,000 INR, 20,000 INR already paid, 10,000 INR balance is overdue by 21 days.
Guidelines:
1. Detect debtor's language (Hinglish, Hindi, Marathi, Gujarati, English). Reply in that EXACT SAME language & accent mix.
2. Negotiate naturally (3-5 rounds). Be empathetic, conversational, but clear about recovering the freelancer's money.
3. If debtor gives an excuse or asks for delay, offer a 50% split (₹5,000 today via instant link, rest next week).
4. If debtor agrees ("theek hai bhej do / pay kar dunga"), set "isSettled": true.
5. Keep response under 30 words so it sounds natural on phone.
Output MUST be valid JSON: {"reply": "...", "isSettled": boolean, "detectedLang": "Hindi" | "Marathi" | "Gujarati" | "English" | "Hinglish"}`;

async function testTurn(userMsg) {
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
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  const content = JSON.parse(data.choices[0].message.content);
  return content;
}

(async () => {
  console.log("Testing Round 1 (Hinglish excuse):");
  const r1 = await testTurn("Arre Sarah ji abhi payment nahi ho payega, thoda cash flow tight hai agle hafte dekhte hain na.");
  console.log("Sarah reply:", r1);

  console.log("\nTesting Round 2 (Marathi objection):");
  const r2 = await testTurn("Namaskar Sarah, amhi sadyasthitit paise deu shakat nahi, don divas thamba.");
  console.log("Sarah reply:", r2);

  console.log("\nTesting Round 3 (Agreement):");
  const r3 = await testTurn("Haan theek hai, 5000 abhi link bhej do main clear kar deta hoon.");
  console.log("Sarah reply:", r3);
})();
