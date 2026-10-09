/* Lernen unter Prüfungsdruck – start.js
   Start: Module initialisieren
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* START */
/* Version: Nummer hochzählen UND in index.html bei allen ?v=… dieselbe Nummer eintragen.
   Jede Version bekommt einen japanischen Lernbegriff (Umschrift, Schriftzeichen, Bedeutung). Bis 3.0 hießen sie
   Kompass, Leuchtturm, Horizont, Funke, Gipfel, Anker. Reihe ab 3.1:
     3.1 Shoshin 初心 (Anfängergeist)       3.2 Doryoku 努力 (Anstrengung)       3.3 Shūchū 集中 (Konzentration)
     3.4 Kaizen 改善 (stetig besser werden)  3.5 Ganbaru 頑張る (durchhalten)    3.6 Kintsugi 金継ぎ (Fehler mit Gold reparieren)
     3.7 Shu-ha-ri 守破離 (Lernstufen)       3.8 Komorebi 木漏れ日 (Licht durch Blätter)  3.9 Senpai 先輩 (Mentor)
     4.0 Nanakorobi-yaoki 七転び八起き (siebenmal fallen, achtmal aufstehen) */
const APP_VERSION = "3.2";   // kleine Korrekturen zählen als x.y.1, der Name bleibt
const APP_NAME = "Doryoku", APP_KANJI = "努力";   // Umschrift und Schriftzeichen (die Bedeutung steht oben in der Reihe)
(() => {   // Versionszeile in den Einstellungen
  const el = document.getElementById("appVersion"); el.textContent = "";
  const kanji = document.createElement("span"); kanji.lang = "ja"; kanji.textContent = APP_KANJI;
  el.append("Version " + APP_VERSION + " „" + APP_NAME + "“ ", kanji);
})();
if(/[?&]neu=/.test(location.search)) history.replaceState(null, "", location.pathname + location.hash);   // Update-Zusatz aus der Adresse entfernen
if(!storageOk()) document.getElementById("storageWarn").hidden = false;
Countdown.init();
Home.init();
LernTest.init();
Lernmittel.init();
Lernkarten.init();
Textkarten.init();
Ziele.init();
Wiki.init();
Backup.init();
Update.init();
Fokus.init();
Kalender.init();
Tour.init();
applyFeatures();
if(!data.settings.tutorialDone) openTut();
