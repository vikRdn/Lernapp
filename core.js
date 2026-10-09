/* Lernen unter Prüfungsdruck – core.js
   Kern: Speicher, Hell/Dunkel, Symbole, Farben und Design, Belohnungen, Navigation, Bestätigungsdialog
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   KERN: Speicher (Storage)
   Alle Daten liegen in EINEM Objekt mit Version und IDs.
   Später kann dieses Objekt 1:1 an ein Backend gesendet werden.
   Nur diese zwei Funktionen greifen auf den Browserspeicher zu.
   ===================================================== */
const STORAGE_KEY = "lernapp.v1";

function defaultData(){
  return { version:1, settings:{ theme:null, design:"frisch", accent:"blau", rewards:true, motion:true, tutorialDone:false, features:{ countdown:true, lerntyp:true, lernmittel:true, ziele:true, wiki:true, fokus:true }, focus:{ work:25, brk:5 } },
           exams:[], tasks:[], learnTypeResult:null, materials:[], cards:[], goals:[], reflections:[], stats:{ days:[], minutes:{} } };
}
function loadData(){
  try{ const raw = localStorage.getItem(STORAGE_KEY);
       if(!raw) return defaultData();
       const d = Object.assign(defaultData(), JSON.parse(raw));
       d.settings = Object.assign(defaultData().settings, d.settings);   // neue Einstellungen für alte Daten ergänzen
       d.settings.features = Object.assign(defaultData().settings.features, d.settings.features);   // neue Bereiche sind sichtbar
       d.settings.focus = Object.assign({ work:25, brk:5 }, d.settings.focus);
       d.stats = Object.assign({ days:[], minutes:{} }, d.stats);
       return d;
  }catch(e){ return defaultData(); }          // Speicher gesperrt oder kaputt
}
function saveData(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }catch(e){}
}
function storageOk(){   // prüft, ob der Browser Speichern erlaubt
  try{ localStorage.setItem("lernapp.test","1"); localStorage.removeItem("lernapp.test"); return true; }
  catch(e){ return false; }
}
function newId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

const data = loadData();

/* =====================================================
   KERN: Design (hell/dunkel)
   Ohne eigene Wahl folgt die App dem Gerät.
   ===================================================== */
function applyTheme(){
  const dark = data.settings.theme
    ? data.settings.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
document.getElementById("btnTheme").onclick = () => {
  const isDark = document.documentElement.dataset.theme === "dark";
  data.settings.theme = isDark ? "light" : "dark";
  saveData(); applyTheme();
};
applyTheme();

/* =====================================================
   KERN: Symbole (SVG, Strichstärke 2, Farbe = Textfarbe)
   icon(name, size) liefert ein Element; <i data-ic="name"> im HTML wird beim Start gefüllt.
   Es werden nur feste Symbole eingesetzt, keine Nutzereingaben.
   ===================================================== */
const ICONS = {
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  contrast:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  sliders:'<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  note:'<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  pdf:'<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5"/><text x="12" y="17.5" text-anchor="middle" font-size="6" font-weight="700" fill="currentColor" stroke="none">PDF</text>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  cards:'<rect x="3" y="7" width="14" height="13" rx="2.5"/><path d="M7 7V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.4-2.1-.7-1.2.1-2.4 1.5-2.4H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10" cy="7" r="1.1"/><circle cx="15" cy="7.5" r="1.1"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  sparkle:'<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  disk:'<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
  left:'<path d="M15 5l-7 7 7 7"/>',
  right:'<path d="M9 5l7 7-7 7"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  down:'<path d="M5 9l7 7 7-7"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
  circle:'<circle cx="12" cy="12" r="9"/>',
  circlecheck:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  flame:'<path d="M12 3c1 3.5 5 5.6 5 10a5 5 0 0 1-10 0c0-2.6 1.5-4.1 2.5-5 .3 1.5 1 2.5 2 3 .4-3-1-5.6.5-8z"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>'
};
function iconSvg(name){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + '</svg>';
}
function icon(name, size){
  const e = document.createElement("span"); e.className = "ic"; e.innerHTML = iconSvg(name);
  if(size){ e.style.width = size + "px"; e.style.height = size + "px"; }
  return e;
}
document.querySelectorAll("[data-ic]").forEach(e => { e.classList.add("ic"); e.innerHTML = iconSvg(e.dataset.ic); });

/* =====================================================
   KERN: Farben und Design
   Palette: Akzentfarbe der App und Farbe pro Prüfung (Lernmittel und Karten übernehmen sie).
   Designs: "frisch" (farbig, lebendig) und "ruhig" (sachlich, wenig Farbe), unabhängig von Hell/Dunkel.
   ===================================================== */
const PALETTE = [["blau", "Blau"], ["violett", "Violett"], ["gruen", "Grün"], ["orange", "Orange"], ["rot", "Rot"], ["tuerkis", "Türkis"]];
const PALETTE_KEYS = PALETTE.map(p => p[0]);
function examKey(ex){   // Farbe einer Prüfung; ohne eigene Wahl stabil aus der ID abgeleitet
  if(ex && PALETTE_KEYS.includes(ex.color)) return ex.color;
  let h = 0; const id = (ex && ex.id) || "";
  for(let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE_KEYS[h % PALETTE_KEYS.length];
}
function examDot(examId){   // kleiner Farbpunkt für Listen (oder null ohne Prüfung)
  const ex = examId && data.exams.find(e => e.id === examId);
  if(!ex) return null;
  const d = document.createElement("span"); d.className = "dot"; d.style.background = "var(--pc-" + examKey(ex) + ")";
  return d;
}
const Look = (() => {
  const DESIGNS = [["frisch", "Frisch", "Farbig und lebendig."], ["ruhig", "Ruhig", "Sachlich, mit wenig Farbe."]];
  const THEMES = [[null, "Automatisch"], ["light", "Hell"], ["dark", "Dunkel"]];
  function apply(){
    const s = data.settings, root = document.documentElement, k = PALETTE_KEYS.includes(s.accent) ? s.accent : "blau";
    root.dataset.look = s.design === "ruhig" ? "ruhig" : "frisch";
    root.dataset.motion = s.motion === false ? "off" : "on";
    root.style.setProperty("--accent", "var(--pc-" + k + ")"); root.style.setProperty("--accent-text", "var(--pt-" + k + ")");
  }
  function build(box, full){   // Auswahl für Design, Akzentfarbe und Helligkeit (full: auch Belohnungen und Animationen)
    box.textContent = ""; const s = data.settings;
    const label = t => { const l = document.createElement("small"); l.textContent = t; l.style.cssText = "display:block;color:var(--muted);margin:12px 0 6px"; box.appendChild(l); };
    const seg = (items, current, onPick) => {
      const d = document.createElement("div"); d.className = "seg";
      items.forEach(([v, text]) => { const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.setAttribute("aria-pressed", v === current); b.onclick = () => onPick(v); d.appendChild(b); });
      box.appendChild(d);
    };
    const redo = () => { saveData(); apply(); applyTheme(); build(box, full); };
    label("Design");
    seg(DESIGNS.map(d => [d[0], d[1]]), s.design === "ruhig" ? "ruhig" : "frisch", v => { s.design = v; redo(); });
    const hint = document.createElement("p"); hint.className = "lt-desc"; hint.style.marginTop = "6px";
    hint.textContent = DESIGNS.find(d => d[0] === (s.design === "ruhig" ? "ruhig" : "frisch"))[2]; box.appendChild(hint);
    label("Akzentfarbe");
    const sw = document.createElement("div"); sw.className = "swatches";
    PALETTE.forEach(([k, name]) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "sw"; b.style.background = "var(--pc-" + k + ")";
      b.setAttribute("aria-label", name); b.setAttribute("aria-pressed", k === (PALETTE_KEYS.includes(s.accent) ? s.accent : "blau"));
      b.onclick = () => { s.accent = k; redo(); }; sw.appendChild(b);
    });
    box.appendChild(sw);
    label("Helligkeit");
    seg(THEMES, s.theme || null, v => { s.theme = v; redo(); });
    if(full){
      label("Belohnungen (Lernserie und Erfolgsmeldungen)");
      seg([[true, "An"], [false, "Aus"]], s.rewards !== false, v => { s.rewards = v; redo(); });
      label("Animationen");
      seg([[true, "An"], [false, "Aus"]], s.motion !== false, v => { s.motion = v; redo(); });
    }
  }
  return { apply, build };
})();
Look.apply();

/* =====================================================
   KERN: Belohnungen (Lernserie und kurze Erfolgsmeldungen)
   Ein Lerntag zählt, sobald man eine Karte übt oder eine Aufgabe abschließt.
   data.stats.days = Liste der Lerntage (JJJJ-MM-TT, höchstens 90).
   Mit settings.rewards = false werden keine Meldungen gezeigt.
   ===================================================== */
const Rewards = (() => {
  const pad = v => String(v).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const on = () => data.settings.rewards !== false;
  function streak(){   // Tage in Folge bis heute (oder bis gestern, wenn heute noch nicht gelernt)
    const days = new Set(data.stats.days), d = new Date(), today = days.has(iso(d));
    if(!today) d.setDate(d.getDate() - 1);
    let n = 0;
    while(days.has(iso(d))){ n++; d.setDate(d.getDate() - 1); }
    return { n, today };
  }
  let timer = null;
  function toast(text, ic, force){   // force: auch zeigen, wenn Belohnungen aus sind (z. B. Timer, Hinweise)
    if(!on() && !force) return;
    const t = document.getElementById("toast"); t.textContent = "";
    t.append(icon(ic || "check", 22), document.createTextNode(text));
    t.hidden = true; void t.offsetWidth; t.hidden = false;   // Animation neu starten
    clearTimeout(timer); timer = setTimeout(() => { t.hidden = true; }, 2800);
  }
  function activity(msg){   // Lernaktivität melden: Serie zählen, ggf. kurz loben
    const t = iso(new Date()), isNew = !data.stats.days.includes(t);
    if(isNew){ data.stats.days.push(t); data.stats.days = data.stats.days.slice(-90); saveData(); }
    if(isNew){ const n = streak().n; toast(n > 1 ? "Lernserie: " + n + " Tage in Folge" : "Erster Lerntag geschafft", "flame"); }
    else if(msg) toast(msg, "check");
  }
  return { on, streak, toast, activity };
})();

/* =====================================================
   KERN: Navigation (Tabs)
   ===================================================== */
function showView(name){
  document.querySelectorAll("main section").forEach(s => s.hidden = (s.id !== "view-" + name));
  document.querySelectorAll(".tab").forEach(t => {
    if(t.dataset.view === (name === "plan" ? "countdown" : name)) t.setAttribute("aria-current","page"); else t.removeAttribute("aria-current");
  });
  setMenu(false);
  if(name === "home") Home.render();
  if(name === "lernmittel") Lernmittel.render();
  if(name === "ziele") Ziele.render();
  if(name === "fokus") Fokus.render();
  if(name === "settings"){ Backup.render(); Look.build(document.getElementById("lookBox"), true); }
  window.scrollTo(0,0);
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => showView(t.dataset.view));

document.getElementById("brand").onclick = () => showView("home");   // Logo = zurück zur Startseite

/* Seitenmenü auf- und zuklappen */
const drawer = document.getElementById("drawer"), scrim = document.getElementById("scrim"), btnMenu = document.getElementById("btnMenu");
function setMenu(open){
  document.documentElement.classList.toggle("menu-open", open);   // Seite dahinter fest
  drawer.classList.toggle("open", open);
  scrim.classList.toggle("open", open);
  btnMenu.setAttribute("aria-expanded", open);
}
const isDesktop = () => matchMedia("(min-width:900px)").matches;
function applyNav(){   // Desktop: Seitenmenü eingeklappt oder sichtbar (gespeichert)
  const collapsed = !!data.settings.navCollapsed;
  document.documentElement.classList.toggle("nav-collapsed", collapsed);
  if(isDesktop()) btnMenu.setAttribute("aria-expanded", !collapsed);
}
btnMenu.onclick = () => {
  if(isDesktop()){ data.settings.navCollapsed = !data.settings.navCollapsed; saveData(); applyNav(); }
  else setMenu(!drawer.classList.contains("open"));   // Handy: Menü als Schublade
};
applyNav();

/* Datumsfelder: Kalender schon beim Antippen des Feldes öffnen
   (manche Android-Browser markieren sonst nur „TT“ oder „JJJJ“) */
document.addEventListener("click", e => {
  const el = e.target;
  if(el instanceof HTMLInputElement && el.type === "date" && typeof el.showPicker === "function"){
    try{ el.showPicker(); }catch(err){}
  }
});
scrim.onclick = () => setMenu(false);

/* Fenster und Menü: Wischen bewegt nie die Seite dahinter.
   guardScroll: Fenster (scroller) dürfen selbst scrollen, an ihren Grenzen und außerhalb passiert nichts. */
function guardScroll(overlay, scroller){
  if(!overlay) return;
  let startY = 0;
  overlay.addEventListener("touchstart", e => { if(e.touches.length === 1) startY = e.touches[0].clientY; }, { passive:true });
  overlay.addEventListener("touchmove", e => {
    if(e.touches.length > 1) return;   // Zoomen mit zwei Fingern bleibt erlaubt
    const sc = typeof scroller === "function" ? scroller() : scroller;
    if(sc && sc.contains(e.target) && sc.scrollHeight > sc.clientHeight + 1){
      const dy = e.touches[0].clientY - startY, atTop = sc.scrollTop <= 0, atBottom = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1;
      if(!((dy > 0 && atTop) || (dy < 0 && atBottom))) return;   // normales Scrollen im Fenster
    }
    if(e.cancelable) e.preventDefault();
  }, { passive:false });
  overlay.addEventListener("wheel", e => {   // Maus und Touchpad ebenso
    const sc = typeof scroller === "function" ? scroller() : scroller;
    if(sc && sc.contains(e.target) && sc.scrollHeight > sc.clientHeight + 1){
      const can = e.deltaY < 0 ? sc.scrollTop > 0 : sc.scrollTop + sc.clientHeight < sc.scrollHeight - 1;
      if(can) return;
    }
    if(e.cancelable) e.preventDefault();
  }, { passive:false });
}
guardScroll(scrim, null);
guardScroll(document.getElementById("tour"), () => document.getElementById("tourTip"));
guardScroll(document.getElementById("tutorial"), () => document.querySelector("#tutorial .sheet"));
guardScroll(document.getElementById("dialog"), () => document.querySelector("#dialog .sheet"));
guardScroll(document.getElementById("addSheet"), () => document.querySelector("#addSheet .sheet"));
guardScroll(document.getElementById("viewer"), () => document.getElementById("viewerBody"));

/* Menü: Gummiband (Bounce) an den Grenzen. Passt der Inhalt ganz hinein, federt er bei jedem Wischen leicht mit
   und springt zurück. Die Seite rechts bleibt still. */
(() => {
  const inner = document.getElementById("drawerInner");
  const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
  let startY = 0;
  drawer.addEventListener("touchstart", e => { if(e.touches.length === 1){ startY = e.touches[0].clientY; inner.style.transition = "none"; } }, { passive:true });
  drawer.addEventListener("touchmove", e => {
    if(e.touches.length > 1) return;
    const dy = e.touches[0].clientY - startY, atTop = drawer.scrollTop <= 0, atBottom = drawer.scrollTop + drawer.clientHeight >= drawer.scrollHeight - 1;
    if((dy > 0 && atTop) || (dy < 0 && atBottom)){   // an der Grenze: Gummiband, nie die Seite
      if(!calm()) inner.style.transform = "translateY(" + (Math.sign(dy) * Math.min(110, Math.abs(dy) * 0.4)) + "px)";
      if(e.cancelable) e.preventDefault();
    } else inner.style.transform = "";
  }, { passive:false });
  const back = () => { inner.style.transition = calm() ? "none" : "transform .5s cubic-bezier(.25,1.6,.5,1)"; inner.style.transform = ""; };
  drawer.addEventListener("touchend", back); drawer.addEventListener("touchcancel", back);
  drawer.addEventListener("wheel", e => {   // Maus und Touchpad: nur das Menü scrollt, nie die Seite daneben
    const can = e.deltaY < 0 ? drawer.scrollTop > 0 : drawer.scrollTop + drawer.clientHeight < drawer.scrollHeight - 1;
    if(!can && e.cancelable) e.preventDefault();
  }, { passive:false });
})();

/* Filter für Lernmittel und Lernkarten: nach Prüfung, Fach oder "ohne Zuordnung" */
function inExam(m, ex){   // gehört zur Prüfung: direkt zugeordnet oder freies Fach mit gleichem Namen
  return !!ex && (m.examId === ex.id || (!m.examId && !!m.subject && m.subject.toLowerCase() === ex.subject.toLowerCase()));
}
function filterOptions(items){   // [Wert, Beschriftung] aus dem, was es wirklich gibt
  const opts = [["all", "Alle (" + items.length + ")"]];
  [...data.exams].sort((a,b) => a.date.localeCompare(b.date)).forEach(ex => {
    const n = items.filter(m => inExam(m, ex)).length;
    if(n) opts.push(["exam:" + ex.id, "Prüfung: " + ex.subject + " (" + n + ")"]);
  });
  const subjects = {};
  items.filter(m => !m.examId && m.subject && !data.exams.some(e => e.subject.toLowerCase() === m.subject.toLowerCase())).forEach(m => {
    const k = m.subject.toLowerCase();
    (subjects[k] = subjects[k] || { name:m.subject, n:0 }).n++;
  });
  Object.keys(subjects).sort().forEach(k => opts.push(["subject:" + k, "Fach: " + subjects[k].name + " (" + subjects[k].n + ")"]));
  const none = items.filter(m => !m.examId && !m.subject).length;
  if(none) opts.push(["none", "Ohne Zuordnung (" + none + ")"]);
  return opts;
}
function filterMatch(m, f){
  if(f === "all") return true;
  if(f === "none") return !m.examId && !m.subject;
  if(f.startsWith("exam:")) return inExam(m, data.exams.find(e => e.id === f.slice(5)));
  if(f.startsWith("subject:")) return !m.examId && (m.subject || "").toLowerCase() === f.slice(8);
  return true;
}
function fillExamSelect(sel){   // Auswahlfeld "Prüfung" füllen
  sel.textContent = "";
  const none = document.createElement("option"); none.value = ""; none.textContent = "Keine Prüfung"; sel.appendChild(none);
  [...data.exams].sort((a,b) => a.date.localeCompare(b.date)).forEach(ex => {
    const o = document.createElement("option"); o.value = ex.id;
    o.textContent = ex.subject + " (" + new Date(ex.date + "T00:00").toLocaleDateString("de-DE", { day:"numeric", month:"short" }) + ")";
    sel.appendChild(o);
  });
}

/* Suche in Lernmitteln und Lernkarten (E10): ein gemeinsamer Suchbegriff */
let searchQuery = "";
function searchMatch(fields){   // true, wenn kein Suchbegriff gesetzt ist oder ein Feld ihn enthält
  if(!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return fields.some(f => (f || "").toLowerCase().includes(q));
}

/* Element antippbar machen (Maus, Touch und Tastatur) */
function makeTappable(e, fn, label){
  e.classList.add("tappable"); e.tabIndex = 0; e.setAttribute("role", "button"); e.setAttribute("aria-label", label);
  e.onclick = fn;
  e.onkeydown = ev => { if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); fn(); } };
}

/* Bereiche ein-/ausblenden (Auswahl am Ende des Tutorials) */
function applyFeatures(){
  const f = data.settings.features;
  document.querySelectorAll(".tab[data-view], [data-go], [data-add]").forEach(b => {
    const key = b.dataset.view || b.dataset.go || b.dataset.add;
    if(key in f) b.hidden = !f[key];
  });
  const addBtn = document.getElementById("homeAdd");   // ohne Prüfungen und Lernmittel gibt es nichts hinzuzufügen
  if(addBtn) addBtn.hidden = !(f.countdown || f.lernmittel);
  const cur = [...document.querySelectorAll("main section")].find(x => !x.hidden);
  const key = cur ? cur.id.replace("view-","") : "";
  if((key in f && !f[key]) || (key === "plan" && !f.countdown)) showView("home"); else Home.render();
}

/* =====================================================
   KERN: Bestätigungsdialog   usage: if(await askConfirm("Text", "Löschen")) ...
   ===================================================== */
let dialogDone = null;
function askConfirm(text, okLabel){
  return new Promise(resolve => {
    const dlg = document.getElementById("dialog"), ok = document.getElementById("dlgOk"), no = document.getElementById("dlgCancel");
    document.getElementById("dlgText").textContent = text;
    ok.textContent = okLabel || "OK";
    dlg.hidden = false; no.focus();
    dialogDone = v => { dlg.hidden = true; dialogDone = null; resolve(v); };
    ok.onclick = () => dialogDone(true);
    no.onclick = () => dialogDone(false);
  });
}
