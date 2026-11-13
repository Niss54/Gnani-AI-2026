import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const auth = getSupabase();
  if (!auth || !token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "Invalid identity." }, { status: 401 });
  const dbPath = path.resolve(process.cwd(), "../backend/data/helpline.db");
  if (!existsSync(dbPath)) return NextResponse.json({ success: true, deleted: 0 });
  const db = new DatabaseSync(dbPath);
  try {
    const result = db.prepare("DELETE FROM callers WHERE user_id = ?").run(data.user.id);
    return NextResponse.json({ success: true, deleted: Number(result.changes) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Deletion could not be confirmed." }, { status: 503 });
  } finally { db.close(); }
}
