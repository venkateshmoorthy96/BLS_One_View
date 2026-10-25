"""Independent pandas implementation of the headline KPIs.

The TypeScript KPI layer is tested against the numbers this module writes to
data/generated/kpi_reference.json. Formulas follow docs/kpi-definitions.md.
"""
from __future__ import annotations

import calendar
from datetime import date, timedelta

import numpy as np
import pandas as pd

import config as C


def _month_ids():
    y0, m0 = C.FIRST_MONTH
    out = []
    for i in range(C.N_MONTHS):
        k = m0 - 1 + i
        out.append(f"{y0 + k // 12}-{k % 12 + 1:02d}")
    return out


ALL_MONTHS = _month_ids()


def window(kind):
    ids = ALL_MONTHS
    year = str(C.AS_OF.year)
    return {
        "ALL": ids,
        "YTD": [m for m in ids if m.startswith(year + "-")],
        "PYTD": [m for m in ids if m.startswith(str(C.AS_OF.year - 1) + "-") and int(m[5:]) <= C.AS_OF.month],
        "TTM": ids[-12:],
        "QTD": ids[-3:],
        "L6M": ids[-6:],
        "L3M": ids[-3:],
        "LATEST": ids[-1:],
    }[kind]


def month_bounds(month_id):
    y, m = int(month_id[:4]), int(month_id[5:])
    return date(y, m, 1), date(y, m, calendar.monthrange(y, m)[1])


def clients_in(DF, bu="ALL"):
    cl = DF["dim_client"]
    if bu and bu != "ALL":
        cl = cl[cl["business_unit"] == bu]
    return set(cl["client_id"])


def prepare(DF):
    """Add derived helper frames used by several KPI functions."""
    proj = DF["fact_project"][["project_id", "client_id", "domain", "service_line_id"]]
    bt = DF["fact_translation_batch"].merge(proj, on="project_id", how="left")
    bt["deliv_month"] = bt["delivered_date"].str.slice(0, 7)
    bt["tat_days"] = (pd.to_datetime(bt["delivered_date"]) - pd.to_datetime(bt["start_date"])).dt.days
    DF["_bt"] = bt
    ss = DF["fact_interpretation_session"].copy()
    ss["month"] = ss["request_date"].str.slice(0, 7)
    DF["_ss"] = ss
    ev = DF["fact_quality_evaluation"].merge(bt[["batch_id", "client_id"]], on="batch_id", how="left")
    ev["month"] = ev["eval_date"].str.slice(0, 7)
    DF["_ev"] = ev
    ai = DF["fact_ai_workflow_batch"].merge(bt[["batch_id", "client_id", "words_total", "deliv_month", "lp_id"]], on="batch_id", how="left")
    DF["_ai"] = ai
    return DF


def _ratio(a, b):
    return None if (b is None or b == 0) else float(a) / float(b)


def core(DF, months, bu="ALL"):
    cs = clients_in(DF, bu)
    out = {}
    rev = DF["fact_revenue_line"]
    revf = rev[rev["month_id"].isin(months) & rev["client_id"].isin(cs)]
    revenue = float(revf["revenue_usd"].sum())
    cost = DF["fact_cost_line"]
    d = cost[(cost["cost_class"] == "DIRECT") & cost["revenue_id"].isin(set(revf["revenue_id"]))]
    direct = float(d["amount_usd"].sum())
    gp = revenue - direct
    allrev = float(rev[rev["month_id"].isin(months)]["revenue_usd"].sum())
    share = _ratio(revenue, allrev) or 0.0
    opex_all = float(cost[(cost["cost_class"] == "OPEX") & cost["month_id"].isin(months)]["amount_usd"].sum())
    da_all = float(cost[(cost["cost_class"] == "DA") & cost["month_id"].isin(months)]["amount_usd"].sum())
    opex = opex_all * share
    out.update(REV=revenue, DIRECT_COST=direct, GP=gp, GM=_ratio(gp, revenue), OPEX=opex, EBITDA=gp - opex,
               EBITDA_M=_ratio(gp - opex, revenue), DA=da_all * share)
    vendor = float(d[d["cost_category"] == "VENDOR_LINGUIST"]["amount_usd"].sum())
    ipay = float(d[d["cost_category"] == "INTERPRETER_PAY"]["amount_usd"].sum())
    out["VENDOR_COGS_SHARE"] = _ratio(vendor + ipay, revenue)
    wr = revf[revf["unit_type"] == "WORD"]
    words_rev = float(wr["units"].sum())
    out["REV_PER_WORD"] = _ratio(float(wr["revenue_usd"].sum()), words_rev)
    vw = d[(d["cost_category"] == "VENDOR_LINGUIST") & d["revenue_id"].isin(set(wr["revenue_id"]))]["amount_usd"].sum()
    out["COST_PER_WORD"] = _ratio(float(vw), words_rev)
    # clients
    byc = revf.groupby("client_id")["revenue_usd"].sum()
    byc = byc[byc > 0]
    out["ACTIVE_CLIENTS"] = int(len(byc))
    out["ARPA"] = _ratio(revenue, len(byc))
    out["TOP10_CONC"] = _ratio(float(byc.nlargest(10).sum()), revenue)
    # translation
    B = DF["_bt"]
    dv = B[(B["status"] == "DELIVERED") & B["deliv_month"].isin(months) & B["client_id"].isin(cs)]
    words = float(dv["words_total"].sum())
    out["TR_WORDS"] = int(words)
    out["TR_OTD"] = _ratio(float((dv["delivered_date"] <= dv["due_date"]).sum()), len(dv))
    out["TR_TAT"] = float(dv["tat_days"].mean()) if len(dv) else None
    out["MTPE_SHARE"] = _ratio(float(dv[dv["workflow_id"] == "MTPE"]["words_total"].sum()), words)
    out["AI_SHARE"] = _ratio(float(dv[dv["workflow_id"].isin(["MTPE", "AIR"])]["words_total"].sum()), words)
    out["TM_REUSE"] = _ratio(float(dv["tm_match_words"].sum()), words)
    out["REJECTION_RATE"] = _ratio(float(dv["client_rejected"].astype(bool).sum()), len(dv))
    # interpretation
    S = DF["_ss"]
    s = S[S["month"].isin(months) & S["client_id"].isin(cs)]
    ful = s[s["status"] == "FULFILLED"]
    out["INT_MIN"] = int(ful["duration_min"].sum())
    out["INT_AVG_DUR"] = float(ful["duration_min"].mean()) if len(ful) else None
    opi = ful[(ful["service_line_id"] == "OPI") & (ful["request_type"] == "ON_DEMAND")]
    out["OPI_ASA"] = float(opi["connect_seconds"].mean()) if len(opi) else None
    vri = s[s["service_line_id"] == "VRI"]
    vf, vt = int((vri["status"] == "FULFILLED").sum()), int((vri["status"] == "TECH_FAILURE").sum())
    out["VRI_CONN"] = _ratio(vf, vf + vt)

    def fill(mask):
        sub = s[mask]
        f = int((sub["status"] == "FULFILLED").sum())
        u = int((sub["status"] == "UNFULFILLED").sum())
        return _ratio(f, f + u)

    out["FILL_ON_DEMAND"] = fill(s["request_type"] == "ON_DEMAND")
    out["FILL_SCHEDULED"] = fill(s["request_type"] == "SCHEDULED")
    out["ONSITE_FILL"] = fill(s["service_line_id"] == "ONSITE")
    # quality
    E = DF["_ev"]
    e = E[E["month"].isin(months) & E["client_id"].isin(cs)]
    out["QUALITY_SCORE"] = float(e["score"].mean()) if len(e) else None
    out["REVIEW_PASS"] = _ratio(int((e["outcome"] == "PASS").sum()), len(e))
    out["OPEN_DISPUTES"] = int((e["dispute_status"] == "OPEN").sum())
    # AI
    A = DF["_ai"]
    a = A[A["deliv_month"].isin(months) & A["client_id"].isin(cs)]
    aw = float(a["words_total"].sum())
    out["AI_HOURS_SAVED"] = float(a["est_hours_saved"].sum())
    out["AI_COST_SAVED"] = float(a["est_cost_saved_usd"].sum())
    out["AI_EDIT_DIST"] = _ratio(float((a["edit_distance"] * a["words_total"]).sum()), aw)
    out["MTQE_ACCEPT"] = _ratio(float(a["mtqe_accepted_words"].sum()), aw)
    return out


def nrr(DF, end_id, bu="ALL"):
    ids = ALL_MONTHS
    e = ids.index(end_id)
    if e < 23:
        return dict(NRR=None, GROSS_REV_CHURN=None, LOGO_CHURN=None, LOGO_RETENTION=None, cohort=0)
    latest, opening = ids[e - 11:e + 1], ids[e - 23:e - 11]
    cs = clients_in(DF, bu)
    rev = DF["fact_revenue_line"]
    rev = rev[rev["client_id"].isin(cs)]
    o = rev[rev["month_id"].isin(opening)].groupby("client_id")["revenue_usd"].sum()
    o = o[o > 0]
    l = rev[rev["month_id"].isin(latest)].groupby("client_id")["revenue_usd"].sum().reindex(o.index).fillna(0.0)
    if len(o) == 0:
        return dict(NRR=None, GROSS_REV_CHURN=None, LOGO_CHURN=None, LOGO_RETENTION=None, cohort=0)
    lost = float(np.maximum(0.0, o - l).sum())
    lc = _ratio(int((l <= 0).sum()), len(o))
    return dict(NRR=float(l.sum() / o.sum()), GROSS_REV_CHURN=lost / float(o.sum()), LOGO_CHURN=lc,
                LOGO_RETENTION=None if lc is None else 1 - lc, cohort=int(len(o)))


def receivables(DF, end_date, bu="ALL"):
    """Open AR (USD) per currency at end_date and invoiced value in the trailing 90 days."""
    cs = clients_in(DF, bu)
    inv = DF["fact_invoice_line"]
    inv = inv[inv["client_id"].isin(cs) & (inv["invoice_date"] <= end_date)]
    br = DF["fact_payment"][["payment_id", "payment_date"]].merge(DF["bridge_payment_invoice"], on="payment_id")
    br = br[br["payment_date"] <= end_date]
    alloc = br.groupby("invoice_line_id")["allocated_usd"].sum()
    inv = inv.assign(paid=inv["invoice_line_id"].map(alloc).fillna(0.0))
    inv = inv.assign(open_usd=inv["amount_usd"] - inv["paid"])
    start90 = (date.fromisoformat(end_date) - timedelta(days=89)).isoformat()
    inv90 = float(inv[inv["invoice_date"] >= start90]["amount_usd"].sum())
    return inv, inv90


def dso(DF, end_date, bu="ALL"):
    inv, inv90 = receivables(DF, end_date, bu)
    return _ratio(float(inv["open_usd"].sum()) * 90.0, inv90), float(inv["open_usd"].sum())


def pm_util(DF, months):
    """Allocated PM hours / available PM hours in the month window."""
    w0, _ = month_bounds(months[0])
    _, w1 = month_bounds(months[-1])
    w0n, w1n = np.datetime64(w0), np.datetime64(w1)
    p = DF["fact_project"]
    start = pd.to_datetime(p["start_date"]).values.astype("datetime64[D]")
    due = pd.to_datetime(p["due_date"]).values.astype("datetime64[D]")
    span = (due - start).astype(int) + 1
    ov_start = np.maximum(start, w0n)
    ov_end = np.minimum(due, w1n)
    ov = np.maximum(0, (ov_end - ov_start).astype(int) + 1)
    alloc = float((p["est_pm_hours"].values * ov / span).sum())
    o = DF["dim_owner"]
    o = o[o["role"] == "PROJECT_MANAGER"]
    cap = 0.0
    for _, r in o.iterrows():
        h = np.datetime64(r["hire_date"])
        t = np.datetime64(r["termination_date"]) if isinstance(r["termination_date"], str) else w1n
        a, b = max(h, w0n), min(t, w1n)
        days = max(0, int((b - a).astype(int)) + 1)
        cap += float(r["weekly_capacity_hours"]) * days / 7.0
    return _ratio(alloc, cap)


def scenario_baseline(DF):
    months = window("TTM")
    rev = DF["fact_revenue_line"]
    r = rev[rev["month_id"].isin(months)]
    cost = DF["fact_cost_line"]
    d = cost[(cost["cost_class"] == "DIRECT") & cost["revenue_id"].isin(set(r["revenue_id"]))]
    wr = r[r["unit_type"] == "WORD"]
    ai_ids = set(wr[wr["workflow_id"].isin(["MTPE", "AIR"])]["revenue_id"])
    ht_ids = set(wr[wr["workflow_id"] == "HT"]["revenue_id"])
    W = float(wr["units"].sum())
    AIW = float(wr[wr["revenue_id"].isin(ai_ids)]["units"].sum())
    HTW = W - AIW
    vend = d[d["cost_category"] == "VENDOR_LINGUIST"]
    ch = float(vend[vend["revenue_id"].isin(ht_ids)]["amount_usd"].sum()) / HTW
    ca = float(vend[vend["revenue_id"].isin(ai_ids)]["amount_usd"].sum()) / AIW
    tool = float(d[d["cost_category"] == "MT_AI_TOOLING"]["amount_usd"].sum())
    cap = DF["fact_capacity_period"]
    act = cap[~cap["is_forecast"].astype(bool)]
    S_week = float(act.groupby("week_start")["supply_words"].sum().mean())

    def cat(c):
        return float(d[d["cost_category"] == c]["amount_usd"].sum())

    return dict(
        Rw=float(r[r["unit_type"] == "WORD"]["revenue_usd"].sum()), Ri=float(r[r["unit_type"] == "MINUTE"]["revenue_usd"].sum()),
        W=W, a0=AIW / W, ch=ch, ca=ca, t=tool / AIW, Pi=cat("INTERPRETER_PAY"), Pl=cat("PLATFORM_TELECOM"), L=cat("PM_DISPATCH_LABOR"),
        X=float(cost[(cost["cost_class"] == "OPEX") & cost["month_id"].isin(months)]["amount_usd"].sum()),
        D=float(cost[(cost["cost_class"] == "DA") & cost["month_id"].isin(months)]["amount_usd"].sum()),
        S_week=S_week,
    )


def scenario_outputs(b, inp):
    S = C.SCENARIO
    v, p, i, da = inp["volume_growth"], inp["price_adjustment"], inp["vendor_inflation"], inp["ai_adoption_delta"]
    W2 = b["W"] * (1 + v)
    a = min(1.0, b["a0"] + da)
    rev = (b["Rw"] + b["Ri"]) * (1 + v) * (1 + p)
    vendor = W2 * ((1 - a) * b["ch"] + a * b["ca"]) * (1 + i)
    tooling = W2 * a * b["t"]
    ipay = b["Pi"] * (1 + v) * (1 + i)
    plat = b["Pl"] * (1 + S["platform_volume_elasticity"] * v)
    labour = b["L"] * (1 + S["pm_labor_volume_elasticity"] * v)
    gp = rev - vendor - tooling - ipay - plat - labour
    opex = b["X"] * (1 + S["opex_volume_elasticity"] * v)
    ebitda = gp - opex
    required = W2 * ((1 - a) + C.ASSUMPTIONS["ai_effort_factor"] * a)
    gap = required - 52.0 * b["S_week"]
    return dict(revenue_usd=rev, gross_profit_usd=gp, gross_margin=gp / rev if rev else None, ebitda_usd=ebitda,
                ebitda_margin=ebitda / rev if rev else None, capacity_gap_words=gap)
