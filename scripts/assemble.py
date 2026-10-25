"""Assemble tables, derive snapshots/alerts/OKRs/scenarios, validate and export JSON."""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
import time
from datetime import date, timedelta

import numpy as np
import pandas as pd

import config as C
import generate_synthetic_data as G
import reference_kpis as R
import validate as V
from kpi_catalog import KPIS
from schema import TABLES, TABLE_BY_NAME, ENUMS
import build_docs

mk, rf, r2, iso = G.mk, G.rf, G.r2, G.iso
DIRECT = {"VENDOR_LINGUIST", "INTERPRETER_PAY", "MT_AI_TOOLING", "PLATFORM_TELECOM", "PM_DISPATCH_LABOR"}
OPEX = {"SALES_MARKETING", "TECHNOLOGY_PRODUCT", "GENERAL_ADMIN"}
ROOT = os.path.dirname(HERE := os.path.dirname(os.path.abspath(__file__)))

ROADMAP = [
    ("Live connector onboarding wizard", "Guided setup for connecting a real TMS or CRM (concept).", "Integration", "PLANNED", "2027-Q1", "P1", 41),
    ("Client-facing quality portal", "Share LQA outcomes and corrective actions with clients.", "Quality", "UNDER_REVIEW", "2027-Q2", "P2", 27),
    ("Dispatch optimisation", "Recommend interpreter assignments to cut speed-to-answer.", "Interpretation", "PLANNED", "2027-Q1", "P1", 52),
    ("Scenario library", "Save and compare named what-if scenarios.", "Forecasting", "IN_PROGRESS", "2026-Q4", "P1", 36),
    ("Role-based dashboards", "Tailor KPI sets to executive, sales and operations roles.", "Platform", "UNDER_REVIEW", "2027-Q2", "P2", 22),
    ("Translation-memory insights", "Surface leverage opportunities by client and domain.", "AI", "PLANNED", "2027-Q1", "P2", 31),
    ("Automated board pack", "One-click monthly executive summary export.", "Reporting", "IN_PROGRESS", "2026-Q4", "P1", 45),
    ("Anomaly alerts", "Statistical alerts on margin and OTD drift.", "Risk", "PLANNED", "2027-Q2", "P2", 19),
    ("Data catalog search", "Search definitions, lineage and owners.", "Governance", "DELIVERED", "2026-Q3", "P3", 14),
    ("Mobile summary view", "Compact KPI summary for phones.", "Platform", "DELIVERED", "2026-Q2", "P3", 17),
    ("Vendor scorecards", "Combine quality, cost and capacity per supplier.", "Workforce", "UNDER_REVIEW", "2027-Q3", "P2", 24),
    ("FX exposure drill-down", "Currency exposure by client and invoice.", "Finance", "PLANNED", "2027-Q1", "P3", 18),
]
FEEDBACK = [
    ("General", 5, "Clear overview; the reconciliation between tabs is helpful.", "Operations lead (fictional)", "2026-09-12"),
    ("Finance", 4, "Would like a cash-flow view next to the margin trend.", "Finance analyst (fictional)", "2026-09-14"),
    ("Capacity", 5, "The language-pair heatmap makes the bottleneck obvious.", "Vendor manager (fictional)", "2026-09-16"),
    ("AI", 4, "Please show the assumptions beside every savings figure.", "Product owner (fictional)", "2026-09-18"),
    ("Usability", 3, "Filters are great, but the roster table needs column chooser.", "Account manager (fictional)", "2026-09-21"),
    ("General", 5, "Good that everything is clearly marked as synthetic.", "Data steward (fictional)", "2026-09-23"),
]


def build_snapshots(DF, clients):
    bt = DF["_bt"]
    bt = bt[bt["status"] == "DELIVERED"]
    ev = DF["_ev"]
    inv = DF["fact_invoice_line"]
    pay = DF["fact_payment"][["payment_id", "payment_date"]].merge(DF["bridge_payment_invoice"], on="payment_id")
    paydate = dict(zip(pay["invoice_line_id"], pay["payment_date"]))
    rev = DF["fact_revenue_line"]
    mrev = rev.groupby(["client_id", "month_id"])["revenue_usd"].sum().to_dict()
    ids = R.ALL_MONTHS
    rows = []
    n = 0
    for qi in range(2, G.N, 3):
        E = G.mend(qi)
        s_otd, e_otd = (E - timedelta(days=89)).isoformat(), E.isoformat()
        s_q = (E - timedelta(days=179)).isoformat()
        for c in clients:
            cid = c["client_id"]
            r3 = sum(mrev.get((cid, ids[j]), 0.0) for j in range(max(0, qi - 2), qi + 1))
            p3 = sum(mrev.get((cid, ids[j]), 0.0) for j in range(max(0, qi - 5), max(0, qi - 2)))
            ttm = sum(mrev.get((cid, ids[j]), 0.0) for j in range(max(0, qi - 11), qi + 1))
            if r3 <= 0 and sum(mrev.get((cid, ids[j]), 0.0) for j in range(max(0, qi - 5), qi + 1)) <= 0:
                continue
            b = bt[(bt["client_id"] == cid) & (bt["delivered_date"] >= s_otd) & (bt["delivered_date"] <= e_otd)]
            otd = float((b["delivered_date"] <= b["due_date"]).mean()) if len(b) else None
            e = ev[(ev["client_id"] == cid) & (ev["eval_date"] >= s_q) & (ev["eval_date"] <= e_otd)]
            qn = float(np.clip((e["score"].mean() - 80) / 20, 0, 1)) if len(e) else None
            il = inv[(inv["client_id"] == cid) & (inv["due_date"] >= s_q) & (inv["due_date"] <= e_otd)]
            if len(il):
                ok = sum(1 for _, r in il.iterrows() if paydate.get(r["invoice_line_id"]) is not None and paydate[r["invoice_line_id"]] <= min(r["due_date"], e_otd))
                pt = ok / len(il)
            else:
                pt = None
            tr = float(np.clip(r3 / p3 - .5, 0, 1)) if p3 > 0 else None
            comps = [(.30, otd), (.25, qn), (.20, pt), (.25, tr)]
            comps = [(w, v) for w, v in comps if v is not None]
            if not comps:
                continue
            score = round(sum(w * v for w, v in comps) / sum(w for w, _ in comps), 4)
            band = "HEALTHY" if score >= C.THRESHOLDS["health_healthy"] else ("WATCH" if score >= C.THRESHOLDS["health_watch"] else "AT_RISK")
            n += 1
            rows.append(mk("fact_client_period_snapshot", snapshot_id=f"SNP-{n:05d}", client_id=cid, snapshot_month_id=ids[qi], health_score=rf(score, 4),
                           health_band=band, ttm_revenue_usd=r2(ttm), otd_90d=None if otd is None else rf(otd, 4),
                           quality_norm=None if qn is None else rf(qn, 4), payment_timeliness=None if pt is None else rf(pt, 4),
                           revenue_trend_norm=None if tr is None else rf(tr, 4)))
    return rows


def build_alerts(rng, T, DF, clients, batches, projects, rev):
    pmap = {p["pid"]: p for p in projects}
    cmap = {c["client_id"]: c for c in clients}
    owners = T["dim_owner"]
    pms = [o["owner_id"] for o in owners if o["role"] == "PROJECT_MANAGER" and o["is_active"]]
    ams = [o["owner_id"] for o in owners if o["role"] == "ACCOUNT_MANAGER" and o["is_active"]]
    th = C.THRESHOLDS
    alerts = []

    def add(sev, domain, rule, etype, eid, desc, trig, exposure, action, owner, link, age=None):
        alerts.append(dict(sev=sev, domain=domain, rule=rule, etype=etype, eid=eid, desc=desc, trig=trig, exp=r2(max(0.0, exposure)), action=action,
                           owner=owner, link=link, age=age if age is not None else int(rng.integers(0, 14))))

    # R-SLA
    act = [b for b in batches if b["delivered"] is None]
    risky = []
    for b in act:
        late = b["due"] < G.AS_OF
        near = (b["due"] - G.AS_OF).days <= th["sla_warning_days"] and b["pct"] < th["sla_warning_progress"]
        if late or near:
            risky.append((b, late))
    risky.sort(key=lambda x: -x[0]["est_rev"])
    for b, late in risky[:14]:
        p = pmap[b["pid"]]
        sev = ("CRITICAL" if b["est_rev"] > 1500 else "HIGH") if late else "MEDIUM"
        add(sev, "DELIVERY", "R-SLA", "batch", b["bid"], f"{'Overdue' if late else 'At risk'}: {G.LP_CODE[b['lp']]} batch for {cmap[p['client_id']]['name']}",
            f"due {iso(b['due'])}, progress {b['pct']:.0%}; rule: overdue, or due within {th['sla_warning_days']} days and below {th['sla_warning_progress']:.0%}",
            b["est_rev"], "Re-assign linguists or negotiate a revised delivery date", p["pm"], "/translation-ops")
    # R-HEALTH
    snap = DF["fact_client_period_snapshot"]
    last = snap[snap["snapshot_month_id"] == R.ALL_MONTHS[-1]]
    risk = last[last["health_band"] == "AT_RISK"].sort_values("ttm_revenue_usd", ascending=False)
    med = float(risk["ttm_revenue_usd"].median()) if len(risk) else 0
    for _, r in risk.head(10).iterrows():
        c = cmap[r["client_id"]]
        add("HIGH" if r["ttm_revenue_usd"] >= med else "MEDIUM", "CLIENT", "R-HEALTH", "client", r["client_id"], f"Client health at risk: {c['name']}",
            f"health score {r['health_score']:.2f} < {th['health_watch']:.2f}; TTM revenue ${r['ttm_revenue_usd']:,.0f}", r["ttm_revenue_usd"],
            "Executive sponsor call and service recovery plan", c["am"], "/client-revenue")
    # R-CAP
    cap = DF["fact_capacity_period"]
    fc = cap[cap["is_forecast"].astype(bool)].copy()
    first8 = sorted(fc["week_start"].unique())[:8]
    fc = fc[fc["week_start"].isin(first8)]
    rr = rev[rev["unit_type"] == "WORD"] if False else DF["fact_revenue_line"]
    rr = rr[rr["unit_type"] == "WORD"]
    rpw = (rr.groupby("lp_id")["revenue_usd"].sum() / rr.groupby("lp_id")["units"].sum()).to_dict()
    for lp, g in fc.groupby("lp_id"):
        load = float(g["demand_words"].sum() / max(1, g["supply_words"].sum()))
        if load > th["capacity_load_warning"]:
            deficit = max(0.0, float(g["demand_words"].sum() - g["supply_words"].sum()))
            sev = "CRITICAL" if load > 1.1 else ("HIGH" if load > 1.0 else "MEDIUM")
            code = G.LP_CODE[G.LP_ID.index(lp)]
            add(sev, "CAPACITY", "R-CAP", "language_pair", lp, f"Capacity pressure on EN>{code} over the next 8 weeks",
                f"forecast load {load:.0%} > {th['capacity_load_warning']:.0%}; shortfall {deficit:,.0f} words", deficit * rpw.get(lp, .15),
                "Source additional qualified linguists or rebalance deadlines", pms[int(rng.integers(0, len(pms)))], "/capacity-demand")
    # R-DISP
    ev = DF["_ev"]
    op = ev[ev["dispute_status"] == "OPEN"].sort_values("eval_date", ascending=False)
    brev = DF["fact_revenue_line"].set_index("batch_id")["revenue_usd"].to_dict()
    for _, r in op.head(10).iterrows():
        add("MEDIUM" if r["score"] < 85 else "LOW", "QUALITY", "R-DISP", "evaluation", r["evaluation_id"], f"Open quality dispute on batch {r['batch_id']}",
            f"score {r['score']:.1f}, critical {int(r['critical_count'])}, major {int(r['major_count'])}", brev.get(r["batch_id"], 0.0),
            "Resolve dispute with client and linguist feedback", pms[int(rng.integers(0, len(pms)))], "/quality-compliance")
    # R-CA
    ca = ev[(ev["corrective_status"] == "OPEN") & (ev["eval_date"] < (G.AS_OF - timedelta(days=45)).isoformat())].sort_values("eval_date")
    for _, r in ca.head(6).iterrows():
        add("LOW", "COMPLIANCE", "R-CA", "evaluation", r["evaluation_id"], f"Corrective action open > 45 days ({r['corrective_action']})",
            f"evaluated {r['eval_date']}, action {r['corrective_action']}", 0.0, "Close or escalate the corrective action", pms[int(rng.integers(0, len(pms)))],
            "/quality-compliance", age=int(rng.integers(15, 40)))
    # R-FX and R-AR
    inv, inv90 = R.receivables(DF, G.AS_OF.isoformat())
    for cur in ("EUR", "GBP"):
        ar = float(inv[inv["currency"] == cur]["open_usd"].sum())
        if ar > 0:
            add("LOW" if ar < 100000 else "MEDIUM", "FINANCE", "R-FX", "currency", cur, f"Illustrative {cur} receivable exposure",
                f"open {cur} receivables ${ar:,.0f} USD-equivalent; exposure = 10% move", ar * .10, "Review natural hedge or invoice currency", ams[0], "/finance-profitability")
    overdue = inv[(inv["due_date"] < (G.AS_OF - timedelta(days=60)).isoformat()) & (inv["open_usd"] > 1)]
    by = overdue.groupby("client_id")["open_usd"].sum().sort_values(ascending=False)
    for cid, v in by.head(5).items():
        add("HIGH" if v > 20000 else "MEDIUM", "FINANCE", "R-AR60", "client", cid, f"Receivables more than 60 days past due: {cmap[cid]['name']}",
            f"overdue open amount ${v:,.0f}", v, "Collections follow-up and credit-hold review", cmap[cid]["am"], "/finance-profitability")
    # R-CONN
    tel = DF["fact_integration_telemetry"]
    t7 = tel[tel["date"] >= (G.AS_OF - timedelta(days=6)).isoformat()]
    cn = {c["connector_id"]: c["connector_name"] for c in T["dim_connector"]}
    for cid, g in t7.groupby("connector_id"):
        up = float(g["up_minutes"].sum() / g["monitored_minutes"].sum())
        if up < th["uptime_warning"]:
            add("HIGH" if up < .99 else "MEDIUM", "TECHNOLOGY", "R-CONN", "connector", cid, f"SIMULATED: {cn[cid]} below uptime threshold",
                f"7-day simulated uptime {up:.2%} < {th['uptime_warning']:.1%}", 0.0, "Investigate simulated incident and retry policy", pms[int(rng.integers(0, len(pms)))],
                "/technology-integration")
    sev_rank = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    alerts.sort(key=lambda a: (sev_rank[a["sev"]], -a["exp"], a["eid"]))
    rows = []
    for i, a in enumerate(alerts):
        li = {"CRITICAL": (4, 5), "HIGH": (3, 4), "MEDIUM": (2, 3), "LOW": (1, 2)}[a["sev"]]
        lik = int(rng.integers(li[0], li[1] + 1))
        imp = int(rng.integers(li[0], 6 if a["sev"] in ("CRITICAL", "HIGH") else li[1] + 1))
        age = a["age"]
        u = rng.random()
        status = "RESOLVED" if (u < .1 and age >= 8) else ("IN_PROGRESS" if u < .3 else "OPEN")
        rows.append(mk("fact_risk_alert", alert_id=f"ALT-{i + 1:04d}", raised_date=iso(G.AS_OF - timedelta(days=age)), severity=a["sev"], domain=a["domain"],
                       rule_id=a["rule"], entity_type=a["etype"], entity_id=a["eid"], description=a["desc"], trigger_text=a["trig"], likelihood=lik,
                       impact=min(5, imp), exposure_usd=a["exp"], recommended_action=a["action"], owner_id=a["owner"], status=status, link_path=a["link"]))
    return rows


def build_okrs(T, DF):
    ytd, pytd = R.window("YTD"), R.window("PYTD")
    cy, cp = R.core(DF, ytd), R.core(DF, pytd)
    n_now = R.nrr(DF, R.ALL_MONTHS[-1])
    n_base = R.nrr(DF, "2025-12")
    kt = DF["fact_kpi_target_period"]
    plan_ytd = float(kt[(kt["kpi_id"] == "REV") & kt["month_id"].isin(ytd)]["target_value"].sum())
    cl = DF["dim_client"]
    new_now = int(((cl["onboarding_date"] >= "2026-01-01") & (cl["onboarding_date"] <= "2026-09-30")).sum())
    new_base = int(((cl["onboarding_date"] >= "2025-01-01") & (cl["onboarding_date"] <= "2025-09-30")).sum())
    util_now, util_base = R.pm_util(DF, ytd), R.pm_util(DF, pytd)
    own = {o["owner_code"]: o["owner_id"] for o in T["dim_owner"]}
    d = [  # pillar, objective, kr, owner, kpi, base, target, cur, lower_is_better
        ("Grow profitably", "Increase recognised revenue", "YTD recognised revenue vs plan (USD)", "AM-01", "REV", cp["REV"], plan_ytd, cy["REV"], False),
        ("Grow profitably", "Retain and expand the client base", "Net revenue retention", "AM-02", "NRR", n_base["NRR"], 1.05, n_now["NRR"], False),
        ("Grow profitably", "Win new logos", "New logos onboarded YTD", "AM-03", None, new_base, new_base + 4, new_now, False),
        ("Protect margin", "Hold gross margin", "Gross margin", "AM-02", "GM", cp["GM"], .42, cy["GM"], False),
        ("Protect margin", "Grow EBITDA", "EBITDA margin", "AM-01", "EBITDA_M", cp["EBITDA_M"], .15, cy["EBITDA_M"], False),
        ("Protect margin", "Reduce vendor dependency", "Vendor COGS share", "AM-05", "VENDOR_COGS_SHARE", cp["VENDOR_COGS_SHARE"], .50, cy["VENDOR_COGS_SHARE"], True),
        ("Deliver reliably", "On-time written delivery", "Translation on-time delivery", "PM-01", "TR_OTD", cp["TR_OTD"], .96, cy["TR_OTD"], False),
        ("Deliver reliably", "Faster interpreter connection", "OPI average speed to answer (s)", "PM-03", "OPI_ASA", cp["OPI_ASA"], 25.0, cy["OPI_ASA"], True),
        ("Deliver reliably", "Higher on-demand coverage", "On-demand fill rate", "PM-04", "FILL_ON_DEMAND", cp["FILL_ON_DEMAND"], .97, cy["FILL_ON_DEMAND"], False),
        ("Raise quality", "Consistent linguistic quality", "Review pass rate", "PM-05", "REVIEW_PASS", cp["REVIEW_PASS"], .95, cy["REVIEW_PASS"], False),
        ("Raise quality", "Fewer client rejections", "Client rejection rate", "PM-05", "REJECTION_RATE", cp["REJECTION_RATE"], .015, cy["REJECTION_RATE"], True),
        ("Scale with AI", "Grow AI-assisted workflows", "AI-touched word share", "PM-06", "AI_SHARE", cp["AI_SHARE"], .55, cy["AI_SHARE"], False),
        ("Scale with AI", "Trust in quality estimation", "MTQE acceptance", "PM-06", "MTQE_ACCEPT", cp["MTQE_ACCEPT"], .80, cy["MTQE_ACCEPT"], False),
        ("Build the team", "Healthy PM workload", "PM utilisation", "PM-07", "PM_UTIL", util_base, .85, util_now, False),
    ]
    rows = []
    for i, (pillar, obj, kr, oc, kpi, base, tgt, cur, lower) in enumerate(d):
        den = (tgt - base)
        prog = 1.0 if abs(den) < 1e-12 else float(np.clip((cur - base) / den, 0, 1))
        status = "COMPLETE" if prog >= 1 else ("ON_TRACK" if prog >= .7 else ("AT_RISK" if prog >= .4 else "OFF_TRACK"))
        rows.append(mk("fact_okr", okr_id=f"OKR-{i + 1:03d}", pillar=pillar, objective=obj, key_result=kr, owner_id=own[oc], metric_kpi_id=kpi,
                       baseline_value=rf(base, 6), target_value=rf(tgt, 6), current_value=rf(cur, 6), progress=rf(prog, 4), status=status, target_date="2026-12-31"))
    return rows


def build_targets(rev_rows):
    m = {}
    for r in rev_rows:
        m[r["month"]] = m.get(r["month"], 0.0) + r["usd"]
    s = pd.Series([m[R.ALL_MONTHS[i]] for i in range(G.N)])
    sm = s.rolling(5, center=True, min_periods=3).mean() * 1.03
    rows, n = [], 0
    flat = {"GM": .40, "EBITDA_M": .13, "TR_OTD": C.THRESHOLDS["otd_target"], "FILL_ON_DEMAND": .95, "QUALITY_SCORE": 92.0}
    for i, mo in enumerate(R.ALL_MONTHS):
        n += 1
        rows.append(mk("fact_kpi_target_period", target_id=f"TGT-{n:05d}", month_id=mo, kpi_id="REV", target_value=r2(sm[i])))
        for k, v in flat.items():
            n += 1
            rows.append(mk("fact_kpi_target_period", target_id=f"TGT-{n:05d}", month_id=mo, kpi_id=k, target_value=v))
    return rows


def clean(v):
    if v is None:
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        v = float(v)
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, float) and v != v:
        return None
    return v


def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, separators=(",", ":"), ensure_ascii=False, default=clean)


def csv_cell(v):
    """CSV encoding shared with the app's loader (lib/data/csv.ts): empty = null, true/false, shortest round-trip floats."""
    v = clean(v)
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float):
        return repr(v)
    return str(v)


def write_csv(path, header, rows):
    # RFC 4180: comma separator, double-quote quoting only where needed, "" escapes, LF line endings, UTF-8 without BOM
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, lineterminator=chr(10), quoting=csv.QUOTE_MINIMAL)
        w.writerow(header)
        for r in rows:
            w.writerow([csv_cell(x) for x in r])


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        h.update(fh.read())
    return h.hexdigest()


def run(out_dir, quiet=False, reports_dir=None):
    reports_dir = reports_dir or os.path.join(ROOT, "data", "generated")
    t0 = time.time()
    say = (lambda *a: None) if quiet else print
    T = G.build_dims_and_owners()
    clients = G.build_clients(T)
    aw, ai_act = G.build_activity(clients)
    projects, batches = G.build_written(T, clients, aw)
    sessions = G.build_sessions(clients, ai_act)
    res, T_res, T_br, D = G.build_resources(clients, batches, sessions)
    assignments = G.assign_and_cost(G.gen(7), clients, projects, batches, sessions, res)
    ai = G.build_ai(G.gen(8), batches, projects)
    rev, costs = G.build_finance(G.gen(9), clients, projects, batches, sessions)
    inv_lines, pays = G.build_invoices(G.gen(10), clients, rev)
    evals, errors = G.build_quality(G.gen(11), clients, projects, batches, res)
    cap = G.build_capacity(G.gen(12), batches, res)
    tel = G.build_telemetry(G.gen(13), T["dim_connector"])
    opps = G.build_opportunities(G.gen(14), clients, T)
    say(f"entities built in {time.time() - t0:.1f}s: clients={len(clients)} projects={len(projects)} batches={len(batches)} sessions={len(sessions)} "
        f"resources={len(res)} revenue_lines={len(rev)} cost_lines={len(costs)} invoices={len(inv_lines)} payments={len(pays)}")

    # ---- rows
    T["dim_resource"], T["bridge_resource_language"] = T_res, T_br
    T["fact_project"] = [mk("fact_project", project_id=p["pid"], project_name=p["name"], client_id=p["client_id"], service_line_id=p["sl"], domain=p["domain"],
                            pm_owner_id=p["pm"], start_date=iso(p["start"]), due_date=iso(p["due"]), delivered_date=iso(p["delivered"]),
                            status="COMPLETED" if p["delivered"] else "ACTIVE", est_pm_hours=p["pm_hours"]) for p in projects]
    T["fact_translation_batch"] = [mk("fact_translation_batch", batch_id=b["bid"], project_id=b["pid"], lp_id=G.LP_ID[b["lp"]], workflow_id=b["wf"], cat_tool=b["cat"],
                                      words_total=b["words"], tm_match_words=b["tm"], start_date=iso(b["start"]), due_date=iso(b["due"]), delivered_date=iso(b["delivered"]),
                                      status="DELIVERED" if b["delivered"] else "IN_PROGRESS", stage=b["stage"], pct_complete=rf(b["pct"], 4), client_rejected=b["rejected"])
                                   for b in batches]
    T["fact_resource_assignment"] = [mk("fact_resource_assignment", assignment_id=a["aid"], batch_id=a["bid"], resource_id=a["rid"], role=a["role"],
                                        words_assigned=a["words"], assigned_date=iso(a["date"])) for a in assignments]
    T["fact_ai_workflow_batch"] = [mk("fact_ai_workflow_batch", ai_batch_id=a["aid"], batch_id=a["bid"], engine_category=a["eng"], content_sensitivity=a["sens"],
                                      mtqe_score=a["mtqe"], mtqe_accepted_words=a["acc"], edit_distance=a["ed"], observed_words_per_hour=a["obs"], est_hours_saved=a["hours"],
                                      tooling_cost_usd=a["tool"], est_cost_saved_usd=a["cost"]) for a in ai]
    T["fact_interpretation_session"] = [mk("fact_interpretation_session", session_id=s["sid"], client_id=s["cid"], service_line_id=s["sl"], lp_id=G.LP_ID[s["lp"]],
                                           request_date=iso(s["date"]), request_hour=s["hour"], request_type=s["rtype"], status=s["status"], connect_seconds=s["connect"],
                                           duration_min=float(s["dur"]), interpreter_id=s["iid"], rating=s["rating"]) for s in sessions]
    T["fact_capacity_period"] = [mk("fact_capacity_period", capacity_id=c["cid"], lp_id=G.LP_ID[c["lp"]], week_start=iso(c["week"]), demand_words=c["demand"],
                                    supply_words=c["supply"], confirmed_words=c["conf"], is_forecast=c["fc"]) for c in cap]
    T["fact_quality_evaluation"] = [mk("fact_quality_evaluation", evaluation_id=e["eid"], batch_id=e["bid"], resource_id=e["rid"], evaluator_code=e["evaluator"],
                                       eval_date=iso(e["date"]), framework="ILLUSTRATIVE_MQM_STYLE", sample_words=e["sample"], critical_count=e["crit"], major_count=e["major"],
                                       minor_count=e["minor"], score=e["score"], outcome=e["outcome"], dispute_status=e["dispute"], corrective_action=e["action"],
                                       corrective_status=e["cstatus"]) for e in evals]
    T["fact_quality_error"] = [mk("fact_quality_error", error_id=e["xid"], evaluation_id=e["eid"], category=e["cat"], severity=e["sev"]) for e in errors]
    T["fact_revenue_line"] = [mk("fact_revenue_line", revenue_id=r["rid"], client_id=r["cid"], project_id=r["pid"], batch_id=r["bid"], month_id=r["month"], service_line_id=r["sl"],
                                 lp_id=G.LP_ID[r["lp"]] if r["lp"] is not None else None, workflow_id=r["wf"], units=r["units"],
                                 unit_type="WORD" if r["kind"] == "W" else "MINUTE", price_per_unit_original=rf(r["orig"] / r["units"], 5), currency=r["cur"],
                                 revenue_original=r["orig"], fx_usd_per_unit=r["fx"], revenue_usd=r["usd"]) for r in rev]
    order = {"DIRECT": 0, "OPEX": 1, "DA": 2}
    cls = lambda c: "DIRECT" if c in DIRECT else ("OPEX" if c in OPEX else "DA")
    costs.sort(key=lambda c: (c[0], order[cls(c[1])], c[1], c[2] or ""))
    T["fact_cost_line"] = [mk("fact_cost_line", cost_id=f"COST-{i + 1:06d}", month_id=c[0], cost_class=cls(c[1]), cost_category=c[1], revenue_id=c[2], service_line_id=c[3],
                              amount_usd=r2(c[4])) for i, c in enumerate(costs)]
    T["fact_invoice_line"] = [mk("fact_invoice_line", invoice_line_id=l["lid"], invoice_id=l["inv"], client_id=l["cid"], service_line_id=l["sl"], revenue_month_id=l["month"],
                                 invoice_date=iso(l["inv_date"]), due_date=iso(l["due"]), currency=l["cur"], amount_original=l["amt"], fx_usd_per_unit=l["fx"],
                                 amount_usd=l["usd"], adjustment_fraction=l["adj"]) for l in inv_lines]
    T["fact_payment"] = [mk("fact_payment", payment_id=p["pid"], client_id=p["cid"], payment_date=iso(p["date"]), currency=p["cur"], amount_original=p["orig"],
                            amount_usd=p["usd"]) for p in pays]
    T["bridge_payment_invoice"] = [mk("bridge_payment_invoice", payment_id=p["pid"], invoice_line_id=l["lid"], allocated_original=ao, allocated_usd=au)
                                   for p in pays for (l, ao, au) in p["allocs"]]
    T["fact_integration_telemetry"] = [mk("fact_integration_telemetry", telemetry_id=t["tid"], connector_id=t["cid"], date=iso(t["date"]), monitored_minutes=1440,
                                          up_minutes=t["up"], requests=t["req"], errors_4xx=t["e4"], errors_5xx=t["e5"], errors_timeout=t["et"], records_ingested=t["rec"],
                                          p50_ms=t["p50"], p95_ms=t["p95"], p99_ms=t["p99"]) for t in tel]
    T["fact_opportunity"] = [mk("fact_opportunity", opportunity_id=o["oid"], prospect_name=o["name"], opportunity_type=o["ptype"], vertical=o["vert"], territory=o["terr"],
                                lead_source=o["src"], owner_id=o["owner"], created_date=iso(o["created"]), expected_close_date=iso(o["exp_close"]), closed_date=iso(o["closed"]),
                                stage_current=o["cur"], value_usd=o["value"], probability=o["prob"], loss_reason=o["lr"], language_count=o["lc"],
                                quote_turnaround_hours=o["q"], client_id=o["client_id"]) for o in opps]
    ev_rows, k = [], 0
    for o in opps:
        for st, d in o["evs"]:
            k += 1
            ev_rows.append(mk("fact_opportunity_stage_event", event_id=f"EVT-{k:06d}", opportunity_id=o["oid"], stage=st, entered_date=iso(d)))
    T["fact_opportunity_stage_event"] = ev_rows
    T["dim_kpi_definition"] = [mk("dim_kpi_definition", **{f: k_[f] for f in FIELDS_KPI}) for k_ in KPIS]
    T["dim_roadmap_feature"] = [mk("dim_roadmap_feature", feature_id=f"FEA-{i + 1:03d}", title=a, description=b, category=c, status=d, target_quarter=e, priority=f, seed_votes=g)
                                for i, (a, b, c, d, e, f, g) in enumerate(ROADMAP)]
    T["fact_feedback_sample"] = [mk("fact_feedback_sample", feedback_id=f"FDB-{i + 1:03d}", category=a, rating=b, comment=c, role_label=d, submitted_date=e)
                                 for i, (a, b, c, d, e) in enumerate(FEEDBACK)]
    T["fact_scenario_assumption_set"] = []
    names = {"BASELINE": "Baseline (trailing 12 months)", "CONSERVATIVE": "Conservative preset", "OPTIMISTIC": "Optimistic preset"}
    for key, v in C.SCENARIO["presets"].items():
        T["fact_scenario_assumption_set"].append(mk("fact_scenario_assumption_set", set_id=f"SCN-{key}", set_name=names[key], ai_adoption_delta=v["ai_adoption_delta"],
                                                    price_adjustment=v["price_adjustment"], vendor_inflation=v["vendor_inflation"], volume_growth=v["volume_growth"],
                                                    formula_version=C.SCENARIO["formula_version"], description="Illustrative scenario preset - not a forecast"))
    T["fact_kpi_target_period"] = build_targets(rev)

    def frames():
        return {k: pd.DataFrame(v, columns=G.FIELDS[k]) for k, v in T.items()}

    DF = R.prepare(frames())
    T["fact_client_period_snapshot"] = build_snapshots(DF, clients)
    DF = R.prepare(frames())
    T["fact_risk_alert"] = build_alerts(G.gen(15), T, DF, clients, batches, projects, rev)
    base = R.scenario_baseline(DF)
    outs = {}
    for s in T["fact_scenario_assumption_set"]:
        inp = dict(ai_adoption_delta=s["ai_adoption_delta"], price_adjustment=s["price_adjustment"], vendor_inflation=s["vendor_inflation"], volume_growth=s["volume_growth"])
        outs[s["set_id"]] = R.scenario_outputs(base, inp)
    b_ebitda = outs["SCN-BASELINE"]["ebitda_usd"]
    T["fact_scenario_output"] = [mk("fact_scenario_output", output_id=f"SCO-{i + 1:03d}", set_id=sid, formula_version=C.SCENARIO["formula_version"], revenue_usd=r2(o["revenue_usd"]),
                                    gross_profit_usd=r2(o["gross_profit_usd"]), gross_margin=rf(o["gross_margin"], 6), ebitda_usd=r2(o["ebitda_usd"]),
                                    ebitda_margin=rf(o["ebitda_margin"], 6), ebitda_delta_vs_base_usd=r2(o["ebitda_usd"] - b_ebitda), capacity_gap_words=rf(o["capacity_gap_words"], 1))
                                 for i, (sid, o) in enumerate(outs.items())]
    DF = R.prepare(frames())
    T["fact_okr"] = build_okrs(T, DF)
    DF = R.prepare(frames())

    # ---- validation
    chk = V.Checks()
    V.validate_schema(T, chk)
    V.validate_business(T, DF, chk)
    ttm = R.core(DF, R.window("TTM"))
    diff = abs(R.scenario_outputs(base, C.SCENARIO["presets"]["BASELINE"])["ebitda_usd"] - ttm["EBITDA"])
    chk.add("fact_scenario_output", "R-SCN baseline scenario reproduces TTM EBITDA", "RECONCILIATION", 1, 0 if diff < 1.0 else 1, f"diff {diff:.4f}")
    T["fact_data_quality_check"] = chk.rows
    summary = dict(total=len(chk.rows), passed=sum(1 for r in chk.rows if r["passed"]), failed=sum(1 for r in chk.rows if not r["passed"]))

    # ---- export: one CSV per table in out_dir (the app's data source); test/report artifacts in reports_dir
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        if f.endswith(".csv"):
            os.remove(os.path.join(out_dir, f))
    files = {}
    for t in TABLES:
        name = t["name"]
        cols = G.FIELDS[name]
        rows = T[name]
        path = os.path.join(out_dir, f"{name}.csv")
        write_csv(path, cols, [[r[c] for c in cols] for r in rows])
        files[name] = dict(rows=len(rows), bytes=os.path.getsize(path), sha256=sha(path))
    # kpi reference
    ref = {"as_of": iso(C.AS_OF), "windows": {}, "nrr": {}, "dso": {}, "pm_util": {}, "scenario_baseline": base, "scenario_outputs": outs}
    for w in ("ALL", "YTD", "PYTD", "TTM", "L3M", "LATEST"):
        for bu in ("ALL", "UNIT_ALPHA"):
            ref["windows"][f"{w}|{bu}"] = R.core(DF, R.window(w), bu)
    for bu in ("ALL", "UNIT_ALPHA"):
        ref["nrr"][bu] = R.nrr(DF, R.ALL_MONTHS[-1], bu)
        d, ar = R.dso(DF, iso(C.AS_OF), bu)
        ref["dso"][bu] = dict(DSO=d, open_ar_usd=ar)
    ref["pm_util"] = {w: R.pm_util(DF, R.window(w)) for w in ("YTD", "TTM")}
    write_json(os.path.join(reports_dir, "kpi_reference.json"), ref)
    # data dictionary
    dd = []
    for t in TABLES:
        first = T[t["name"]][0] if T[t["name"]] else {}
        fl = []
        for f in t["fields"]:
            fl.append(dict(field=f["name"], type=f["dtype"], nullable=f["nullable"], description=f["description"], formula=f["formula"], enum=f["enum"],
                           classification=build_docs.classification(t, f), example=first.get(f["name"])))
        dd.append(dict(entity=t["name"], kind=t["kind"], domain=t["domain"], grain=t["grain"], primary_key=t["pk"], foreign_keys=t["fks"], notes=t["notes"], fields=fl))
    # data dictionary as CSV: one row per table and one row per column
    write_csv(os.path.join(out_dir, "meta_tables.csv"), ["table", "kind", "domain", "grain", "primary_key", "foreign_keys", "notes"],
              [[e["entity"], e["kind"], e["domain"], e["grain"], e["primary_key"], "; ".join(f"{k}->{v}" for k, v in e["foreign_keys"].items()), e["notes"] or None] for e in dd])
    write_csv(os.path.join(out_dir, "meta_fields.csv"), ["table", "position", "field", "type", "nullable", "enum", "formula", "classification", "description", "example"],
              [[e["entity"], i + 1, x["field"], x["type"], x["nullable"], "|".join(x["enum"]) if x["enum"] else None, x["formula"], x["classification"], x["description"], x["example"]]
               for e in dd for i, x in enumerate(e["fields"])])
    cfg = dict(thresholds=C.THRESHOLDS, assumptions=C.ASSUMPTIONS, scenario=C.SCENARIO, payment_terms_days=C.PAYMENT_TERMS_DAYS, seeded_surge=C.SEEDED_SURGE,
               fx_usd_per_unit=C.FX_USD_PER_UNIT, rounding_policy=C.ROUNDING_POLICY)
    manifest = dict(dataset_version=C.DATASET_VERSION, generator_version=C.GENERATOR_VERSION, schema_version=C.SCHEMA_VERSION, synthetic=True,
                    seed=C.SEED, generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), as_of=iso(C.AS_OF), first_month=R.ALL_MONTHS[0],
                    last_month=R.ALL_MONTHS[-1], base_currency=C.BASE_CURRENCY, fx_rate_type=C.FX_RATE_TYPE, fx_rate_version=C.FX_RATE_VERSION,
                    disclaimer="All records are synthetic and fictional. Nothing here is BIG Language Solutions data.", config=cfg, files=files,
                    total_bytes=sum(v["bytes"] for v in files.values()))
    # dataset metadata and generator configuration as key/value CSVs (manifest.json is no longer written)
    meta = {k: manifest[k] for k in ("dataset_version", "generator_version", "schema_version", "synthetic", "seed", "as_of", "first_month", "last_month",
                                     "base_currency", "fx_rate_type", "fx_rate_version", "disclaimer")}
    write_csv(os.path.join(out_dir, "meta_dataset.csv"), ["key", "value"], [[k, v] for k, v in meta.items()])

    def flat(prefix, obj):
        for k, v in obj.items():
            if isinstance(v, dict):
                yield from flat(f"{prefix}.{k}" if prefix else k, v)
            elif isinstance(v, (list, tuple)):
                yield prefix, k, "|".join(str(x) for x in v), "list_number" if all(isinstance(x, (int, float)) for x in v) else "list_string"
            else:
                yield prefix, k, v, "number" if isinstance(v, (int, float)) and not isinstance(v, bool) else "string"
    write_csv(os.path.join(out_dir, "meta_config.csv"), ["section", "key", "value", "type"], [list(r) for r in flat("", cfg)])
    report = dict(summary=dict(summary, critical_failed=chk.critical_failed), failed=[r for r in chk.rows if not r["passed"]],
                  tables={k: v["rows"] for k, v in files.items()}, file_sizes={k: v["bytes"] for k, v in files.items()},
                  headline=dict(YTD=ref["windows"]["YTD|ALL"], TTM=ref["windows"]["TTM|ALL"], nrr=ref["nrr"]["ALL"], dso=ref["dso"]["ALL"], pm_util=ref["pm_util"]),
                  checks=chk.rows)
    write_json(os.path.join(reports_dir, "validation_report.json"), report)
    say(f"validation: {summary['passed']}/{summary['total']} checks passed; critical_failed={chk.critical_failed}; "
        f"total CSV {manifest['total_bytes'] / 1e6:.2f} MB; {time.time() - t0:.1f}s")
    return manifest, report, ref


FIELDS_KPI = [f["name"] for f in TABLE_BY_NAME["dim_kpi_definition"]["fields"]]


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "public", "data"), help="directory for the CSV dataset the app reads")
    ap.add_argument("--reports", default=os.path.join(ROOT, "data", "generated"), help="directory for kpi_reference.json and validation_report.json")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args(argv)
    manifest, report, ref = run(a.out, a.quiet, a.reports)
    if not a.quiet:
        y = ref["windows"]["YTD|ALL"]
        print("YTD headline:", {k: (round(v, 4) if isinstance(v, float) else v) for k, v in y.items()
                                if k in ("REV", "GM", "EBITDA_M", "TR_WORDS", "TR_OTD", "AI_SHARE", "MTPE_SHARE", "INT_MIN", "OPI_ASA", "FILL_ON_DEMAND",
                                         "ACTIVE_CLIENTS", "TOP10_CONC", "QUALITY_SCORE", "REVIEW_PASS", "VENDOR_COGS_SHARE", "REJECTION_RATE")})
        print("NRR:", ref["nrr"]["ALL"], "DSO:", ref["dso"]["ALL"], "PM util:", ref["pm_util"])
        for r in report["failed"]:
            print("FAILED:", r["entity"], r["check_name"], r["rows_failed"], r["detail"])
    return 1 if report["summary"]["critical_failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
