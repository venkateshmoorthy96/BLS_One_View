import crypto from "node:crypto";
// Smoke test against a running server.
// Usage: BASE_URL=http://localhost:3000 SESSION_SECRET=<same secret as server> node scripts/smoke-test.mjs
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.SESSION_SECRET;
if (!SECRET) { console.error("SESSION_SECRET required to forge test cookies"); process.exit(2); }
const b64 = (b) => Buffer.from(b).toString("base64url");
const sign = (payload, secret = SECRET) => { const body = b64(JSON.stringify(payload)); return `${body}.${crypto.createHmac("sha256", secret).update(body).digest("base64url")}`; };
const now = Math.floor(Date.now() / 1000);
const good = sign({ sub: "Demo_project_for_interview", iat: now, exp: now + 600 });
const expired = sign({ sub: "Demo_project_for_interview", iat: now - 100, exp: now - 10 });
const wrongKey = sign({ sub: "x", iat: now, exp: now + 600 }, "another-secret-another-secret-another-secret");
const slugs = ["overview", "executive-strategy", "client-revenue", "translation-ops", "interpretation-ops", "finance-profitability", "ai-automation", "forecasting-scenarios", "sales-marketing", "quality-compliance", "hr-workforce", "capacity-demand", "technology-integration", "risk-alerts", "data-governance", "enhancement", "coming-soon", "feedback"];
let fail = 0;
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"}  ${m}`); if (!c) fail++; };
const get = (p, cookie) => fetch(BASE + p, { redirect: "manual", headers: cookie ? { cookie: `bls_oneview_session=${cookie}` } : {} });

for (const s of slugs) {
  const r = await get(`/${s}`, good);
  const t = await r.text();
  ok(r.status === 200 && t.includes("DEMO / SYNTHETIC DATA") && !t.includes("Application error"), `/${s} renders with a valid session (${r.status})`);
}
for (const s of slugs) {
  const r = await get(`/${s}`);
  ok(r.status === 307 && (r.headers.get("location") ?? "").endsWith("/login"), `/${s} redirects to /login without a session`);
}
for (const [name, c] of [["tampered", good + "x"], ["expired", expired], ["wrong-key", wrongKey], ["garbage", "abc"]]) {
  const r = await get("/overview", c);
  ok(r.status === 307 && (r.headers.get("location") ?? "").endsWith("/login"), `/overview with ${name} cookie redirects to /login (${r.status})`);
}
ok((await get("/login")).status === 200, "/login reachable when signed out");
ok((await get("/login", good)).status === 307, "/login redirects into the app when signed in");
const eur = await (await get("/overview?range=ttm&cur=EUR&bu=UNIT_ALPHA", good)).text();
ok(eur.includes("€"), "currency filter switches symbol to EUR");
ok((await get("/overview?range=bogus&cur=XXX&bu=ZZZ", good)).status === 200, "invalid filter params fall back safely");
const html = await (await get("/overview", good)).text();
ok(!html.includes(SECRET) && !html.includes(process.env.DEMO_PASSWORD ?? "\u0000none"), "secret and password do not appear in rendered HTML");
console.log(fail ? `\n${fail} FAILED` : "\nAll smoke checks passed");
process.exit(fail ? 1 : 0);
