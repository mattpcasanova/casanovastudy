import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only client. Service role bypasses RLS, so this key must never reach the browser.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TABLE = "apchem_unit2_review";

// POST /api/apchem-unit2-review  — called by public/apchem/unit2-review.html on "Turn in"
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const first = String(body.first_name ?? "").trim().slice(0, 40);
  const last = String(body.last_name ?? "").trim().slice(0, 40);
  const name = `${first} ${last}`.trim();
  const period = String(body.period ?? "").trim().slice(0, 4);
  const program = String(body.program ?? "").trim().toUpperCase();
  const seed = Number(body.seed);
  const score = Number(body.score);
  const max = Number(body.max_score);

  if (!first || !last) return NextResponse.json({ error: "First and last name required." }, { status: 400 });
  if (!period) return NextResponse.json({ error: "Period required." }, { status: 400 });
  if (!["HS", "AC"].includes(program)) return NextResponse.json({ error: "Program must be HS or AC." }, { status: 400 });
  if (![seed, score, max].every(Number.isFinite) || max <= 0 || score < 0 || score > max)
    return NextResponse.json({ error: "Score fields are malformed." }, { status: 400 });

  const { error } = await supabase.from(TABLE).insert({
    student_name: name,
    first_name: first,
    last_name: last,
    program,
    period,
    seed,
    score,
    max_score: max,
    answers: body.answers ?? {},
    user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Turned in — clear any saved in-progress answers for this paper.
  await supabase.from("apchem_unit2_progress").delete().eq("seed", seed).eq("program", program);

  return NextResponse.json({ ok: true });
}

// GET /api/apchem-unit2-review?key=TEACHER_EXPORT_KEY[&program=HS][&period=3]  — CSV of submissions, sorted by last name within program
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.APCHEM_EXPORT_KEY)
    return new NextResponse("Not authorized.", { status: 401 });

  const period = req.nextUrl.searchParams.get("period");
  const program = req.nextUrl.searchParams.get("program");
  let q = supabase
    .from(TABLE)
    .select("created_at, first_name, last_name, program, period, score, max_score, percent, seed")
    .order("program", { ascending: true })
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true })
    .order("created_at", { ascending: false });
  if (period) q = q.eq("period", period);
  if (program) q = q.eq("program", program.toUpperCase());

  const { data, error } = await q;
  if (error) return new NextResponse(error.message, { status: 500 });

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["last_name", "first_name", "program", "period", "score", "max", "percent", "submitted_at", "seed"].join(","),
    ...(data ?? []).map((r) =>
      [r.last_name, r.first_name, r.program, r.period, r.score, r.max_score, r.percent, r.created_at, r.seed].map(esc).join(",")
    ),
  ];
  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="apchem-unit2-review${program ? "-" + program : ""}${period ? "-p" + period : ""}.csv"`,
    },
  });
}
