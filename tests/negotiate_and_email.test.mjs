import assert from "node:assert";

console.log("================================================================================");
console.log("⚡ RevClaim AI — Chat/Voice Email Dispatch & Language Test Suite");
console.log("================================================================================\n");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function run() {
  console.log("▶ [Test 1/4] POST /api/negotiate with English Email Request");
  const enRes = await fetch(`${BASE_URL}/api/negotiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      debtorName: "Nishant Maurya",
      debtorCompany: "Nishant Tech Ventures",
      debtorEmail: "nishantma05@gmail.com",
      invoiceNumber: "INV-2026-NISHANT-LIVE",
      amountDue: 5000,
      currency: "INR",
      daysOverdue: 14,
      deliverable: "Full-Stack AI Voice Agents & Next.js Cockpit Architecture",
      freelancerName: "Nishant Maurya",
      clientLastMessage: "Could you share the payment link in email",
      conversationHistory: [],
    }),
  });

  assert.strictEqual(enRes.status, 200, `Expected 200, got ${enRes.status}`);
  const enData = await enRes.json();
  console.log("  Response reply:", enData.reply);
  console.log("  Email dispatched:", enData.emailDispatched);
  console.log("  Delivered to:", enData.deliveredTo);
  console.log("  Message ID:", enData.emailMessageId);
  assert.strictEqual(enData.success, true, "Negotiation turn should succeed");
  assert.strictEqual(enData.emailDispatched, true, "Email should be dispatched upon request");
  assert.strictEqual(enData.deliveredTo, "nishantma05@gmail.com", "Email must be delivered to nishantma05@gmail.com");
  console.log("  ✔ English email request correctly triggers Resend dispatch!\n");

  console.log("▶ [Test 2/4] Burst Anti-Spam Guard (Simulating 10 Rapid Clicks/Messages in 1s)");
  let blockedCount = 0;
  let successCount = 0;
  const burstPromises = Array.from({ length: 9 }).map(async (_, idx) => {
    const res = await fetch(`${BASE_URL}/api/negotiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        debtorName: "Nishant Maurya",
        debtorCompany: "Nishant Tech Ventures",
        debtorEmail: "nishantma05@gmail.com",
        invoiceNumber: "INV-2026-NISHANT-LIVE",
        amountDue: 5000,
        currency: "INR",
        daysOverdue: 14,
        deliverable: "Deliverables",
        freelancerName: "Nishant Maurya",
        clientLastMessage: `Please send payment link ${idx}`,
        conversationHistory: [],
      }),
    });
    return res.json();
  });

  const burstResults = await Promise.all(burstPromises);
  burstResults.forEach((r) => {
    if (r.emailDispatched) successCount++;
    if (r.emailMessageId?.startsWith("dedup_")) blockedCount++;
  });

  console.log(`  Total burst calls: 10 (1 original + 9 parallel)`);
  console.log(`  Deduplicated & Suppressed by 6s flood barrier: ${blockedCount}`);
  assert(blockedCount > 0, "Rapid burst calls within 6s flood window MUST be deduplicated to avoid 10 emails!");
  console.log("  ✔ Strict anti-spam barrier verified: User will NOT receive 10 spam emails at once!\n");

  console.log("▶ [Test 3/4] POST /api/negotiate with Hindi Devanagari Script (कुल्ड यू शेयर ये पेमेंट लिंक इन ईमेल)");
  const hiRes = await fetch(`${BASE_URL}/api/negotiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      debtorName: "Nishant Maurya",
      debtorCompany: "Nishant Tech Ventures",
      debtorEmail: "nishantma05@gmail.com",
      invoiceNumber: "INV-2026-HI-DEV",
      amountDue: 5000,
      currency: "INR",
      daysOverdue: 14,
      deliverable: "Deliverables",
      freelancerName: "Nishant Maurya",
      clientLastMessage: "कुल्ड यू शेयर ये पेमेंट लिंक इन ईमेल",
      conversationHistory: [],
    }),
  });

  assert.strictEqual(hiRes.status, 200);
  const hiData = await hiRes.json();
  console.log("  Response reply:", hiData.reply);
  console.log("  Email dispatched:", hiData.emailDispatched);
  assert.strictEqual(hiData.emailDispatched, true, "Devanagari script should also trigger email dispatch");
  console.log("  ✔ Devanagari script intent accurately detected and dispatched!\n");

  console.log("▶ [Test 4/4] Follow-up Reflex: 'Didn't get any email / ई डिड'टी गेट एनी ईमेल'");
  const followRes = await fetch(`${BASE_URL}/api/negotiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      debtorName: "Nishant Maurya",
      debtorCompany: "Nishant Tech Ventures",
      debtorEmail: "nishantma05@gmail.com",
      invoiceNumber: "INV-2026-NISHANT-LIVE",
      amountDue: 5000,
      currency: "INR",
      daysOverdue: 14,
      deliverable: "Deliverables",
      freelancerName: "Nishant Maurya",
      clientLastMessage: "I didn't get any email yet",
      conversationHistory: [],
    }),
  });
  const followData = await followRes.json();
  console.log("  Follow-up reply:", followData.reply);
  assert(
    followData.reply.toLowerCase().includes("spam") ||
    followData.reply.toLowerCase().includes("inbox") ||
    followData.reply.toLowerCase().includes("resend") ||
    followData.reply.toLowerCase().includes("nishantma05@gmail.com"),
    "Reply should address email delivery specifically"
  );
  console.log("  ✔ Follow-up reassurance reflex verified!\n");

  console.log("================================================================================");
  console.log("🎉 ALL 4 TESTS PASSED: Email Dispatch, Deduplication, Script & Reflex Ready!");
  console.log("================================================================================\n");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
