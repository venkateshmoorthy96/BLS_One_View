"""Schema validation and reconciliation checks for the synthetic dataset."""
from __future__ import annotations

import math
import re
from datetime import date

import numpy as np
import pandas as pd

from schema import TABLES, TABLE_BY_NAME

ID_PATTERNS = {
    "dim_owner.owner_id": r"^OWN-\d{3}$", "dim_client.client_id": r"^CL-\d{4}$", "dim_resource.resource_id": r"^RES-\d{4}$",
    "dim_language_pair.lp_id": r"^LP-\d{2}$", "dim_connector.connector_id": r"^CON-\d{2}$",
    "fact_opportunity.opportunity_id": r"^OPP-\d{4}$", "fact_project.project_id": r"^PRJ-\d{6}$",
    "fact_translation_batch.batch_id": r"^TRB-\d{6}$", "fact_interpretation_session.session_id": r"^INT-\d{6}$",
    "fact_ai_workflow_batch.ai_batch_id": r"^AIB-\d{6}$", "fact_quality_evaluation.evaluation_id": r"^QE-\d{5}$",
    "fact_revenue_line.revenue_id": r"^REV-\d{6}$", "fact_cost_line.cost_id": r"^COST-\d{6}$",
    "fact_invoice_line.invoice_line_id": r"^INVL-\d{6}$", "fact_payment.payment_id": r"^PAY-\d{6}$",
    "fact_risk_alert.alert_id": r"^ALT-\d{4}$",
}
NEGATIVE_OK = {"ebitda_delta_vs_base_usd", "ebitda_usd", "est_cost_saved_usd", "gross_profit_usd"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class Checks:
    def __init__(self):
        self.rows = []
        self.critical_failed = False

    def add(self, entity, name, dimension, checked, failed, detail="", critical=True):
        passed = int(failed) == 0
        if not passed and critical:
            self.critical_failed = True
        self.rows.append({"check_id": f"DQC-{len(self.rows) + 1:04d}", "entity": entity, "check_name": name,
                          "dimension": dimension, "rows_checked": int(checked), "rows_failed": int(failed),
                          "passed": passed, "detail": detail})


def _is_null(v):
    return v is None or (isinstance(v, float) and math.isnan(v))


def _valid(v, dtype, enum):
    if dtype == "string":
        return isinstance(v, str) and len(v) > 0
    if dtype == "int":
        return isinstance(v, (int, np.integer)) and not isinstance(v, (bool, np.bool_))
    if dtype in ("float", "money", "fraction", "sfraction"):
        return isinstance(v, (int, float, np.integer, np.floating)) and not isinstance(v, (bool, np.bool_)) and math.isfinite(v)
    if dtype == "date":
        if not (isinstance(v, str) and DATE_RE.match(v)):
            return False
        try:
            date.fromisoformat(v)
            return True
        except ValueError:
            return False
    if dtype == "bool":
        return isinstance(v, (bool, np.bool_))
    if dtype == "enum":
        return v in enum
    return False


def validate_schema(T, chk):
    pk_sets = {}
    for t in TABLES:
        name = t["name"]
        if name == "fact_data_quality_check":
            continue
        rows = T[name]
        cols = [f["name"] for f in t["fields"]]
        n = len(rows)
        chk.add(name, "has rows", "COMPLETENESS", 1, 0 if n > 0 else 1, f"{n} rows")
        bad_cols = sum(1 for r in rows if list(r.keys()) != cols)
        chk.add(name, "columns match schema", "VALIDITY", n, bad_cols)
        # primary key
        pk = t["pk"].split("+")
        keys = [tuple(r[c] for c in pk) for r in rows]
        dups = n - len(set(keys))
        chk.add(name, "primary key unique", "UNIQUENESS", n, dups, t["pk"])
        if len(pk) == 1:
            pk_sets[name] = set(k[0] for k in keys)
        # field level
        for f in t["fields"]:
            vals = [r[f["name"]] for r in rows]
            nulls = sum(1 for v in vals if _is_null(v))
            if not f["nullable"]:
                chk.add(name, f"{f['name']} not null", "COMPLETENESS", n, nulls)
            nn = [v for v in vals if not _is_null(v)]
            bad = sum(1 for v in nn if not _valid(v, f["dtype"], f["enum"]))
            chk.add(name, f"{f['name']} valid {f['dtype']}", "VALIDITY", len(nn), bad)
            if f["dtype"] == "fraction":
                chk.add(name, f"{f['name']} within 0..1", "VALIDITY", len(nn), sum(1 for v in nn if not (0 <= v <= 1)))
            elif f["dtype"] == "sfraction":
                chk.add(name, f"{f['name']} within -1..1", "VALIDITY", len(nn), sum(1 for v in nn if not (-1 <= v <= 1)))
            elif f["dtype"] == "money" and f["name"] not in NEGATIVE_OK:
                chk.add(name, f"{f['name']} non-negative", "VALIDITY", len(nn), sum(1 for v in nn if v < 0))
                chk.add(name, f"{f['name']} has <= 2 decimals", "VALIDITY", len(nn), sum(1 for v in nn if abs(round(v, 2) - v) > 1e-9))
        # id pattern
        pat = ID_PATTERNS.get(f"{name}.{pk[0]}")
        if pat:
            rx = re.compile(pat)
            bad = sum(1 for r in rows if not rx.match(r[pk[0]]))
            chk.add(name, f"{pk[0]} synthetic ID pattern", "VALIDITY", n, bad, pat)
    # foreign keys
    for t in TABLES:
        name = t["name"]
        if name == "fact_data_quality_check":
            continue
        for col, target in t["fks"].items():
            tt, tc = target.split(".")
            parent = pk_sets.get(tt)
            if parent is None:
                parent = set(r[tc] for r in T[tt])
            vals = [r[col] for r in T[name] if not _is_null(r[col])]
            bad = sum(1 for v in vals if v not in parent)
            chk.add(name, f"FK {col} -> {target}", "INTEGRITY", len(vals), bad)


def validate_business(T, DF, chk):
    def add(entity, name, dim, checked, failed, detail=""):
        chk.add(entity, name, dim, checked, failed, detail)

    rev, cost = DF["fact_revenue_line"], DF["fact_cost_line"]
    # R-REV-1: revenue sliced three ways totals the same
    tot = round(float(rev["revenue_usd"].sum()), 2)
    by_client = round(float(rev.groupby("client_id")["revenue_usd"].sum().sum()), 2)
    by_sl = round(float(rev.groupby("service_line_id")["revenue_usd"].sum().sum()), 2)
    by_month = round(float(rev.groupby("month_id")["revenue_usd"].sum().sum()), 2)
    add("fact_revenue_line", "R-REV-1 revenue by client = by service line = by month = total", "RECONCILIATION", 4,
        0 if (tot == by_client == by_sl == by_month) else 1, f"total {tot}")
    # R-FX
    exp = (rev["revenue_original"] * rev["fx_usd_per_unit"]).apply(lambda x: float(np.round(x + 1e-9, 2)))
    bad = int((np.abs(exp - rev["revenue_usd"]) > 0.0101).sum())
    add("fact_revenue_line", "R-FX revenue_usd = round(original x fixed fx, 2)", "RECONCILIATION", len(rev), bad)
    # R-REV-2: units
    B = DF["fact_translation_batch"]
    dv = B[B["status"] == "DELIVERED"]
    w_units = int(rev[rev["unit_type"] == "WORD"]["units"].sum())
    add("fact_revenue_line", "R-REV-2a written revenue units = delivered batch words", "RECONCILIATION", 1,
        0 if w_units == int(dv["words_total"].sum()) else 1, f"{w_units}")
    S = DF["fact_interpretation_session"]
    m_units = int(rev[rev["unit_type"] == "MINUTE"]["units"].sum())
    add("fact_revenue_line", "R-REV-2b interpretation revenue units = fulfilled session minutes", "RECONCILIATION", 1,
        0 if m_units == int(S[S["status"] == "FULFILLED"]["duration_min"].sum()) else 1, f"{m_units}")
    # R-GP
    direct = cost[cost["cost_class"] == "DIRECT"]
    add("fact_cost_line", "R-GP every direct cost line points to a revenue line", "INTEGRITY", len(direct),
        int(direct["revenue_id"].isna().sum()))
    add("fact_cost_line", "R-GP opex/D&A lines have no revenue_id", "CONSISTENCY", int((cost["cost_class"] != "DIRECT").sum()),
        int(cost[cost["cost_class"] != "DIRECT"]["revenue_id"].notna().sum()))
    gp = float(rev["revenue_usd"].sum()) - float(direct["amount_usd"].sum())
    gm = gp / float(rev["revenue_usd"].sum())
    add("fact_cost_line", "R-GP gross margin within plausible demo range (25%-55%)", "CONSISTENCY", 1, 0 if 0.25 <= gm <= 0.55 else 1, f"GM {gm:.4f}")
    # R-WORDS
    add("fact_translation_batch", "R-WORDS tm_match_words <= words_total", "CONSISTENCY", len(B), int((B["tm_match_words"] > B["words_total"]).sum()))
    ai = DF["fact_ai_workflow_batch"].merge(B[["batch_id", "words_total", "workflow_id", "status"]], on="batch_id")
    add("fact_ai_workflow_batch", "R-WORDS mtqe_accepted_words <= words_total", "CONSISTENCY", len(ai),
        int((ai["mtqe_accepted_words"] > ai["words_total"]).sum()))
    add("fact_ai_workflow_batch", "R-WORDS AI rows belong to AI-touched delivered batches", "CONSISTENCY", len(ai),
        int((~ai["workflow_id"].isin(["MTPE", "AIR"]) | (ai["status"] != "DELIVERED")).sum()))
    ai_deliv = dv[dv["workflow_id"].isin(["MTPE", "AIR"])]
    add("fact_ai_workflow_batch", "R-WORDS every delivered AI-touched batch has one AI row", "CONSISTENCY", len(ai_deliv),
        abs(len(ai_deliv) - len(ai)))
    add("fact_translation_batch", "R-WORDS MTPE words <= AI-touched words <= delivered words", "CONSISTENCY", 1,
        0 if (dv[dv["workflow_id"] == "MTPE"]["words_total"].sum() <= ai_deliv["words_total"].sum() <= dv["words_total"].sum()) else 1)
    # R-ASSIGN
    A = DF["fact_resource_assignment"]
    sums = A.groupby(["batch_id", "role"])["words_assigned"].sum().reset_index().merge(B[["batch_id", "words_total"]], on="batch_id")
    add("fact_resource_assignment", "R-ASSIGN assigned words per batch-role = words_total", "RECONCILIATION", len(sums),
        int((sums["words_assigned"] != sums["words_total"]).sum()))
    add("fact_resource_assignment", "R-ASSIGN every batch has at least one assignment", "COMPLETENESS", len(B),
        len(set(B["batch_id"]) - set(A["batch_id"])))
    # R-CAP
    cap = DF["fact_capacity_period"]
    act = cap[~cap["is_forecast"].astype(bool)]
    bt = B.copy()
    bt["week"] = (pd.to_datetime(bt["start_date"]) - pd.to_timedelta(pd.to_datetime(bt["start_date"]).dt.weekday, unit="D")).dt.strftime("%Y-%m-%d")
    d = bt.groupby(["lp_id", "week"])["words_total"].sum()
    bad = 0
    for _, r in act.iterrows():
        if int(d.get((r["lp_id"], r["week_start"]), 0)) != int(r["demand_words"]):
            bad += 1
    add("fact_capacity_period", "R-CAP past-week demand = batch words started that week", "RECONCILIATION", len(act), bad)
    add("fact_capacity_period", "R-CAP confirmed_words <= demand_words", "CONSISTENCY", len(cap), int((cap["confirmed_words"] > cap["demand_words"]).sum()))
    # R-PAY
    inv, pay, br = DF["fact_invoice_line"], DF["fact_payment"], DF["bridge_payment_invoice"]
    s = br.groupby("payment_id")["allocated_original"].sum().round(2)
    m = pay.set_index("payment_id")["amount_original"].round(2)
    add("fact_payment", "R-PAY payment amount = sum of allocations", "RECONCILIATION", len(pay), int((s.reindex(m.index) != m).sum()))
    a2 = br.groupby("invoice_line_id")["allocated_original"].sum().round(2)
    i2 = inv.set_index("invoice_line_id")["amount_original"]
    add("bridge_payment_invoice", "R-PAY allocations <= invoice line amount", "CONSISTENCY", len(a2), int((a2 > i2.reindex(a2.index) + 0.005).sum()))
    # R-ERR
    ev, er = DF["fact_quality_evaluation"], DF["fact_quality_error"]
    cnt = er.groupby("evaluation_id").size()
    exp_n = (ev["critical_count"] + ev["major_count"] + ev["minor_count"]).values
    got = cnt.reindex(ev["evaluation_id"]).fillna(0).astype(int).values
    add("fact_quality_error", "R-ERR error rows per evaluation = severity counts", "RECONCILIATION", len(ev), int((exp_n != got).sum()))
    # score formula
    pen = (ev["minor_count"] * 1 + ev["major_count"] * 5 + ev["critical_count"] * 25) * 1000.0 / ev["sample_words"]
    calc = (100 - pen).clip(lower=0).round(2)
    add("fact_quality_evaluation", "score formula reproduces stored score", "CONSISTENCY", len(ev), int((np.abs(calc - ev["score"]) > 0.011).sum()))
    # date order
    add("fact_translation_batch", "delivered_date >= start_date", "CONSISTENCY", int(dv.shape[0]), int((dv["delivered_date"] < dv["start_date"]).sum()))
    add("fact_translation_batch", "due_date > start_date", "CONSISTENCY", len(B), int((B["due_date"] <= B["start_date"]).sum()))
    add("fact_invoice_line", "due_date > invoice_date", "CONSISTENCY", len(inv), int((inv["due_date"] <= inv["invoice_date"]).sum()))
    add("fact_client_period_snapshot", "health band matches score thresholds", "CONSISTENCY", len(DF["fact_client_period_snapshot"]),
        int(((DF["fact_client_period_snapshot"]["health_score"] >= 0.7) != (DF["fact_client_period_snapshot"]["health_band"] == "HEALTHY")).sum()))
    add("fact_interpretation_session", "duration_min > 0 only when FULFILLED", "CONSISTENCY", len(S),
        int((((S["status"] == "FULFILLED") & (S["duration_min"] <= 0)) | ((S["status"] != "FULFILLED") & (S["duration_min"] != 0))).sum()))
    add("fact_integration_telemetry", "up_minutes <= monitored_minutes", "CONSISTENCY", len(DF["fact_integration_telemetry"]),
        int((DF["fact_integration_telemetry"]["up_minutes"] > DF["fact_integration_telemetry"]["monitored_minutes"]).sum()))
    # dimension rule: workflow is not a service line
    add("dim_service_line", "R-SL MTPE/AI are workflows, not service lines", "CONSISTENCY", len(DF["dim_service_line"]),
        int(DF["dim_service_line"]["service_line_id"].isin(["MTPE", "AIR", "HT"]).sum()))
