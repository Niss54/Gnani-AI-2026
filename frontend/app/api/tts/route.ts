import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, language = "Hindi", languageCode } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // 1. Primary Indic Voice: Gnani.ai Vachana API (timbre-v3.0 / Shivani / Kavya)
    const gnaniApiKey = process.env.GNANI_API_KEY?.trim();
    if (gnaniApiKey && gnaniApiKey.startsWith("vach_")) {
      try {
        const isSouthIndic =
          languageCode === "ta" ||
          languageCode === "te" ||
          languageCode === "kn" ||
          language.toLowerCase().includes("tamil") ||
          language.toLowerCase().includes("telugu") ||
          language.toLowerCase().includes("kannada");

        // Gnani Timbre v3.0 supported voices: Avinash, Shivani, Lakshmi, Kalpana, Shubham, Prakash, Devansh, Yashraj, Chetana, Vasudha, Harshad, Riyaa, Tarika
        const selectedGnaniVoice = isSouthIndic ? "Lakshmi" : "Shivani";

        const gnaniRes = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key-ID": gnaniApiKey,
          },
          body: JSON.stringify({
            text,
            language: language || "Hindi",
            model: "timbre-v3.0",
            voice: selectedGnaniVoice,
          }),
        });

        if (gnaniRes.ok) {
          const audioBuffer = await gnaniRes.arrayBuffer();
          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              "Content-Type": "audio/wav",
              "Cache-Control": "public, max-age=3600",
            },
          });
        } else {
          console.warn("[Gnani TTS API Response]:", gnaniRes.status, await gnaniRes.text());
        }
      } catch (gnaniErr) {
        console.warn("[Gnani TTS Fetch Error]:", gnaniErr);
      }
    }

    // 2. Secondary Voice: ElevenLabs (Sarah - Ultra-Realistic High-EQ Voice)
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
    const selectedVoice = voiceId || "EXAVITQu4vr4xnSDxMaL";

    if (apiKey && !apiKey.includes("your_elevenlabs")) {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.50,
              similarity_boost: 0.85,
              style: 0.25,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=3600",
          },
        });
      } else {
        const errText = await response.text();
        console.warn("[ElevenLabs TTS Error]:", response.status, errText);
      }
    }

    return NextResponse.json(
      { error: "TTS synthesis engine unavailable" },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("[TTS Route Error]:", error);
    return NextResponse.json(
      { error: error?.message || "TTS synthesis failed" },
      { status: 500 }
    );
  }
}
