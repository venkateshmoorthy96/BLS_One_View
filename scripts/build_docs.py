"""Render docs/kpi-definitions.md and docs/data-dictionary.md from the single-source catalogs."""
from __future__ import annotations
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from kpi_catalog import KPIS  # noqa: E402
from schema import TABLES, ENUMS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def classification(table, fld):
    n, d = fld["name"], fld["dtype"]
    if n.endswith("_id") or n.endswith("_code") or n in ("pk",):
        return "SYNTHETIC_IDENTIFIER"
    if d == "money":
        return "SYNTHETIC_FINANCIAL"
    if table["domain"] in ("WORKFORCE",) and n in ("quality_score", "rate_per_word_usd", "rate_per_minute_usd"):
        return "SYNTHETIC_WORKFORCE_SENSITIVE"
    return "SYNTHETIC_OPERATIONAL"


def render_kpis():
    out = ["# KPI definitions", "",
           "> **Generated** from `scripts/kpi_catalog.py` by `scripts/build_docs.py`. Do not edit by hand.",
           "> All targets and examples are illustrative demo values - not BLS targets or results. Data is 100% synthetic.", "",
           "## Conventions", "",
           "- **Date ranges are whole calendar months.** Revenue is recognised monthly, so every KPI uses the same month boundaries (presets: YTD, QTD, TTM, last 6 months, last 3 months, latest month, all data, custom month range). The BRD's 'trailing 30 days' is implemented as 'latest month'.",
           "- **Data as-of date:** 2026-09-30 (last closed month). **Reporting currency:** USD by default; EUR/GBP via the fixed table below.",
           "- **Fixed FX (illustrative, `DEMO-FX-2026-09`):** 1 EUR = 1.08 USD, 1 GBP = 1.27 USD. Reporting-currency conversion divides aggregated USD by the rate; rounding only at display.",
           "- **Percentages** are stored as fractions (0..1) and formatted only in the UI. **Zero denominators** return N/A, never infinity or NaN.",
           "- **Revenue basis:** recognised revenue. Bookings (pipeline value), invoices, cash receipts and receivables are separate measures and are never mixed into revenue.",
           "- **Service lines** (TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE) are mutually exclusive revenue categories. **Workflows** (HT, MTPE, AIR) describe how written work is done; MTPE/AI-touched are not revenue categories.",
           "- **Eligible populations:** word KPIs (TR_WORDS, MTPE_SHARE, AI_SHARE, TM_REUSE, REJECTION_RATE) all use delivered batches with `delivered_date` in range. Interpretation KPIs use sessions by `request_date`.",
           "- **Business-unit filter:** applied through the client's business unit. Company-level items (plan targets, OPEX) are allocated pro-rata to revenue or shown as N/A, and the UI says so.", ""]
    domains = []
    for k in KPIS:
        if k["domain"] not in domains:
            domains.append(k["domain"])
    out.append("## Index")
    out.append("")
    out.append("| ID | KPI | Domain | Tab |")
    out.append("|---|---|---|---|")
    for k in KPIS:
        out.append(f"| `{k['kpi_id']}` | {k['kpi_name']} | {k['domain']} | {k['tab']} |")
    out.append("")
    for dom in domains:
        out.append(f"## {dom}")
        out.append("")
        for k in [x for x in KPIS if x["domain"] == dom]:
            out.append(f"### {k['kpi_name']} (`{k['kpi_id']}`)")
            out.append("")
            rows = [("Business definition", k["definition"]), ("Formula", f"`{k['formula']}`"),
                    ("Numerator", k["numerator"] or "-"), ("Denominator", k["denominator"] or "-"),
                    ("Source fact", k["source_fact"]), ("Grain", k["grain"]), ("Date field", k["date_field"]),
                    ("Filters", k["filters"]), ("Unit", k["unit"]), ("Null / zero behaviour", k["null_behavior"]),
                    ("Target direction", k["target_direction"]), ("Illustrative target", k["illustrative_target"]),
                    ("Worked example", k["worked_example"]), ("Dependencies", k["dependencies"])]
            out.append("| Attribute | Value |")
            out.append("|---|---|")
            for a, v in rows:
                out.append(f"| {a} | {v} |")
            out.append("")
    return "\n".join(out) + "\n"


def render_dictionary():
    out = ["# Data dictionary", "",
           "> **Generated** from `scripts/schema.py` by `scripts/build_docs.py`. Do not edit by hand.",
           "> Every record is synthetic. IDs follow stable synthetic patterns. No real clients, people, contracts or systems.", "",
           "## Tables", "", "| Table | Kind | Domain | Grain | Primary key | Fields |", "|---|---|---|---|---|---|"]
    for t in TABLES:
        out.append(f"| `{t['name']}` | {t['kind']} | {t['domain']} | {t['grain']} | `{t['pk']}` | {len(t['fields'])} |")
    out.append("")
    out.append("## Enumerations")
    out.append("")
    for k, v in ENUMS.items():
        out.append(f"- **{k}**: {', '.join(v)}")
    out.append("")
    for t in TABLES:
        out.append(f"## `{t['name']}`")
        out.append("")
        out.append(f"**Grain:** {t['grain']}  ")
        out.append(f"**Primary key:** `{t['pk']}`  ")
        if t["fks"]:
            out.append("**Foreign keys:** " + ", ".join(f"`{a}` -> `{b}`" for a, b in t["fks"].items()) + "  ")
        if t["notes"]:
            out.append(f"**Note:** {t['notes']}  ")
        out.append("")
        out.append("| Field | Type | Null | Description | Enum / formula | Classification |")
        out.append("|---|---|---|---|---|---|")
        for fld in t["fields"]:
            extra = ", ".join(fld["enum"]) if fld["enum"] else (f"`{fld['formula']}`" if fld["formula"] else "")
            out.append(f"| `{fld['name']}` | {fld['dtype']} | {'yes' if fld['nullable'] else 'no'} | {fld['description']} | {extra} | {classification(t, fld)} |")
        out.append("")
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    with open(os.path.join(ROOT, "docs", "kpi-definitions.md"), "w", encoding="utf-8") as fh:
        fh.write(render_kpis())
    with open(os.path.join(ROOT, "docs", "data-dictionary.md"), "w", encoding="utf-8") as fh:
        fh.write(render_dictionary())
    print("docs rendered:", len(KPIS), "KPIs,", len(TABLES), "tables")
