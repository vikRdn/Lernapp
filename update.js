/* Lernen unter Prüfungsdruck – update.js
   App aktualisieren: prüft, ob auf dem Server eine neuere Version liegt, und lädt die App frisch.
   Browser (vor allem auf dem iPad) halten alte Dateien oft zwischen. Eine frische Adresse
   (?neu=…) zwingt sie, alles neu zu holen. Gespeicherte Daten bleiben erhalten, weil sie
   an der Adresse ohne Zusatz hängen.
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Update
   ===================================================== */
const Update = (() => {
  const $ = id => document.getElementById(id);
  const current = () => String(APP_VERSION).split(" ")[0];   // "2.5"
  const msg = t => { $("upMsg").textContent = t; };

  async function check(){
    $("upCheck").disabled = true; msg("Prüfe …");
    try{
      const r = await fetch("index.html?cb=" + Date.now(), { cache:"no-store" });
      if(!r.ok) throw new Error("HTTP " + r.status);
      const m = (await r.text()).match(/\?v=([\d.]+)"/), remote = m && m[1];
      $("upReload").hidden = false;
      if(!remote){ msg("Die neueste Version ließ sich nicht feststellen. Du kannst trotzdem frisch laden."); $("upReload").textContent = "Frisch neu laden"; }
      else if(remote === current()){ msg("Du hast die neueste Version (" + current() + ")."); $("upReload").textContent = "Trotzdem frisch neu laden"; }
      else { msg("Neue Version " + remote + " gefunden. Du hast " + current() + "."); $("upReload").textContent = "Jetzt aktualisieren"; }
    }catch(e){
      $("upReload").hidden = false; $("upReload").textContent = "Frisch neu laden";
      msg("Die Prüfung ist gerade nicht möglich (keine Verbindung?). Du kannst trotzdem frisch laden.");
    }finally{ $("upCheck").disabled = false; }
  }
  function reload(){   // Zwischenspeicher leeren, dann mit frischer Adresse neu laden
    try{ if(window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k))); }catch(e){}
    const u = new URL(location.href); u.searchParams.set("neu", String(Date.now()));
    location.replace(u.href);
  }
  function init(){ $("upCheck").onclick = check; $("upReload").onclick = reload; }
  return { init };
})();
