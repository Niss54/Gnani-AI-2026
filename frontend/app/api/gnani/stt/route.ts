import { NextRequest, NextResponse } from "next/server";
import { transcribeWithPrisma, normalizeIndicLanguage } from "@/lib/gnani";

/**
 * Gnani.ai Prisma v3.0 / v2.5 Speech-to-Text API Route
 * Processes incoming audio payloads, detects code-mixed Indic dialects,
 * and extracts financial Promise-To-Pay (PTP) commitments.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let audioBuffer: Buffer;
    let languageCode = "hi-IN";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (!body.audioBase64) {
        return NextResponse.json(
          { error: "audioBase64 string required in JSON body" },
          { status: 400 }
        );
      }
      const rawBase64 = body.audioBase64.replace(/^data:audio\/\w+;base64,/, "");
      audioBuffer = Buffer.from(rawBase64, "base64");
      if (body.languageCode) {
        languageCode = normalizeIndicLanguage(body.languageCode);
      }
    } else {
      const arrayBuffer = await req.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json(
        { error: "No audio payload received" },
        { status: 400 }
      );
    }

    const result = await transcribeWithPrisma(audioBuffer, languageCode as any);

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      detectedLanguage: result.detectedLanguage,
      confidence: result.confidence,
      provider: result.provider,
      latencyMs: result.latencyMs,
      extractedPtp: result.extractedPtp,
    });
  } catch (error: any) {
    console.error("[Gnani STT API Route Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
