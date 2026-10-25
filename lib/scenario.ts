// Scenario engine SCN-F1.0 (pure; runs on server and client). See docs/architecture.md.
// Elasticities and the AI effort factor come from meta_config.csv (scenario.* and assumptions.ai_effort_factor);
// the defaults below equal the configured values and are used only by tests that call the engine directly.
export type ScnBase = { Rw: number; Ri: number; W: number; a0: number; ch: number; ca: number; t: number; Pi: number; Pl: number; L: number; X: number; D: number; S_week: number };
export type ScnInputs = { ai_adoption_delta: number; price_adjustment: number; vendor_inflation: number; volume_growth: number };
export type ScnParams = { effort: number; pmElasticity: number; opexElasticity: number; platformElasticity: number };
export const DEFAULT_SCN_PARAMS: ScnParams = { effort: 0.35, pmElasticity: 0.6, opexElasticity: 0.25, platformElasticity: 1.0 };
export function scenarioOutputs(b: ScnBase, inp: ScnInputs, p: ScnParams = DEFAULT_SCN_PARAMS) {
  const v = inp.volume_growth, pr = inp.price_adjustment, i = inp.vendor_inflation;
  const W2 = b.W * (1 + v);
  const a = Math.min(1, Math.max(0, b.a0 + inp.ai_adoption_delta));
  const revenue = (b.Rw + b.Ri) * (1 + v) * (1 + pr);
  const vendor = W2 * ((1 - a) * b.ch + a * b.ca) * (1 + i);
  const tooling = W2 * a * b.t;
  const ipay = b.Pi * (1 + v) * (1 + i);
  const plat = b.Pl * (1 + p.platformElasticity * v);
  const labour = b.L * (1 + p.pmElasticity * v);
  const gp = revenue - vendor - tooling - ipay - plat - labour;
  const opex = b.X * (1 + p.opexElasticity * v);
  const ebitda = gp - opex;
  const gap = W2 * ((1 - a) + p.effort * a) - 52 * b.S_week;
  return { revenue, vendor, tooling, ipay, plat, labour, gp, gm: gp / revenue, opex, ebitda, em: ebitda / revenue, gap, a };
}
