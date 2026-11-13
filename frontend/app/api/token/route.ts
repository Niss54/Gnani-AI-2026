import { NextResponse } from 'next/server';
import { getVoiceSession } from '@/lib/voice-client';
import { randomUUID } from 'node:crypto';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from 'livekit-server-sdk';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

// LiveKit credentials
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
const AGENT_NAME = process.env.AGENT_NAME;

// don't cache the results
export const revalidate = 0;

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Parse room config from request body (if provided).
    const body = await req.json().catch(() => ({}));
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ') || typeof body.sessionId !== 'string') {
      return NextResponse.json({ error: 'An authenticated voice session is required.' }, { status: 401 });
    }
    const voiceSession = await getVoiceSession(body.sessionId, { accessToken: auth.slice(7) });
    if (voiceSession.should_end_call) return NextResponse.json({ error: 'Session is closed.' }, { status: 409 });
    let roomConfig: RoomConfiguration | undefined;
    if (AGENT_NAME) {
      // When AGENT_NAME is set, configure explicit agent dispatch so the named
      // agent worker picks up the job when a user joins the room.
      roomConfig = RoomConfiguration.fromJson(
        { agents: [{ agentName: AGENT_NAME }] },
        { ignoreUnknownFields: true }
      );
    }

    const participantName = 'Voice caller';
    const participantIdentity = `caller_${randomUUID()}`;
    const roomName = `voice_${voiceSession.session_id}_${randomUUID()}`;

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      roomConfig
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantName,
      participantToken,
    };
    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Set-Cookie': `revclaim_caller_id=${participantIdentity}; Path=/; Max-Age=31536000; SameSite=Lax`,
    });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  roomConfig?: RoomConfiguration
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (roomConfig) {
    at.roomConfig = roomConfig;
  }

  return at.toJwt();
}
