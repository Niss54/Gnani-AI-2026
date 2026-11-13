import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const memoryCache = new Map<string, { buffer: Buffer; contentType: string }>();
const CACHE_DIR = path.join(process.cwd(), ".cache", "tts");

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch {}
}

function getCacheKey(text: string, voiceId: string): string {
  return createHash("md5").update(`${voiceId}:${text.trim()}`).digest("hex");
}

async function getCachedAudio(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const mem = memoryCache.get(key);
  if (mem) return mem;
  try {
    const mp3Path = path.join(CACHE_DIR, `${key}.mp3`);
    const data = await fs.readFile(mp3Path);
    const entry = { buffer: data, contentType: "audio/mpeg" };
    memoryCache.set(key, entry);
    return entry;
  } catch {
    try {
      const wavPath = path.join(CACHE_DIR, `${key}.wav`);
      const data = await fs.readFile(wavPath);
      const entry = { buffer: data, contentType: "audio/wav" };
      memoryCache.set(key, entry);
      return entry;
    } catch {
      return null;
    }
  }
}

async function saveCachedAudio(key: string, buffer: Buffer, contentType: string): Promise<void> {
  memoryCache.set(key, { buffer, contentType });
  try {
    await ensureCacheDir();
    const ext = contentType.includes("mpeg") ? "mp3" : "wav";
    await fs.writeFile(path.join(CACHE_DIR, `${key}.${ext}`), buffer);
  } catch {}
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

async function synthesizeSpeech(text: string, voiceId?: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const cleanText = text.trim();
  if (!cleanText) return null;

  const targetVoice = voiceId || "EXAVITQu4vr4xnSDxMaL"; // Sarah: High-EQ, natural, confident
  const cacheKey = getCacheKey(cleanText, targetVoice);
  const cached = await getCachedAudio(cacheKey);
  if (cached) return cached;

  // 1. Primary: ElevenLabs Ultra-Realistic Multilingual Model
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (elevenKey && !elevenKey.includes("your_elevenlabs")) {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoice}?output_format=mp3_44100_128`, {
        method: "POST",
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
        console.warn("[ElevenLabs TTS Error]:", res.status, await res.text());
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
        headers: {
          "Content-Type": "application/json",
          "X-API-Key-ID": gnaniKey,
        },
        body: JSON.stringify({
          text: cleanText,
          language: "Hindi",
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
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text") || "Namaste, this is Sarah from RevClaim AI.";
    const voiceId = searchParams.get("voiceId") || searchParams.get("voice") || undefined;

    const result = await synthesizeSpeech(text, voiceId);
    if (!result) {
      return new NextResponse("TTS Unavailable", { status: 503 });
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Content-Length": String(result.buffer.length),
      },
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Internal error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const result = await synthesizeSpeech(text, body.voiceId);
    if (!result) {
      return NextResponse.json({ error: "TTS synthesis engine unavailable" }, { status: 503 });
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Content-Length": String(result.buffer.length),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "TTS synthesis failed" }, { status: 500 });
  }
}
