import { NextRequest, NextResponse } from "next/server";

// In-memory cache to guarantee sub-10ms response for repeated phrases
const audioCache = new Map<string, { buffer: Buffer; contentType: string }>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text") || "Namaste, this is Sarah from RevClaim AI.";
    const rawLang = searchParams.get("lang") || "Hindi";
    const voice = searchParams.get("voice") || "Shivani";

    // Map language parameter
    let language = "Hindi";
    const l = rawLang.toLowerCase();
    if (l.includes("mar") || l === "mr") language = "Marathi";
    else if (l.includes("guj") || l === "gu") language = "Gujarati";
    else if (l.includes("eng") || l === "en") language = "English";
    else if (l.includes("hin") || l === "hi") language = "Hindi";

    const cacheKey = `${voice}_${language}_${text.trim()}`;
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey)!;
      return new NextResponse(new Uint8Array(cached.buffer), {
        headers: {
          "Content-Type": cached.contentType,
          "Content-Length": cached.buffer.length.toString(),
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    const apiKey = process.env.GNANI_API_KEY?.trim();
    if (!apiKey) {
      console.warn("[Gnani Audio Stream] GNANI_API_KEY not configured");
      return new NextResponse("TTS Synthesis Unconfigured", { status: 500 });
    }

    const res = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key-ID": apiKey,
      },
      body: JSON.stringify({
        text,
        language,
        model: "timbre-v3.0",
        voice,
      }),
    });

    if (!res.ok) {
      console.warn(`[Gnani Audio Stream] API returned status ${res.status}`);
      return new NextResponse("TTS Synthesis Error", { status: 502 });
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = "audio/wav";

    // Cache the synthesized audio buffer
    audioCache.set(cacheKey, { buffer, contentType });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error: any) {
    console.error("[Gnani Audio Route Error]:", error);
    return new NextResponse("Internal Audio Error", { status: 500 });
  }
}
