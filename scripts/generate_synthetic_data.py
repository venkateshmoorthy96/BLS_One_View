#!/usr/bin/env python3
"""Deterministic synthetic data generator for BLS OneView.

ALL DATA IS FICTIONAL. Fixed seed -> identical output. Fails (exit 1) if a critical
validation or reconciliation check fails.

Usage: python3 scripts/generate_synthetic_data.py [--out public/data] [--reports data/generated]
"""
from __future__ import annotations

import argparse
import calendar
import hashlib
import json
import math
import os
import sys
import time
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import config as C  # noqa: E402
import reference_kpis as R  # noqa: E402
import validate as V  # noqa: E402
from kpi_catalog import KPIS  # noqa: E402
from schema import TABLES, TABLE_BY_NAME, ENUMS  # noqa: E402

N = C.N_MONTHS
AS_OF = C.AS_OF
TARGET_PROJECTS = 1050
TARGET_SESSIONS = 36000


# ------------------------------------------------------------------ helpers
def gen(stage):
    return np.random.default_rng([C.SEED, stage])


def r2(x):
    return float(Decimal(repr(float(x))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def rf(x, n=4):
    return round(float(x), n)


def ym(i):
    k = C.FIRST_MONTH[1] - 1 + i
    return C.FIRST_MONTH[0] + k // 12, k % 12 + 1


def mstart(i):
    y, m = ym(i)
    return date(y, m, 1)


def mend(i):
    y, m = ym(i)
    return date(y, m, calendar.monthrange(y, m)[1])


def mid(i):
    y, m = ym(i)
    return f"{y}-{m:02d}"


def iso(d):
    return d.isoformat() if d is not None else None


def midx(d):
    """Month index of a date (0 = first data month; may be negative)."""
    return (d.year - C.FIRST_MONTH[0]) * 12 + (d.month - C.FIRST_MONTH[1])


def monday(d):
    return d - timedelta(days=d.weekday())


def norm(p):
    p = np.array(p, dtype=float)
    return p / p.sum()


FIELDS = {t["name"]: [f["name"] for f in t["fields"]] for t in TABLES}


def mk(table, **kw):
    cols = FIELDS[table]
    if set(kw) != set(cols):
        raise KeyError(f"{table}: mismatch missing={set(cols) - set(kw)} extra={set(kw) - set(cols)}")
    return {c: kw[c] for c in cols}


# ------------------------------------------------------------------ static reference data
SERVICE_LINES = [("TRANSLATION", "Document Translation", "WRITTEN", "WORD", 1), ("LOCALIZATION", "Localization", "WRITTEN", "WORD", 2),
                 ("ALT_FORMAT", "Alternate Formats", "WRITTEN", "WORD", 3), ("OPI", "Over-the-Phone Interpretation", "INTERPRETATION", "MINUTE", 4),
                 ("VRI", "Video Remote Interpretation", "INTERPRETATION", "MINUTE", 5), ("ONSITE", "On-site Interpretation", "INTERPRETATION", "MINUTE", 6)]
WORKFLOWS = [("HT", "Human translation (TEP)", False, "Translate, edit and proofread by linguists"),
             ("MTPE", "Machine translation post-editing", True, "Machine output post-edited by a linguist"),
             ("AIR", "AI-assisted review", True, "Machine output with a lightweight linguist review")]
LPS = [("ES", "Spanish", "Romance", "HIGH", .28), ("ZH", "Chinese (Simplified)", "Sino-Tibetan", "HIGH", .12), ("VI", "Vietnamese", "Austroasiatic", "MEDIUM", .08),
       ("AR", "Arabic", "Semitic", "MEDIUM", .06), ("RU", "Russian", "Slavic", "HIGH", .05), ("FR", "French", "Romance", "HIGH", .05),
       ("DE", "German", "Germanic", "HIGH", .03), ("PT", "Portuguese (Brazil)", "Romance", "HIGH", .05), ("KO", "Korean", "Koreanic", "MEDIUM", .04),
       ("TL", "Tagalog", "Austronesian", "MEDIUM", .03), ("HT", "Haitian Creole", "Creole", "LOW", .03), ("SO", "Somali", "Cushitic", "LOW", .02),
       ("HI", "Hindi", "Indo-Aryan", "MEDIUM", .03), ("JA", "Japanese", "Japonic", "MEDIUM", .02), ("IT", "Italian", "Romance", "HIGH", .02),
       ("PL", "Polish", "Slavic", "HIGH", .02), ("AM", "Amharic", "Semitic", "LOW", .015), ("FA", "Farsi", "Iranian", "MEDIUM", .015),
       ("UR", "Urdu", "Indo-Aryan", "MEDIUM", .015), ("NE", "Nepali", "Indo-Aryan", "LOW", .015)]
LP_W = norm([x[4] for x in LPS])
LP_ID = [f"LP-{i + 1:02d}" for i in range(len(LPS))]
LP_TIER = [x[3] for x in LPS]
LP_CODE = [x[0] for x in LPS]
TIER_IDX = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
DOMAINS = ENUMS["domain"]
VERT = {
    "HEALTHCARE": dict(w=.6, i=1.6, bu="UNIT_ALPHA", sl=(.70, .10, .20),
                       dom={"MEDICAL": .62, "REGULATORY": .10, "MARKETING": .08, "TECHNICAL": .05, "GOVERNMENT": .10, "FINANCIAL": .05}),
    "GOVERNMENT": dict(w=1.0, i=1.0, bu="UNIT_BETA", sl=(.62, .08, .30),
                       dom={"GOVERNMENT": .55, "LEGAL": .15, "REGULATORY": .12, "MARKETING": .08, "TECHNICAL": .05, "FINANCIAL": .03, "MEDICAL": .02}),
    "LEGAL": dict(w=1.3, i=.8, bu="UNIT_BETA", sl=(.88, .02, .10), dom={"LEGAL": .82, "FINANCIAL": .08, "REGULATORY": .05, "GOVERNMENT": .05}),
    "LIFE_SCIENCES": dict(w=1.8, i=.3, bu="UNIT_ALPHA", sl=(.75, .20, .05), dom={"MEDICAL": .40, "REGULATORY": .35, "TECHNICAL": .15, "MARKETING": .10}),
    "FINANCIAL_SERVICES": dict(w=1.0, i=.5, bu="UNIT_GAMMA", sl=(.70, .18, .12), dom={"FINANCIAL": .65, "LEGAL": .12, "REGULATORY": .10, "MARKETING": .13}),
    "TECHNOLOGY": dict(w=1.5, i=.2, bu="UNIT_GAMMA", sl=(.38, .57, .05), dom={"TECHNICAL": .60, "MARKETING": .25, "LEGAL": .05, "FINANCIAL": .10}),
}
VERT_COUNTS = [("HEALTHCARE", 22), ("GOVERNMENT", 10), ("LEGAL", 8), ("LIFE_SCIENCES", 8), ("FINANCIAL_SERVICES", 7), ("TECHNOLOGY", 5)]
SUFFIX = {
    "HEALTHCARE": ["Regional Health", "Medical Center", "Health Partners", "Community Clinics", "Children's Care Network"],
    "GOVERNMENT": ["County Services", "Municipal Agency", "State Benefits Office", "Transit Authority", "Housing Authority"],
    "LEGAL": ["Legal Group", "Law Partners", "Litigation Services"],
    "LIFE_SCIENCES": ["Biosciences", "Pharma Labs", "Clinical Research", "Therapeutics"],
    "FINANCIAL_SERVICES": ["Credit Union", "Insurance Group", "Capital Partners"],
    "TECHNOLOGY": ["Software", "Cloud Systems", "Digital Labs"],
}
PREFIXES = ["Northgate", "Cedar Valley", "Harborview", "Summit Ridge", "Bluewater", "Maple Grove", "Ironwood", "Lakeshore", "Pinecrest", "Redstone",
            "Silverline", "Oakmont", "Brightwell", "Stonebridge", "Westfield", "Eastbrook", "Clearpoint", "Fairhaven", "Granite Peak", "Highland",
            "Juniper", "Keystone", "Lighthouse", "Meridian", "Newbridge", "Orchard", "Palisade", "Quarry Hill", "Riverbend", "Sunridge", "Tidewater",
            "Unity Square", "Valleybrook", "Windmere", "Yarrow", "Zephyr Point", "Alder", "Birchwood", "Cobalt", "Driftwood", "Elmstead", "Foxglove",
            "Greystone", "Hawthorne", "Jasper Hill", "Kingsley", "Larkspur", "Mosswood", "Nightingale", "Oakhurst", "Peregrine", "Quillfeather",
            "Rosedale", "Sandpiper", "Thornfield", "Umber Ridge", "Vireo", "Wrenwood", "Aspen Glen", "Briarwood", "Coral Bay", "Dunmore",
            "Emberfield", "Falconcrest", "Glenhaven", "Heronsgate", "Ivywood", "Kestrel Park", "Lindenwood", "Marlowe"]
PROJ_WORDS = ["Intake Forms", "Patient Materials", "Policy Update", "Annual Report", "Training Course", "Consent Documents", "Website Refresh",
              "Regulatory Filing", "Benefits Notice", "Contract Pack", "Discharge Instructions", "Product Labels", "Help Center", "App Strings", "Handbook"]
DOMAIN_PRICE = {"MEDICAL": 1.12, "LEGAL": 1.12, "REGULATORY": 1.15, "FINANCIAL": 1.05, "TECHNICAL": 1.0, "MARKETING": 1.05, "GOVERNMENT": .98}
DOMAIN_AI = {"MEDICAL": .55, "LEGAL": .55, "REGULATORY": .6, "FINANCIAL": .8, "TECHNICAL": 1.3, "MARKETING": 1.1, "GOVERNMENT": .7}
PRICE_WORD = {"HIGH": .115, "MEDIUM": .155, "LOW": .215}
RATE_WORD = {"HIGH": .046, "MEDIUM": .062, "LOW": .088}
SL_PRICE = {"TRANSLATION": 1.0, "LOCALIZATION": 1.22, "ALT_FORMAT": 1.75}
WF_PRICE = {"HT": 1.0, "MTPE": .80, "AIR": .72}
TIER_DISC = {"STRATEGIC": .93, "GROWTH": .965, "STANDARD": 1.0}
ROLE_FACTORS = {"HT": [("TRANSLATOR", 1.0), ("EDITOR", .30)], "MTPE": [("POST_EDITOR", .62), ("REVIEWER", .30)], "AIR": [("REVIEWER", .45)]}
PRICE_MIN = {"OPI": 1.15, "VRI": 1.45, "ONSITE": 1.70}
LANG_PRICE_FAC = {"HIGH": 1.0, "MEDIUM": 1.12, "LOW": 1.35}
LANG_PAY_FAC = {"HIGH": 1.0, "MEDIUM": 1.15, "LOW": 1.45}
PLATFORM_RATE = {"OPI": .07, "VRI": .11, "ONSITE": .01}
SEAS_W = [.93, .96, 1.03, 1.04, 1.05, 1.0, .93, .96, 1.05, 1.08, 1.03, .94]
SEAS_I = [1.08, 1.05, 1.02, 1.0, .98, .97, .95, .96, 1.0, 1.03, 1.04, 1.02]


# ------------------------------------------------------------------ stage 1: dimensions, owners, clients
def build_dims_and_owners():
    T = {}
    T["dim_service_line"] = [mk("dim_service_line", service_line_id=a, service_line_name=b, family=c, unit_type=d, sort_order=e) for a, b, c, d, e in SERVICE_LINES]
    T["dim_workflow_type"] = [mk("dim_workflow_type", workflow_id=a, workflow_name=b, is_ai_touched=c, description=d) for a, b, c, d in WORKFLOWS]
    T["dim_language_pair"] = [mk("dim_language_pair", lp_id=LP_ID[i], pair_label=f"EN>{x[0]}", source_language="English", target_language=x[1],
                                 language_family=x[2], resource_tier=x[3], demand_weight=rf(LP_W[i], 4)) for i, x in enumerate(LPS)]
    T["dim_date"] = []
    for i in range(N):
        y, m = ym(i)
        T["dim_date"].append(mk("dim_date", month_id=mid(i), month_start=iso(mstart(i)), month_end=iso(mend(i)), year=y,
                                quarter=f"{y}-Q{(m - 1) // 3 + 1}", month_index=i, is_ytd=(y == AS_OF.year)))
    T["dim_fx_rate"] = [mk("dim_fx_rate", currency_code=k, usd_per_unit=v, rate_type=C.FX_RATE_TYPE, rate_version=C.FX_RATE_VERSION) for k, v in C.FX_USD_PER_UNIT.items()]
    conn = [("Simulated TMS Job Feed", "TMS", "WEBHOOK", "SIM_PROD"), ("Simulated TMS Asset Sync", "TMS", "SFTP", "SIM_PROD"),
            ("Mock CRM Opportunity Sync", "CRM", "REST", "SIM_PROD"), ("Mock ERP Ledger Export", "FINANCE", "SOAP", "SIM_PROD"),
            ("Mock Billing Gateway", "FINANCE", "REST", "SIM_PROD"), ("Simulated Telephony Gateway", "TELEPHONY", "SIP", "SIM_PROD"),
            ("Simulated Call Routing Events", "TELEPHONY", "WEBHOOK", "SIM_PROD"), ("Mock Video Session Service", "VIDEO", "WEBSOCKET", "SIM_PROD"),
            ("Simulated Workforce Roster Feed", "HR", "SFTP", "SIM_PROD"), ("Mock MT Engine API", "AI_MT", "REST", "SIM_PROD"),
            ("Mock QE Scoring Service", "AI_MT", "REST", "SIM_STAGING"), ("Simulated Quality Tool Sync", "QUALITY", "WEBHOOK", "SIM_PROD"),
            ("Mock Data Lake Loader", "DATA", "SFTP", "SIM_PROD"), ("Simulated BI Export", "DATA", "REST", "SIM_STAGING")]
    T["dim_connector"] = [mk("dim_connector", connector_id=f"CON-{i + 1:02d}", connector_name=n, category=c, protocol=p,
                             simulated_endpoint=f"https://sim-{n.lower().replace(' ', '-')}.example.invalid/v1", sim_environment=e, is_simulated=True)
                          for i, (n, c, p, e) in enumerate(conn)]
    # owners
    rng = gen(1)
    spec = [("AM-01", "ACCOUNT_MANAGER", None), ("AM-02", "ACCOUNT_MANAGER", None), ("AM-03", "ACCOUNT_MANAGER", None),
            ("AM-04", "ACCOUNT_MANAGER", date(2026, 2, 28)), ("AM-05", "ACCOUNT_MANAGER", None), ("AM-06", "ACCOUNT_MANAGER", None),
            ("PM-01", "PROJECT_MANAGER", None), ("PM-02", "PROJECT_MANAGER", date(2025, 4, 15)), ("PM-03", "PROJECT_MANAGER", None),
            ("PM-04", "PROJECT_MANAGER", None), ("PM-05", "PROJECT_MANAGER", None), ("PM-06", "PROJECT_MANAGER", None),
            ("PM-07", "PROJECT_MANAGER", None), ("PM-08", "PROJECT_MANAGER", None), ("PM-09", "PROJECT_MANAGER", None),
            ("SR-01", "SALES_REP", None), ("SR-02", "SALES_REP", None), ("SR-03", "SALES_REP", date(2025, 11, 30)),
            ("SR-04", "SALES_REP", None), ("SR-05", "SALES_REP", None), ("SR-06", "SALES_REP", None)]
    hires_late = {"PM-09": date(2025, 5, 1), "SR-06": date(2025, 12, 15)}
    regions = ["NORTH_AMERICA", "NORTH_AMERICA", "EMEA", "NORTH_AMERICA", "APAC", "LATAM", "NORTH_AMERICA"]
    T["dim_owner"] = []
    for k, (code, role, term) in enumerate(spec):
        hire = hires_late.get(code) or date(2019, 1, 1) + timedelta(days=int(rng.integers(0, 365 * 4 + 200)))
        T["dim_owner"].append(mk("dim_owner", owner_id=f"OWN-{k + 1:03d}", owner_code=code, role=role, region=regions[k % len(regions)],
                                 weekly_capacity_hours=38.0 if role == "PROJECT_MANAGER" else None, hire_date=iso(hire),
                                 termination_date=iso(term), is_active=term is None))
    return T


def build_clients(T):
    rng = gen(2)
    owners = T["dim_owner"]
    ams = [o for o in owners if o["role"] == "ACCOUNT_MANAGER" and o["is_active"]]
    verts = [v for v, c in VERT_COUNTS for _ in range(c)]
    pre_idx = rng.permutation(len(PREFIXES))[:60]
    rank_w = np.arange(1, 61) ** -0.8
    perm = rng.permutation(60)
    ranks = list(perm)
    strategic = [i for i in range(60) if ranks[i] < 8]
    cand = [i for i in range(60) if ranks[i] >= 8]
    new_ids = set(int(x) for x in rng.choice(cand, 15, replace=False))
    churn_pool = [i for i in cand if i not in new_ids]
    churn_ids = set(int(x) for x in rng.choice(churn_pool, 8, replace=False))
    clients = []
    for i in range(60):
        v = verts[i]
        tier = "STRATEGIC" if ranks[i] < 8 else ("GROWTH" if ranks[i] < 28 else "STANDARD")
        region = ENUMS["region"][int(rng.choice(4, p=[.72, .12, .10, .06]))]
        cur = "USD" if region != "EMEA" else ("EUR" if rng.random() < .6 else "GBP")
        if i in new_ids:
            ob = date(2024, 3, 1) + timedelta(days=int(rng.integers(0, 790)))
        else:
            ob = date(2019, 1, 1) + timedelta(days=int(rng.integers(0, 365 * 5 - 1)))
        churn = mend(int(rng.integers(8, 29))) if i in churn_ids else None
        g = float(rng.normal(.12, .05)) if tier == "STRATEGIC" else (float(rng.normal(-.04, .05)) if i in churn_ids else float(rng.normal(.10, .09)))
        ctype = ("MSA_MULTI_YEAR" if rng.random() < .7 else "MSA_ANNUAL") if tier == "STRATEGIC" else ("MSA_ANNUAL" if rng.random() < .65 else "PAY_AS_YOU_GO")
        if churn:
            cend = churn
        elif ctype == "PAY_AS_YOU_GO":
            cend = None
        else:
            yrs = 3 if ctype == "MSA_MULTI_YEAR" else 1
            cend = date(ob.year + yrs, ob.month, min(ob.day, 28))
            while cend <= AS_OF:
                cend = date(cend.year + yrs, cend.month, cend.day)
        terms = C.PAYMENT_TERMS_DAYS[tier]
        am = ams[int(rng.integers(0, len(ams)))]
        name = f"{PREFIXES[int(pre_idx[i])]} {SUFFIX[v][int(rng.integers(0, len(SUFFIX[v])))]}"
        summary = (f"{ctype.replace('_', ' ').title()}; net-{terms}; billed in {cur}; "
                   + (f"ended {iso(cend)}" if churn else (f"renews {iso(cend)}" if cend else "no fixed term")))
        slip = float(rng.normal(18, 6)) if i in churn_ids else float(rng.normal(3, 6))
        clients.append(dict(i=i, client_id=f"CL-{i + 1:04d}", name=name, vertical=v, region=region, tier=tier, bu=VERT[v]["bu"], am=am["owner_id"],
                            cur=cur, ctype=ctype, ob=ob, churn=churn, cend=cend, size=float(rank_w[ranks[i]]), growth=g, terms=terms,
                            new=i in new_ids, churned=i in churn_ids, slip=slip, summary=summary,
                            sl_mix=norm(rng.dirichlet(np.array(VERT[v]["sl"]) * 25 + .5)),
                            mod_mix=norm(rng.dirichlet(np.array([.58, .30, .12]) * 20 + .5)),
                            dom_p=norm([VERT[v]["dom"].get(d, 0) for d in DOMAINS])))
    clients.sort(key=lambda c: c["client_id"])
    T["dim_client"] = [mk("dim_client", client_id=c["client_id"], client_name=c["name"], vertical=c["vertical"], region=c["region"], tier=c["tier"],
                          business_unit=c["bu"], account_manager_id=c["am"], billing_currency=c["cur"], contract_type=c["ctype"],
                          contract_start_date=iso(c["ob"]), contract_end_date=iso(c["cend"]), onboarding_date=iso(c["ob"]),
                          churn_date=iso(c["churn"]), contract_summary=c["summary"]) for c in clients]
    return clients


def build_activity(clients):
    """Monthly activity multipliers: aw (written), ai (interpretation); index mi+1 (mi = -1..N-1)."""
    rng = gen(3)
    aw = np.zeros((len(clients), N + 1))
    ai = np.zeros((len(clients), N + 1))
    for ci, c in enumerate(clients):
        ob_idx = midx(c["ob"])
        ch_idx = midx(c["churn"]) if c["churn"] else None
        vw, vi = VERT[c["vertical"]]["w"], VERT[c["vertical"]]["i"]
        for mi in range(-1, N):
            noise_w, noise_i = math.exp(float(rng.normal(0, .15))), math.exp(float(rng.normal(0, .12)))
            if mi < ob_idx:
                continue
            age = mi - ob_idx
            ramp = 1.0 if (c["ob"] < date(2024, 1, 1)) else min(1.0, .35 + .65 * age / 6)
            if age == 0:
                dim = calendar.monthrange(*ym(mi))[1]
                ramp *= max(.1, (dim - c["ob"].day + 1) / dim)
            wind = 1.0
            if ch_idx is not None:
                if mi > ch_idx:
                    continue
                wind = min(1.0, .35 + .65 * (ch_idx - mi) / 3)
            trend = (1 + c["growth"]) ** ((mi + 1) / 12)
            y, m = ym(mi)
            base = c["size"] * trend * ramp * wind
            aw[ci, mi + 1] = base * vw * SEAS_W[m - 1] * noise_w
            ai[ci, mi + 1] = base * vi * SEAS_I[m - 1] * noise_i
    return aw, ai


# ------------------------------------------------------------------ stage 2: written work
def build_written(T, clients, aw):
    rng = gen(4)
    owners = T["dim_owner"]
    pms = [(o["owner_id"], date.fromisoformat(o["hire_date"]), date.fromisoformat(o["termination_date"]) if o["termination_date"] else None)
           for o in owners if o["role"] == "PROJECT_MANAGER"]
    PS = TARGET_PROJECTS / float(aw.sum())
    projects, batches = [], []
    sl_names = ["TRANSLATION", "LOCALIZATION", "ALT_FORMAT"]
    for ci, c in enumerate(clients):
        for mi in range(-1, N):
            a = aw[ci, mi + 1]
            if a <= 0:
                continue
            dim = calendar.monthrange(*ym(mi))[1]
            n = int(rng.poisson(PS * a))
            min_day = c["ob"].day - 1 if (midx(c["ob"]) == mi and c["ob"] >= date(2024, 1, 1)) else 0
            for _ in range(n):
                start = mstart(mi) + timedelta(days=int(rng.integers(min_day, dim)))
                sl = sl_names[int(rng.choice(3, p=c["sl_mix"]))]
                domain = DOMAINS[int(rng.choice(len(DOMAINS), p=c["dom_p"]))]
                act_pms = [p for p in pms if p[1] <= start and (p[2] is None or p[2] >= start)]
                pm = act_pms[int(rng.integers(0, len(act_pms)))][0]
                k = int(rng.choice(4, p=[.5, .25, .15, .10])) + 1
                lps = [int(x) for x in rng.choice(len(LPS), size=k, replace=False, p=LP_W)]
                pj = dict(key=len(projects), ci=ci, client_id=c["client_id"], sl=sl, domain=domain, pm=pm, start=start,
                          name=f"{PROJ_WORDS[int(rng.integers(0, len(PROJ_WORDS)))]} {mid(mi)}")
                projects.append(pj)
                frac = max(0.0, (mi + 1) / N)
                for lp in lps:
                    words = int(np.clip(rng.lognormal(math.log(5200), .9), 300, 120000))
                    words = int(words * (.6 if sl == "ALT_FORMAT" else (.8 if sl == "LOCALIZATION" else 1.0)))
                    tier = LP_TIER[lp]
                    p_ai = C.SIM["workflow_ai_share_start"] + (C.SIM["workflow_ai_share_end"] - C.SIM["workflow_ai_share_start"]) * frac
                    p_ai *= DOMAIN_AI[domain] * (1.15 if tier == "HIGH" else (.5 if tier == "LOW" else 1.0)) * (.7 if sl == "LOCALIZATION" else 1.0)
                    p_ai = 0.0 if sl == "ALT_FORMAT" else float(np.clip(p_ai, 0, .85))
                    if rng.random() < p_ai:
                        wf = "MTPE" if rng.random() < C.SIM["mtpe_fraction_of_ai"] else "AIR"
                    else:
                        wf = "HT"
                    tm_mean = {"TECHNICAL": .35, "MARKETING": .12}.get(domain, .22) + .0015 * (mi + 1)
                    tm = int(words * float(np.clip(rng.beta(4, 4 / tm_mean - 4), 0, .85)))
                    planned = max(2, math.ceil(words / (3200 if wf == "HT" else 5000)) + 1)
                    due_days = planned + 1
                    p_late = (.045 + (.05 if tier == "LOW" else (.025 if tier == "MEDIUM" else 0)) + (.04 if words > 30000 else 0)
                              + .03 * (1 - frac) + (-.01 if wf == "AIR" else 0))
                    if rng.random() < p_late:
                        actual = due_days + int(rng.integers(1, 5))
                    else:
                        actual = max(1, int(round(planned * float(rng.uniform(.5, 1.0)))))
                    bstart = start + timedelta(days=int(rng.integers(0, 4)))
                    delivered = bstart + timedelta(days=actual)
                    batches.append(dict(pkey=pj["key"], lp=lp, wf=wf, cat=ENUMS["cat_tool"][int(rng.choice(4, p=[.45, .3, .15, .1]))], words=words,
                                        tm=tm, start=bstart, due=bstart + timedelta(days=due_days), delivered=delivered if delivered <= AS_OF else None,
                                        actual=actual, rejected=bool(rng.random() < (.012 + (.03 if tier == "LOW" else 0) + (.01 if wf == "AIR" else 0)))))
    # drop pre-2024 deliveries, keep batches in dataset window
    batches = [b for b in batches if not (b["delivered"] is not None and b["delivered"] < date(2024, 1, 1))]
    used = set(b["pkey"] for b in batches)
    projects = [p for p in projects if p["key"] in used]
    byp = {}
    for b in batches:
        byp.setdefault(b["pkey"], []).append(b)
    for p in projects:
        bs = byp[p["key"]]
        p["start"] = min(b["start"] for b in bs)
        p["due"] = max(b["due"] for b in bs)
        done = all(b["delivered"] is not None for b in bs)
        p["delivered"] = max(b["delivered"] for b in bs) if done else None
        words = sum(b["words"] for b in bs)
        p["pm_hours"] = rf(1.45 * float(np.clip(6 + .0011 * words, 4, 90)) * math.exp(float(rng.normal(0, .15))), 1)
    projects.sort(key=lambda p: (p["start"], p["client_id"], p["key"]))
    for i, p in enumerate(projects):
        p["pid"] = f"PRJ-{i + 1:06d}"
    pid_of = {p["key"]: p["pid"] for p in projects}
    batches.sort(key=lambda b: (b["start"], pid_of[b["pkey"]], b["lp"]))
    for i, b in enumerate(batches):
        b["bid"] = f"TRB-{i + 1:06d}"
        b["pid"] = pid_of[b["pkey"]]
        if b["delivered"] is None:
            span = max(1, b["actual"])
            b["pct"] = float(min(.97, max(.03, (AS_OF - b["start"]).days / span)))
            b["stage"] = ("TRANSLATION" if b["pct"] < .45 else "EDITING" if b["pct"] < .7 else "PROOFREADING" if b["pct"] < .85 else "QA")
            b["rejected"] = False
        else:
            b["pct"] = 1.0
            b["stage"] = "DELIVERY"
    return projects, batches


# ------------------------------------------------------------------ stage 3: interpretation
def build_sessions(clients, ai_act):
    rng = gen(5)
    SS = TARGET_SESSIONS / float(ai_act.sum())
    lp_w_int = norm(LP_W ** .9)
    sessions = []
    dwk = {0: [1, 1, 1, 1, 1, .45, .35], 1: [1, 1, 1, 1, 1, .2, .1], 2: [1, 1, 1, 1, 1, .02, .01]}
    hw = {0: norm([.25, .2, .18, .18, .2, .3, .5, .8, 1, 1, 1, 1, .95, 1, 1, .95, .9, .75, .6, .5, .45, .4, .35, .3]),
          1: norm([.01] * 7 + [.4, .9, 1, 1, 1, .9, 1, 1, .9, .8, .5, .25] + [.02] * 5),
          2: norm([.01] * 7 + [.15, .9, 1, 1, .9, .7, .9, .8, .5, .2] + [.01] * 7)}
    mods = ["OPI", "VRI", "ONSITE"]
    base_unf = {0: .02, 1: .035, 2: .05}
    tier_fac = np.array([{"HIGH": 1.0, "MEDIUM": 1.8, "LOW": 3.5}[t] for t in LP_TIER])
    conn_fac = np.array([{"HIGH": 1.0, "MEDIUM": 1.6, "LOW": 2.8}[t] for t in LP_TIER])
    for ci, c in enumerate(clients):
        for mi in range(0, N):
            a = ai_act[ci, mi + 1]
            if a <= 0:
                continue
            n = int(rng.poisson(SS * a))
            if n == 0:
                continue
            dim = calendar.monthrange(*ym(mi))[1]
            mod = rng.choice(3, size=n, p=c["mod_mix"])
            lp = rng.choice(len(LPS), size=n, p=lp_w_int)
            day = np.zeros(n, dtype=int)
            hour = np.zeros(n, dtype=int)
            min_day = c["ob"].day - 1 if (midx(c["ob"]) == mi and c["ob"] >= date(2024, 1, 1)) else 0
            for k in range(3):
                idx = np.where(mod == k)[0]
                if len(idx) == 0:
                    continue
                w = norm([dwk[k][(mstart(mi) + timedelta(days=d)).weekday()] * (1 if d >= min_day else 0) for d in range(dim)])
                day[idx] = rng.choice(dim, size=len(idx), p=w)
                hour[idx] = rng.choice(24, size=len(idx), p=hw[k])
            on_demand = np.where(mod == 0, rng.random(n) < .88, np.where(mod == 1, rng.random(n) < .6, False))
            p_unf = np.array([base_unf[int(m)] for m in mod]) * tier_fac[lp] * np.where((mod == 0) & (hour < 6), 1.35, 1.0)
            status = np.full(n, "FULFILLED", dtype=object)
            u1, u2, u3 = rng.random(n), rng.random(n), rng.random(n)
            status[u1 < p_unf] = "UNFULFILLED"
            can = (status == "FULFILLED") & (u2 < np.where(on_demand, .03, .07))
            status[can] = "CANCELLED_BY_CLIENT"
            tech = (status == "FULFILLED") & (mod == 1) & (u3 < .025)
            status[tech] = "TECH_FAILURE"
            ful = status == "FULFILLED"
            connect = np.where(on_demand & ful & (mod < 2),
                               np.clip(np.where(mod == 0, 24.0, 38.0) * conn_fac[lp] * np.where(hour < 6, 1.3, 1.0)
                                       * np.exp(rng.normal(0, .55, n)), 3, 600), np.nan)
            dur_raw = np.where(mod == 0, np.exp(rng.normal(math.log(9), .65, n)).clip(1, 90),
                               np.where(mod == 1, np.exp(rng.normal(math.log(19), .55, n)).clip(3, 120),
                                        (np.exp(rng.normal(math.log(100), .45, n)).clip(30, 480) / 15).round() * 15))
            dur = np.where(ful, np.maximum(1, np.round(dur_raw)), 0).astype(int)
            rated = ful & (rng.random(n) < .35)
            rating = rng.choice([5, 4, 3, 2, 1], size=n, p=[.5, .3, .12, .05, .03])
            for j in range(n):
                sessions.append(dict(ci=ci, cid=c["client_id"], sl=mods[int(mod[j])], lp=int(lp[j]), date=mstart(mi) + timedelta(days=int(day[j])),
                                     hour=int(hour[j]), rtype="ON_DEMAND" if on_demand[j] else "SCHEDULED", status=str(status[j]),
                                     connect=None if math.isnan(connect[j]) else rf(connect[j], 1), dur=int(dur[j]),
                                     rating=int(rating[j]) if rated[j] else None))
    sessions.sort(key=lambda s: (s["date"], s["hour"], s["cid"], s["sl"], s["lp"]))
    for i, s in enumerate(sessions):
        s["sid"] = f"INT-{i + 1:06d}"
    return sessions


# ------------------------------------------------------------------ stage 4: resources
def build_resources(clients, batches, sessions):
    rng = gen(6)
    w0 = date(2026, 6, 29)
    weeks = [w0 + timedelta(weeks=k) for k in range(13)]
    wset = set(weeks)
    D = np.zeros(len(LPS))
    for b in batches:
        if monday(b["start"]) in wset:
            D[b["lp"]] += b["words"]
    D /= 13.0
    DM = np.zeros(len(LPS))
    for s in sessions:
        if s["status"] == "FULFILLED" and monday(s["date"]) in wset:
            DM[s["lp"]] += s["dur"]
    DM /= 13.0
    constrained = {"AM": 1.02, "SO": .98, "HT": .95, "NE": .93, "FA": .92, "UR": .90}
    internal_ling = {"ES": 3, "ZH": 2, "FR": 1, "PT": 1, "DE": 1, "RU": 1, "VI": 1}
    internal_int = {"ES": 3, "ZH": 1, "VI": 1, "AR": 1, "RU": 1, "FR": 1, "PT": 1, "KO": 1}
    res, bridge = [], []
    dom_p = norm([.30, .15, .10, .10, .15, .10, .10])
    regions = ENUMS["region"]
    S_needed = {}

    def onboard_dates(anchor):
        if anchor:
            return date(2021, 1, 1) + timedelta(days=int(rng.integers(0, 900)))
        if rng.random() < .55:
            return date(2022, 1, 1) + timedelta(days=int(rng.integers(0, 730)))
        return date(2024, 2, 1) + timedelta(days=int(rng.integers(0, 940)))

    def app_date(onb):
        frac = min(1.0, max(0.0, (onb - date(2024, 1, 1)).days / 975.0))
        mu = 38 - 11 * frac
        return onb - timedelta(days=int(np.clip(rng.normal(mu, 9), 8, 70)))

    ling_idx = 0
    for lp in range(len(LPS)):
        code, tier = LP_CODE[lp], LP_TIER[lp]
        L = constrained.get(code) or float(rng.uniform(.70, .88))
        S_needed[lp] = D[lp] / L
        n = max(4, int(round(S_needed[lp] / 3200)))
        n_int = internal_ling.get(code, 0)
        group = []
        for k in range(n):
            internal = k < n_int
            anchor = k < 3
            cap = float(rng.uniform(16000, 22000) if internal else rng.uniform(7000, 15000))
            w = 2.0 if internal else float(rng.uniform(.5, 1.5))
            onb = onboard_dates(anchor)
            term = None
            if not anchor and not internal and rng.random() < .12:
                lo = max(onb + timedelta(days=120), date(2024, 6, 1))
                if lo < date(2026, 8, 31):
                    term = lo + timedelta(days=int(rng.integers(0, (date(2026, 8, 31) - lo).days)))
            ling_idx += 1
            dom = DOMAINS[int(rng.choice(len(DOMAINS), p=dom_p))]
            group.append(dict(idx=ling_idx, lp=lp, internal=internal, cap=cap, w=w, onb=onb, term=term, dom=dom,
                              q=rf(float(np.clip(rng.normal(93 if internal else 91, 3.2), 78, 99.5)), 1),
                              rate=rf(1.16 * RATE_WORD[tier] * float(rng.uniform(.9, 1.1)) * (.85 if internal else 1.0), 4)))
        sw = sum(g["w"] for g in group)
        for g in group:
            g["avail"] = rf(float(np.clip(S_needed[lp] * g["w"] / sw / g["cap"], .03, .95)), 3)
        res.extend(group)
    # make two internal linguists leave (non-anchors are not guaranteed, so use later-indexed internals)
    internals = [g for g in res if g["internal"]]
    for g in internals[-2:]:
        g["term"] = date(2026, 3, 31) if g is internals[-1] else date(2025, 11, 14)
    n_ling = len(res)
    linguists = list(res)
    res = []
    for g in linguists:
        res.append(dict(g, kind="LING", rtype="INTERNAL_LINGUIST" if g["internal"] else "FREELANCE_LINGUIST", mins=None))
    # interpreters
    int_idx = 0
    interpreters = []
    for lp in range(len(LPS)):
        code = LP_CODE[lp]
        n = max(4, int(math.ceil(DM[lp] / 700.0)))
        n_int = internal_int.get(code, 0)
        for k in range(n):
            internal = k < n_int
            onb = onboard_dates(k < 3)
            term = None
            if k >= 3 and not internal and rng.random() < .12:
                lo = max(onb + timedelta(days=120), date(2024, 6, 1))
                if lo < date(2026, 8, 31):
                    term = lo + timedelta(days=int(rng.integers(0, (date(2026, 8, 31) - lo).days)))
            int_idx += 1
            dom = DOMAINS[int(rng.choice(len(DOMAINS), p=dom_p))]
            interpreters.append(dict(idx=n_ling + int_idx, lp=lp, internal=internal, kind="INT", cap=None, mins=int(rng.uniform(1800, 2400) if internal else rng.uniform(600, 1800)),
                                     onb=onb, term=term, dom=dom, avail=rf(float(rng.uniform(.3, .8)), 3),
                                     q=rf(float(np.clip(rng.normal(93 if internal else 91, 3.2), 78, 99.5)), 1),
                                     rate=rf(1.16 * float(rng.uniform(.46, .62)) * (.9 if internal else 1.0), 3),
                                     rtype="INTERNAL_INTERPRETER" if internal else "FREELANCE_INTERPRETER"))
    ints_i = [g for g in interpreters if g["internal"]]
    ints_i[-1]["term"] = date(2026, 1, 31)
    res.extend(interpreters)
    # codes, dates and rows
    T_res, T_br = [], []
    li = ii = 0
    for g in res:
        if g["kind"] == "LING":
            li += 1
            code = f"L-{li:04d}"
        else:
            ii += 1
            code = f"I-{ii:04d}"
        g["rid"] = f"RES-{g['idx']:04d}"
        g["app"] = app_date(g["onb"])
        T_res.append(mk("dim_resource", resource_id=g["rid"], anon_code=code, resource_type=g["rtype"], region=regions[int(rng.choice(4, p=[.45, .15, .2, .2]))],
                        primary_domain=g["dom"], certification_label=f"{g['dom'].title()} specialist (fictional)", application_date=iso(g["app"]),
                        onboarded_date=iso(g["onb"]), termination_date=iso(g["term"]), is_active=g["term"] is None, quality_score=g["q"],
                        availability=g["avail"], weekly_capacity_words=int(g["cap"]) if g["cap"] else None,
                        weekly_capacity_minutes=g["mins"], rate_per_word_usd=g["rate"] if g["kind"] == "LING" else None,
                        rate_per_minute_usd=g["rate"] if g["kind"] == "INT" else None))
        T_br.append(mk("bridge_resource_language", resource_id=g["rid"], lp_id=LP_ID[g["lp"]], expertise_domain=g["dom"], is_primary=True))
        g["lps"] = [g["lp"]]
        extra = (1 if rng.random() < .3 else 0) if g["kind"] == "LING" else (int(rng.integers(0, 3)) if rng.random() < .4 else 0)
        if extra:
            others = [x for x in range(len(LPS)) if x != g["lp"]]
            pw = norm([LP_W[x] for x in others])
            for x in rng.choice(others, size=extra, replace=False, p=pw):
                g["lps"].append(int(x))
                T_br.append(mk("bridge_resource_language", resource_id=g["rid"], lp_id=LP_ID[int(x)], expertise_domain=g["dom"], is_primary=False))
    return res, T_res, T_br, D


# ------------------------------------------------------------------ stage 5: assignments, finance, quality, AI
def month_of(d):
    return f"{d.year}-{d.month:02d}"


def assign_and_cost(rng, clients, projects, batches, sessions, res):
    cmap = {c["client_id"]: c for c in clients}
    pmap = {p["pid"]: p for p in projects}
    ling_pool = {lp: [] for lp in range(len(LPS))}
    int_pool = {lp: [] for lp in range(len(LPS))}
    for g in res:
        for lp in g["lps"]:
            (ling_pool if g["kind"] == "LING" else int_pool)[lp].append(g)

    def active(pool, d):
        out = [g for g in pool if g["onb"] <= d and (g["term"] is None or g["term"] >= d)]
        return out or pool

    assignments = []
    for b in batches:
        used = set()
        vendor = 0.0
        b["resources"] = []
        for role, fac in ROLE_FACTORS[b["wf"]]:
            cands = active(ling_pool[b["lp"]], b["start"])
            fresh = [g for g in cands if g["rid"] not in used] or cands
            k = 2 if (b["words"] > 25000 and len(fresh) >= 2) else 1
            wts = norm([g["q"] ** 3 for g in fresh])
            chosen = [fresh[int(i)] for i in rng.choice(len(fresh), size=k, replace=False, p=wts)]
            if k == 2:
                first = int(b["words"] * float(rng.uniform(.4, .7)))
                parts = [first, b["words"] - first]
            else:
                parts = [b["words"]]
            for g, wds in zip(chosen, parts):
                used.add(g["rid"])
                assignments.append(dict(bid=b["bid"], rid=g["rid"], role=role, words=wds, date=min(AS_OF, b["start"] + timedelta(days=int(rng.integers(0, 2))))))
                vendor += wds * g["rate"] * fac
                b["resources"].append((g["anon"] if "anon" in g else g["rid"], role, wds))
        b["vendor"] = vendor
    for i, a in enumerate(assignments):
        a["aid"] = f"ASG-{i + 1:06d}"
    # interpreters on fulfilled sessions + pay
    for s in sessions:
        s["iid"], s["pay"] = None, 0.0
        if s["status"] == "FULFILLED":
            cands = active(int_pool[s["lp"]], s["date"])
            wts = norm([g["q"] ** 2 for g in cands])
            g = cands[int(rng.choice(len(cands), p=wts))]
            s["iid"] = g["rid"]
            s["pay"] = s["dur"] * g["rate"] * LANG_PAY_FAC[LP_TIER[s["lp"]]] * (1.35 if s["sl"] == "ONSITE" else 1.0)
    return assignments


def build_finance(rng, clients, projects, batches, sessions):
    cmap = {c["client_id"]: c for c in clients}
    pmap = {p["pid"]: p for p in projects}
    fx = C.FX_USD_PER_UNIT
    rev, cost = [], []
    # written revenue per delivered batch
    for b in batches:
        if b["delivered"] is None:
            b["est_rev"] = b["words"] * PRICE_WORD[LP_TIER[b["lp"]]] * DOMAIN_PRICE[pmap[b["pid"]]["domain"]] * SL_PRICE[pmap[b["pid"]]["sl"]] * WF_PRICE[b["wf"]] * TIER_DISC[cmap[pmap[b["pid"]]["client_id"]]["tier"]]
            continue
        p = pmap[b["pid"]]
        c = cmap[p["client_id"]]
        price = (PRICE_WORD[LP_TIER[b["lp"]]] * DOMAIN_PRICE[p["domain"]] * SL_PRICE[p["sl"]] * WF_PRICE[b["wf"]] * TIER_DISC[c["tier"]]
                 * float(np.clip(rng.normal(1, .03), .9, 1.1)))
        usd = b["words"] * price
        f = fx[c["cur"]]
        orig = r2(usd / f)
        rev.append(dict(kind="W", cid=c["client_id"], pid=b["pid"], bid=b["bid"], month=month_of(b["delivered"]), sl=p["sl"], lp=b["lp"], wf=b["wf"],
                        units=b["words"], cur=c["cur"], orig=orig, fx=f, usd=r2(orig * f), b=b, c=c))
    # interpretation revenue per client x month x modality
    groups = {}
    for s in sessions:
        if s["status"] != "FULFILLED":
            continue
        k = (s["cid"], month_of(s["date"]), s["sl"])
        g = groups.setdefault(k, dict(minutes=0, usd=0.0, pay=0.0, plat=0.0))
        g["minutes"] += s["dur"]
        c = cmap[s["cid"]]
        g["usd"] += s["dur"] * PRICE_MIN[s["sl"]] * LANG_PRICE_FAC[LP_TIER[s["lp"]]] * TIER_DISC[c["tier"]]
        g["pay"] += s["pay"]
        g["plat"] += s["dur"] * PLATFORM_RATE[s["sl"]]
    for (cid, month, sl), g in groups.items():
        c = cmap[cid]
        f = fx[c["cur"]]
        orig = r2(g["usd"] / f)
        rev.append(dict(kind="I", cid=cid, pid=None, bid=None, month=month, sl=sl, lp=None, wf=None, units=int(g["minutes"]), cur=c["cur"],
                        orig=orig, fx=f, usd=r2(orig * f), g=g, c=c))
    rev.sort(key=lambda r: (r["month"], r["cid"], r["sl"], r["bid"] or ""))
    for i, r in enumerate(rev):
        r["rid"] = f"REV-{i + 1:06d}"
    # direct costs
    costs = []
    tool_factor = None
    for r in rev:
        if r["kind"] == "W":
            b = r["b"]
            costs.append((r["month"], "VENDOR_LINGUIST", r["rid"], r["sl"], b["vendor"]))
            if b["wf"] != "HT":
                costs.append((r["month"], "MT_AI_TOOLING", r["rid"], r["sl"], b["words"] * C.ASSUMPTIONS["tooling_cost_per_ai_word_usd"] * b.get("tool_f", 1.0)))
            costs.append((r["month"], "PM_DISPATCH_LABOR", r["rid"], r["sl"], r["usd"] * C.ASSUMPTIONS["pm_labor_pct_written"] * float(np.clip(rng.normal(1, .08), .8, 1.2))))
        else:
            g = r["g"]
            costs.append((r["month"], "INTERPRETER_PAY", r["rid"], r["sl"], g["pay"]))
            costs.append((r["month"], "PLATFORM_TELECOM", r["rid"], r["sl"], g["plat"] * float(np.clip(rng.normal(1, .05), .85, 1.15))))
            costs.append((r["month"], "PM_DISPATCH_LABOR", r["rid"], r["sl"], r["usd"] * C.ASSUMPTIONS["dispatch_labor_pct_interp"] * float(np.clip(rng.normal(1, .08), .8, 1.2))))
    # opex and D&A
    mrev = {mid(i): 0.0 for i in range(N)}
    for r in rev:
        mrev[r["month"]] += r["usd"]
    series = [mrev[mid(i)] for i in range(N)]
    for i in range(N):
        a3 = float(np.mean(series[max(0, i - 2):i + 1]))
        a6 = float(np.mean(series[max(0, i - 5):i + 1]))
        for cat, pct in (("SALES_MARKETING", .095), ("TECHNOLOGY_PRODUCT", .075), ("GENERAL_ADMIN", .115)):
            costs.append((mid(i), cat, None, None, a3 * pct * float(np.clip(rng.normal(1, .03), .92, 1.08))))
        costs.append((mid(i), "DEPRECIATION_AMORTIZATION", None, None, a6 * .022))
    return rev, costs


def build_invoices(rng, clients, rev):
    cmap = {c["client_id"]: c for c in clients}
    fx = C.FX_USD_PER_UNIT
    agg = {}
    for r in rev:
        k = (r["cid"], r["month"], r["sl"])
        agg[k] = agg.get(k, 0.0) + r["orig"]
    lines = []
    for (cid, month, sl), orig in sorted(agg.items()):
        y, m = int(month[:4]), int(month[5:])
        inv_date = date(y + (m == 12), 1 if m == 12 else m + 1, 3)
        if inv_date > AS_OF:
            continue
        u = rng.random()
        adj = 0.0 if u < .93 else (-float(rng.uniform(.01, .05)) if u < .97 else float(rng.uniform(.005, .03)))
        c = cmap[cid]
        amt = r2(orig * (1 + adj))
        lines.append(dict(cid=cid, month=month, sl=sl, inv_date=inv_date, due=inv_date + timedelta(days=c["terms"]), cur=c["cur"], amt=amt,
                          fx=fx[c["cur"]], usd=r2(amt * fx[c["cur"]]), adj=rf(adj, 4)))
    lines.sort(key=lambda l: (l["inv_date"], l["cid"], l["sl"]))
    inv_no = {}
    for i, l in enumerate(lines):
        l["lid"] = f"INVL-{i + 1:06d}"
        key = (l["cid"], l["month"])
        if key not in inv_no:
            inv_no[key] = f"INV-{len(inv_no) + 1:06d}"
        l["inv"] = inv_no[key]
    byinv = {}
    for l in lines:
        byinv.setdefault(l["inv"], []).append(l)
    pays, bridge = [], []
    for inv, ls in byinv.items():
        c = cmap[ls[0]["cid"]]
        delay = int(max(7, round(c["terms"] + c["slip"] + float(rng.normal(0, 8)))))
        pdate = ls[0]["inv_date"] + timedelta(days=delay)
        if pdate > AS_OF:
            continue
        short = rng.random() < .02
        allocs = []
        for j, l in enumerate(ls):
            if short and j == 0:
                ao = r2(l["amt"] * .95)
                au = r2(ao * l["fx"])
            else:
                ao, au = l["amt"], l["usd"]
            allocs.append((l, ao, au))
        pays.append(dict(cid=c["client_id"], date=pdate, cur=c["cur"], orig=r2(sum(a[1] for a in allocs)), usd=r2(sum(a[2] for a in allocs)), allocs=allocs))
    pays.sort(key=lambda p: (p["date"], p["cid"]))
    for i, p in enumerate(pays):
        p["pid"] = f"PAY-{i + 1:06d}"
    return lines, pays


def build_quality(rng, clients, projects, batches, res):
    resmap = {g["rid"]: g for g in res}
    batch_primary = {}
    evals, errors = [], []
    pmap = {p["pid"]: p for p in projects}
    for b in batches:
        pass
    th = C.THRESHOLDS
    cats = ENUMS["error_category"]
    cat_p = norm([.27, .2, .2, .12, .1, .06, .05])
    crit_p = norm([.4, .05, .1, .0, .05, .1, .3])
    n = 0
    for b in batches:
        if b["delivered"] is None:
            continue
        pe = .45 if b["wf"] != "HT" else .30
        if rng.random() > pe:
            continue
        ed = b["delivered"] + timedelta(days=int(rng.integers(1, 11)))
        if ed > AS_OF:
            continue
        g_rid = None
        # primary linguist = first assignment resource for the main role
        g_rid = b["resources"][0][0] if b["resources"] else None
        b["eval_rid"] = g_rid
        n += 1
        q = resmap[g_rid]["q"] if g_rid in resmap else 91.0
        scale = max(.4, (100 - q) / 9.0) * (1.15 if b["wf"] == "MTPE" else 1.0)
        sample = int(min(b["words"], rng.choice([1000, 1500, 2000])))
        lam = sample / 1000.0
        minor = int(rng.poisson(3.0 * scale * lam))
        major = int(rng.poisson(.30 * scale * lam))
        crit = int(rng.poisson(.02 * scale * lam))
        pen = (minor * th["quality_penalty_minor"] + major * th["quality_penalty_major"] + crit * th["quality_penalty_critical"]) * th["quality_norm_words"] / sample
        score = rf(max(0.0, 100 - pen), 2)
        outcome = "PASS" if (score >= th["quality_pass_score"] and crit == 0) else "FAIL"
        age = (AS_OF - ed).days
        if outcome == "FAIL":
            dispute = "NONE" if rng.random() > .25 else ("OPEN" if (rng.random() < .6 and age < 90) else "RESOLVED")
            action = ["COACHING", "RETRAINING", "TERMINOLOGY_UPDATE", "PROCESS_FIX"][int(rng.integers(0, 4))]
            status = "CLOSED" if rng.random() < (.8 if age > 60 else .45) else "OPEN"
        else:
            dispute = "RESOLVED" if rng.random() < .01 else "NONE"
            action, status = "NONE_REQUIRED", "NA"
        evals.append(dict(eid=f"QE-{n:05d}", bid=b["bid"], rid=g_rid, evaluator=f"EV-{int(rng.integers(1, 13)):02d}", date=ed, sample=sample,
                          crit=crit, major=major, minor=minor, score=score, outcome=outcome, dispute=dispute, action=action, cstatus=status))
        sev_list = ["CRITICAL"] * crit + ["MAJOR"] * major + ["MINOR"] * minor
        for sev in sev_list:
            p = crit_p if sev == "CRITICAL" else cat_p
            errors.append(dict(eid=evals[-1]["eid"], cat=cats[int(rng.choice(len(cats), p=p))], sev=sev))
    for i, e in enumerate(errors):
        e["xid"] = f"ERR-{i + 1:06d}"
    return evals, errors


def build_ai(rng, batches, projects):
    pmap = {p["pid"]: p for p in projects}
    out = []
    A = C.ASSUMPTIONS
    eng_tool = {"GENERIC_NMT": .8, "CUSTOM_NMT": 1.0, "LLM_BASED": 1.6, "HYBRID_NMT_LLM": 1.3}
    for b in batches:
        if b["wf"] == "HT" or b["delivered"] is None:
            continue
        frac = max(0.0, midx(b["start"]) / (N - 1))
        w = norm([.35 - .15 * frac, .40, .10 + .20 * frac, .15 - .05 * frac])
        eng = ENUMS["engine_category"][int(rng.choice(4, p=w))]
        dom = pmap[b["pid"]]["domain"]
        sens = "HIGH" if dom in ("MEDICAL", "LEGAL") and rng.random() < .6 else ("MEDIUM" if rng.random() < .5 else "LOW")
        tier = LP_TIER[b["lp"]]
        mean = {"HIGH": .86, "MEDIUM": .80, "LOW": .70}[tier] + {"CUSTOM_NMT": .03, "LLM_BASED": .02, "HYBRID_NMT_LLM": .025, "GENERIC_NMT": 0}[eng] + (.03 if b["wf"] == "AIR" else 0)
        mtqe = float(np.clip(rng.normal(mean, .04), .45, .97))
        share = float(np.clip(1.25 * mtqe - .28 + rng.normal(0, .05), .05, .98))
        accepted = int(b["words"] * share)
        ed = float(np.clip(.55 - .5 * mtqe + rng.normal(0, .04) + (.03 if b["wf"] == "MTPE" else 0), .03, .6))
        base_wph = 650.0 if b["wf"] == "MTPE" else 1000.0
        obs = max(150.0, base_wph * (1 + 1.2 * (mtqe - .8)) * float(rng.normal(1, .1)))
        hours = b["words"] / A["baseline_words_per_hour"] - b["words"] / obs
        b["tool_f"] = eng_tool[eng]
        tool = r2(b["words"] * A["tooling_cost_per_ai_word_usd"] * eng_tool[eng])
        out.append(dict(bid=b["bid"], eng=eng, sens=sens, mtqe=rf(mtqe, 4), acc=accepted, ed=rf(ed, 4), obs=rf(obs, 1), hours=rf(hours, 2),
                        tool=tool, cost=r2(hours * A["review_hourly_cost_usd"] - tool)))
    for i, a in enumerate(out):
        a["aid"] = f"AIB-{i + 1:06d}"
    return out


def build_capacity(rng, batches, res):
    lp_n = len(LPS)
    w0 = date(2026, 6, 29)
    weeks_a = [w0 + timedelta(weeks=k) for k in range(13)]
    weeks_f = [date(2026, 9, 28) + timedelta(weeks=k) for k in range(13)]
    dem = {}
    for b in batches:
        k = (b["lp"], monday(b["start"]))
        dem[k] = dem.get(k, 0) + b["words"]
    ling = [g for g in res if g["kind"] == "LING"]
    rows = []

    def supply(lp, wk):
        tot = 0.0
        for g in ling:
            if g["lp"] != lp:
                continue
            if g["onb"] <= wk + timedelta(days=6) and (g["term"] is None or g["term"] >= wk):
                tot += g["cap"] * g["avail"]
        return tot

    base = {lp: float(np.mean([dem.get((lp, w), 0) for w in weeks_a[-8:]])) for lp in range(lp_n)}
    surge_lp = set(LP_CODE.index(c) for c in C.SEEDED_SURGE["language_codes"])
    n = 0
    for lp in range(lp_n):
        for w in weeks_a:
            d = int(dem.get((lp, w), 0))
            s = int(round(supply(lp, w)))
            n += 1
            rows.append(dict(cid=f"CAP-{n:05d}", lp=lp, week=w, demand=d, supply=s, conf=d, fc=False))
        for k, w in enumerate(weeks_f):
            seas = {9: 1.02, 10: 1.06, 11: 1.0, 12: .9}[w.month]
            if w == date(2026, 11, 23):
                seas = .9
            d = base[lp] * seas * (1.0025 ** (k + 1)) * float(rng.uniform(.95, 1.06))
            if lp in surge_lp and k in C.SEEDED_SURGE["weeks_index"]:
                d *= 1 + C.SEEDED_SURGE["uplift"]
            d = int(round(d))
            sf = 1.0
            if w.month == 12 and w.day >= 7:
                sf = .93
            if w == date(2026, 11, 23):
                sf = .95
            s = int(round(supply(lp, w) * sf * float(rng.uniform(.97, 1.02))))
            conf = int(d * max(.25, .9 - .055 * k) * float(rng.uniform(.93, 1.0)))
            n += 1
            rows.append(dict(cid=f"CAP-{n:05d}", lp=lp, week=w, demand=d, supply=s, conf=min(conf, d), fc=True))
    return rows


def build_telemetry(rng, connectors):
    rows = []
    reqs = {"TMS": 12000, "CRM": 3000, "FINANCE": 1500, "TELEPHONY": 40000, "VIDEO": 9000, "HR": 800, "AI_MT": 20000, "QUALITY": 2000, "DATA": 5000}
    p50 = {"TMS": 120, "CRM": 140, "FINANCE": 220, "TELEPHONY": 60, "VIDEO": 90, "HR": 250, "AI_MT": 180, "QUALITY": 130, "DATA": 200}
    flaky = {"CON-07", "CON-11"}
    n = 0
    start = AS_OF - timedelta(days=89)
    for c in connectors:
        cat = c["category"]
        for d in range(90):
            day = start + timedelta(days=d)
            p_inc = .08 if c["connector_id"] in flaky else .03
            inc = rng.random() < p_inc
            down = int(rng.integers(5, 180)) if inc else 0
            r = int(reqs[cat] * float(rng.uniform(.8, 1.2)) * (.6 if day.weekday() >= 5 else 1.0))
            e_mult = 8 if inc else 1
            m = 2.0 if inc else 1.0
            p50v = p50[cat] * float(rng.uniform(.9, 1.15)) * m
            p95v = p50v * float(rng.uniform(2.4, 3.2))
            p99v = p95v * float(rng.uniform(1.4, 1.9))
            n += 1
            rows.append(dict(tid=f"TEL-{n:06d}", cid=c["connector_id"], date=day, up=1440 - down, req=r,
                             e4=int(r * .004 * e_mult * float(rng.uniform(.6, 1.4))), e5=int(r * .0015 * e_mult * float(rng.uniform(.6, 1.4))),
                             et=int(r * .001 * e_mult * float(rng.uniform(.6, 1.4))), rec=int(r * float(rng.uniform(.3, 3.0))),
                             p50=rf(p50v, 1), p95=rf(p95v, 1), p99=rf(p99v, 1)))
    return rows


def build_opportunities(rng, clients, T):
    owners = [o for o in T["dim_owner"] if o["role"] == "SALES_REP"]
    cmap = {c["client_id"]: c for c in clients}
    new_clients = [c for c in clients if c["new"]]
    stages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"]
    prob = {"LEAD": .10, "QUALIFIED": .25, "PROPOSAL": .45, "NEGOTIATION": .70, "CLOSED_WON": 1.0, "CLOSED_LOST": 0.0}
    loss = ENUMS["loss_reason"]
    loss_p = norm([.32, .18, .14, .12, .16, .08])
    src = ENUMS["lead_source"]
    src_p = norm([.3, .25, .15, .2, .1])
    opps, events = [], []

    def owner_at(d):
        act = [o for o in owners if date.fromisoformat(o["hire_date"]) <= d and (o["termination_date"] is None or date.fromisoformat(o["termination_date"]) >= d)]
        return act[int(rng.integers(0, len(act)))]["owner_id"]

    def make(kind, ptype, name, vert, terr, created, outcome, reach, client_id, value_med, closed=None):
        # reach: furthest stage index reached before close (0..3)
        durs = [int(rng.integers(5, 21)), int(rng.integers(7, 31)), int(rng.integers(10, 41)), int(rng.integers(10, 46))]
        d = created
        evs = [("LEAD", d)]
        for k in range(1, reach + 1):
            d = d + timedelta(days=durs[k - 1])
            evs.append((stages[k], d))
        if outcome in ("WON", "LOST"):
            d = closed or (d + timedelta(days=durs[min(3, reach)]))
            evs.append(("CLOSED_WON" if outcome == "WON" else "CLOSED_LOST", d))
        last = evs[-1]
        cur = last[0]
        value = float(np.clip(rng.lognormal(math.log(value_med), .9), 5000, 900000))
        opps.append(dict(name=name, ptype=ptype, vert=vert, terr=terr, src=src[int(rng.choice(5, p=src_p))], created=created, cur=cur,
                         closed=last[1] if cur.startswith("CLOSED") else None, value=r2(value),
                         lr=loss[int(rng.choice(6, p=loss_p))] if outcome == "LOST" else None, lc=int(rng.poisson(3)) + 1,
                         q=rf(float(np.clip(rng.lognormal(math.log(20), .6), 3, 160)), 1) if reach >= 2 else None, client_id=client_id,
                         owner=owner_at(created), evs=evs, prob=prob[cur]))

    for c in new_clients:  # won new logos (close just before onboarding)
        closed = c["ob"] - timedelta(days=int(rng.integers(3, 20)))
        created = closed - timedelta(days=int(rng.integers(50, 150)))
        make("NEW", "NEW_LOGO", c["name"], c["vertical"], c["region"], created, "WON", 3, c["client_id"], 70000, closed)
    for _ in range(90):  # lost new logos
        created = date(2023, 10, 1) + timedelta(days=int(rng.integers(0, 1000)))
        reach = int(rng.choice(4, p=[.40, .30, .18, .12]))
        v = VERT_COUNTS[int(rng.choice(6, p=norm([22, 10, 8, 8, 7, 5])))][0]
        name = f"{PREFIXES[int(rng.integers(0, len(PREFIXES)))]} {SUFFIX[v][int(rng.integers(0, len(SUFFIX[v])))]} (prospect)"
        make("NEW", "NEW_LOGO", name, v, ENUMS["region"][int(rng.choice(4, p=[.7, .15, .1, .05]))], created, "LOST", reach, None, 60000)
    active = [c for c in clients if not c["churned"]]
    for _ in range(85):  # expansions (won / lost)
        c = active[int(rng.integers(0, len(active)))]
        created = date(2023, 10, 1) + timedelta(days=int(rng.integers(0, 1000)))
        won = rng.random() < .46
        make("EXP", "EXPANSION", c["name"], c["vertical"], c["region"], created, "WON" if won else "LOST", 3 if won else int(rng.choice(4, p=[.2, .3, .3, .2])),
             c["client_id"], 35000)
    for _ in range(26):  # open pipeline
        created = date(2026, 1, 15) + timedelta(days=int(rng.integers(0, 250)))
        reach = int(rng.choice(4, p=[.25, .30, .27, .18]))
        exp = rng.random() < .35
        if exp:
            c = active[int(rng.integers(0, len(active)))]
            make("EXP", "EXPANSION", c["name"], c["vertical"], c["region"], created, "OPEN", reach, c["client_id"], 40000)
        else:
            v = VERT_COUNTS[int(rng.choice(6, p=norm([22, 10, 8, 8, 7, 5])))][0]
            name = f"{PREFIXES[int(rng.integers(0, len(PREFIXES)))]} {SUFFIX[v][int(rng.integers(0, len(SUFFIX[v])))]} (prospect)"
            make("NEW", "NEW_LOGO", name, v, ENUMS["region"][int(rng.choice(4, p=[.7, .15, .1, .05]))], created, "OPEN", reach, None, 65000)
    # drop any whose events exceed as-of
    clean = []
    for o in opps:
        if any(d > AS_OF for _, d in o["evs"]):
            # truncate to as-of: reopen at last stage on/before as-of
            keep = [(s, d) for s, d in o["evs"] if d <= AS_OF]
            if not keep:
                continue
            o["evs"] = keep
            o["cur"] = keep[-1][0]
            o["closed"] = None
            o["lr"] = None
            o["prob"] = prob[o["cur"]]
        clean.append(o)
    clean.sort(key=lambda o: (o["created"], o["name"]))
    for i, o in enumerate(clean):
        o["oid"] = f"OPP-{i + 1:04d}"
        last = o["evs"][-1][1]
        o["exp_close"] = o["closed"] if o["closed"] else max(AS_OF + timedelta(days=int(rng.integers(14, 150))), last)
    return clean


if __name__ == "__main__":
    from assemble import main
    sys.exit(main())
