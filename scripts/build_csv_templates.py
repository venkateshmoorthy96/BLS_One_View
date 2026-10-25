"""Build blank CSV templates for every table in the dataset, plus two guide files.

Output (data/templates/):
  <table>.csv        header row only, columns in the exact order the app loads them
  _tables.csv        one row per table: kind, grain, primary key, foreign keys, load order, demo row count
  _field_guide.csv   one row per column: type, format, required, keys, allowed values, formula, description, example

Source of truth: public/data/meta_tables.csv and meta_fields.csv (checked against each table's CSV header).
Run: python scripts/build_csv_templates.py
"""
from __future__ import annotations

import csv
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "data")
OUT = os.path.join(ROOT, "data", "templates")

FORMAT = {
    "string": "text",
    "int": "whole number",
    "float": "decimal number",
    "money": "decimal, 2 places, USD unless the column name says otherwise",
    "fraction": "decimal 0 to 1 (0.25 = 25%)",
    "sfraction": "signed decimal -1 to 1 (-0.05 = -5%)",
    "enum": "one of the allowed values (exact spelling)",
    "date": "YYYY-MM-DD",
    "bool": "true or false",
}


def load_order(entities: dict[str, dict]) -> dict[str, int]:
    """Topological order so referenced tables are loaded before the tables that point to them."""
    deps = {t: {ref.split(".")[0] for ref in e["foreign_keys"].values()} - {t} for t, e in entities.items()}
    order: dict[str, int] = {}
    level = 1
    while len(order) < len(deps):
        ready = sorted(t for t, d in deps.items() if t not in order and d <= set(order))
        if not ready:
            raise SystemExit(f"Circular foreign keys among: {sorted(set(deps) - set(order))}")
        for t in ready:
            order[t] = level
        level += 1
    return order


def main() -> None:
    def read(name):
        with open(os.path.join(SRC, f"{name}.csv"), encoding="utf-8", newline="") as f:
            return list(csv.DictReader(f))
    entities = {t["table"]: dict(entity=t["table"], kind=t["kind"], domain=t["domain"], grain=t["grain"], primary_key=t["primary_key"], notes=t["notes"],
                                 foreign_keys=dict(x.split("->") for x in t["foreign_keys"].split("; ") if x), fields=[]) for t in read("meta_tables")}
    for f in read("meta_fields"):
        entities[f["table"]]["fields"].append(dict(field=f["field"], type=f["type"], nullable=f["nullable"] == "true", description=f["description"],
                                                   formula=f["formula"] or None, enum=f["enum"].split("|") if f["enum"] else None,
                                                   classification=f["classification"], example=f["example"] or None))
    os.makedirs(OUT, exist_ok=True)
    order = load_order(entities)
    tables_rows, field_rows = [], []

    for name in sorted(entities, key=lambda t: (order[t], t)):
        e = entities[name]
        data = read(name)
        cols = [x["field"] for x in e["fields"]]
        if data and cols != list(data[0].keys()):
            raise SystemExit(f"{name}: data dictionary columns differ from {name}.csv")
        first = {k: (v or None) for k, v in data[0].items()} if data else {}

        # utf-8-sig so Excel opens the files with the right encoding
        with open(os.path.join(OUT, f"{name}.csv"), "w", encoding="utf-8-sig", newline="") as f:
            csv.writer(f).writerow(cols)

        fks = e["foreign_keys"]
        tables_rows.append({
            "load_order": order[name], "table": name, "kind": e["kind"], "domain": e["domain"], "grain": e["grain"],
            "primary_key": e["primary_key"], "foreign_keys": "; ".join(f"{k} -> {v}" for k, v in fks.items()),
            "columns": len(cols), "demo_rows": len(data), "template_file": f"{name}.csv", "notes": e.get("notes") or "",
        })
        for i, x in enumerate(e["fields"], 1):
            example, ex_src = x.get("example"), "data dictionary"
            if example is None and first.get(x["field"]) is not None:
                example, ex_src = first[x["field"]], "first row of synthetic demo data"
            if isinstance(example, bool):
                example = str(example).lower()
            field_rows.append({
                "table": name, "position": i, "column": x["field"], "type": x["type"], "format": FORMAT.get(x["type"], x["type"]),
                "required": "no" if x["nullable"] else "yes",
                "key": "primary key" if x["field"] == e["primary_key"] else ("foreign key" if x["field"] in fks else ""),
                "references": fks.get(x["field"], ""),
                "allowed_values": "|".join(x["enum"]) if x.get("enum") else "",
                "formula": x.get("formula") or "", "description": x["description"], "classification": x.get("classification") or "",
                "example": "" if example is None else example, "example_source": ex_src if example is not None else "",
            })

    for fname, rows in (("_tables.csv", tables_rows), ("_field_guide.csv", field_rows)):
        with open(os.path.join(OUT, fname), "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)
    print(f"Wrote {len(tables_rows)} table templates, _tables.csv and _field_guide.csv ({len(field_rows)} columns) to {OUT}")


if __name__ == "__main__":
    sys.exit(main())
