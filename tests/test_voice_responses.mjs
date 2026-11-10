async function runTests() {
  const base = "http://localhost:3000/api/twilio/voice/respond";

  console.log("=== 5-STAGE CONVERSATION & INVOICE CONSISTENCY REGRESSION TESTS ===");

  // Turn 1: Debtor confirms hearing
  console.log("\n[TEST 1] Turn 1 - Debtor confirms hearing ('हाँ, सुन रहा हूँ'):");
  let res = await fetch(`${base}?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=%2B918840301998&turn=1`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SpeechResult: "हाँ, सुन रहा हूँ" }).toString()
  });
  console.log(await res.text());

  // Turn 2: Debtor gives excuse
  console.log("\n[TEST 2] Turn 2 - Debtor pushes back / excuse ('नहीं, अभी पैसे नहीं हैं'):");
  res = await fetch(`${base}?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=%2B918840301998&turn=2`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SpeechResult: "नहीं, अभी पैसे नहीं हैं" }).toString()
  });
  console.log(await res.text());

  // Turn 3: Debtor stalls
  console.log("\n[TEST 3] Turn 3 - Debtor stalls ('देखते हैं बाद में'):");
  res = await fetch(`${base}?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=%2B918840301998&turn=3`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SpeechResult: "देखते हैं बाद में" }).toString()
  });
  console.log(await res.text());

  // Turn 4: Debtor agrees
  console.log("\n[TEST 4] Turn 4 - Debtor agrees to pay ('ठीक है, लिंक भेज दो'):");
  res = await fetch(`${base}?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=%2B918840301998&turn=4`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SpeechResult: "ठीक है, लिंक भेज दो" }).toString()
  });
  console.log(await res.text());

  // Turn 5: Debtor chooses Email
  console.log("\n[TEST 5] Turn 5 - Debtor specifies Email ('ईमेल पर भेजो'):");
  res = await fetch(`${base}?clientName=Nishant&invoiceNumber=INV-2026-JEWEL-1042&amount=10000&phone=%2B918840301998&turn=5`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ SpeechResult: "ईमेल पर भेजो" }).toString()
  });
  console.log(await res.text());
}

runTests().catch(console.error);
