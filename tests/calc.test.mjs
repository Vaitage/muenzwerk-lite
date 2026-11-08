import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const L = createRequire(import.meta.url)("../web/calc.js");

// Beispiel wie in der Vorlage: 3.600 € Gehalt, 2.253,84 € Fixkosten, 336,54 € Sparen, 30 Tage → 33,65 €/Tag
const base = () => ({
  settings: {},
  categories: [],
  fixed: [
    { id: 1, name: "Gehalt", kind: "income", amount_cents: 360000, day: 28 },
    { id: 2, name: "Miete", kind: "expense", amount_cents: 225384, day: 1 },
    { id: 3, name: "Sparen", kind: "saving", amount_cents: 33654, day: 1 },
  ],
  entries: [],
});

test("Tagessatz = (Einnahmen − Fixkosten − Sparen) ÷ Tage im Monat", () => {
  const r = L.month(base(), "2026-11", "2026-11-08");
  assert.equal(r.budget, 100962);
  assert.equal(Math.round(r.rate), 3365);
  assert.equal(r.left, 100962);
});

test("Topf: heute = Tagessatz × Tage seit dem 1. − Ausgaben; morgen +1 Tagessatz", () => {
  const s = base();
  let r = L.month(s, "2026-11", "2026-11-08");
  assert.deepEqual(r.preview.map((p) => p.available), [26923, 30289, 33654]);
  s.entries.push({ id: 1, date: "2026-11-08", amount_cents: -20000, category_id: 1 });
  r = L.month(s, "2026-11", "2026-11-08");
  assert.deepEqual(r.preview.map((p) => p.available), [6923, 10289, 13654]);
  s.entries.push({ id: 2, date: "2026-11-08", amount_cents: -6000, category_id: 2 });
  r = L.month(s, "2026-11", "2026-11-08");
  assert.deepEqual(r.preview.map((p) => p.available), [923, 4289, 7654]);
});

test("Nichts ausgegeben: am nächsten Tag steht bei heute mehr", () => {
  const a = L.month(base(), "2026-11", "2026-11-08").preview[0].available;
  const b = L.month(base(), "2026-11", "2026-11-09").preview[0].available;
  assert.equal(b - a, 3365 + 1);   // gerundet
});

test("Einnahme eintragen hebt Budget und Tagessatz", () => {
  const s = base();
  s.entries.push({ id: 1, date: "2026-11-05", amount_cents: 30000, category_id: 9 });
  const r = L.month(s, "2026-11", "2026-11-08");
  assert.equal(r.incomeVariable, 30000);
  assert.equal(r.budget, 130962);
  assert.equal(Math.round(r.rate), Math.round(130962 / 30));
});

test("Große Ausgaben zählen voll, werden aber nicht hochgerechnet", () => {
  const s = base();
  s.entries.push({ id: 1, date: "2026-11-02", amount_cents: -50000, category_id: 1 });
  s.entries.push({ id: 2, date: "2026-11-03", amount_cents: -7000, category_id: 1 });
  const r = L.month(s, "2026-11", "2026-11-14");
  assert.equal(r.large, 50000);
  assert.equal(r.variable, 7000);
  assert.equal(r.left, 100962 - 57000);
  assert.equal(r.forecastEnd, Math.round(r.left - (7000 / 14) * 16));
});

test("Verteilt statt Topf: Übrig ÷ Resttage", () => {
  const s = base();
  s.settings.daily_mode = "spread";
  const r = L.month(s, "2026-11", "2026-11-08");
  assert.equal(r.preview[0].available, Math.round(100962 / 23));
});

test("Feste Posten: inaktiv und Zeitraum", () => {
  const s = base();
  s.fixed.push({ id: 4, name: "Abo", kind: "expense", amount_cents: 1000, active: false });
  s.fixed.push({ id: 5, name: "Kurs", kind: "expense", amount_cents: 5000, start_month: "2026-12" });
  assert.equal(L.month(s, "2026-11", "2026-11-08").fixedCosts, 225384);
  assert.equal(L.month(s, "2026-12", "2026-11-08").fixedCosts, 230384);
});

test("Betrag aus dem Tastenfeld", () => {
  assert.equal(L.parseAmount("12,5"), 1250);
  assert.equal(L.parseAmount("1.234,56"), 123456);
  assert.equal(L.parseAmount("7"), 700);
  assert.equal(L.parseAmount("abc"), null);
  assert.equal(L.parseAmount(""), null);
});

test("Sicherung prüfen", () => {
  assert.equal(L.validState(base()), true);
  assert.equal(L.validState({ entries: [] }), false);
});

test("Fixkosten mit Kategorie zählen unter „Nach Kategorie“ mit", () => {
  const s = { entries: [{ id: "e1", date: "2026-11-03", amount_cents: -5000, category_id: "home" }],
    categories: [], settings: {},
    fixed: [{ id: "f1", name: "Miete", kind: "expense", amount_cents: 100000, day: 1, category_id: "home" },
            { id: "f2", name: "Handy", kind: "expense", amount_cents: 2000, day: 5 }] };
  const r = L.month(s, "2026-11", "2026-11-08");
  assert.deepEqual(r.categories, [{ id: "home", total: 105000 }]);
  assert.equal(r.fixedCosts, 102000);
});
