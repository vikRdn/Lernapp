/* Lernen unter Prüfungsdruck – home.js
   Startseite (Dashboard)
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Startseite (nur Anzeige, ändert keine Daten)
   Zeigt: nächste Prüfung, was heute dran ist, Links zu den Modulen
   ===================================================== */
const Home = (() => {
  const C = Countdown, $ = id => document.getElementById(id);
  function h(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;
    return e;
  }
  function backupHint(){   // Erinnerung, wenn es Daten gibt und das letzte Backup fehlt oder alt ist
    const any = data.exams.length || data.materials.length || data.cards.length;
    const last = data.settings.lastBackup, age = last ? (Date.now() - new Date(last)) / 864e5 : Infinity;
    if(!any || age < 14) return;
    const c = h("div", "card");
    const hb = h("b", "", " Tipp: Backup erstellen"); hb.prepend(icon("disk", 18));
    c.append(hb,
      h("p", "lt-desc", last ? "Dein letztes Backup ist älter als 14 Tage." : "Sichere deine Daten, falls der Browser den Speicher leert."));
    const b = h("button", "ghost", "Zum Backup"); b.style.padding = "10px 0 0"; b.onclick = () => showView("settings");
    c.appendChild(b); $("homeBox").appendChild(c);
  }
  function render(){ renderMain(); backupHint(); }
  function bar(frac){
    const b = h("div", "bar"), f = h("i"); f.style.width = Math.round(frac * 100) + "%"; b.appendChild(f); return b;
  }
  function renderMain(){
    const box = $("homeBox"); box.textContent = "";
    $("homeSub").textContent = new Date().toLocaleDateString("de-DE", { weekday:"long", day:"numeric", month:"long" });
    const f = data.settings.features, today = C.todayIso();
    const upcoming = f.countdown ? data.exams.filter(e => C.daysUntil(e.date) >= 0).sort((a,b) => a.date.localeCompare(b.date)) : [];
    if(f.countdown){ nextExam(box, upcoming); if(upcoming.length){ moreExams(box, upcoming); todayCard(box, upcoming, today); } }
    overview(box, upcoming);
    lerntypLink();
  }

  /* Nächste Prüfung (oder Einladung, wenn es keine gibt) */
  function nextExam(box, upcoming){
    if(!upcoming.length){
      const c = h("div", "card empty");
      c.appendChild(h("p", "", data.exams.length ? "Keine anstehende Prüfung." : "Du hast noch keine Prüfung eingetragen."));
      const b = h("button", "primary", "Prüfung eintragen");
      b.onclick = () => { showView("countdown"); C.startAdd(); };
      c.appendChild(b); box.appendChild(c); return;
    }
    const ex = upcoming[0], t = C.dayText(C.daysUntil(ex.date)), tk = data.tasks.filter(x => x.examId === ex.id);
    const card = h("div", "card"), top = h("div", "exam"), left = h("div");
    card.style.borderLeft = "var(--bar,6px) solid var(--pc-" + examKey(ex) + ")";
    left.append(h("small", "", "Nächste Prüfung"), h("h3", "", ex.subject),
      h("small", "", C.dateOf(ex.date).toLocaleDateString("de-DE", { weekday:"long", day:"numeric", month:"long" })));
    const right = h("div", "days", t.big); right.appendChild(h("small", "", t.small));
    top.append(left, right); card.appendChild(top);
    if(tk.length){
      const done = tk.filter(x => x.status === "done").length;
      card.append(h("p", "prog", done + " von " + tk.length + " Aufgaben geschafft"), bar(done / tk.length));
    }
    const hint = h("p", "prog", "Tippen für den Lernplan ›"); hint.style.color = "var(--accent)";
    card.appendChild(hint);
    makeTappable(card, () => C.openPlan(ex.id), "Lernplan von " + ex.subject + " öffnen");
    box.appendChild(card);
  }

  /* Die zwei Prüfungen danach, kurz */
  function moreExams(box, upcoming){
    const more = upcoming.slice(1, 3);
    if(!more.length) return;
    const c = h("div", "card"); c.appendChild(h("h3", "", "Danach"));
    more.forEach(ex => {
      const n = C.daysUntil(ex.date), r = h("button", "taskrow");
      r.append(examDot(ex.id), document.createTextNode(ex.subject));
      r.appendChild(h("small", "", C.dateOf(ex.date).toLocaleDateString("de-DE", { weekday:"short", day:"numeric", month:"short" }) +
        " · " + (n === 0 ? "heute" : n === 1 ? "morgen" : "in " + n + " Tagen")));
      r.onclick = () => C.openPlan(ex.id); c.appendChild(r);
    });
    box.appendChild(c);
  }

  /* Heute dran: offene Aufgaben mit Datum heute oder früher */
  function todayCard(box, upcoming, today){
    const ids = upcoming.map(e => e.id);
    const todo = data.tasks.filter(x => x.status !== "done" && x.date && x.date <= today && ids.includes(x.examId))
                           .sort((a,b) => a.date.localeCompare(b.date));
    const c2 = h("div", "card"); c2.appendChild(h("h3", "", "Heute dran"));
    if(!todo.length){
      const any = data.tasks.some(x => ids.includes(x.examId));
      c2.appendChild(h("p", "sub", any ? "Heute ist nichts offen. Gut gemacht!" : "Erstelle bei deiner Prüfung einen Lernplan, dann siehst du hier, was heute dran ist."));
      c2.lastChild.style.margin = "6px 0 0";
    }
    todo.forEach(x => {
      const exam = data.exams.find(e => e.id === x.examId);
      const r = h("button", "taskrow", x.title);
      r.appendChild(h("small", "", exam.subject + (x.date < today ? " · überfällig" : " · heute")));
      r.onclick = () => C.openPlan(x.examId);
      c2.appendChild(r);
    });
    box.appendChild(c2);
  }

  /* Lernstand: Aufgaben, Lernmittel, Lernkarten und "Weiterlernen" */
  function overview(box, upcoming){
    const f = data.settings.features, tiles = [];
    if(Rewards.on()){
      const st = Rewards.streak();
      tiles.push(["Lernserie", st.n + (st.n === 1 ? " Tag" : " Tage"),
        st.today ? "heute schon gelernt" : st.n ? "heute lernen, dann läuft sie weiter" : "heute lernen und starten",
        null, () => { if(f.lernmittel && data.cards.some(c => !c.archived)) Lernkarten.practiceOpen(); }, "flame"]);
    }
    if(f.countdown){
      const ids = new Set(upcoming.map(e => e.id)), tk = data.tasks.filter(x => ids.has(x.examId));
      if(tk.length){
        const done = tk.filter(x => x.status === "done").length;
        tiles.push(["Aufgaben", done + " von " + tk.length, "geschafft", done / tk.length, () => C.openPlan(upcoming[0].id)]);
      }
    }
    if(f.lernmittel){
      const m = data.materials.length, n = data.cards.length, kn = data.cards.filter(c => c.archived).length;
      tiles.push(["Lernmittel", String(m), m === 1 ? "Eintrag" : "Einträge", null, () => { Lernmittel.setPane("material"); showView("lernmittel"); }]);
      tiles.push(["Lernkarten", n ? kn + " von " + n : "0", n ? "gelernt" : "Karten", n ? kn / n : null, () => { Lernmittel.setPane("cards"); showView("lernmittel"); }]);
    }
    if(!tiles.length) return;
    const c = h("div", "card"); c.appendChild(h("h3", "", "Dein Lernstand"));
    const grid = h("div", "tiles");
    tiles.forEach(([label, value, unit, frac, go, ic]) => {
      const t = h("button", "tile"), val = h("b", "", value);
      if(ic){ const i = icon(ic, 20); i.style.cssText += ";color:var(--accent);margin-right:6px"; val.prepend(i); }
      t.append(h("small", "", label), val, h("small", "", unit));
      if(frac !== null) t.appendChild(bar(frac));
      t.onclick = go; grid.appendChild(t);
    });
    c.appendChild(grid);
    const open = f.lernmittel ? data.cards.filter(x => !x.archived).length : 0;
    if(open){
      const b = h("button", "primary", "Weiterlernen (" + open + (open === 1 ? " Karte" : " Karten") + ")");
      b.style.cssText = "width:100%;margin-top:12px"; b.onclick = () => Lernkarten.practiceOpen(); c.appendChild(b);
    }
    box.appendChild(c);
  }

  /* Kurzlink zum Lerntyp: zeigt das Ergebnis, wenn es schon eines gibt */
  function lerntypLink(){
    const btn = document.querySelector('[data-go="lerntyp"]');
    if(!btn) return;
    const sum = LernTest.summary();
    btn.querySelector("b").textContent = sum ? "Dein Lernzugang" : "Lerntyp herausfinden";
    btn.querySelector("small").textContent = sum || "Wie lernst du am besten?";
  }
  function goAdd(k){   // direkt zum Formular der gewählten Art
    $("addSheet").hidden = true;
    showView(k);
    if(k === "countdown") C.startAdd(); else Lernmittel.add();
  }
  function init(){
    $("homeAdd").onclick = () => {
      const f = data.settings.features;
      if(f.countdown && f.lernmittel){ $("addSheet").hidden = false; $("addExam").focus(); }
      else goAdd(f.countdown ? "countdown" : "lernmittel");   // nur ein Bereich aktiv: direkt dorthin
    };
    $("addExam").onclick = () => goAdd("countdown");
    $("addMaterial").onclick = () => goAdd("lernmittel");
    $("addCancel").onclick = () => { $("addSheet").hidden = true; };
    $("addSheet").addEventListener("click", e => { if(e.target === $("addSheet")) $("addSheet").hidden = true; });
    document.addEventListener("keydown", e => { if(e.key === "Escape" && !$("addSheet").hidden && !dialogDone) $("addSheet").hidden = true; });
    document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => showView(b.dataset.go));
    document.addEventListener("visibilitychange", () => { if(!document.hidden && !$("view-home").hidden) render(); });
    render();
  }
  return { init, render };
})();
