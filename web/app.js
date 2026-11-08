// Münzwerk Lite – Oberfläche. Alles läuft im Browser, Daten über Store (IndexedDB) auf dem Gerät.
"use strict";

const APP_VERSION = "1.0.1";
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const money0 = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmt = (c) => money.format((c || 0) / 100).replace("-", "−");
const fmt0 = (c) => money0.format(Math.round((c || 0) / 100)).replace("-", "−");
const todayIso = () => L.isoOf(new Date());
const thisMonth = () => todayIso().slice(0, 7);
const monthName = (m) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
const dayLabel = (iso) => {
  if (iso === todayIso()) return t("Heute");
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric" }).replace(",", "");
};
const dateLong = (iso) => new Date(iso + "T12:00:00").toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" });
const dateShort = (iso) => new Date(iso + "T12:00:00").toLocaleDateString(LOCALE, { day: "numeric", month: "numeric", year: "numeric" });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ------------------------------------------------------------------ Grundzustand
function defaultState() {
  const c = (name, icon, kind) => ({ id: uid(), name: t(name), icon, kind });
  return {
    version: 1,
    categories: [
      c("Lebensmittel", "basket", "expense"), c("Restaurant", "utensils", "expense"), c("Haushalt", "home", "expense"),
      c("Mobilität", "car", "expense"), c("Tanken", "fuel", "expense"), c("Kleidung", "shirt", "expense"),
      c("Freizeit", "smile", "expense"), c("Gesundheit", "stethoscope", "expense"), c("Geschenke", "gift", "expense"),
      c("Urlaub", "plane", "expense"), c("Kaffee", "cup", "expense"), c("Haustier", "paw", "expense"),
      c("Bildung", "graduation", "expense"), c("Sonstiges", "tag", "expense"),
      c("Gehalt", "briefcase", "income"), c("Nebenjob", "wallet", "income"), c("Geschenk", "gift", "income"),
      c("Erstattung", "undo", "income"), c("Sonstiges", "coins", "income"),
    ],
    entries: [],
    fixed: [],
    settings: { daily_mode: "pot", large_cents: 25000, last_backup: null, onboarded: false },
  };
}

let S = null;                          // Daten
const ui = { tab: "overview", month: thisMonth(), installPrompt: null };
const save = () => Store.save(S);
const catById = (id) => S.categories.find((c) => c.id === id);
const HUES = { basket: 3, utensils: 5, home: 1, car: 2, fuel: 2, shirt: 5, smile: 5, stethoscope: 8, gift: 7, plane: 1,
  cup: 4, paw: 6, graduation: 7, tag: 0, briefcase: 6, wallet: 6, undo: 6, coins: 6, heart: 8, plug: 4, phone: 4, shield: 7, receipt: 7, piggy: 6 };
const hue = (cat) => (cat && HUES[cat.icon]) ? `hue${HUES[cat.icon]}` : "hue0";

// ------------------------------------------------------------------ Fenster (Sheet) und Hinweise
// Fenster füllt den Bildschirm; „actions“ (Speichern usw.) stehen fest am unteren Rand, der Inhalt scrollt dazwischen
function openSheet(html, { onClose, actions = "", cls = "" } = {}) {
  closeSheet();
  const wrap = document.createElement("div");
  wrap.className = "sheet-wrap";
  wrap.innerHTML = `<div class="backdrop" data-close></div><div class="sheet ${cls}" role="dialog" aria-modal="true">
    <div class="sheet-top"><button class="back" data-close>${icon("chevronLeft")}${t("Zurück")}</button></div>
    <div class="sheet-body">${html}</div>${actions ? `<div class="sheet-actions">${actions}</div>` : ""}</div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });
  wrap._onClose = onClose;
  requestAnimationFrame(() => wrap.classList.add("open"));
  return $(".sheet", wrap);
}
function closeSheet() {
  const w = $(".sheet-wrap");
  if (!w) return;
  w._onClose && w._onClose();
  w.remove();
}
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("gone"), 1800);
  setTimeout(() => el.remove(), 2300);
}
function confirmSheet(title, text, okLabel, onOk) {
  const sh = openSheet(`<h3>${esc(title)}</h3><p class="meta">${esc(text)}</p>`, {
    actions: `<button class="btn secondary" data-close>${t("Abbrechen")}</button><button class="btn danger" id="c-ok">${esc(okLabel)}</button>` });
  $("#c-ok", sh).addEventListener("click", () => { closeSheet(); onOk(); });
}

// ------------------------------------------------------------------ Übersicht
function viewOverview() {
  const m = thisMonth();
  const r = L.month(S, m, todayIso());
  const today = r.preview[0];
  const neg = today && today.available < 0;
  const explain = r.pot
    ? t("Geld für den Monat: Einnahmen − Fixkosten − Sparen = {budget} ÷ {days} Tage = {rate} pro Tag.", { budget: fmt(r.budget), days: r.days, rate: fmt(r.rate) })
    : t("Übrig bis Monatsende ÷ restliche Tage = {rate} pro Tag.", { rate: fmt(r.perDay) });
  let html = "";
  if (!S.settings.onboarded && !S.fixed.length) {
    html += `<section class="card hint-card"><h2>${t("Willkommen bei Münzwerk Lite")}</h2>
      <p>${t("Trag zuerst ein, was jeden Monat fest kommt und geht: Gehalt, Miete, Versicherungen, Sparen. Daraus rechnet die App dein Tagesbudget.")}</p>
      <div class="btn-row"><button class="btn" data-action="fixed-new">${t("Feste Posten eintragen")}</button>
      <button class="btn secondary" data-action="onboarded">${t("Später")}</button></div></section>`;
  }
  if (ui.installPrompt) {
    html += `<section class="card hint-card"><h2>${t("App installieren")}</h2><p>${t("Leg Münzwerk Lite auf den Startbildschirm – dann läuft es wie eine App, auch offline.")}</p>
      <button class="btn" data-action="install">${icon("download")}${t("Installieren")}</button></section>`;
  }
  if (backupDue()) {
    html += `<section class="card hint-card warn"><h2>${t("Zeit für eine Sicherung")}</h2><p>${t("Deine Daten liegen nur auf diesem Handy. Eine Sicherung schützt vor Verlust.")}</p>
      <button class="btn" data-action="backup">${icon("download")}${t("Sicherung speichern")}</button></section>`;
  }
  html += `<section class="card hero">
    <div class="label">${t("Heute verfügbar")}</div>
    <div class="big ${neg ? "neg" : ""}">${fmt(today ? today.available : r.left)}</div>
    <div class="per-day">${t("{amount}/Tag", { amount: fmt(r.perDay) })} · ${tn(r.daysLeft, "noch {n} Tag", "noch {n} Tage")}</div>
    <details class="explain"><summary>${icon("help")}<span class="sr-only">${t("Tagessatz")}</span></summary><p>${esc(explain)}</p></details>
  </section>`;
  if (r.preview.length) {
    html += `<div class="days3">${r.preview.map((p, i) => `<div class="day ${i === 0 ? "today" : ""}">
      <span>${esc(dayLabel(p.iso))}</span><b class="${p.available < 0 ? "neg" : ""}">${i === 0 ? fmt(p.available) : fmt0(p.available)}</b></div>`).join("")}</div>`;
  }
  // Monat im Überblick
  const scale = Math.max(r.income, r.fixedCosts + r.savings + r.spent, 1);
  const w = (c) => `${Math.max(0, (c / scale) * 100).toFixed(2)}%`;
  html += `<section class="card month">
    <h2>${esc(monthName(m))}</h2>
    <div class="flow" role="img" aria-label="${esc(`${t("Einnahmen")} ${fmt0(r.income)}, ${t("Fixkosten")} ${fmt0(r.fixedCosts)}, ${t("Sparen")} ${fmt0(r.savings)}, ${t("Ausgaben bisher")} ${fmt0(r.spent)}`)}">
      <div class="track"><i class="inc" style="width:${w(r.income)}"></i></div>
      <div class="track"><i class="fix" style="width:${w(r.fixedCosts)}"></i><i class="sav" style="width:${w(r.savings)}"></i><i class="var" style="width:${w(r.spent)}"></i></div>
    </div>
    <div class="rows">
      <div class="row"><span><i class="dot inc"></i>${t("Einnahmen")}</span><b class="pos">${fmt(r.income)}</b></div>
      <div class="row"><span><i class="dot fix"></i>${t("Fixkosten")}</span><b>${fmt(-r.fixedCosts)}</b></div>
      <div class="row"><span><i class="dot sav"></i>${t("Sparen")}</span><b>${fmt(-r.savings)}</b></div>
      <div class="row"><span><i class="dot var"></i>${t("Ausgaben bisher")}</span><b>${fmt(-r.spent)}</b></div>
      <div class="row total"><span>${t("Übrig bis Monatsende")}</span><b class="${r.left < 0 ? "neg" : "pos"}">${fmt(r.left)}</b></div>
    </div>
  </section>`;
  // Letzte Einträge
  const recent = [...S.entries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5);
  html += `<section class="card"><div class="card-head"><h2>${t("Letzte Einträge")}</h2>${recent.length ? `<button class="link" data-tab="entries">${t("Alle ansehen")}</button>` : ""}</div>
    ${recent.length ? recent.map(entryRow).join("") : `<p class="empty">${t("Noch keine Einträge in diesem Monat.")}<br>${t("Tippe unten auf „Ausgabe“ oder „Einnahme“.")}</p>`}</section>`;
  return html;
}

function entryRow(e) {
  const c = catById(e.category_id);
  return `<button class="entry" data-entry="${esc(e.id)}">
    <span class="bubble ${hue(c)}">${icon(c ? c.icon : "tag")}</span>
    <span class="grow"><b>${esc(e.note || (c ? c.name : t("Sonstiges")))}</b><small>${esc(e.note && c ? `${c.name} · ` : "")}${esc(dayLabel(e.date))}</small></span>
    <b class="amt ${e.amount_cents > 0 ? "pos" : ""}">${e.amount_cents > 0 ? "+" : ""}${fmt(e.amount_cents)}</b></button>`;
}

// ------------------------------------------------------------------ Buchungen
function monthNav() {
  const next = L.addMonths(ui.month, 1);
  return `<div class="month-nav"><button data-month="-1" aria-label="${t("Monat zurück")}">${icon("chevronLeft")}</button>
    <b>${esc(monthName(ui.month))}</b>
    <button data-month="1" aria-label="${t("Monat vor")}" ${next > thisMonth() ? "disabled" : ""}>${icon("chevronRight")}</button></div>`;
}

function viewEntries() {
  const list = S.entries.filter((e) => e.date.startsWith(ui.month)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  let html = monthNav();
  if (!list.length) return html + `<section class="card"><p class="empty">${t("Noch keine Einträge in diesem Monat.")}<br>${t("Tippe unten auf „Ausgabe“ oder „Einnahme“.")}</p></section>`;
  const byDay = new Map();
  for (const e of list) { if (!byDay.has(e.date)) byDay.set(e.date, []); byDay.get(e.date).push(e); }
  for (const [day, es] of byDay) {
    const sum = es.reduce((s, e) => s + e.amount_cents, 0);
    html += `<section class="card day-group"><div class="card-head"><h2>${esc(dateLong(day))}</h2><span class="${sum > 0 ? "pos" : "muted"}">${fmt(sum)}</span></div>${es.map(entryRow).join("")}</section>`;
  }
  return html;
}

// ------------------------------------------------------------------ Statistik
function viewStats() {
  const r = L.month(S, ui.month, todayIso());
  const row = (label, v, cls = "", sub = false) => `<div class="row ${sub ? "sub" : ""}"><span>${esc(label)}</span><b class="${cls}">${fmt(v)}</b></div>`;
  const maxCat = r.categories[0]?.total || 1;
  return `${monthNav()}
  <section class="card stat">
    ${row(t("Tagessatz"), r.rate)}
  </section>
  <section class="card stat">
    ${row(t("Einkommen"), r.income, "pos")}${row(t("Regelmäßig"), r.incomeRegular, "", true)}${row(t("Variabel"), r.incomeVariable, "", true)}
  </section>
  <section class="card stat">
    ${row(t("Ausgaben"), -(r.fixedCosts + r.spent))}${row(t("Fixkosten"), -r.fixedCosts, "", true)}${row(t("Variable Ausgaben"), -r.variable, "", true)}${row(t("Große Ausgaben"), -r.large, "", true)}
  </section>
  <section class="card stat">${row(t("Ersparnisse"), r.savings)}</section>
  <section class="card stat">
    ${row(r.status === "past" ? t("Übrig bis Monatsende") : t("Budget übrig"), r.left, r.left < 0 ? "neg" : "pos")}
    ${r.status === "current" ? row(t("Wenn du so weiter ausgibst"), r.forecastEnd, r.forecastEnd < 0 ? "neg" : "", true) : ""}
  </section>
  ${r.categories.length ? `<section class="card"><h2>${t("Nach Kategorie")}</h2>${r.categories.map((x) => {
    const c = catById(x.id);
    return `<div class="cat-bar"><span class="bubble ${hue(c)}">${icon(c ? c.icon : "tag")}</span>
      <div class="grow"><div class="cat-line"><span>${esc(c ? c.name : t("Sonstiges"))}</span><b>${fmt(x.total)}</b></div>
      <div class="bar"><i class="${hue(c)}" style="width:${((x.total / maxCat) * 100).toFixed(1)}%"></i></div></div></div>`;
  }).join("")}</section>` : ""}`;
}

// ------------------------------------------------------------------ Einstellungen
const KIND_LABEL = { income: "Regelmäßige Einnahme", expense: "Fixkosten", saving: "Sparen" };
function viewSettings() {
  const group = (kind) => S.fixed.filter((f) => f.kind === kind).sort((a, b) => (a.day || 0) - (b.day || 0));
  const fixedRow = (f) => `<button class="entry" data-fixed="${esc(f.id)}">
    <span class="bubble ${f.kind === "income" ? "hue6" : f.kind === "saving" ? "hue7" : "hue2"}">${icon(f.kind === "income" ? "briefcase" : f.kind === "saving" ? "piggy" : "repeat")}</span>
    <span class="grow"><b>${esc(f.name)}</b><small>${f.day ? t("am {day}.", { day: f.day }) : ""}${f.active === false ? " · —" : ""}</small></span>
    <b class="amt ${f.kind === "income" ? "pos" : ""}">${f.kind === "income" ? "+" : "−"}${fmt(Math.abs(f.amount_cents)).replace("−", "")}</b></button>`;
  const sections = ["income", "expense", "saving"].map((k) => {
    const g = group(k);
    return g.length ? `<h3 class="sub-h">${t(KIND_LABEL[k])}</h3>${g.map(fixedRow).join("")}` : "";
  }).join("");
  const lang = (() => { try { return localStorage.getItem("muenzwerk-lite-lang") || "auto"; } catch { return "auto"; } })();
  const seg = (name, val, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-${name}="${v}" aria-pressed="${v === val}">${esc(l)}</button>`).join("")}</div>`;
  return `
  <section class="card"><div class="card-head"><h2>${t("Feste Posten")}</h2></div>
    <p class="meta">${t("Kommen jeden Monat automatisch dazu – du musst sie nicht eintragen.")}</p>
    ${sections || `<p class="empty">${t("Noch keine festen Posten. Trag Gehalt, Miete & Co. ein, dann stimmt dein Tagesbudget.")}</p>`}
    <button class="btn secondary block" data-action="fixed-new">${icon("plus")}${t("Posten hinzufügen")}</button></section>
  <section class="card"><h2>${t("Tagesbudget")}</h2>
    ${seg("mode", S.settings.daily_mode === "spread" ? "spread" : "pot", [["pot", t("Topf")], ["spread", t("Neu verteilt")]])}
    <p class="meta">${t("Topf: jeden Tag kommt ein fester Betrag dazu, was du nicht ausgibst, bleibt drin. Neu verteilt: das Übrige wird jeden Tag auf die restlichen Tage aufgeteilt.")}</p>
    <label class="field"><span>${t("Große Ausgaben ab")}</span><input type="text" inputmode="decimal" id="s-large" value="${(S.settings.large_cents / 100).toLocaleString(LOCALE)}">
      <small class="meta">${t("Werden in der Prognose nicht hochgerechnet.")}</small></label></section>
  <section class="card"><div class="card-head"><h2>${t("Kategorien")}</h2></div>
    <div class="cat-list">${S.categories.map((c) => `<button class="chip" data-cat="${esc(c.id)}"><span class="bubble sm ${hue(c)}">${icon(c.icon)}</span>${esc(c.name)}${c.kind === "income" ? " <small>+</small>" : ""}</button>`).join("")}</div>
    <button class="btn secondary block" data-action="cat-new">${icon("plus")}${t("Kategorie hinzufügen")}</button></section>
  <section class="card"><h2>${t("Sicherung")}</h2>
    <p class="meta">${t("Deine Daten liegen nur auf diesem Handy. Speichere ab und zu eine Sicherung, z. B. in deinem Cloud-Speicher.")}</p>
    <p class="meta"><b>${S.settings.last_backup ? t("Letzte Sicherung: {date}", { date: dateShort(S.settings.last_backup) }) : t("Noch keine Sicherung.")}</b></p>
    <div class="btn-row"><button class="btn" data-action="backup">${icon("download")}${t("Sicherung speichern")}</button>
    <label class="btn secondary file-btn">${icon("upload")}${t("Sicherung laden")}<input type="file" accept="application/json,.json" id="restore" hidden></label></div>
    <button class="btn secondary danger-text block" data-action="wipe">${icon("trash")}${t("Alles löschen")}</button></section>
  <section class="card"><h2>${t("Sprache")}</h2>${seg("lang", lang, [["auto", t("Wie das Gerät")], ["de", "Deutsch"], ["en", "English"]])}</section>
  <section class="card about"><div class="about-logo">${logoMark("", "Münzwerk Lite")}</div><h2>${t("Über Münzwerk Lite")}</h2>
    <p class="meta">${t("Haushaltsbuch fürs Handy: Ausgaben eintippen, Tagesbudget als Topf. Läuft offline, deine Daten verlassen das Gerät nicht.")}</p>
    <p class="meta">${t("Version {v} · Freie Software (AGPL-3.0) · ohne Gewähr", { v: APP_VERSION })}</p>
    <a class="link" href="https://github.com/Vaitage/muenzwerk-lite" target="_blank" rel="noopener">${t("Quellcode auf GitHub")}</a></section>`;
}

// ------------------------------------------------------------------ Eintrag erfassen (Tastenfeld)
function openEntrySheet(kind, entry = null) {
  let amount = entry ? (Math.abs(entry.amount_cents) / 100).toFixed(2).replace(".", ",").replace(/,00$/, "") : "";
  let sign = entry ? (entry.amount_cents > 0 ? "income" : "expense") : kind;
  let catId = entry ? entry.category_id : null;
  const sheet = openSheet(`
    <div class="seg type" role="group"><button data-sign="expense">${icon("minus")}${t("Ausgabe")}</button><button data-sign="income">${icon("plus")}${t("Einnahme")}</button></div>
    <output class="amount-display" id="e-amount" aria-live="polite"></output>
    <div class="cat-grid" id="e-cats" role="group" aria-label="${t("Kategorie")}"></div>
    <div class="field-row">
      <label class="field"><span>${t("Datum")}</span><input type="date" id="e-date" value="${esc(entry ? entry.date : todayIso())}" max="${esc(L.isoOf(new Date(Date.now() + 365 * 864e5)))}"></label>
      <label class="field"><span>${t("Notiz")}</span><input type="text" id="e-note" maxlength="60" placeholder="${t("optional")}" value="${esc(entry ? entry.note || "" : "")}"></label>
    </div>
    <div class="keypad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"].map((k) =>
      `<button data-key="${k}" ${k === "⌫" ? `aria-label="⌫"` : k === "," ? `aria-label="${t("Komma")}"` : ""}>${k === "⌫" ? icon("backspace") : k}</button>`).join("")}</div>`, {
    cls: "entry-sheet",
    actions: `${entry ? `<button class="btn secondary danger-text icon-only" id="e-del" aria-label="${t("Löschen")}">${icon("trash")}</button>` : ""}<button class="btn" id="e-save">${t("Speichern")}</button>` });
  const render = () => {
    sheet.querySelectorAll("[data-sign]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.sign === sign));
    const v = L.parseAmount(amount || "0") || 0;
    $("#e-amount", sheet).innerHTML = `<span class="${sign === "income" ? "pos" : ""}">${sign === "income" ? "+" : "−"}${esc(amount ? amount : "0")} €</span>`;
    $("#e-amount", sheet).setAttribute("aria-label", fmt(v));
    const cats = S.categories.filter((c) => c.kind === sign);
    if (catId && !cats.some((c) => c.id === catId)) catId = null;
    $("#e-cats", sheet).innerHTML = cats.map((c) => `<button data-ecat="${esc(c.id)}" aria-pressed="${c.id === catId}">
      <span class="bubble ${hue(c)}">${icon(c.icon)}</span><small>${esc(c.name)}</small></button>`).join("");
  };
  render();
  sheet.addEventListener("click", (e) => {
    const sb = e.target.closest("[data-sign]");
    if (sb) { sign = sb.dataset.sign; render(); return; }
    const cb = e.target.closest("[data-ecat]");
    if (cb) { catId = cb.dataset.ecat; render(); return; }
    const kb = e.target.closest("[data-key]");
    if (kb) {
      const k = kb.dataset.key;
      if (k === "⌫") amount = amount.slice(0, -1);
      else if (k === ",") { if (!amount.includes(",")) amount = (amount || "0") + ","; }
      else if (!/,\d\d$/.test(amount) && amount.replace(",", "").length < 8) amount = amount === "0" ? k : amount + k;
      render();
      return;
    }
    if (e.target.closest("#e-del")) {
      confirmSheet(t("Eintrag löschen?"), `${fmt(entry.amount_cents)} · ${dateLong(entry.date)}`, t("Löschen"), async () => {
        S.entries = S.entries.filter((x) => x.id !== entry.id);
        await save(); toast(t("Gelöscht")); render_();
      });
      return;
    }
    if (e.target.closest("#e-save")) {
      const v = L.parseAmount(amount);
      if (!v) { toast(t("Bitte einen Betrag eingeben.")); return; }
      if (!catId) { toast(t("Bitte eine Kategorie wählen.")); return; }
      const data = { date: $("#e-date", sheet).value || todayIso(), amount_cents: sign === "income" ? v : -v, category_id: catId, note: $("#e-note", sheet).value.trim() };
      if (entry) Object.assign(S.entries.find((x) => x.id === entry.id), data);
      else S.entries.push({ id: uid(), ...data });
      save().then(() => { closeSheet(); toast(t("Gespeichert")); render_(); });
    }
  });
}

// ------------------------------------------------------------------ Feste Posten
function openFixedSheet(fx = null) {
  let kind = fx ? fx.kind : "expense";
  const sheet = openSheet(`<h3>${t("Fester Posten")}</h3>
    <div class="seg" role="group" aria-label="${t("Art")}">${["income", "expense", "saving"].map((k) => `<button data-fkind="${k}">${t(k === "income" ? "Einnahme" : KIND_LABEL[k])}</button>`).join("")}</div>
    <label class="field"><span>${t("Name")}</span><input type="text" id="f-name" maxlength="60" value="${esc(fx ? fx.name : "")}" placeholder="${t("Miete")}"></label>
    <div class="field-row">
      <label class="field"><span>${t("Betrag")}</span><input type="text" inputmode="decimal" id="f-amount" value="${fx ? (Math.abs(fx.amount_cents) / 100).toLocaleString(LOCALE, { minimumFractionDigits: 2 }) : ""}" placeholder="0,00"></label>
      <label class="field"><span>${t("Tag im Monat")}</span><input type="number" inputmode="numeric" min="1" max="31" id="f-day" value="${fx && fx.day ? fx.day : ""}" placeholder="1"></label>
    </div>
    ${fx ? `<label class="check"><input type="checkbox" id="f-active" ${fx.active !== false ? "checked" : ""}> ${t("Aktiv")}</label>` : ""}`, {
    actions: `${fx ? `<button class="btn secondary danger-text icon-only" id="f-del" aria-label="${t("Löschen")}">${icon("trash")}</button>` : ""}<button class="btn" id="f-save">${t("Speichern")}</button>` });
  const mark = () => sheet.querySelectorAll("[data-fkind]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.fkind === kind));
  mark();
  sheet.addEventListener("click", (e) => {
    const kb = e.target.closest("[data-fkind]");
    if (kb) { kind = kb.dataset.fkind; mark(); return; }
    if (e.target.closest("#f-del")) {
      confirmSheet(t("Posten löschen?"), fx.name, t("Löschen"), async () => { S.fixed = S.fixed.filter((x) => x.id !== fx.id); await save(); toast(t("Gelöscht")); render_(); });
      return;
    }
    if (!e.target.closest("#f-save")) return;
    const name = $("#f-name", sheet).value.trim();
    const v = L.parseAmount($("#f-amount", sheet).value);
    const day = Math.min(31, Math.max(1, Number($("#f-day", sheet).value) || 1));
    if (!name) { toast(t("Bitte einen Namen eingeben.")); return $("#f-name", sheet).focus(); }
    if (!v) { toast(t("Bitte einen Betrag eingeben.")); return $("#f-amount", sheet).focus(); }
    const data = { name, kind, amount_cents: v, day, active: fx ? $("#f-active", sheet).checked : true };
    if (fx) Object.assign(S.fixed.find((x) => x.id === fx.id), data);
    else S.fixed.push({ id: uid(), ...data });
    S.settings.onboarded = true;
    save().then(() => { closeSheet(); toast(t("Gespeichert")); render_(); });
  });
}

// ------------------------------------------------------------------ Kategorien
function openCategorySheet(cat = null) {
  let chosen = cat ? cat.icon : "tag";
  let kind = cat ? cat.kind : "expense";
  const sheet = openSheet(`<h3>${t("Kategorie")}</h3>
    <div class="seg" role="group">${["expense", "income"].map((k) => `<button data-ckind="${k}">${t(k === "income" ? "Einnahme" : "Ausgabe")}</button>`).join("")}</div>
    <label class="field"><span>${t("Name")}</span><input type="text" id="k-name" maxlength="40" value="${esc(cat ? cat.name : "")}"></label>
    <div class="field"><span>${t("Symbol")}</span><div class="icon-pick">${CATEGORY_ICON_CHOICES.map((i) => `<button data-icon="${i}" aria-label="${i}">${icon(i)}</button>`).join("")}</div></div>`, {
    actions: `${cat ? `<button class="btn secondary danger-text icon-only" id="k-del" aria-label="${t("Löschen")}">${icon("trash")}</button>` : ""}<button class="btn" id="k-save">${t("Speichern")}</button>` });
  const mark = () => {
    sheet.querySelectorAll("[data-icon]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.icon === chosen));
    sheet.querySelectorAll("[data-ckind]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.ckind === kind));
  };
  mark();
  sheet.addEventListener("click", (e) => {
    const ib = e.target.closest("[data-icon]");
    if (ib) { chosen = ib.dataset.icon; mark(); return; }
    const kb = e.target.closest("[data-ckind]");
    if (kb) { kind = kb.dataset.ckind; mark(); return; }
    if (e.target.closest("#k-del")) {
      confirmSheet(t("Kategorie löschen?"), t("Einträge dieser Kategorie bleiben erhalten und stehen dann unter „Sonstiges“."), t("Löschen"), async () => {
        S.categories = S.categories.filter((c) => c.id !== cat.id);
        const other = S.categories.find((c) => c.kind === cat.kind && (c.icon === "tag" || c.icon === "coins")) || S.categories.find((c) => c.kind === cat.kind);
        S.entries.forEach((x) => { if (x.category_id === cat.id) x.category_id = other ? other.id : null; });
        await save(); toast(t("Gelöscht")); render_();
      });
      return;
    }
    if (!e.target.closest("#k-save")) return;
    const name = $("#k-name", sheet).value.trim();
    if (!name) { toast(t("Bitte einen Namen eingeben.")); return; }
    if (cat) Object.assign(S.categories.find((c) => c.id === cat.id), { name, icon: chosen, kind });
    else S.categories.push({ id: uid(), name, icon: chosen, kind });
    save().then(() => { closeSheet(); toast(t("Gespeichert")); render_(); });
  });
}

// ------------------------------------------------------------------ Sicherung
const backupDue = () => S.entries.length >= 10 && (!S.settings.last_backup || (Date.now() - Date.parse(S.settings.last_backup)) / 864e5 > 30);
async function doBackup() {
  const name = `muenzwerk-lite-${todayIso()}.json`;
  const blob = new Blob([JSON.stringify({ app: "muenzwerk-lite", exported: new Date().toISOString(), ...S }, null, 1)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: name });
    else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  } catch (err) { if (err && err.name === "AbortError") return; }
  S.settings.last_backup = new Date().toISOString();
  await save(); render_();
}
function restoreFrom(fileEl) {
  const f = fileEl.files && fileEl.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); } catch { data = null; }
    fileEl.value = "";
    if (!data || data.app !== "muenzwerk-lite" || !L.validState(data)) { toast(t("Die Datei ist keine Sicherung von Münzwerk Lite.")); return; }
    confirmSheet(t("Sicherung laden"), t("Sicherung laden? Die Daten auf diesem Handy werden ersetzt."), t("Sicherung laden"), async () => {
      delete data.app; delete data.exported;
      S = { ...defaultState(), ...data, settings: { ...defaultState().settings, ...data.settings } };
      await save(); toast(t("Sicherung geladen")); render_();
    });
  };
  reader.readAsText(f);
}

// ------------------------------------------------------------------ Gerüst
const TABS = [["overview", "pie", "Übersicht"], ["entries", "list", "Buchungen"], ["stats", "chart", "Statistik"], ["settings", "settings", "Einstellungen"]];
function render_() {
  const main = $("#main");
  const views = { overview: viewOverview, entries: viewEntries, stats: viewStats, settings: viewSettings };
  main.innerHTML = views[ui.tab]();
  document.title = `${t(TABS.find((x) => x[0] === ui.tab)[2])} · Münzwerk Lite`;
  $("#tabbar").innerHTML = TABS.map(([id, ic, label]) => `<button data-tab="${id}" aria-current="${ui.tab === id ? "page" : "false"}">${icon(ic)}<span>${t(label)}</span></button>`).join("");
  $("#add-bar").hidden = ui.tab === "settings";
}

document.addEventListener("click", async (e) => {
  if (e.target.closest(".sheet-wrap")) return;
  const tb = e.target.closest("[data-tab]");
  if (tb) { ui.tab = tb.dataset.tab; if (ui.tab !== "entries" && ui.tab !== "stats") ui.month = thisMonth(); window.scrollTo(0, 0); return render_(); }
  const mb = e.target.closest("[data-month]");
  if (mb) { ui.month = L.addMonths(ui.month, Number(mb.dataset.month)); return render_(); }
  const en = e.target.closest("[data-entry]");
  if (en) return openEntrySheet(null, S.entries.find((x) => x.id === en.dataset.entry));
  const fx = e.target.closest("[data-fixed]");
  if (fx) return openFixedSheet(S.fixed.find((x) => x.id === fx.dataset.fixed));
  const cb = e.target.closest("[data-cat]");
  if (cb) return openCategorySheet(catById(cb.dataset.cat));
  const md = e.target.closest("[data-mode]");
  if (md) { S.settings.daily_mode = md.dataset.mode; await save(); return render_(); }
  const lg = e.target.closest("[data-lang]");
  if (lg) { try { localStorage.setItem("muenzwerk-lite-lang", lg.dataset.lang); } catch { /* egal */ } return location.reload(); }
  const a = e.target.closest("[data-action]");
  if (!a) return;
  switch (a.dataset.action) {
    case "add-expense": return openEntrySheet("expense");
    case "add-income": return openEntrySheet("income");
    case "fixed-new": return openFixedSheet();
    case "cat-new": return openCategorySheet();
    case "onboarded": S.settings.onboarded = true; await save(); return render_();
    case "backup": return doBackup();
    case "install":
      if (ui.installPrompt) { ui.installPrompt.prompt(); await ui.installPrompt.userChoice.catch(() => null); ui.installPrompt = null; render_(); }
      return;
    case "wipe":
      return confirmSheet(t("Wirklich alles löschen?"), t("Alle Einträge, festen Posten und Kategorien verschwinden von diesem Handy."), t("Alles löschen"), async () => {
        S = defaultState(); await save(); toast(t("Alles gelöscht")); ui.tab = "overview"; render_();
      });
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "restore") return restoreFrom(e.target);
  if (e.target.id === "s-large") {
    const v = L.parseAmount(e.target.value);
    if (v && v > 0) { S.settings.large_cents = v; await save(); toast(t("Gespeichert")); }
  }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); ui.installPrompt = e; if (S) render_(); });

async function start() {
  document.documentElement.lang = LANG;
  S = (await Store.load()) || defaultState();
  S = { ...defaultState(), ...S, settings: { ...defaultState().settings, ...(S.settings || {}) } };
  await save();
  Store.persist();
  $("#add-bar").innerHTML = `<button class="btn add out" data-action="add-expense">${icon("minus")}${t("Ausgabe")}</button>
    <button class="btn add in" data-action="add-income">${icon("plus")}${t("Einnahme")}</button>`;
  render_();
  // Tageswechsel (App bleibt offen): neu rechnen
  let day = todayIso();
  setInterval(() => { if (todayIso() !== day) { day = todayIso(); render_(); } }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && todayIso() !== day) { day = todayIso(); render_(); } });
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
}
start();
