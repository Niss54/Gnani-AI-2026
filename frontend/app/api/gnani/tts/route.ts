import { NextRequest, NextResponse } from "next/server";
import { synthesizeIndicSpeech, normalizeIndicLanguage } from "@/lib/gnani";

/**
 * Gnani.ai Timbre v3.0 / v2.5 Text-to-Speech API Route
 * Exposes live synthesis for testing, phone agents, and interactive browser widgets.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      language = "Hindi",
      voice = "Shivani",
      model = "timbre-v3.0",
      speed = 1.0,
      expressiveTags = true,
    } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text string is required for speech synthesis" },
        { status: 400 }
      );
    }

    const response = await synthesizeIndicSpeech({
      text,
      language,
      voice,
      model,
      speed,
      expressiveTags,
    });

    return NextResponse.json({
      success: true,
      audioBase64: response.audioBase64,
      audioUrl: response.audioUrl,
      provider: response.provider,
      latencyMs: response.latencyMs,
      modelUsed: response.modelUsed,
      voiceUsed: response.voiceUsed,
      languageUsed: response.languageUsed,
      byteLength: response.byteLength,
      sentiment: response.detectedSentiment,
    });
  } catch (error: any) {
    console.error("[Gnani TTS API Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to synthesize Indic speech" },
      { status: 500 }
    );
  }
}
