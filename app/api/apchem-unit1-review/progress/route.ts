import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only client. Service role bypasses RLS, so this key must never reach the browser.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TABLE = "apchem_unit1_progress";

// GET /api/apchem-unit1-review/progress?seed=N&program=HS — saved answers for one student's paper
export async function GET(req: NextRequest) {
  const seed = Number(req.nextUrl.searchParams.get("seed"));
  const program = String(req.nextUrl.searchParams.get("program") ?? "").toUpperCase();
  if (!Number.isFinite(seed) || !["HS", "AC"].includes(program))
    return NextResponse.json({ error: "seed and program required." }, { status: 400 });

  const { data, error } = await supabase
    .from(TABLE)
    .select("answers, updated_at")
    .eq("seed", seed)
    .eq("program", program)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? {});
}

// POST /api/apchem-unit1-review/progress — autosave (also hit via sendBeacon on page close)
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const seed = Number(body.seed);
  const program = String(body.program ?? "").trim().toUpperCase();
  const period = String(body.period ?? "").trim().slice(0, 4);
  const name = String(body.student_name ?? "").trim().slice(0, 80);
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};

  if (!Number.isFinite(seed) || !["HS", "AC"].includes(program) || !period || !name)
    return NextResponse.json({ error: "Malformed progress payload." }, { status: 400 });
  if (JSON.stringify(answers).length > 100_000)
    return NextResponse.json({ error: "Answers payload too large." }, { status: 413 });

  const { error } = await supabase.from(TABLE).upsert(
    { seed, program, period, student_name: name, answers, updated_at: new Date().toISOString() },
    { onConflict: "seed,program" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
