import { type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { analysis } from "@/lib/analysis/engine";
import { DataUnavailableError } from "@/lib/data/store";

// Lazy detail for the Expand analysis view. GET /api/analysis?key=REV&range=ytd&cur=USD&bu=ALL
export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401 });
  const params = new URLSearchParams(req.nextUrl.searchParams);
  const key = params.get("key") ?? "";
  params.delete("key");
  let out;
  try {
    out = analysis(key, params);
  } catch (e) {
    if (e instanceof DataUnavailableError) return Response.json({ error: "The dataset failed validation, so this analysis cannot be calculated.", issues: e.report.issues.length }, { status: 503 });
    throw e;
  }
  if (!out) return Response.json({ error: `Unknown analysis "${key}"` }, { status: 404 });
  return Response.json(out, { headers: { "Cache-Control": "private, max-age=300" } });
}
