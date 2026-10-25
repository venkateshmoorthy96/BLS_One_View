"""Shared configuration for the BLS OneView synthetic data generator.

Everything here is a documented DEMO default. The values are exported into
public/data/meta_config.csv so the web app reads exactly the same constants.
"""
from datetime import date

SEED = 20261029
GENERATOR_VERSION = "1.0.0"
SCHEMA_VERSION = "1.0.0"
DATASET_VERSION = "2026.10.1"

AS_OF = date(2026, 9, 30)          # last closed month-end in the demo data
FIRST_MONTH = (2024, 1)            # first month of data
N_MONTHS = 33                      # 2024-01 .. 2026-09
BASE_CURRENCY = "USD"
FX_RATE_VERSION = "DEMO-FX-2026-09"
FX_RATE_TYPE = "FIXED_ILLUSTRATIVE"
FX_USD_PER_UNIT = {"USD": 1.0, "EUR": 1.08, "GBP": 1.27}
ROUNDING_POLICY = (
    "Line-level amounts are rounded half-up to 2 decimals when generated. Reporting-currency "
    "conversion is applied once to aggregated USD totals and rounded only for display."
)

THRESHOLDS = {
    "quality_pass_score": 90.0,          # score >= 90 and zero critical errors = PASS
    "quality_penalty_minor": 1.0,        # penalty points per minor error
    "quality_penalty_major": 5.0,
    "quality_penalty_critical": 25.0,
    "quality_norm_words": 1000,          # penalties normalised per 1,000 sampled words
    "sla_warning_days": 2,               # active batch due within N days and <80% complete
    "sla_warning_progress": 0.8,
    "health_healthy": 0.70,
    "health_watch": 0.50,
    "capacity_load_warning": 0.90,       # demand / supply
    "capacity_load_critical": 1.05,
    "pm_util_warning": 0.90,
    "mtqe_accept_threshold": 0.85,
    "uptime_warning": 0.995,
    "otd_target": 0.95,
}

ASSUMPTIONS = {
    "baseline_words_per_hour": 380.0,    # human translation effective throughput (assumption)
    "review_hourly_cost_usd": 32.0,      # blended review/post-edit labour cost (assumption)
    "full_postedit_words_per_hour": 600.0,
    "light_review_words_per_hour": 2000.0,
    "ai_effort_factor": 0.35,            # share of human effort an AI-touched word still needs
    "pm_labor_pct_written": 0.07,
    "dispatch_labor_pct_interp": 0.05,
    "tooling_cost_per_ai_word_usd": 0.004,
}

SCENARIO = {
    "formula_version": "SCN-F1.0",
    "pm_labor_volume_elasticity": 0.6,
    "opex_volume_elasticity": 0.25,
    "platform_volume_elasticity": 1.0,
    "presets": {
        "BASELINE": {"ai_adoption_delta": 0.0, "price_adjustment": 0.0, "vendor_inflation": 0.0, "volume_growth": 0.0},
        "CONSERVATIVE": {"ai_adoption_delta": 0.03, "price_adjustment": -0.02, "vendor_inflation": 0.08, "volume_growth": -0.05},
        "OPTIMISTIC": {"ai_adoption_delta": 0.15, "price_adjustment": 0.03, "vendor_inflation": 0.02, "volume_growth": 0.12},
    },
    "trajectory_cagr": {"CONSERVATIVE": 0.04, "TARGET": 0.11, "AGGRESSIVE": 0.20},
}

PAYMENT_TERMS_DAYS = {"STRATEGIC": 60, "GROWTH": 45, "STANDARD": 30}

SEEDED_SURGE = {
    "note": "Illustrative seeded demand surge in forecast weeks so the Capacity tab has a story",
    "language_codes": ["AM", "SO", "HT", "VI", "ZH"], "uplift": 0.22, "weeks_index": [2, 3, 4, 5, 6],
}

SIM = {
    "workflow_ai_share_start": 0.22,     # AI-touched word share at 2024-01
    "workflow_ai_share_end": 0.80,       # at 2026-09
    "mtpe_fraction_of_ai": 0.72,         # MTPE vs AIR split inside the AI-touched share
}
