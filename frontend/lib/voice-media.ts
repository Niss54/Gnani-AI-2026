import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const key = process.env.VOICE_MEDIA_SIGNING_KEY || process.env.VOICE_INTERNAL_API_KEY;
  if (!key) throw new Error("Voice media signing is not configured.");
  return key;
}
function signature(text: string, language: string, expires: string): string {
  return createHmac("sha256", secret()).update(JSON.stringify([text, language, expires])).digest("hex");
}
export function signedSpeechUrl(base: string, text: string, language: string): URL {
  const url = new URL("/api/tts", base);
  const expires = String(Math.floor(Date.now() / 1000) + 120);
  url.searchParams.set("text", text);
  url.searchParams.set("lang", language);
  url.searchParams.set("expires", expires);
  url.searchParams.set("signature", signature(text, language, expires));
  return url;
}
export function verifySpeechUrl(url: URL): boolean {
  try {
    const text = url.searchParams.get("text") || "";
    const lang = url.searchParams.get("lang") || "";
    const expires = url.searchParams.get("expires") || "";
    const supplied = url.searchParams.get("signature") || "";
    const now = Math.floor(Date.now() / 1000);
    if (!text || text.length > 2000 || !["hi-en", "en-IN"].includes(lang) || !/^\d+$/.test(expires) || Number(expires) < now || Number(expires) > now + 120 || !/^[a-f0-9]{64}$/.test(supplied)) return false;
    return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(signature(text, lang, expires), "hex"));
  } catch { return false; }
}
