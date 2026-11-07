// ============================================================================
// RevClaim AI — LiveKit Real-Time WebRTC Voice Streaming Engine
// ============================================================================
import { AccessToken } from "livekit-server-sdk";

export interface LiveKitSession {
  roomName: string;
  token: string;
  serverUrl: string;
  participantIdentity: string;
}

export async function createLiveKitVoiceSession(
  invoiceId: string,
  clientName: string
): Promise<LiveKitSession> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl =
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    process.env.LIVEKIT_URL ||
    "wss://ravclaim-ai-qe4u52dy.livekit.cloud";

  const roomName = `room_inv_${invoiceId.slice(0, 8)}_${Date.now().toString().slice(-4)}`;
  const participantIdentity = `debtor_${clientName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`;

  // If LiveKit credentials are ready, generate official signed WebRTC token
  if (apiKey && apiSecret && !apiKey.includes("your_livekit")) {
    try {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: participantIdentity,
        ttl: "2h",
      });
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();
      return {
        roomName,
        token,
        serverUrl,
        participantIdentity,
      };
    } catch (err) {
      console.warn("[LiveKit Token Error]:", err);
    }
  }

  // Fallback token
  return {
    roomName,
    token: `sim_token_${Date.now()}`,
    serverUrl,
    participantIdentity,
  };
}
