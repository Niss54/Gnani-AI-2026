const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

const dest = path.resolve(__dirname, '../artifacts/verification/ts-modules');
fs.mkdirSync(dest, { recursive: true });
for (const name of ['voice-client', 'voice-media', 'twilio', 'razorpay', 'resend']) {
  const source = fs.readFileSync(path.resolve(__dirname, `../frontend/lib/${name}.ts`), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  fs.writeFileSync(path.join(dest, `${name}.js`), compiled.outputText);
}
const media = require(path.join(dest, 'voice-media.js'));
const twilio = require(path.join(dest, 'twilio.js'));
const payments = require(path.join(dest, 'razorpay.js'));
process.env.VOICE_INTERNAL_API_KEY = 'isolated-test-key';
process.env.VOICE_PUBLIC_BASE_URL = 'https://voice.example.test';
process.env.TWILIO_AUTH_TOKEN = 'isolated-test-token';

test('speech URLs reject modified text, expired and unsigned requests', () => {
  const url = media.signedSpeechUrl('https://voice.example.test', 'Private balance', 'en-IN');
  assert.equal(media.verifySpeechUrl(url), true);
  url.searchParams.set('text', 'Different balance');
  assert.equal(media.verifySpeechUrl(url), false);
  const expired = media.signedSpeechUrl('https://voice.example.test', 'Hello', 'en-IN');
  expired.searchParams.set('expires', '0');
  assert.equal(media.verifySpeechUrl(expired), false);
  assert.equal(media.verifySpeechUrl(new URL('https://voice.example.test/api/tts?text=hello')), false);
});

test('carrier listens during reply playback and leaves time for pauses', () => {
  const xml = twilio.renderGatherReply({ reply: 'Go ahead & explain.', language: 'hi-en', sessionId: 'test', sequence: 1, stateVersion: 1, endCall: false });
  assert.ok(xml.indexOf('<Gather ') < xml.indexOf('<Play>'));
  assert.match(xml, /speechTimeout="2"/);
  assert.match(xml, /signature=/);
  assert.doesNotMatch(xml, /45000|Nishant/);
  const closing = twilio.renderGatherReply({ reply: 'Goodbye', language: 'en-IN', sessionId: 'test', sequence: 1, stateVersion: 1, endCall: true });
  assert.match(closing, /<Hangup\/>/);
  assert.doesNotMatch(closing, /<Gather/);
});

test('webhook cannot bypass signatures through a development flag', () => {
  process.env.SKIP_TWILIO_VALIDATION = 'true';
  const fields = new URLSearchParams({ CallSid: 'CA123' });
  assert.equal(twilio.validateTwilioWebhook('https://voice.example.test/api/twilio/voice', null, fields), false);
  const signature = crypto.createHmac('sha1', process.env.TWILIO_AUTH_TOKEN).update('https://voice.example.test/api/twilio/voiceCallSidCA123').digest('base64');
  assert.equal(twilio.validateTwilioWebhook('https://voice.example.test/api/twilio/voice', signature, fields), true);
});

test('payment credentials missing means no fabricated URL or signature acceptance', async () => {
  delete process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_SECRET; delete process.env.RAZORPAY_WEBHOOK_SECRET;
  assert.equal(payments.verifyRazorpayPaymentSignature({ orderId: 'x', paymentId: 'y', signature: 'z' }), false);
  assert.equal(payments.verifyRazorpayWebhookSignature('{}', null).valid, false);
  await assert.rejects(payments.createRazorpayPaymentLink({ invoiceId: 'x', invoiceNumber: 'x', amount: 1 }));
  await assert.rejects(payments.createRazorpayOrder({ invoiceId: 'x', invoiceNumber: 'x', amount: 1 }));
});

test('payment link creation never sends notifications implicitly', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_test'; process.env.RAZORPAY_KEY_SECRET = 'test';
  const original = global.fetch;
  let payload;
  global.fetch = async (url, init) => { payload = JSON.parse(init.body); return new Response(JSON.stringify({ id: 'plink_test', short_url: 'https://example.test/payment' }), { status: 200 }); };
  try {
    await payments.createRazorpayPaymentLink({ invoiceId: 'x', invoiceNumber: 'x', amount: 1 });
    assert.deepEqual(payload.notify, { sms: false, email: false });
    assert.equal(payload.reminder_enable, false);
    assert.equal(payload.accept_partial, false);
  } finally { global.fetch = original; }
});

const email = require(path.join(dest, 'resend.js'));
test('email rejection never redirects to a developer or claims success', async () => {
  process.env.RESEND_API_KEY = 'test'; process.env.RESEND_FROM_EMAIL = 'accounts@example.test';
  const original = global.fetch;
  let calls = 0, payload;
  global.fetch = async (url, init) => { calls++; payload = JSON.parse(init.body); return new Response('{}', { status: 403 }); };
  try {
    const result = await email.sendRecoveryEmail({ to: 'client@example.test', clientName: 'Client', amount: 1, invoiceNumber: 'INV1', paymentLink: 'https://example.test/pay' });
    assert.equal(result.success, false); assert.equal(calls, 1);
    assert.deepEqual(payload.to, ['client@example.test']);
    assert.doesNotMatch(payload.text, /HDFC|IFSC|REVCINV|Escrow|24 hours|MSMED/);
  } finally { global.fetch = original; }
});
