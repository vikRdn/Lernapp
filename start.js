/* Lernen unter Prüfungsdruck – start.js
   Start: Module initialisieren
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* START */
/* Version: Nummer hochzählen UND in index.html bei allen ?v=… dieselbe Nummer eintragen.
   Jede Version bekommt einen Namen (Reihe: Kompass, Leuchtturm, Horizont, Funke, Gipfel, Anker, Brücke, Fernglas, Kurs, Segel). */
const APP_VERSION = "2.6";
const APP_NAME = "Leuchtturm";
document.getElementById("appVersion").textContent = "Version " + APP_VERSION + " „" + APP_NAME + "“";
if(/[?&]neu=/.test(location.search)) history.replaceState(null, "", location.pathname + location.hash);   // Update-Zusatz aus der Adresse entfernen
if(!storageOk()) document.getElementById("storageWarn").hidden = false;
Countdown.init();
Home.init();
LernTest.init();
Lernmittel.init();
Lernkarten.init();
Ziele.init();
Wiki.init();
Backup.init();
Update.init();
Fokus.init();
Kalender.init();
Tour.init();
applyFeatures();
if(!data.settings.tutorialDone) openTut();
