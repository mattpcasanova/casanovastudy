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

type Member = { first: string; last: string; program: string };

// POST: one submission per group -> one row per group member (same group_id, same score).
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const period = String(body.period || "").trim();
  const group_name = String(body.group_name || "").trim().slice(0, 40);
  const members: Member[] = Array.isArray(body.members) ? body.members : [];
  const score = Number(body.score), max_score = Number(body.max_score);

  if (!/^[1-7]$/.test(period)) return NextResponse.json({ error: "bad period" }, { status: 400 });
  if (group_name.length < 2) return NextResponse.json({ error: "group name required" }, { status: 400 });
  if (!members.length || members.length > 4) return NextResponse.json({ error: "1-4 members" }, { status: 400 });
  if (!Number.isFinite(score) || !Number.isFinite(max_score) || max_score <= 0 || score < 0 || score > max_score)
    return NextResponse.json({ error: "bad score" }, { status: 400 });

  const clean = members.map(m => ({
    first: String(m.first || "").trim().slice(0, 40),
    last: String(m.last || "").trim().slice(0, 40),
    program: String(m.program || "").toUpperCase(),
  }));
  if (clean.some(m => !m.first || !m.last || !["HS", "AC"].includes(m.program)))
    return NextResponse.json({ error: "every member needs first name, last name, and HS or AC" }, { status: 400 });

  const group_id = crypto.randomUUID();
  const rows = clean.map(m => ({
    group_id,
    program: m.program,
    period,
    group_name,
    first_name: m.first,
    last_name: m.last,
    seed: Number(body.seed) || 0,
    score,
    max_score,
    section_scores: body.section_scores ?? {},
    answers: body.answers ?? {},
    user_agent: req.headers.get("user-agent") ?? null,
  }));

  const sb = db();
  const { error } = await sb.from("apstats_unit1_review").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark the draft as submitted so the group can reopen it read-only but never resubmit.
  const group_key = String(body.group || group_name.toLowerCase().replace(/\s+/g, " ").trim());
  await sb.from("apstats_unit1_review_draft").upsert({
    period, group_key, group_name, members: clean, state: body.state ?? {},
    submitted: true, result: { score, max_score, sections: body.section_scores ?? {}, max: body.max ?? null },
    updated_at: new Date().toISOString(),
  }, { onConflict: "period,group_key" });

  return NextResponse.json({ ok: true, group_id, rows: rows.length });
}

// GET ?key=EXPORT_KEY[&program=HS|AC][&period=N][&format=json|csv][&best=1]
// Sorted for gradebook entry: program (HS/AC gradebook), period, last name, first name.
// A mixed group shows up under both programs, one row per student.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (!process.env.APSTATS_EXPORT_KEY || sp.get("key") !== process.env.APSTATS_EXPORT_KEY)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const program = (sp.get("program") || "").toUpperCase();
  const period = sp.get("period") || "";
  const format = sp.get("format") || "csv";
  const table = sp.get("best") === "1" ? "apstats_unit1_review_best" : "apstats_unit1_review";

  let q = db().from(table)
    .select("created_at, program, period, last_name, first_name, group_name, score, max_score, percent, group_id, seed")
    .order("program").order("period").order("last_name").order("first_name");
  if (["HS", "AC"].includes(program)) q = q.eq("program", program);
  if (/^[1-7]$/.test(period)) q = q.eq("period", period);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Case-insensitive last-name sort (Postgres order is case-sensitive by default).
  const rows = (data ?? []).sort((a: any, b: any) =>
    a.program.localeCompare(b.program) || Number(a.period) - Number(b.period) ||
    a.last_name.localeCompare(b.last_name, "en", { sensitivity: "base" }) ||
    a.first_name.localeCompare(b.first_name, "en", { sensitivity: "base" }));

  if (format === "json") return NextResponse.json({ rows });

  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    ["submitted_at", "school", "period", "last_name", "first_name", "group", "score", "max_score", "percent", "group_id", "seed"].join(","),
    ...rows.map((r: any) => [r.created_at, r.program, r.period, r.last_name, r.first_name, r.group_name, r.score, r.max_score, r.percent, r.group_id, r.seed].map(esc).join(",")),
  ].join("\n");
  const name = `apstats-unit1-review${program ? "-" + program : ""}${period ? "-p" + period : ""}.csv`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });
}
