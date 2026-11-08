// Speicher auf dem Gerät: ein Datensatz in IndexedDB (Ausweich: localStorage).
// Es gibt keinen Server – die Sicherung als Datei (Einstellungen → Sicherung) ist der einzige Weg,
// Daten auf ein anderes Handy zu bringen oder nach dem Löschen der App zurückzuholen.
(function () {
  "use strict";
  const DB = "muenzwerk-lite", OS = "kv", KEY = "state", LS = "muenzwerk-lite-state";

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(OS);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(OS, mode);
      const r = fn(t.objectStore(OS));
      t.oncomplete = () => resolve(r && r.result);
      t.onerror = () => reject(t.error);
    });
  }

  window.Store = {
    async load() {
      try { const v = await tx("readonly", (s) => s.get(KEY)); if (v) return v; } catch { /* weiter mit localStorage */ }
      try { const raw = localStorage.getItem(LS); return raw ? JSON.parse(raw) : null; } catch { return null; }
    },
    async save(state) {
      try { await tx("readwrite", (s) => s.put(state, KEY)); return; } catch { /* weiter mit localStorage */ }
      try { localStorage.setItem(LS, JSON.stringify(state)); } catch { /* voll oder gesperrt */ }
    },
    async clear() {
      try { await tx("readwrite", (s) => s.delete(KEY)); } catch { /* egal */ }
      try { localStorage.removeItem(LS); } catch { /* egal */ }
    },
    // Bittet den Browser, die Daten nicht bei Platzmangel zu löschen
    async persist() {
      try { return navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; } catch { return false; }
    },
  };
})();
