// RFC 4180 CSV parser (pure, no dependencies). Handles quoted fields, commas and line breaks inside quotes,
// doubled-quote escapes, CRLF or LF line endings, a UTF-8 byte-order mark and a trailing newline.
// Type conversion and validation happen in lib/data/loader.ts; this module only splits text into cells.

export type CsvParseError = { line: number; message: string };
export type CsvParseResult = { header: string[]; rows: string[][]; rowLines: number[]; errors: CsvParseError[] };

export function parseCsv(text: string): CsvParseResult {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records: string[][] = [];
  const lines: number[] = [];
  const errors: CsvParseError[] = [];
  let field = "", record: string[] = [], inQuotes = false, line = 1, recordLine = 1, fieldStarted = false;
  const endField = () => { record.push(field); field = ""; fieldStarted = false; };
  const endRecord = () => {
    endField();
    // a blank line is not a record
    if (!(record.length === 1 && record[0] === "")) { records.push(record); lines.push(recordLine); }
    record = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else {
          inQuotes = false;
          const nx = text[i + 1];
          if (nx !== undefined && nx !== "," && nx !== "\n" && nx !== "\r") errors.push({ line, message: "Unexpected character after closing quote" });
        }
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      if (fieldStarted || field.length) errors.push({ line, message: "Quote inside an unquoted field" });
      inQuotes = true; fieldStarted = true;
    } else if (ch === ",") endField();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRecord(); line++; recordLine = line;
    } else { field += ch; fieldStarted = true; }
  }
  if (inQuotes) errors.push({ line: recordLine, message: "Unterminated quoted field at end of file" });
  if (field.length || record.length || fieldStarted) endRecord();
  const [header = [], ...rows] = records;
  return { header, rows, rowLines: lines.slice(1), errors };
}

/** Encode one value for CSV output (used for exports and tests). */
export function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
