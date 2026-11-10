async function test() {
  const base = "http://localhost:3000/api/twilio/voice/respond";

  console.log("=== RUNNING REGRESSION TESTS FOR VOICE RESPOND ===");

  // Test 1: Delay
  let res = await fetch(`${base}?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=%2B918840301998&turn=1`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SpeechResult: "Bhaiya abhi cash tight hai agle hafte dekhenge" }).toString()
  });
  let text = await res.text();
  console.log("\n[TEST 1] Objection / Cash Delay Turn 1:");
  console.log(text);

  // Test 2: Agreement
  res = await fetch(`${base}?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=%2B918840301998&turn=2`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SpeechResult: "Theek hai main pay kar dunga" }).toString()
  });
  text = await res.text();
  console.log("\n[TEST 2] Debtor Agrees Turn 2:");
  console.log(text);

  // Test 3: WhatsApp
  res = await fetch(`${base}?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=%2B918840301998&turn=3`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SpeechResult: "WhatsApp par bhej do" }).toString()
  });
  text = await res.text();
  console.log("\n[TEST 3] Debtor Selects WhatsApp Turn 3:");
  console.log(text);

  // Test 4: Email
  res = await fetch(`${base}?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=%2B918840301998&turn=4`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SpeechResult: "Email par bhejo" }).toString()
  });
  text = await res.text();
  console.log("\n[TEST 4] Debtor Selects Email Turn 4:");
  console.log(text);
}

test().catch(console.error);
