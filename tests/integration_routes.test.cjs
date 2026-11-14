const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const dest = path.resolve(__dirname, '../artifacts/verification/ts-modules');
fs.mkdirSync(dest, { recursive: true });

// Compile DB and Route dependencies
for (const rel of ['lib/types.ts', 'lib/demo-data.ts', 'lib/db.ts', 'lib/call-store.ts']) {
  const source = fs.readFileSync(path.resolve(__dirname, `../frontend/${rel}`), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  fs.writeFileSync(path.join(dest, path.basename(rel, '.ts') + '.js'), compiled.outputText);
}

// Compile route handlers with mock next/server
const mockNextServer = `
class MockNextResponse {
  constructor(body, init) {
    this._body = body;
    this.status = init?.status || 200;
    this.headers = init?.headers || {};
  }
  static json(body, init) {
    return new MockNextResponse(body, init);
  }
  async json() {
    return this._body;
  }
}
module.exports = { NextResponse: MockNextResponse };
`;
fs.writeFileSync(path.join(dest, 'mock-next-server.js'), mockNextServer);

for (const [routePath, outName] of [
  ['app/api/checkout/route.ts', 'checkout-route.js'],
  ['app/api/notify/route.ts', 'notify-route.js'],
  ['app/api/call/route.ts', 'call-route.js'],
]) {
  let source = fs.readFileSync(path.resolve(__dirname, `../frontend/${routePath}`), 'utf8');
  source = source.replace(/from\s+["']next\/server["']/g, `from './mock-next-server.js'`);
  source = source.replace(/from\s+["']@\/lib\/db["']/g, `from './db.js'`);
  source = source.replace(/from\s+["']@\/lib\/call-store["']/g, `from './call-store.js'`);
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  fs.writeFileSync(path.join(dest, outName), compiled.outputText);
}

const checkout = require(path.join(dest, 'checkout-route.js'));
const notify = require(path.join(dest, 'notify-route.js'));
const call = require(path.join(dest, 'call-route.js'));

function makeMockReq(body) {
  return {
    json: async () => body,
  };
}

test('RESTORED ROUTE: checkout enforces authoritative invoice and prevents excessive discounts', async () => {
  // 1. Missing invoiceId -> 400
  const r1 = await checkout.POST(makeMockReq({}));
  assert.equal(r1.status, 400);

  // 2. Non-existent invoiceId -> 404
  const r2 = await checkout.POST(makeMockReq({ invoiceId: 'non-existent' }));
  assert.equal(r2.status, 404);

  // 3. Excessive discount (> 1000 bps = 10%) -> 422
  const r3 = await checkout.POST(makeMockReq({ invoiceId: 'inv-2026-jewel-1042', requestedDiscountBps: 2000 }));
  assert.equal(r3.status, 422);
  const d3 = await r3.json();
  assert.match(d3.error, /exceeds authorized mandate maximum/);

  // 4. Valid invoice + authorized discount within mandate (500 bps = 5%)
  const originalFetch = global.fetch;
  process.env.RAZORPAY_KEY_ID = 'rzp_test_mock';
  process.env.RAZORPAY_KEY_SECRET = 'rzp_secret_mock';
  let capturedPayload;
  global.fetch = async (url, init) => {
    capturedPayload = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'plink_test_restored', short_url: 'https://rzp.io/rzp/restored123' }),
    };
  };

  try {
    const r4 = await checkout.POST(makeMockReq({ invoiceId: 'inv-2026-jewel-1042', requestedDiscountBps: 500 }));
    assert.equal(r4.status, 200);
    const d4 = await r4.json();
    assert.equal(d4.success, true);
    assert.equal(d4.paymentLinkId, 'plink_test_restored');
    assert.equal(d4.checkoutUrl, 'https://rzp.io/rzp/restored123');
    assert.equal(d4.amount, 9500); // 10000 - 5% = 9500
    assert.equal(d4.discountAppliedBps, 500);
    // Invariant: no unconsented notifications
    assert.deepEqual(capturedPayload.notify, { sms: false, email: false });
    assert.equal(capturedPayload.reminder_enable, false);
    assert.equal(capturedPayload.amount, 950000); // minor units
  } finally {
    global.fetch = originalFetch;
  }
});

test('RESTORED ROUTE: notify requires authoritative invoice debtor email and provider dispatch', async () => {
  // Missing invoiceId -> 400
  const r1 = await notify.POST(makeMockReq({}));
  assert.equal(r1.status, 400);

  // Unsupported channel -> 422
  const r2 = await notify.POST(makeMockReq({ invoiceId: 'inv-2026-jewel-1042', channel: 'unsupported' }));
  assert.equal(r2.status, 422);

  // Successful Resend email dispatch
  const originalFetch = global.fetch;
  process.env.RESEND_API_KEY = 're_test_mock_123';
  let capturedEmail;
  global.fetch = async (url, init) => {
    capturedEmail = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'email_test_restored_456' }),
    };
  };

  try {
    const r3 = await notify.POST(makeMockReq({ invoiceId: 'inv-2026-jewel-1042', channel: 'email' }));
    assert.equal(r3.status, 200);
    const d3 = await r3.json();
    assert.equal(d3.success, true);
    assert.equal(d3.channel, 'email');
    assert.equal(d3.messageId, 'email_test_restored_456');
    assert.equal(d3.recipient, 'nishantma05@gmail.com');
    assert.deepEqual(capturedEmail.to, ['nishantma05@gmail.com']);
  } finally {
    global.fetch = originalFetch;
  }
});

test('RESTORED ROUTE: call establishes authorized session with contact phone', async () => {
  // Missing invoiceId -> 400
  const r1 = await call.POST(makeMockReq({}));
  assert.equal(r1.status, 400);

  // Missing invoice -> 404
  const r2 = await call.POST(makeMockReq({ invoiceId: 'missing-id' }));
  assert.equal(r2.status, 404);

  // Valid invoice -> session created / call initiated
  const r3 = await call.POST(makeMockReq({ invoiceId: 'inv-2026-jewel-1042' }));
  assert.equal(r3.status, 200);
  const d3 = await r3.json();
  assert.equal(d3.success, true);
  assert.ok(d3.callId);
  assert.equal(d3.phone, '+91 8840301998');
});
