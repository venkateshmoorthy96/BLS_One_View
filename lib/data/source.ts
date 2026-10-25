// Where the raw dataset files come from. The app only depends on the DataSource interface, so the CSV directory can later be
// replaced by an API or database adapter that returns the same tables, without changing calculations or UI.
import fs from "node:fs";
import path from "node:path";

export type SourceFile = { name: string; text: string; bytes: number; modified: string };
export interface DataSource {
  /** Human-readable location, shown on the Data Governance tab. */
  readonly location: string;
  /** Raw text of a dataset file, or null when it does not exist. */
  read(name: string): SourceFile | null;
  /** Cheap fingerprint that changes when any file changes (used to detect updated files). */
  signature(): string;
}

/** CSV files in a directory: DATA_DIR if set, otherwise public/data in the project. */
export class CsvDirectorySource implements DataSource {
  readonly location: string;
  constructor(private dir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "public", "data")) {
    this.location = (path.relative(process.cwd(), dir) || dir).split(path.sep).join("/");
  }
  read(name: string): SourceFile | null {
    const p = path.join(this.dir, `${name}.csv`);
    try {
      const st = fs.statSync(p);
      return { name, text: fs.readFileSync(p, "utf8"), bytes: st.size, modified: st.mtime.toISOString() };
    } catch {
      return null;
    }
  }
  signature(): string {
    try {
      return fs.readdirSync(this.dir).filter((f) => f.endsWith(".csv")).sort()
        .map((f) => { const st = fs.statSync(path.join(this.dir, f)); return `${f}:${st.size}:${st.mtimeMs}`; }).join("|");
    } catch {
      return "missing-directory";
    }
  }
}
