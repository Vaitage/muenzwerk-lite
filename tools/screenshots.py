"""Bilder fürs README mit erfundenen Beispieldaten.

    python -m http.server 8765 --directory web &   # in einem zweiten Fenster
    python tools/screenshots.py de|en

Schreibt docs/bilder/ (de) bzw. docs/images/ (en). Braucht Playwright mit Chromium.
"""
import asyncio
import json
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
LANG = sys.argv[1] if len(sys.argv) > 1 else "de"
OUT = ROOT / "docs" / ("bilder" if LANG == "de" else "images")
URL = os.environ.get("URL", "http://localhost:8765/")
NOW = "2026-11-17T10:15:00"

# Erfundene Beispieldaten (Monat November 2026)
SEED = """(lang) => {
  const de = lang === "de";
  const s = { version: 1, categories: [], entries: [], fixed: [],
    settings: { daily_mode: "pot", large_cents: 25000, last_backup: "2026-11-01T10:00:00Z", onboarded: true } };
  const cats = [["basket", de ? "Lebensmittel" : "Groceries"], ["utensils", "Restaurant"], ["car", de ? "Mobilität" : "Transport"],
    ["fuel", de ? "Tanken" : "Fuel"], ["smile", de ? "Freizeit" : "Leisure"], ["cup", de ? "Kaffee" : "Coffee"], ["tag", de ? "Sonstiges" : "Other"]];
  cats.forEach(([icon, name], i) => s.categories.push({ id: "c" + i, name, icon, kind: "expense" }));
  s.categories.push({ id: "i0", name: de ? "Gehalt" : "Salary", icon: "briefcase", kind: "income" });
  s.categories.push({ id: "i1", name: de ? "Nebenjob" : "Side job", icon: "wallet", kind: "income" });
  const f = (name, kind, eur, day) => s.fixed.push({ id: "f" + s.fixed.length, name, kind, amount_cents: eur * 100, day, active: true });
  f(de ? "Gehalt" : "Salary", "income", 2950, 28); f(de ? "Miete" : "Rent", "expense", 890, 1); f(de ? "Strom" : "Electricity", "expense", 78, 3);
  f(de ? "Versicherungen" : "Insurance", "expense", 96, 1); f(de ? "Handy" : "Phone", "expense", 20, 15); f("Streaming", "expense", 13, 12);
  f(de ? "Sparplan" : "Savings plan", "saving", 250, 1);
  const e = (d, cents, cat, note = "") => s.entries.push({ id: "e" + s.entries.length, date: `2026-11-${String(d).padStart(2, "0")}`, amount_cents: cents, category_id: cat, note });
  e(2, -4780, "c0"); e(3, -650, "c5"); e(4, -5520, "c3"); e(6, -2390, "c0"); e(7, -3800, "c1", de ? "Pizza mit Freunden" : "Pizza with friends");
  e(9, -1200, "c4", de ? "Kino" : "Cinema"); e(10, -6210, "c0"); e(11, 12000, "i1"); e(12, -420, "c5"); e(13, -2900, "c2", de ? "Monatskarte" : "Monthly pass");
  e(14, -5480, "c3"); e(15, -3150, "c0"); e(16, -1890, "c4"); e(17, -780, "c5");
  return s;
}"""


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROMIUM") or None)
        for scheme in ("light", "dark"):
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, color_scheme=scheme,
                                      locale="de-DE" if LANG == "de" else "en-GB", is_mobile=True, has_touch=True)
            await ctx.clock.set_fixed_time(NOW)
            await ctx.add_init_script(f"try{{localStorage.setItem('muenzwerk-lite-lang', {json.dumps(LANG)})}}catch{{}}")
            pg = await ctx.new_page()
            await pg.goto(URL)
            await pg.wait_for_timeout(800)
            await pg.evaluate(f"async () => {{ await Store.save(({SEED})({json.dumps(LANG)})); }}")
            await pg.reload()
            await pg.wait_for_timeout(800)
            suffix = "" if scheme == "light" else "-dark"
            await pg.screenshot(path=str(OUT / f"1-overview{suffix}.png"))
            if scheme == "dark":
                await ctx.close()
                continue
            await pg.click("[data-action=add-expense]")
            await pg.wait_for_timeout(400)
            for k in "12,5":
                await pg.click(f'[data-key="{k}"]')
            await pg.locator("[data-ecat]").nth(5).click()
            await pg.screenshot(path=str(OUT / "2-entry.png"))
            await pg.click(".sheet .back")
            await pg.click("[data-tab=stats]")
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(OUT / "3-stats.png"))
            await pg.click("[data-tab=settings]")
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=str(OUT / "4-settings.png"))
            await ctx.close()
        await b.close()
    print("Bilder in", OUT)


asyncio.run(main())
