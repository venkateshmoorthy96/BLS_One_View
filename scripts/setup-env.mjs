// Writes .env.local interactively. The password is typed locally and never printed or committed.
import { createInterface } from "node:readline";
import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";

if (existsSync(".env.local") && !process.argv.includes("--force")) {
  console.log(".env.local already exists. Use --force to overwrite.");
  process.exit(0);
}
const rl = createInterface({ input: process.stdin, output: process.stdout });
const out = rl._writeToOutput;
let mute = false;
rl._writeToOutput = (s) => out.call(rl, mute ? "" : s);
rl.question("Demo password (min 8 chars, input hidden): ", (pw) => {
  rl.close();
  console.log("");
  if (pw.length < 8) { console.error("Password too short."); process.exit(1); }
  const secret = randomBytes(48).toString("base64");
  writeFileSync(".env.local", `DEMO_USERNAME=Demo_project_for_interview\nDEMO_PASSWORD=${JSON.stringify(pw)}\nSESSION_SECRET=${secret}\n`, { mode: 0o600 });
  console.log("Wrote .env.local (git-ignored).");
});
mute = true;
