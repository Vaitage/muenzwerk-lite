import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Jeder Text in t("…") / tn(n, "…", "…") braucht eine englische Fassung in web/i18n.js
test("alle Texte haben eine englische Fassung", () => {
  const src = readFileSync(new URL("../web/app.js", import.meta.url), "utf8");
  const i18n = readFileSync(new URL("../web/i18n.js", import.meta.url), "utf8");
  const window = {};
  new Function("window", "navigator", "localStorage", i18n)(window, { language: "en" }, { getItem: () => "en" });
  const EN = window.I18N_EN;
  const keys = new Set();
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(m[1]);
  for (const m of src.matchAll(/\btn\([^,]+,\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"/g)) { keys.add(m[1]); keys.add(m[2]); }
  for (const m of src.matchAll(/:\s*"(Regelmäßige Einnahme|Fixkosten|Sparen)"/g)) keys.add(m[1]);
  const missing = [...keys].filter((k) => !(k in EN));
  assert.deepEqual(missing, []);
});
