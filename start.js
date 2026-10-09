/* Lernen unter Prüfungsdruck – start.js
   Start: Module initialisieren
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* START */
const APP_VERSION = "2.0 (getrennte Dateien)";   // bei jedem Update hochzählen, damit man sieht, ob die neue Datei online ist
document.getElementById("appVersion").textContent = "Version " + APP_VERSION;
if(!storageOk()) document.getElementById("storageWarn").hidden = false;
Countdown.init();
Home.init();
LernTest.init();
Lernmittel.init();
Lernkarten.init();
Backup.init();
Tour.init();
applyFeatures();
if(!data.settings.tutorialDone) openTut();
