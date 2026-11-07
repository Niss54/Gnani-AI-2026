import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const revalidate = 0;

const STATUSES = ['open', 'acknowledged', 'resolved'];

// Same file the Python agent writes through aiosqlite. WAL is enabled by db.init_db(),
// so a concurrent agent write no longer means SQLITE_BUSY here.
function openDb() {
  const dbPath = path.resolve(process.cwd(), '../backend/data/helpline.db');
  if (!fs.existsSync(dbPath)) return null;
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA busy_timeout = 3000');
  return db;
}

const ref = (id: number) => `ESC-${String(id).padStart(4, '0')}`;

const DEMO_ESCALATIONS = [
  {
    id: 1,
    ref: 'ESC-0001',
    caller_user_id: 'deb-nexus-corp',
    caller_name: 'Nexus Corp (Vikram Malhotra)',
    language: 'Hindi / English',
    urgency: 'high',
    what_happened: 'Debtor requested 10% cash settlement discount for milestone 2 completion',
    already_checked: 'Invoice INV-1044 (₹25,000) overdue 12 days',
    followup_method: 'WhatsApp / Email',
    callback_phone: '+91 8840301998',
    status: 'open',
    resolution_note: 'Awaiting founder sign-off on 10% discount',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 2,
    ref: 'ESC-0002',
    caller_user_id: 'deb-cloudscale',
    caller_name: 'CloudScale Inc (Ananya Roy)',
    language: 'English',
    urgency: 'medium',
    what_happened: 'Debtor promised 50% split wire transfer by next Friday',
    already_checked: 'Invoice INV-1043 (₹68,500)',
    followup_method: 'Email',
    callback_phone: '+91 8840301998',
    status: 'acknowledged',
    resolution_note: 'PTP logged; split payment link dispatched via Razorpay',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
];

export async function GET(req: Request) {
  try {
    const status = new URL(req.url).searchParams.get('status') ?? 'open';
    const db = openDb();
    if (!db) {
      const filtered = status ? DEMO_ESCALATIONS.filter(e => e.status === status) : DEMO_ESCALATIONS;
      return NextResponse.json({ escalations: filtered }, { headers: { 'Cache-Control': 'no-store' } });
    }

    try {
      const rows = status
        ? db
            .prepare(
              'SELECT * FROM escalations WHERE status = ? ORDER BY created_at DESC LIMIT 100'
            )
            .all(status)
        : db.prepare('SELECT * FROM escalations ORDER BY created_at DESC LIMIT 100').all();
      
      if (!rows || rows.length === 0) {
        const filtered = status ? DEMO_ESCALATIONS.filter(e => e.status === status) : DEMO_ESCALATIONS;
        return NextResponse.json({ escalations: filtered }, { headers: { 'Cache-Control': 'no-store' } });
      }

      const escalations = rows.map((r) => ({ ...r, ref: ref(Number(r.id)) }));
      return NextResponse.json({ escalations }, { headers: { 'Cache-Control': 'no-store' } });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Escalations GET error:', error);
    const status = new URL(req.url).searchParams.get('status') ?? 'open';
    const filtered = status ? DEMO_ESCALATIONS.filter(e => e.status === status) : DEMO_ESCALATIONS;
    return NextResponse.json({ escalations: filtered }, { headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function PATCH(req: Request) {
  // Fails closed: with ADMIN_TOKEN unset nobody can write, so a forgotten env var
  // cannot leave status updates open to the internet.
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || req.headers.get('x-admin-token') !== expected) {
    return NextResponse.json(
      { error: 'forbidden — set ADMIN_TOKEN and send x-admin-token' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const escRef = String(body?.ref ?? '');
    const status = String(body?.status ?? '').toLowerCase();
    const note = String(body?.note ?? '');
    const id = Number(escRef.replace(/\D/g, ''));
    if (!id || !STATUSES.includes(status)) {
      return NextResponse.json({ error: 'bad ref or status' }, { status: 400 });
    }

    const db = openDb();
    if (!db) return NextResponse.json({ error: 'database not found' }, { status: 404 });
    try {
      const res = db
        .prepare(
          'UPDATE escalations SET status = ?, resolution_note = ?, updated_at = ? WHERE id = ?'
        )
        .run(status, note, new Date().toISOString(), id);
      if (res.changes === 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
      const row = db.prepare('SELECT * FROM escalations WHERE id = ?').get(id);
      return NextResponse.json({ escalation: { ...row, ref: ref(id) } });
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Escalations PATCH error:', error);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
