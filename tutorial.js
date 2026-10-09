/* Lernen unter Prüfungsdruck – tutorial.js
   Einführungstutorial mit Design- und Bereichsauswahl
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Einführungstutorial
   Erscheint beim ersten Start; über "?" jederzeit wieder.
   ===================================================== */
const TUT_STEPS = [
  { icon:"sparkle", title:"Willkommen!", text:"Diese App hilft dir, dich ruhig und klar auf Prüfungen vorzubereiten. Das dauert nur eine Minute." },
  { icon:"calendar", title:"Countdown", text:"Trage deine Prüfungen ein. Du siehst, wie viele Tage noch bleiben, und bekommst einen einfachen Lernplan." },
  { icon:"compass", title:"Lerntyp", text:"Beantworte ein paar Fragen. Du erfährst, wie du lernst, und bekommst Tipps, die zu dir passen." },
  { icon:"folder", title:"Lernmittel", text:"Sammle Notizen, Bilder und PDFs und ordne sie deinen Prüfungen zu. Daraus kannst du Lernkarten machen." },
  { icon:"flag", title:"Ziele & Reflexion", text:"Setze dir Lernziele und hake sie ab. Zu einem erreichten Ziel kannst du direkt reflektieren: Was hat geholfen, was machst du anders?" },
  { icon:"timer", title:"Fokus-Timer", text:"Lerne in Blöcken von 25 Minuten und mache danach eine Pause. Die App zählt deine Lernzeit." },
  { icon:"search", title:"Nachschlagen", text:"Schlage Begriffe bei Wikipedia nach und speichere die Zusammenfassung als Notiz." },
  { icon:"lock", title:"Deine Daten", text:"Alles bleibt auf deinem Gerät. Es gibt kein Konto. Mit dem „?“ oben rechts siehst du diese Einführung wieder." },
  { icon:"palette", title:"Wie soll die App aussehen?", look:true,
    text:"Wähle ein Design und eine Farbe. Beides lässt sich später in den Einstellungen ändern." },
  { icon:"target", title:"Was brauchst du?", features:true,
    text:"Wähle, was du nutzen möchtest. Alles andere blendet die App aus. Du kannst das später über das „?“ oben rechts ändern. Beim ersten Mal folgt danach ein kurzer Rundgang durch die App." }
];
const FEATURES = [   // [Schlüssel, Titel, Beschreibung]
  ["countdown", "Prüfungen und Lernplan", "Countdown und Lernaufgaben-Board", "calendar"],
  ["lerntyp", "Lerntyp-Test", "Fragen und passende Tipps", "compass"],
  ["lernmittel", "Lernmittel", "Notizen, Bilder, PDFs, Lernkarten", "folder"],
  ["ziele", "Ziele & Reflexion", "Lernziele setzen und zurückschauen", "flag"],
  ["wiki", "Nachschlagen", "Begriffe bei Wikipedia nachschlagen", "search"],
  ["fokus", "Fokus-Timer", "Lernen und Pausen im Wechsel", "timer"]
];
function renderFeatures(){
  const box = document.getElementById("tutFeatures"); box.textContent = "";
  FEATURES.forEach(([key, title, desc, ic]) => {
    const label = document.createElement("label"); label.className = "featrow";
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!tutSel[key];
    cb.onchange = () => { tutSel[key] = cb.checked; document.getElementById("tutErr").textContent = ""; };
    const d = document.createElement("div"), b = document.createElement("b"), sm = document.createElement("small");
    b.textContent = title; sm.textContent = desc; d.append(b, sm);
    label.append(cb, icon(ic, 22), d); box.appendChild(label);
  });
}
let tutStep = 0, tutSel = {};
const tut = document.getElementById("tutorial");

function renderTut(){
  const s = TUT_STEPS[tutStep];
  const ti = document.getElementById("tutIcon"); ti.textContent = ""; ti.appendChild(icon(s.icon, 48));
  document.getElementById("tutTitle").textContent = s.title;
  document.getElementById("tutText").textContent = s.text;
  document.getElementById("tutDots").innerHTML = TUT_STEPS.map((_,i) => `<i class="${i===tutStep?"on":""}"></i>`).join("");
  document.getElementById("tutLook").hidden = !s.look; if(s.look) Look.build(document.getElementById("tutLook"));
  document.getElementById("tutFeatures").hidden = !s.features; document.getElementById("tutErr").textContent = "";
  if(s.features) renderFeatures();
  document.getElementById("tutNext").textContent = tutStep === TUT_STEPS.length-1 ? "Los geht's" : "Weiter";
  document.getElementById("tutSkip").style.visibility = tutStep === TUT_STEPS.length-1 ? "hidden" : "visible";
}
function openTut(){ tutStep = 0; tutSel = Object.assign({}, data.settings.features); renderTut(); tut.hidden = false; document.getElementById("tutNext").focus(); }
function closeTut(){ tut.hidden = true; data.settings.tutorialDone = true; saveData(); }

document.getElementById("tutNext").onclick = () => {
  if(tutStep < TUT_STEPS.length-1){ tutStep++; renderTut(); return; }
  if(!Object.values(tutSel).some(Boolean)){ document.getElementById("tutErr").textContent = "Wähle mindestens einen Bereich."; return; }
  data.settings.features = tutSel;     // Auswahl übernehmen
  applyFeatures(); closeTut();
  if(!data.settings.tourDone) setTimeout(() => Tour.start(), 300);   // Rundgang beim ersten Mal
};
document.getElementById("tutSkip").onclick = closeTut;
document.getElementById("btnHelp").onclick = openTut;
document.addEventListener("keydown", e => { if(e.key === "Escape"){ if(dialogDone) dialogDone(false); else if(!tut.hidden) closeTut(); else setMenu(false); } });
