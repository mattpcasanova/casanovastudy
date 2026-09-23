import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}
const okPeriod = (p: string) => /^[1-7]$/.test(p);
const okKey = (k: string) => k.length >= 2 && k.length <= 40;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// GET ?period=N&group=<group name>  -> { draft: {...} | null }
export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") || "";
  const group = norm(req.nextUrl.searchParams.get("group") || "");
  if (!okPeriod(period) || !okKey(group)) return NextResponse.json({ error: "bad period or group" }, { status: 400 });
  const { data, error } = await db().from("apstats_unit2_review_draft")
    .select("group_name, members, state, submitted, result, updated_at")
    .eq("period", period).eq("group_key", group).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ draft: data ?? null });
}

// PUT { period, group, group_name, members, state }  -> autosave. Refused once submitted.
export async function PUT(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const period = String(body.period || "");
  const group_key = norm(String(body.group || ""));
  const group_name = String(body.group_name || "").trim().slice(0, 40);
  if (!okPeriod(period) || !okKey(group_key)) return NextResponse.json({ error: "bad period or group" }, { status: 400 });
  const members = Array.isArray(body.members) ? body.members.slice(0, 4).map((m: any) => ({
    first: String(m.first || "").slice(0, 40), last: String(m.last || "").slice(0, 40), program: String(m.program || "").toUpperCase(),
  })) : [];
  const state = body.state && typeof body.state === "object" ? body.state : {};
  if (JSON.stringify(state).length > 60000) return NextResponse.json({ error: "state too large" }, { status: 413 });

  const sb = db();
  const { data: existing } = await sb.from("apstats_unit2_review_draft").select("submitted").eq("period", period).eq("group_key", group_key).maybeSingle();
  if (existing?.submitted) return NextResponse.json({ error: "already submitted" }, { status: 409 });

  const { error } = await sb.from("apstats_unit2_review_draft").upsert(
    { period, group_key, group_name, members, state, submitted: false, updated_at: new Date().toISOString() },
    { onConflict: "period,group_key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
