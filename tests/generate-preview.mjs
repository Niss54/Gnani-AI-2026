import fs from "node:fs";

const code = fs.readFileSync("tests/send-real-razorpay-email.mjs", "utf-8");
const start = code.indexOf("<!DOCTYPE html>");
const end = code.indexOf("</html>") + 7;
let html = code.substring(start, end);

const logoB64 = fs.readFileSync("frontend/public/logo-email.png").toString("base64");
const verifiedB64 = fs.readFileSync("frontend/public/verified-email.png").toString("base64");

html = html.replace("cid:revclaim-logo", `data:image/png;base64,${logoB64}`);
html = html.replace("cid:verified-badge", `data:image/png;base64,${verifiedB64}`);
html = html.replace(/\$\{INVOICE_NUMBER\}/g, "INV-2026-NISHANT-LIVE");
html = html.replace(/\$\{CLIENT_NAME\}/g, "Nishant Maurya");
html = html.replace(/\$\{AMOUNT_INR\.toLocaleString\("en-IN"\)\}/g, "5,000");
html = html.replace(/\$\{\(AMOUNT_INR \/ 2\)\.toLocaleString\("en-IN"\)\}/g, "2,500");
html = html.replace(/\$\{paymentLinkUrl\}/g, "https://rzp.io/rzp/ZWSKTito");

fs.writeFileSync("tests/preview-email.html", html);
console.log("preview-email.html successfully generated!");
