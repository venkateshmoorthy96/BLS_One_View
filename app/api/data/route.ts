import { type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { dataStatus, reloadData } from "@/lib/data/store";

// GET: validation report for the CSV dataset. POST: re-read every file (after replacing CSVs) and return the new report.
async function authed(req: NextRequest) {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
}
export async function GET(req: NextRequest) {
  if (!(await authed(req))) return Response.json({ error: "Not signed in" }, { status: 401 });
  return Response.json(dataStatus(), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(req: NextRequest) {
  if (!(await authed(req))) return Response.json({ error: "Not signed in" }, { status: 401 });
  return Response.json(reloadData(), { headers: { "Cache-Control": "no-store" } });
}
