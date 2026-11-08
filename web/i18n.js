// Texte: Schlüssel = deutscher Text, hier die englische Fassung. t("…", {vars}), tn(n, eins, mehr).
(function () {
  "use strict";
  const EN = {
    "Übersicht": "Overview", "Buchungen": "Entries", "Statistik": "Statistics", "Einstellungen": "Settings",
    "Heute verfügbar": "Available today", "Heute": "Today", "{amount}/Tag": "{amount}/day",
    "noch {n} Tag": "{n} day left", "noch {n} Tage": "{n} days left",
    "Ausgabe": "Expense", "Einnahme": "Income", "Speichern": "Save", "Löschen": "Delete", "Abbrechen": "Cancel",
    "Zurück": "Back", "Kategorie": "Category", "Kategorie (optional)": "Category (optional)", "App schließen?": "Close the app?", "Deine Einträge sind gespeichert.": "Your entries are saved.", "Schließen": "Close", "Datum": "Date", "Notiz": "Note", "optional": "optional",
    "Betrag": "Amount", "Bitte einen Betrag eingeben.": "Please enter an amount.",
    "Bitte eine Kategorie wählen.": "Please choose a category.",
    "Gespeichert": "Saved", "Gelöscht": "Deleted", "Eintrag löschen?": "Delete entry?",
    "Eintrag bearbeiten": "Edit entry", "Neue Ausgabe": "New expense", "Neue Einnahme": "New income",
    "Einnahmen": "Income", "Fixkosten": "Fixed costs", "Sparen": "Savings", "Ausgaben bisher": "Spent so far",
    "Übrig bis Monatsende": "Left until month end", "Fürs Monat frei": "Free for the month",
    "Voraussichtlich am Monatsende": "Expected at month end",
    "Noch keine Einträge in diesem Monat.": "No entries this month yet.",
    "Tippe unten auf „Ausgabe“ oder „Einnahme“.": "Tap “Expense” or “Income” below.",
    "Letzte Einträge": "Recent entries", "Alle ansehen": "View all",
    "Tagessatz": "Daily amount", "Einkommen": "Income", "Regelmäßig": "Regular", "Variabel": "Variable",
    "Ausgaben": "Expenses", "Variable Ausgaben": "Variable expenses", "Große Ausgaben": "Large expenses",
    "Ersparnisse": "Savings", "Budget übrig": "Budget left", "Nach Kategorie": "By category",
    "Feste Posten": "Recurring items", "Fester Posten": "Recurring item",
    "Kommen jeden Monat automatisch dazu – du musst sie nicht eintragen.": "Added automatically every month – no need to enter them.",
    "Posten hinzufügen": "Add item", "Name": "Name", "Art": "Type", "am {day}.": "on day {day}",
    "Tag im Monat": "Day of month", "Aktiv": "Active", "Regelmäßige Einnahme": "Regular income",
    "Bitte einen Namen eingeben.": "Please enter a name.", "Posten löschen?": "Delete item?",
    "Kategorien": "Categories", "Kategorie hinzufügen": "Add category", "Symbol": "Icon",
    "Kategorie löschen?": "Delete category?",
    "Einträge dieser Kategorie bleiben erhalten und stehen dann unter „Sonstiges“.": "Entries in this category are kept and move to “Other”.",
    "Tagesbudget": "Daily budget", "Topf": "Pot", "Neu verteilt": "Spread",
    "Topf: jeden Tag kommt ein fester Betrag dazu, was du nicht ausgibst, bleibt drin. Neu verteilt: das Übrige wird jeden Tag auf die restlichen Tage aufgeteilt.": "Pot: a fixed amount is added every day and whatever you don't spend stays in. Spread: what's left is divided over the remaining days every day.",
    "Große Ausgaben ab": "Large expenses from", "Werden in der Prognose nicht hochgerechnet.": "Not extrapolated in the forecast.",
    "Sprache": "Language", "Wie das Gerät": "Device", "Sicherung": "Backup",
    "Deine Daten liegen nur auf diesem Handy. Speichere ab und zu eine Sicherung, z. B. in deinem Cloud-Speicher.": "Your data lives only on this phone. Save a backup now and then, e.g. to your cloud storage.",
    "Sicherung speichern": "Save backup", "Sicherung laden": "Restore backup", "Alles löschen": "Delete everything",
    "Letzte Sicherung: {date}": "Last backup: {date}", "Noch keine Sicherung.": "No backup yet.",
    "Sicherung laden? Die Daten auf diesem Handy werden ersetzt.": "Restore backup? The data on this phone will be replaced.",
    "Sicherung geladen": "Backup restored", "Die Datei ist keine Sicherung von Münzwerk Lite.": "This file is not a Münzwerk Lite backup.",
    "Wirklich alles löschen?": "Really delete everything?",
    "Alle Einträge, festen Posten und Kategorien verschwinden von diesem Handy.": "All entries, recurring items and categories are removed from this phone.",
    "Alles gelöscht": "Everything deleted",
    "Zeit für eine Sicherung": "Time for a backup",
    "Deine Daten liegen nur auf diesem Handy. Eine Sicherung schützt vor Verlust.": "Your data lives only on this phone. A backup protects it from loss.",
    "App installieren": "Install app", "Leg Münzwerk Lite auf den Startbildschirm – dann läuft es wie eine App, auch offline.": "Add Münzwerk Lite to your home screen – it then works like an app, even offline.",
    "Installieren": "Install", "Über Münzwerk Lite": "About Münzwerk Lite",
    "Haushaltsbuch fürs Handy: Ausgaben eintippen, Tagesbudget als Topf. Läuft offline, deine Daten verlassen das Gerät nicht.": "Budget book for your phone: type in expenses, daily budget as a pot. Works offline, your data never leaves the device.",
    "Version {v} · Freie Software (AGPL-3.0) · ohne Gewähr": "Version {v} · Free software (AGPL-3.0) · no warranty",
    "Quellcode auf GitHub": "Source code on GitHub",
    "Los geht's": "Let's start", "Willkommen bei Münzwerk Lite": "Welcome to Münzwerk Lite",
    "Trag zuerst ein, was jeden Monat fest kommt und geht: Gehalt, Miete, Versicherungen, Sparen. Daraus rechnet die App dein Tagesbudget.": "First enter what comes and goes every month: salary, rent, insurance, savings. The app uses this to work out your daily budget.",
    "Feste Posten eintragen": "Enter recurring items", "Später": "Later",
    "Noch keine festen Posten. Trag Gehalt, Miete & Co. ein, dann stimmt dein Tagesbudget.": "No recurring items yet. Add salary, rent & co. so your daily budget is right.",
    "Sonstiges": "Other", "Lebensmittel": "Groceries", "Restaurant": "Restaurant", "Haushalt": "Household",
    "Mobilität": "Transport", "Tanken": "Fuel", "Kleidung": "Clothing", "Freizeit": "Leisure", "Gesundheit": "Health",
    "Geschenke": "Gifts", "Urlaub": "Holiday", "Kaffee": "Coffee", "Haustier": "Pet", "Bildung": "Education",
    "Gehalt": "Salary", "Nebenjob": "Side job", "Geschenk": "Gift", "Erstattung": "Refund",
    "Miete": "Rent", "Strom": "Electricity", "Handy": "Phone", "Versicherungen": "Insurance",
    "Monat zurück": "Previous month", "Monat vor": "Next month",
    "Geld für den Monat: Einnahmen − Fixkosten − Sparen = {budget} ÷ {days} Tage = {rate} pro Tag.": "Money for the month: income − fixed costs − savings = {budget} ÷ {days} days = {rate} per day.",
    "Übrig bis Monatsende ÷ restliche Tage = {rate} pro Tag.": "Left until month end ÷ remaining days = {rate} per day.",
    "Wenn du so weiter ausgibst": "If you keep spending like this",
    "Komma": "Decimal comma",
  };
  const pick = () => {
    let lang = "auto";
    try { lang = localStorage.getItem("muenzwerk-lite-lang") || "auto"; } catch { /* egal */ }
    if (lang === "auto") lang = (navigator.language || "de").toLowerCase().startsWith("de") ? "de" : "en";
    return lang;
  };
  window.LANG = pick();
  window.LOCALE = window.LANG === "de" ? "de-DE" : "en-GB";
  const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : s);
  window.t = (key, vars) => fill(window.LANG === "en" ? EN[key] ?? key : key, vars);
  window.tn = (n, one, many, vars = {}) => window.t(n === 1 ? one : many, { n, ...vars });
  window.I18N_EN = EN;
})();
