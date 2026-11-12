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

  // Zu welchem Monat zählt ein Eintrag? Einnahmen einer Kategorie mit „Folgemonat“ (Gehalt, Nebenjob), die ab dem
  // Stichtag (settings.shift_day, Standard 15) kommen, zählen zum nächsten Monat – wie in Münzwerk.
  function budgetMonth(e, state) {
    const m = monthOf(e.date);
    if (!(e.amount_cents > 0) || !e.category_id) return m;
    const c = (state.categories || []).find((x) => x.id === e.category_id);
    const from = state.settings?.shift_day ?? 15;
    return c && c.next_month && Number(e.date.slice(8, 10)) >= from ? addMonths(m, 1) : m;
  }

  // Gilt ein fester Posten in Monat m? (optional erst ab start_month, nur bis end_month)
  const fixedActive = (f, m) => f.active !== false && (!f.start_month || f.start_month <= m) && (!f.end_month || f.end_month >= m);

  /**
   * Monatsbericht.
   * state: { entries, fixed, settings }   m: "YYYY-MM"   today: "YYYY-MM-DD"
   */
  function month(state, m, today, opts = {}) {
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

    const entries = (state.entries || []).filter((e) => budgetMonth(e, state) === m);
    let incomeVariable = 0, variable = 0, largeSum = 0;
    for (const e of entries) {
      if (e.amount_cents > 0) incomeVariable += e.amount_cents;
      else if (-e.amount_cents >= large) largeSum += -e.amount_cents;
      else variable += -e.amount_cents;
    }
    const income = incomeRegular + incomeVariable;
    const spent = variable + largeSum;                       // frei ausgegeben (alles Eingetragene)
    // Sparziele: die Rate des laufenden Monats ist eingeplant (zieht Übrig und Tagesbudget herunter)
    const goalRate = !opts.noGoals && status === "current" && (state.goals || []).length ? goals(state, today).planned : 0;
    const budget = income - fixedCosts - savings - goalRate; // Geld für den ganzen Monat zum freien Ausgeben
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
      income, incomeRegular, incomeVariable, fixedCosts, savings, goalRate, variable, large: largeSum, spent,
      budget, left, rate, perDay, pot, preview: days, forecastEnd, pace, categories,
      fixedList: fixed,
    };
  }

  // ---------------------------------------------------------------- Sparziele (wie in Münzwerk)
  // Ziel: { id, name, icon, target_cents, start_cents, start_date, end_date }. Das Geld bleibt, wo es ist: die Rate
  // jedes Monats ist eingeplant, fürs Ziel zählt, was am Monatsende übrig bleibt – höchstens die Rate.
  const dayNo = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5);
  const monthsBetween = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));

  function goalWindow(g, m) {
    const mStart = `${m}-01`, mEnd = `${m}-${pad(daysIn(m))}`;
    const from = g.start_date > mStart ? g.start_date : mStart;
    const to = g.end_date < mEnd ? g.end_date : mEnd;
    return { inMonth: Math.max(0, dayNo(to) - dayNo(from) + 1), left: dayNo(g.end_date) - dayNo(from) + 1 };
  }
  // Rate taggenau: Rest × Tage des Monats im Zeitraum ÷ Tage bis zum Ende; letzter Monat = ganzer Rest
  function goalRate(s, m) {
    const g = s.goal;
    if (s.reached || m < monthOf(g.start_date)) return 0;
    const rest = g.target_cents - s.saved;
    if (rest <= 0) return 0;
    if (m >= monthOf(g.end_date)) return rest;
    const w = goalWindow(g, m);
    return w.left > 0 ? Math.ceil((rest * w.inMonth) / w.left) : rest;
  }
  function distribute(rates, money) {
    const total = rates.reduce((a, b) => a + b, 0);
    if (!total) return rates.map(() => 0);
    if (money >= total) return rates.slice();
    return rates.map((r) => Math.round((r * money) / total));
  }
  function step(states, m, surplus, record) {
    const rates = states.map((s) => goalRate(s, m));
    const credits = distribute(rates, surplus);
    states.forEach((s, i) => {
      if (m < monthOf(s.goal.start_date) || s.reached) return;
      const before = s.saved;
      s.saved = Math.max(0, s.saved + credits[i]);          // ein Minus-Monat kann das Ziel nicht unter 0 drücken
      if (record) s.history.push({ month: m, rate: rates[i], credit: s.saved - before });
      if (s.saved >= s.goal.target_cents) s.reached = m;
    });
  }

  /**
   * Bewertung: ok = Rate diesen Monat ist gedeckt und das Ziel bis zum Enddatum schaffbar („Im Plan“);
   * watch = diesen Monat reicht es nicht (ganz), das Ziel ist aber schaffbar („Im Blick“);
   * late = nötige Rate ab nächstem Monat höher als der Schnitt-Überschuss der letzten Monate („Gefährdet“).
   * Ohne abgeschlossene Monate mit Einträgen gibt es keinen Vergleich → nie „gefährdet“.
   */
  function goals(state, today) {
    const list = (state.goals || []).filter((g) => g.target_cents > 0 && g.start_date && g.end_date);
    const cur = monthOf(today);
    const states = list.map((g) => ({ goal: g, saved: g.start_cents || 0, history: [], reached: null }));
    if (!states.length) return { goals: [], planned: 0 };
    const report = (m) => month(state, m, today, { noGoals: true });

    // Abgeschlossene Monate: was übrig blieb
    const first = list.map((g) => monthOf(g.start_date)).sort()[0];
    for (let m = first; m < cur; m = addMonths(m, 1)) step(states, m, report(m).left, true);

    // Laufender Monat
    const r = report(cur);
    const ratesNow = states.map((s) => goalRate(s, cur));
    const coverNow = distribute(ratesNow, r.left).map((c, i) => Math.min(ratesNow[i], Math.max(0, c)));
    const expectedNow = distribute(ratesNow, r.forecastEnd);

    // Schnitt der letzten bis zu 3 abgeschlossenen Monate mit Einträgen
    const firstData = (state.entries || []).reduce((a, e) => (!a || e.date < a ? e.date : a), null);
    const past = [];
    if (firstData) for (let m = addMonths(cur, -1); past.length < 3 && m >= monthOf(firstData); m = addMonths(m, -1)) past.push(report(m).left);
    const avg = past.length ? past.reduce((a, b) => a + b, 0) / past.length : null;

    const left = (g) => monthsBetween(cur, monthOf(g.end_date));        // Monate nach dem laufenden
    const need = (s, kept) => (s.reached || left(s.goal) <= 0 ? 0 : Math.max(0, Math.ceil((s.goal.target_cents - s.saved - kept) / left(s.goal))));
    const needs = states.map((s, i) => need(s, coverNow[i]));
    const needsNone = states.map((s) => need(s, 0));
    const fits = (xs) => avg == null || xs.reduce((a, b) => a + b, 0) <= Math.max(0, avg);
    const feasible = fits(needs), feasibleIfNone = fits(needsNone);

    // Wann wäre das Ziel mit dem üblichen Überschuss erreicht?
    const sim = states.map((s, i) => ({ goal: s.goal, saved: s.saved + (s.reached ? 0 : Math.max(0, coverNow[i])), history: [], reached: s.reached }));
    sim.forEach((s) => { if (!s.reached && s.saved >= s.goal.target_cents) s.reached = cur; });
    if (avg > 0) for (let m = addMonths(cur, 1), n = 0; n < 240 && sim.some((s) => !s.reached); m = addMonths(m, 1), n++) step(sim, m, avg, false);

    const result = states.map((s, i) => {
      const g = s.goal, rate = ratesNow[i];
      const monthOk = coverNow[i] >= rate;
      let status = "reached";
      if (!s.reached) status = !(left(g) > 0 ? feasible : monthOk) ? "late" : monthOk ? "ok" : "watch";
      const end = `${cur}-${pad(daysIn(cur))}`;
      const frac = Math.min(1, Math.max(0, (dayNo(end < g.end_date ? end : g.end_date) - dayNo(g.start_date) + 1) / (dayNo(g.end_date) - dayNo(g.start_date) + 1)));
      return {
        goal: g, saved: s.saved, reached: s.reached, rate, perDay: rate / Math.max(1, goalWindow(g, cur).inMonth),
        coverNow: coverNow[i], monthOk, forecastOk: expectedNow[i] >= rate, status,
        needNext: left(g) > 0 ? needs[i] : null, needIfNone: left(g) > 0 ? needsNone[i] : null, feasibleIfNone,
        reach: sim[i].reached, history: s.history.slice(-2),
        plannedMonthEnd: Math.round((g.start_cents || 0) + (g.target_cents - (g.start_cents || 0)) * frac),
      };
    });
    const planned = ratesNow.reduce((a, b) => a + b, 0);
    const remDays = r.status === "current" ? r.days - r.day : 0;
    return {
      goals: result, planned, avgSurplus: avg,
      paceDaily: remDays > 0 ? (r.left - r.forecastEnd) / remDays : null,
      tipDaily: remDays > 0 ? (r.left - planned) / remDays : null,
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

  const L = { pad, daysIn, isoOf, monthOf, addMonths, fixedActive, budgetMonth, month, goals, dayNo, parseAmount, validState };
  if (typeof module !== "undefined" && module.exports) module.exports = L;
  else root.L = L;
})(typeof window !== "undefined" ? window : globalThis);
