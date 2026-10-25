"""Generator tests: determinism, schema coverage, validation, independent recomputation (dataset = public/data/*.csv)."""
import csv, hashlib, json, os, subprocess, sys, tempfile, unittest
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "public", "data")
REPORTS = os.path.join(ROOT, "data", "generated")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from schema import TABLES


def load(n, d=DATA):
    with open(os.path.join(d, n + ".csv"), encoding="utf-8", newline="") as fh:
        rows = list(csv.reader(fh))
    return {"columns": rows[0], "rows": rows[1:]}


def report(n):
    with open(os.path.join(REPORTS, n + ".json"), encoding="utf-8") as fh:
        return json.load(fh)


class T(unittest.TestCase):
    def test_all_tables_present_with_schema_columns(self):
        for t in TABLES:
            d = load(t["name"])
            self.assertEqual(d["columns"], [f["name"] for f in t["fields"]], t["name"])
            self.assertGreater(len(d["rows"]), 0, t["name"])
            self.assertTrue(all(len(r) == len(d["columns"]) for r in d["rows"]), t["name"])

    def test_data_dictionary_matches_files(self):
        fields = load("meta_fields")
        by_table = {}
        for r in fields["rows"]:
            by_table.setdefault(r[0], []).append(r[2])
        self.assertEqual(set(by_table), {t["name"] for t in TABLES})
        for t in TABLES:
            self.assertEqual(by_table[t["name"]], load(t["name"])["columns"], t["name"])

    def test_validation_clean(self):
        r = report("validation_report")
        self.assertEqual(r["summary"]["failed"], 0)
        self.assertFalse(r["summary"]["critical_failed"])

    def test_determinism(self):
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as rep:
            subprocess.check_call([sys.executable, os.path.join(ROOT, "scripts", "generate_synthetic_data.py"), "--out", d, "--reports", rep, "--quiet"])
            for name in [t["name"] for t in TABLES] + ["meta_tables", "meta_fields", "meta_config"]:
                with open(os.path.join(d, name + ".csv"), "rb") as x, open(os.path.join(DATA, name + ".csv"), "rb") as y:
                    a, b = hashlib.sha256(x.read()).hexdigest(), hashlib.sha256(y.read()).hexdigest()
                self.assertEqual(a, b, name)

    def test_independent_revenue_recompute(self):
        rev = load("fact_revenue_line")
        c = rev["columns"].index("revenue_usd"); m = rev["columns"].index("month_id")
        tot = sum(float(r[c]) for r in rev["rows"])
        self.assertGreater(tot, 2.5e6)
        ytd = sum(float(r[c]) for r in rev["rows"] if r[m] >= "2026-01")
        self.assertAlmostEqual(ytd, report("kpi_reference")["windows"]["YTD|ALL"]["REV"], places=2)

    def test_dataset_is_marked_synthetic(self):
        meta = dict(load("meta_dataset")["rows"])
        self.assertEqual(meta["synthetic"], "true")
        self.assertIn("synthetic", meta["disclaimer"].lower())

if __name__ == "__main__":
    unittest.main(verbosity=2)
