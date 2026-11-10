import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function logCall(msg: string) {
  try {
    const logLine = `[${new Date().toISOString()}] [Gnani Audio Route] ${msg}\n`;
    fs.appendFileSync(path.resolve("twilio_calls.log"), logLine, "utf8");
    console.log(logLine.trim());
  } catch {}
}

function addWavHeader(rawPcm: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
  if (rawPcm.length >= 4 && rawPcm.toString("ascii", 0, 4) === "RIFF") {
    return rawPcm;
  }
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = rawPcm.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitDepth, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  rawPcm.copy(buffer, 44);
  return buffer;
}

// In-memory cache to guarantee sub-10ms response for repeated phrases
const audioCache = new Map<string, { buffer: Buffer; contentType: string }>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    logCall(`Incoming GET for audio: text="${searchParams.get("text")?.slice(0, 40)}" lang=${searchParams.get("lang")}`);
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
      const wavBuf = addWavHeader(cached.buffer);
      return new NextResponse(new Uint8Array(wavBuf), {
        headers: {
          "Content-Type": cached.contentType,
          "Content-Length": wavBuf.length.toString(),
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
    const rawBuffer = Buffer.from(arrayBuf);
    const buffer = addWavHeader(rawBuffer, 24000, 1, 16);
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
    logCall("Gnani Audio Route Error: " + (error?.stack || error?.message || String(error)));
    return new NextResponse("Internal Audio Error: " + (error?.message || String(error)), { status: 500 });
  }
}
