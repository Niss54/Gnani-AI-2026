import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { verifySpeechUrl } from "@/lib/voice-media";

export const runtime = "nodejs";

// Bounded process-local cache only; invoice speech must not persist to shared disk.
const memoryCache = new Map<string, { buffer: Buffer; contentType: string; expires: number }>();
function getCacheKey(text: string, voiceId: string): string {
  return createHash("sha256").update(`${voiceId}:${text.trim()}`).digest("hex");
}
async function getCachedAudio(key: string) {
  const entry = memoryCache.get(key);
  if (entry && entry.expires > Date.now()) return entry;
  memoryCache.delete(key);
  return null;
}
async function saveCachedAudio(key: string, buffer: Buffer, contentType: string) {
  if (memoryCache.size >= 32) memoryCache.delete(memoryCache.keys().next().value!);
  memoryCache.set(key, { buffer, contentType, expires: Date.now() + 120_000 });
}

function pcmToWav(pcmData: Buffer, sampleRate = 16000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

async function synthesizeSpeech(text: string, voiceId?: string, language = "en-IN"): Promise<{ buffer: Buffer; contentType: string } | null> {
  const cleanText = text.trim();
  if (!cleanText) return null;

  const targetVoice = voiceId || "EXAVITQu4vr4xnSDxMaL"; // Sarah: High-EQ, natural, confident
  const cacheKey = getCacheKey(cleanText, `${targetVoice}:${language}`);
  const cached = await getCachedAudio(cacheKey);
  if (cached) return cached;

  // 1. Primary: ElevenLabs Ultra-Realistic Multilingual Model
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (elevenKey && !elevenKey.includes("your_elevenlabs")) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}?output_format=mp3_44100_128`, {
        method: "POST",
        signal: AbortSignal.timeout(8_000),
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": elevenKey,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.50,
            similarity_boost: 0.85,
            style: 0.20,
            use_speaker_boost: true,
          },
        }),
      });

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        await saveCachedAudio(cacheKey, buffer, "audio/mpeg");
        return { buffer, contentType: "audio/mpeg" };
      } else {
        console.warn("[ElevenLabs TTS Error]:", res.status);
      }
    } catch (err) {
      console.warn("[ElevenLabs TTS Network Error]:", err);
    }
  }

  // 2. Secondary: Gnani.ai Vachana Indic Audio
  const gnaniKey = process.env.GNANI_API_KEY?.trim();
  if (gnaniKey && gnaniKey.startsWith("vach_")) {
    try {
      const res = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
        method: "POST",
        signal: AbortSignal.timeout(8_000),
        headers: {
          "Content-Type": "application/json",
          "X-API-Key-ID": gnaniKey,
        },
        body: JSON.stringify({
          text: cleanText,
          language: language === "hi-en" ? "Hindi" : "English",
          model: "timbre-v3.0",
          voice: "Shivani",
        }),
      });

      if (res.ok) {
        const rawPcm = Buffer.from(await res.arrayBuffer());
        // Gnani returns raw headerless PCM - convert to valid RIFF WAVE
        const wavBuffer = pcmToWav(rawPcm, 16000, 1, 16);
        await saveCachedAudio(cacheKey, wavBuffer, "audio/wav");
        return { buffer: wavBuffer, contentType: "audio/wav" };
      }
    } catch (err) {
      console.warn("[Gnani TTS Network Error]:", err);
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    if (!verifySpeechUrl(url)) return new NextResponse("Unauthorized media request", { status: 401 });
    const { searchParams } = url;
    const text = searchParams.get("text") || "Namaste, this is Sarah from RevClaim AI.";
    const voiceId = process.env.VOICE_TTS_VOICE_ID || undefined;

    const result = await synthesizeSpeech(text, voiceId, searchParams.get("lang") || "en-IN");
    if (!result) {
      return new NextResponse("TTS Unavailable", { status: 503 });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "private, no-store",
        "Content-Length": String(result.buffer.length),
      },
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Internal error", { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Use a signed session speech URL." }, { status: 401 });
}
