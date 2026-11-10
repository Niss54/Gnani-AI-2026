import fs from "node:fs";
import path from "node:path";

let gnaniKey = process.env.GNANI_API_KEY;
if (!gnaniKey) {
  try {
    const envContent = fs.readFileSync(path.resolve("frontend/.env"), "utf8");
    const match = envContent.match(/GNANI_API_KEY=([^\r\n]+)/);
    if (match) gnaniKey = match[1].trim();
  } catch {}
}

async function testSynthesis(text, lang = "Hindi") {
  const t0 = Date.now();
  const res = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key-ID": gnaniKey,
    },
    body: JSON.stringify({
      text,
      language: lang,
      model: "timbre-v3.0",
      voice: "Shivani",
    }),
  });

  const latency = Date.now() - t0;
  console.log(`Status: ${res.status}, Latency: ${latency}ms`);
  const buf = await res.arrayBuffer();
  console.log(`Received ${buf.byteLength} bytes for "${text.slice(0, 30)}..." in ${lang}`);
}

(async () => {
  await testSynthesis("Samajh gayi Nishant ji. Aaj 5,000 bhej do link pe, baaki agle hafte. Theek hai?", "Hindi");
  await testSynthesis("Me samju shakte. 5,000 aaj clear kara ani baki pudhil aathvadyat?", "Marathi");
})();
