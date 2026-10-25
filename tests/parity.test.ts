/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { core, nrr, dso, pmUtil, scenarioBaseline, scenarioOutputs } from "@/lib/kpi/core";
import { windowMonths, priorMonths } from "@/lib/filters";
import ref from "@/data/generated/kpi_reference.json";

const close = (a: number | null, b: number | null) => {
  if (a === null || b === null) return expect(a).toBe(b);
  expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(1e-6, Math.abs(b) * 1e-9));
};
const R = ref as any;

describe("TS KPI layer matches the independent pandas reference", () => {
  for (const [key, expected] of Object.entries<any>(R.windows)) {
    it(`core KPIs ${key}`, () => {
      const [w, bu] = key.split("|");
      const months = w === "PYTD" ? priorMonths("ytd", windowMonths("ytd"))! : windowMonths(w.toLowerCase() as any);
      const got = core(months, bu);
      for (const [k, v] of Object.entries<any>(expected)) close(got[k] as number | null, v);
    });
  }
  for (const bu of ["ALL", "UNIT_ALPHA"]) {
    it(`NRR and DSO ${bu}`, () => {
      const n = nrr(undefined, bu);
      for (const [k, v] of Object.entries<any>(R.nrr[bu])) close(n[k] as number | null, v);
      const d = dso(undefined, bu);
      close(d.DSO, R.dso[bu].DSO); close(d.open, R.dso[bu].open_ar_usd);
    });
  }
  it("PM utilisation", () => {
    close(pmUtil(windowMonths("ytd")), R.pm_util.YTD);
    close(pmUtil(windowMonths("ttm")), R.pm_util.TTM);
  });
  it("scenario engine reproduces reference and baseline EBITDA", () => {
    const b = scenarioBaseline();
    for (const [id, o] of Object.entries<any>(R.scenario_outputs)) {
      const preset = id.replace("SCN-", "");
      const inp = { BASELINE: [0, 0, 0, 0], CONSERVATIVE: [0.03, -0.02, 0.08, -0.05], OPTIMISTIC: [0.15, 0.03, 0.02, 0.12] }[preset]!;
      const got = scenarioOutputs(b, { ai_adoption_delta: inp[0], price_adjustment: inp[1], vendor_inflation: inp[2], volume_growth: inp[3] });
      close(got.revenue, o.revenue_usd); close(got.ebitda, o.ebitda_usd); close(got.gap, o.capacity_gap_words);
    }
    close(scenarioOutputs(b, { ai_adoption_delta: 0, price_adjustment: 0, vendor_inflation: 0, volume_growth: 0 }).ebitda, core(windowMonths("ttm")).EBITDA);
  });
});
