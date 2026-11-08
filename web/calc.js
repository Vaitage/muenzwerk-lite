// Münzwerk Lite – Rechenkern ohne Oberfläche (läuft im Browser und in node für die Tests).
// Alle Beträge in Cent. Einträge: + = Einnahme, − = Ausgabe.
// Feste Posten (Fixkosten, regelmäßige Einnahmen, Sparen) zählen jeden Monat voll mit – ohne Eintrag.
(function (root) {
  "use strict";

  const pad = (n) => String(n).padStart(2, "0");
  const daysIn = (m) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate();
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthOf = (iso) => iso.slice(0, 7);
  const addMonths = (m, n) => {
    const y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7)) - 1 + n;
    return `${y + Math.floor(mo / 12)}-${pad(((mo % 12) + 12) % 12 + 1)}`;
  };

  // Gilt ein fester Posten in Monat m? (optional erst ab start_month, nur bis end_month)
  const fixedActive = (f, m) => f.active !== false && (!f.start_month || f.start_month <= m) && (!f.end_month || f.end_month >= m);

  /**
   * Monatsbericht.
   * state: { entries, fixed, settings }   m: "YYYY-MM"   today: "YYYY-MM-DD"
   */
  function month(state, m, today) {
    const D = daysIn(m);
    const cur = monthOf(today);
    const status = m < cur ? "past" : m > cur ? "future" : "current";
    const day = status === "current" ? Number(today.slice(8, 10)) : status === "past" ? D : 0;
    const large = state.settings?.large_cents ?? 25000;

    const fixed = (state.fixed || []).filter((f) => fixedActive(f, m));
    const sumKind = (k) => fixed.filter((f) => f.kind === k).reduce((s, f) => s + Math.abs(f.amount_cents), 0);
    const incomeRegular = sumKind("income");
    const fixedCosts = sumKind("expense");
    const savings = sumKind("saving");

    const entries = (state.entries || []).filter((e) => monthOf(e.date) === m);
    let incomeVariable = 0, variable = 0, largeSum = 0;
    for (const e of entries) {
      if (e.amount_cents > 0) incomeVariable += e.amount_cents;
      else if (-e.amount_cents >= large) largeSum += -e.amount_cents;
      else variable += -e.amount_cents;
    }
    const income = incomeRegular + incomeVariable;
    const spent = variable + largeSum;                       // frei ausgegeben (alles Eingetragene)
    const budget = income - fixedCosts - savings;            // Geld für den ganzen Monat zum freien Ausgeben
    const left = budget - spent;                             // Übrig bis Monatsende
    const rate = budget / D;                                 // Tagessatz (Topf)

    // Topf: jeden Tag kommt der Tagessatz dazu, Ausgaben gehen ab; „Heute“ = bis einschließlich heute frei
    // Verteilt: das Übrige wird auf die restlichen Tage aufgeteilt (jeden Tag neu)
    const pot = state.settings?.daily_mode !== "spread";
    const daysLeft = status === "current" ? D - day + 1 : status === "future" ? D : 0;
    const days = [];
    if (status === "current") {
      for (let k = 0; k < 3 && day + k <= D; k++) {
        const available = pot ? rate * (day + k) - spent : (left / daysLeft) * (k + 1);
        days.push({ day: day + k, iso: `${m}-${pad(day + k)}`, available: Math.round(available) });
      }
    }
    const perDay = pot ? rate : daysLeft ? left / daysLeft : 0;

    // Prognose: wie bisher weiter ausgeben (große Einzelausgaben nicht hochrechnen), frühestens ab Tag 7 voll
    const pace = status === "current" ? variable / Math.max(day, 7) : 0;
    const forecastEnd = status === "past" ? left : Math.round(left - pace * (status === "current" ? D - day : 0));

    // Ausgaben nach Kategorie (größte zuerst)
    const byCat = new Map();
    for (const e of entries) if (e.amount_cents < 0) byCat.set(e.category_id, (byCat.get(e.category_id) || 0) - e.amount_cents);
    // Fixkosten mit Kategorie zählen dort mit (ohne Kategorie stehen sie nur unter „Fixkosten“)
    for (const f of fixed) if (f.kind === "expense" && f.category_id) byCat.set(f.category_id, (byCat.get(f.category_id) || 0) + Math.abs(f.amount_cents));
    const categories = [...byCat.entries()].map(([id, total]) => ({ id, total })).sort((a, b) => b.total - a.total);

    return {
      month: m, status, days: D, day, daysLeft,
      income, incomeRegular, incomeVariable, fixedCosts, savings, variable, large: largeSum, spent,
      budget, left, rate, perDay, pot, preview: days, forecastEnd, pace, categories,
      fixedList: fixed,
    };
  }

  // Ausgabe/Einnahme aus dem Tastenfeld: "12,5" → 1250 Cent
  function parseAmount(s) {
    if (s == null) return null;
    const t = String(s).trim().replace(/\s|€/g, "");
    if (!t) return null;
    const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
    if (!/^\d+(\.\d{0,2})?$/.test(norm)) return null;
    return Math.round(Number(norm) * 100);
  }

  // Sicherung: Daten prüfen, bevor sie übernommen werden
  function validState(s) {
    return !!s && typeof s === "object" && Array.isArray(s.entries) && Array.isArray(s.categories) && Array.isArray(s.fixed);
  }

  const L = { pad, daysIn, isoOf, monthOf, addMonths, fixedActive, month, parseAmount, validState };
  if (typeof module !== "undefined" && module.exports) module.exports = L;
  else root.L = L;
})(typeof window !== "undefined" ? window : globalThis);
