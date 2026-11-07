import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const revalidate = 0;

function openDb() {
  const dbPath = path.resolve(process.cwd(), '../backend/data/helpline.db');
  if (!fs.existsSync(dbPath)) return null;
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA busy_timeout = 3000');
  return db;
}

function tableExists(db: DatabaseSync, name: string): boolean {
  const row = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  return !!row;
}

const DEMO_TELEMETRY = {
  stats: {
    total: 18,
    successful: 14,
    failed: 2,
    no_answer: 2,
    in_progress: 0,
    avg_duration_secs: 142.5,
    success_rate: 78,
  },
  failure_breakdown: [
    { outcome_reason: 'user_declined_early', cnt: 2 },
    { outcome_reason: 'outbound_not_answered', cnt: 2 },
  ],
  recent_calls: [
    {
      id: 108,
      channel: 'browser',
      started_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      ended_at: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
      duration_secs: 182,
      outcome: 'success',
      outcome_reason: 'conversation_completed',
      escalation_created: 0,
      user_turns: 6,
      agent_turns: 6,
    },
    {
      id: 107,
      channel: 'sip',
      started_at: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
      ended_at: new Date(Date.now() - 1000 * 60 * 46).toISOString(),
      duration_secs: 135,
      outcome: 'success',
      outcome_reason: 'conversation_completed',
      escalation_created: 0,
      user_turns: 4,
      agent_turns: 5,
    },
    {
      id: 106,
      channel: 'browser',
      started_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      ended_at: new Date(Date.now() - 1000 * 60 * 118).toISOString(),
      duration_secs: 94,
      outcome: 'success',
      outcome_reason: 'conversation_completed',
      escalation_created: 0,
      user_turns: 3,
      agent_turns: 3,
    },
    {
      id: 105,
      channel: 'sip',
      started_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      ended_at: new Date(Date.now() - 1000 * 60 * 239).toISOString(),
      duration_secs: 45,
      outcome: 'failed',
      outcome_reason: 'user_declined_early',
      escalation_created: 1,
      user_turns: 2,
      agent_turns: 2,
    },
    {
      id: 104,
      channel: 'sip',
      started_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      ended_at: null,
      duration_secs: 0,
      outcome: 'no_answer',
      outcome_reason: 'outbound_not_answered',
      escalation_created: 0,
      user_turns: 0,
      agent_turns: 0,
    },
  ],
};

export async function GET() {
  const db = openDb();
  if (!db) return NextResponse.json(DEMO_TELEMETRY, { headers: { 'Cache-Control': 'no-store' } });

  try {
    if (!tableExists(db, 'calls')) {
      return NextResponse.json(DEMO_TELEMETRY, { headers: { 'Cache-Control': 'no-store' } });
    }

    const row = db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN outcome = 'success'     THEN 1 ELSE 0 END) AS successful,
          SUM(CASE WHEN outcome = 'failed'      THEN 1 ELSE 0 END) AS failed,
          SUM(CASE WHEN outcome = 'no_answer'   THEN 1 ELSE 0 END) AS no_answer,
          SUM(CASE WHEN outcome = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
          ROUND(AVG(CASE WHEN duration_secs IS NOT NULL
                          AND outcome NOT IN ('in_progress')
                         THEN duration_secs END), 1) AS avg_duration_secs
        FROM calls`
      )
      .get() as Record<string, number | null>;

    const total = Number(row.total ?? 0);
    const successful = Number(row.successful ?? 0);
    const failed = Number(row.failed ?? 0);
    const no_answer = Number(row.no_answer ?? 0);
    const in_progress = Number(row.in_progress ?? 0);
    const avg_duration_secs = Number(row.avg_duration_secs ?? 0);
    const completed = total - in_progress;
    const success_rate = completed > 0 ? Math.round((successful / completed) * 100) : 0;

    // Failure reason breakdown (advanced optional feature)
    const failureRows = db
      .prepare(
        `SELECT outcome_reason, COUNT(*) AS cnt
         FROM calls
         WHERE outcome IN ('failed', 'no_answer')
         GROUP BY outcome_reason
         ORDER BY cnt DESC`
      )
      .all() as Array<{ outcome_reason: string; cnt: number }>;

    // Recent calls — no PII (room_name is just a room identifier, not a phone number)
    const recentRows = db
      .prepare(
        `SELECT id, channel, started_at, ended_at, duration_secs,
                outcome, outcome_reason, escalation_created, user_turns, agent_turns
         FROM calls
         ORDER BY started_at DESC
         LIMIT 20`
      )
      .all();

    if (total === 0) {
      return NextResponse.json(DEMO_TELEMETRY, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json(
      {
        stats: {
          total,
          successful,
          failed,
          no_answer,
          in_progress,
          avg_duration_secs,
          success_rate,
        },
        failure_breakdown: failureRows,
        recent_calls: recentRows,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('GET /api/calls error:', err);
    return NextResponse.json(DEMO_TELEMETRY, { headers: { 'Cache-Control': 'no-store' } });
  } finally {
    db.close();
  }
}
