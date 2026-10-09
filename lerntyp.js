/* Lernen unter Prüfungsdruck – lerntyp.js
   Lerntyptest mit Auswertung und Tipps
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Lerntyptest (E5: Fragen und Auswertung, E6 ergänzt Tipps)
   Teil 1: Wie nimmst du Stoff am liebsten auf? (visuell, auditiv, Lesen/Schreiben, handelnd)
   Teil 2: Wie gut nutzt du Lernstrategien? (kognitiv, metakognitiv, Ressourcen)
   Ergebnis in data.learnTypeResult = { takenAt, answers[], types{}, strategy{} }
   ===================================================== */
const LernTest = (() => {
  const $ = id => document.getElementById(id);
  function h(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;
    return e;
  }

  /* ---- Inhalte ---- */
  const TYPES = {   // Reihenfolge = Reihenfolge der Antworten in PART1
    visuell:   ["Visuell", "Du lernst gut mit Bildern, Farben und Strukturen."],
    auditiv:   ["Auditiv", "Du lernst gut durch Hören, Sprechen und Erklären."],
    schreiben: ["Lesen und Schreiben", "Du lernst gut durch Lesen und Aufschreiben."],
    handelnd:  ["Handelnd", "Du lernst gut durch Ausprobieren und Üben."]
  };
  const TYPE_KEYS = Object.keys(TYPES);
  const GROUPS = {
    kognitiv:     ["Kognitive Strategien", "Wie du Stoff bearbeitest: wiederholen, ordnen, erklären, hinterfragen."],
    metakognitiv: ["Metakognitive Strategien", "Wie du dein Lernen planst, überwachst und anpasst."],
    ressourcen:   ["Ressourcen-Strategien", "Wie du Umgebung, Zeit und Aufmerksamkeit nutzt."]
  };
  /* ---- Strategietipps (E6) ---- */
  const TIPS_TYPE = {
    visuell: [
      "Zeichne Mindmaps und Schaubilder, statt nur Text zu lesen.",
      "Nutze Farben: eine Farbe pro Thema oder pro Art von Information (Definition, Beispiel, Formel).",
      "Mache aus Zusammenfassungen kleine Skizzen und gehe sie vor der Prüfung nochmal durch."
    ],
    auditiv: [
      "Erkläre den Stoff laut, als würdest du ihn einem Freund beibringen.",
      "Fragt euch gegenseitig ab und sprecht Unklares gemeinsam durch.",
      "Sprich Zusammenfassungen als Sprachnachricht auf und höre sie unterwegs an."
    ],
    schreiben: [
      "Schreibe Zusammenfassungen in eigenen Worten, statt Sätze abzuschreiben.",
      "Schreibe Lernkarten mit Frage vorne und Antwort hinten.",
      "Beantworte Übungsfragen schriftlich, ohne in die Unterlagen zu schauen."
    ],
    handelnd: [
      "Löse viele Aufgaben und Beispiele selbst, statt nur Lösungen zu lesen.",
      "Wende den Stoff praktisch an: nachbauen, vorführen oder ein Beispiel aus deinem Alltag suchen.",
      "Lerne in kurzen Blöcken und bewege dich dazwischen, zum Beispiel beim Wiederholen im Gehen."
    ]
  };
  const TIPS_GROUP = {
    kognitiv: [
      "Teste dich selbst, statt nur durchzulesen. Abfragen festigt Wissen besser als nochmal lesen.",
      "Ordne den Stoff: mit Überschriften, einer Mindmap oder einer Tabelle.",
      "Erkläre Zusammenhänge in eigenen Worten und frage dich: Stimmt das? Warum ist das so?"
    ],
    metakognitiv: [
      "Plane vorher, was du heute schaffen willst, und schreibe es auf. Der Lernplan in dieser App hilft dir dabei.",
      "Prüfe dich nach jedem Lernblock: Habe ich das wirklich verstanden? Wenn nicht, wiederhole genau das.",
      "Wenn eine Methode nicht klappt, wechsle bewusst zu einer anderen."
    ],
    ressourcen: [
      "Lege das Handy außer Reichweite und wähle einen festen, ruhigen Lernplatz.",
      "Verteile das Lernen auf mehrere Tage und mache nach 25 bis 45 Minuten eine kurze Pause.",
      "Setze dir kleine Ziele und belohne dich. So bleibst du auch bei anstrengendem Stoff dran."
    ]
  };

  const PART1 = [   // Antworten: visuell, auditiv, schreiben, handelnd
    ["Du musst einen neuen Begriff verstehen. Was hilft dir am meisten?",
      ["Eine Zeichnung oder ein Schaubild", "Wenn mir jemand ihn erklärt", "Wenn ich die Erklärung lese und aufschreibe", "Wenn ich ein Beispiel selbst ausprobiere"]],
    ["Wie merkst du dir Stoff für eine Prüfung am besten?",
      ["Mit Farben, Markierungen oder Mindmaps", "Indem ich ihn laut wiederhole oder erkläre", "Indem ich Zusammenfassungen oder Karteikarten schreibe", "Indem ich Aufgaben löse oder es praktisch übe"]],
    ["Woran erinnerst du dich in der Prüfung zuerst?",
      ["An das Bild oder die Skizze im Heft", "An die Erklärung, die ich gehört oder gesagt habe", "An meine Notizen und Formulierungen", "An das, was ich selbst gemacht habe"]],
    ["Wie lernst du am liebsten mit anderen?",
      ["Wir zeichnen oder skizzieren zusammen", "Wir sprechen den Stoff durch", "Wir tauschen Zusammenfassungen aus", "Wir üben gemeinsam Aufgaben"]],
    ["Du schaust ein Lernvideo. Was ist dir am wichtigsten?",
      ["Gute Bilder und Grafiken", "Eine klare, gut verständliche Stimme", "Folien oder Text zum Mitschreiben", "Dass ich dabei etwas ausprobieren kann"]],
    ["Du bekommst eine neue Anleitung. Was machst du zuerst?",
      ["Ich schaue mir die Bilder an", "Ich lasse sie mir erklären", "Ich lese sie genau durch", "Ich fange einfach an"]]
  ];
  const PART2 = [   // [Gruppe, Aussage]
    ["kognitiv", "Ich fasse Stoff in eigenen Worten zusammen oder ordne ihn, zum Beispiel als Mindmap."],
    ["metakognitiv", "Ich plane vor dem Lernen, was ich bis wann schaffen will."],
    ["ressourcen", "Ich lerne an einem ruhigen Platz und lege Ablenkungen wie das Handy weg."],
    ["kognitiv", "Ich teste mich selbst mit Fragen, statt den Stoff nur durchzulesen."],
    ["metakognitiv", "Ich merke beim Lernen, ob ich etwas wirklich verstanden habe."],
    ["ressourcen", "Ich verteile meine Lernzeit auf mehrere Tage und mache Pausen."],
    ["kognitiv", "Ich überlege, wo ich das Gelernte anwenden kann und ob es stimmt."],
    ["metakognitiv", "Wenn eine Lernmethode nicht klappt, probiere ich eine andere."],
    ["ressourcen", "Ich bleibe dran, auch wenn der Stoff anstrengend oder langweilig ist."]
  ];
  const SCALE = ["Trifft gar nicht zu", "Trifft eher nicht zu", "Trifft eher zu", "Trifft voll zu"];
  const TOTAL = PART1.length + PART2.length;

  /* ---- Zustand (nur im Arbeitsspeicher, bis der Test fertig ist) ---- */
  let running = false, step = 0, answers = [], msg = "";   // Teil 1: answers[i] = Liste (bis 2 Antworten)

  /* ---- Auswerten ---- */
  function compute(){
    const types = {}, strategy = {};
    TYPE_KEYS.forEach(k => types[k] = 0);
    Object.keys(GROUPS).forEach(k => strategy[k] = 0);
    PART1.forEach((_, i) => answers[i].forEach(idx => types[TYPE_KEYS[idx]]++));
    PART2.forEach(([g], i) => strategy[g] += answers[PART1.length + i]);
    return { takenAt:new Date().toISOString(), answers:[...answers], types, strategy };
  }
  function headline(types){   // Schwerpunkt oder Mischung
    const sorted = Object.entries(types).sort((a,b) => b[1] - a[1]);
    const close = sorted.filter(e => sorted[0][1] - e[1] <= 1).map(e => e[0]);
    if(close.length === 1) return { title:TYPES[close[0]][0], text:TYPES[close[0]][1] };
    if(close.length === 2) return { title:"Mischung: " + TYPES[close[0]][0] + " und " + TYPES[close[1]][0],
                                    text:TYPES[close[0]][1] + " " + TYPES[close[1]][1] };
    return { title:"Allrounder", text:"Dir liegen mehrere Wege. Probiere je nach Fach aus, was sich am besten anfühlt." };
  }
  function leading(types){   // bis zu 2 Typen, die vorne liegen
    const sorted = Object.entries(types).sort((a,b) => b[1] - a[1]);
    return sorted.filter(e => sorted[0][1] - e[1] <= 1).slice(0,2).map(e => e[0]);
  }
  function level(score){ return score >= 10 ? "Stark" : score >= 7 ? "Solide" : "Ausbaufähig"; }   // Wertebereich 3 bis 12

  /* ---- Anzeige ---- */
  function bar(frac){
    const b = h("div", "bar"), i = h("i"); i.style.width = Math.round(frac * 100) + "%";
    b.appendChild(i); return b;
  }
  function render(){
    const box = $("ltBox"); box.textContent = "";
    if(running) renderQuestion(box);
    else if(data.learnTypeResult) renderResult(box, data.learnTypeResult);
    else renderIntro(box);
  }
  function renderIntro(box){
    const c = h("div", "card");
    c.append(h("h3", "", "Wie lernst du am besten?"),
      h("p", "sub", "15 kurze Fragen, etwa 3 Minuten. Es gibt keine richtigen oder falschen Antworten."));
    const b = h("button", "primary", "Test starten"); b.onclick = start;
    c.appendChild(b); box.appendChild(c);
  }
  function start(){ running = true; step = 0; answers = []; msg = ""; render(); window.scrollTo(0,0); }

  function renderQuestion(box){
    const c = h("div", "card"), inPart1 = step < PART1.length;
    c.append(h("small", "", "Frage " + (step+1) + " von " + TOTAL), bar((step+1) / TOTAL));
    c.append(h("p", "sub", inPart1 ? "Wie nimmst du Stoff am liebsten auf?" : "Wie lernst du?"));
    c.lastChild.style.margin = "14px 0 4px";
    if(inPart1){
      const [q, opts] = PART1[step], sel = answers[step] || [];
      c.append(h("h3", "", q), h("p", "lt-desc", "Wähle 1 oder 2 Antworten."));
      // Reihenfolge je Frage drehen, damit keine Antwortart immer oben steht
      const shift = step % 4;
      [0,1,2,3].map(i => (i + shift) % 4).forEach(i => {
        const on = sel.includes(i);
        const b = h("button", "taskrow", (on ? "✓ " : "") + opts[i]);
        b.setAttribute("aria-pressed", on); b.onclick = () => toggle(i); c.appendChild(b);
      });
      const err = h("div", "error", msg); err.setAttribute("role", "alert"); err.style.marginTop = "8px"; c.appendChild(err);
      const next = h("button", "primary", "Weiter"); next.disabled = !sel.length;
      next.onclick = () => { msg = ""; step++; render(); }; c.appendChild(next);
    } else {
      c.appendChild(h("h3", "", PART2[step - PART1.length][1]));
      SCALE.forEach((label, i) => {
        const b = h("button", "taskrow", label); b.onclick = () => choose(i + 1); c.appendChild(b);
      });
    }
    if(step > 0){
      const back = h("button", "ghost", "‹ Zurück"); back.style.cssText = "margin-top:12px;padding:10px 14px";
      back.onclick = () => { msg = ""; step--; render(); }; c.appendChild(back);
    }
    box.appendChild(c);
  }
  function toggle(i){   // Antwort an- oder abwählen, höchstens 2 pro Frage
    const sel = answers[step] || [];
    if(sel.includes(i)){ answers[step] = sel.filter(x => x !== i); msg = ""; }
    else if(sel.length >= 2){ msg = "Höchstens 2 Antworten. Tippe eine an, um sie abzuwählen."; }
    else { answers[step] = [...sel, i]; msg = ""; }
    render();
  }
  function choose(value){
    answers[step] = value; msg = "";
    if(step < TOTAL - 1){ step++; render(); return; }
    data.learnTypeResult = compute(); saveData();
    running = false; render(); window.scrollTo(0,0);
  }

  function renderResult(box, r){
    const hl = headline(r.types), c1 = h("div", "card");
    c1.append(h("small", "", "Dein Lernzugang"), h("h3", "", hl.title), h("p", "lt-desc", hl.text));
    Object.keys(TYPES).forEach(k => {
      const row = h("div", "brow"); row.append(h("span", "", TYPES[k][0]), h("span", "", r.types[k] + " von " + PART1.length));
      c1.append(row, bar(r.types[k] / PART1.length));
    });
    const note = h("p", "prog", "Das ist eine Vorliebe, kein fester Typ. Am besten wirkt oft eine Mischung. Probiere auch andere Wege aus.");
    c1.appendChild(note); box.appendChild(c1);

    const c2 = h("div", "card");
    c2.append(h("small", "", "Dein Strategie-Profil"));
    Object.keys(GROUPS).forEach(k => {
      const row = h("div", "brow"); row.append(h("b", "", GROUPS[k][0]), h("span", "", level(r.strategy[k])));
      c2.append(row, bar(r.strategy[k] / 12), h("p", "lt-desc", GROUPS[k][1]));
    });
    box.appendChild(c2);

    // Tipps: zum Lernzugang und zur schwächsten Strategie-Gruppe
    const c3 = h("div", "card"); c3.appendChild(h("h3", "", "Tipps für dich"));
    const addTips = (title, list) => {
      const t = h("p", "", title); t.style.cssText = "font-weight:600;margin:14px 0 0";
      const ul = h("ul", "tips"); list.forEach(x => ul.appendChild(h("li", "", x)));
      c3.append(t, ul);
    };
    leading(r.types).forEach(k => addTips("Weil du so lernst: " + TYPES[k][0], TIPS_TYPE[k]));
    const weakest = Object.keys(GROUPS).sort((a,b) => r.strategy[a] - r.strategy[b])[0];
    if(r.strategy[weakest] >= 10){
      c3.appendChild(h("p", "lt-desc", "Alle drei Strategie-Bereiche sind bei dir stark. Bleib dabei und probiere ab und zu eine neue Methode aus."));
    } else addTips("Hier kannst du am meisten gewinnen: " + GROUPS[weakest][0], TIPS_GROUP[weakest]);
    box.appendChild(c3);

    const again = h("button", "ghost", "Test wiederholen"); again.onclick = start;
    box.appendChild(again);
  }
  function init(){ render(); }
  function reset(){ running = false; render(); }   // für den Rundgang
  function goalIdeas(){   // Vorschläge für Lernziele: aus dem Testergebnis oder allgemein
    const r = data.learnTypeResult;
    if(!r) return ["Jeden Tag 15 Minuten Lernkarten üben.", "Vor jeder Lerneinheit aufschreiben, was ich schaffen will.", "Beim Lernen das Handy in einen anderen Raum legen."];
    const ideas = leading(r.types).map(k => TIPS_TYPE[k][0]);
    const weakest = Object.keys(GROUPS).sort((a,b) => r.strategy[a] - r.strategy[b])[0];
    ideas.push(TIPS_GROUP[weakest][0]);
    return ideas.slice(0, 3);
  }
  return { init, reset, goalIdeas, summary: () => data.learnTypeResult ? headline(data.learnTypeResult.types).title : null };
})();
