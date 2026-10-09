/* Lernen unter Prüfungsdruck – lernkarten.js
   Lernkarten: erstellen, üben, Verlauf, Archiv
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Lernkarten (E9: Karten aus Notizen, Übungsmodus)
   Eine Karte = { id, front, back, examId|null, subject, sourceId|null,
                  known:true|false|null, tries, history:[{at, answer, ok}], archived:true|false, createdAt }
   Archiv: zweimal hintereinander gewusst = gelernt (archived); einmal nicht gewusst = wieder zu lernen.
   Sie erscheinen im Lernmittel-Tab unter "Lernkarten".
   Notizen erzeugen Karten über Lernkarten.quickForm(notiz).
   E10 verknüpft Karten mit dem Countdown.
   ===================================================== */
const Lernkarten = (() => {
  const $ = id => document.getElementById(id);
  function h(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;
    return e;
  }
  function bar(frac){
    const b = h("div", "bar"), i = h("i"); i.style.width = Math.round(frac * 100) + "%";
    b.appendChild(i); return b;
  }
  let filter = "all", queue = [], idx = 0, flipped = false, knownCount = 0, wrong = [], myAnswer = "";
  let view = "open", archivedNow = 0;   // Liste: "open" (zu lernen) oder "archive"; neu archivierte Karten in dieser Übung

  function create(front, back, examId, subject, sourceId){
    data.cards.push({ id:newId(), front, back, examId:examId || null, subject:examId ? "" : (subject || ""),
                      sourceId:sourceId || null, known:null, tries:0, history:[], createdAt:new Date().toISOString() });
    saveData(); Lernmittel.renderTabs();
  }

  /* ---- Schnellformular unter einer Notiz ---- */
  function taField(label, rows){
    const wrap = h("div", "field"), l = h("label", "", label), t = document.createElement("textarea");
    t.id = "ta" + newId(); l.htmlFor = t.id; t.rows = rows; t.maxLength = 1000; t.style.minHeight = "70px";
    wrap.append(l, t); return [wrap, t];
  }
  function quickForm(m){
    const box = h("div", "card"), msg = h("p", "lt-desc", "");
    const [w1, front] = taField("Frage", 2), [w2, back] = taField("Antwort", 3);
    msg.setAttribute("role", "status");
    const take = t => {   // markierten Text übernehmen
      const sel = (window.getSelection ? window.getSelection().toString() : "").trim();
      if(!sel){ msg.textContent = "Markiere zuerst Text in der Notiz oben."; return; }
      t.value = sel.slice(0, t.maxLength); msg.textContent = "";
    };
    const row = h("div", "pbtns");
    const b1 = h("button", "secondary", "Auswahl als Frage"), b2 = h("button", "secondary", "Auswahl als Antwort");
    b1.onclick = () => take(front); b2.onclick = () => take(back);
    row.append(b1, b2);
    const save = h("button", "primary", "Karte speichern"); save.style.marginTop = "12px";
    save.onclick = () => {
      if(!front.value.trim() || !back.value.trim()){ msg.textContent = "Bitte fülle Frage und Antwort aus."; return; }
      create(front.value.trim(), back.value.trim(), m.examId, m.subject, m.id);
      front.value = ""; back.value = "";
      msg.textContent = "Gespeichert ✓ (" + data.cards.filter(c => c.sourceId === m.id).length + " Karten aus dieser Notiz)";
    };
    box.append(h("h3", "", "Lernkarte aus dieser Notiz"),
      h("p", "lt-desc", "Markiere Text oben und tippe auf „Auswahl als Frage“ oder „Auswahl als Antwort“. Oder schreibe selbst."),
      w1, w2, row, save, msg);
    return box;
  }

  /* ---- Formular im Lernkarten-Bereich ---- */
  function openForm(){
    ["ckFront", "ckBack", "ckSubject"].forEach(id => $(id).value = "");
    fillExamSelect($("ckExam")); $("ckSubjectWrap").hidden = false; $("ckError").textContent = "";
    $("ckForm").hidden = false; $("ckNew").hidden = true; $("ckFront").focus();
  }
  function closeForm(){ $("ckForm").hidden = true; $("ckNew").hidden = false; }
  function save(){
    const front = $("ckFront").value.trim(), back = $("ckBack").value.trim(), err = $("ckError");
    if(!front){ err.textContent = "Bitte schreibe eine Frage."; $("ckFront").focus(); return; }
    if(!back){ err.textContent = "Bitte schreibe eine Antwort."; $("ckBack").focus(); return; }
    create(front, back, $("ckExam").value, $("ckSubject").value.trim(), null);
    closeForm(); render();
  }

  /* ---- Verlauf einer Karte: frühere Übungen mit eigener Antwort ---- */
  function historyView(c){
    const det = document.createElement("details"); det.style.marginTop = "8px";
    const sum = document.createElement("summary");
    sum.textContent = "Verlauf (" + c.history.length + ")"; sum.style.cssText = "color:var(--accent);cursor:pointer;padding:6px 0";
    det.appendChild(sum);
    [...c.history].reverse().forEach(x => {
      const row = h("div"); row.style.cssText = "background:var(--bg);border-radius:12px;padding:10px 12px;margin-top:6px";
      const when = new Date(x.at).toLocaleString("de-DE", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
      const meta = h("small", "", when + " · " + (x.ok ? "✓ gewusst" : "✗ nicht gewusst")); meta.style.cssText = "display:block;color:var(--muted)";
      const t = h("div", "", x.answer || "Keine eigene Antwort notiert.");
      t.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;margin-top:4px" + (x.answer ? "" : ";color:var(--muted)");
      row.append(meta, t); det.appendChild(row);
    });
    return det;
  }

  /* ---- Liste ---- */
  function render(){
    const list = $("ckList"), pr = $("ckPractice"), all = data.cards, sel = $("ckFilter");
    list.textContent = ""; pr.textContent = ""; sel.textContent = ""; $("ckFilterWrap").hidden = !all.length;
    if(!all.length){
      filter = "all";
      list.appendChild(h("div", "card empty", "Noch keine Lernkarten. Öffne eine Notiz und erstelle dort Karten, oder tippe oben auf „Neue Lernkarte“."));
      return;
    }
    const opts = filterOptions(all);
    if(!opts.some(o => o[0] === filter)) filter = "all";
    opts.forEach(([v, label]) => { const o = document.createElement("option"); o.value = v; o.textContent = label; sel.appendChild(o); });
    sel.value = filter;

    const exSubj = c => { const e = c.examId && data.exams.find(x => x.id === c.examId); return e ? e.subject : ""; };
    const shown = all.filter(c => filterMatch(c, filter) && searchMatch([c.front, c.back, c.subject, exSubj(c)]));
    if(!shown.length){ list.appendChild(h("div", "card empty", "Keine Treffer.")); return; }
    // Zu lernen und Archiv getrennt anzeigen
    const toLearn = shown.filter(c => !c.archived), arch = shown.filter(c => c.archived);
    const seg = h("div", "seg");
    [["open", "Zu lernen (" + toLearn.length + ")"], ["archive", "Archiv (" + arch.length + ")"]].forEach(([k, label]) => {
      const b = h("button", "", label); b.type = "button"; b.setAttribute("aria-pressed", k === view);
      b.onclick = () => { view = k; render(); }; seg.appendChild(b);
    });
    pr.appendChild(seg);
    const cur = view === "archive" ? arch : toLearn;
    if(cur.length){
      const box = h("div", "card");
      const b1 = h("button", "primary", (view === "archive" ? "Archiv wiederholen (" : "Üben (") + cur.length + ")");
      b1.style.width = "100%"; b1.onclick = () => practice(cur);
      box.appendChild(b1);
      if(data.cards.length >= 2){
        const bq = h("button", "ghost", "Quiz (Multiple Choice)"); bq.style.width = "100%"; bq.onclick = () => Quiz.start(cur); box.appendChild(bq);
      }
      pr.appendChild(box);
    } else {
      list.appendChild(h("div", "card empty", view === "archive"
        ? "Noch nichts im Archiv. Eine Karte kommt hierher, wenn du sie zweimal hintereinander gewusst hast."
        : "Alles gelernt! Im Archiv kannst du deine Karten wiederholen."));
    }

    [...cur].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).forEach(c => {
      const exam = c.examId && data.exams.find(e => e.id === c.examId);
      const where = exam ? "Prüfung: " + exam.subject : c.subject ? "Fach: " + c.subject : "Ohne Zuordnung";
      const status = c.archived ? "im Archiv" : c.known === true ? "✓ gewusst" : c.known === false ? "✗ noch nicht gewusst" : "neu";
      const card = h("div", "card");
      const meta = h("small", "", where + " · " + status), dot = examDot(c.examId);
      if(dot) meta.prepend(dot);
      card.append(h("b", "", c.front), h("p", "ck-back", c.back), meta);
      card.lastChild.style.cssText = "display:block;color:var(--muted);margin-top:8px";
      if((c.history || []).length) card.appendChild(historyView(c));
      const act = h("div", "actions"), d = h("button", "ghost danger", "Löschen");
      const mv = h("button", "ghost", c.archived ? "Wieder lernen" : "Ins Archiv");
      mv.onclick = () => { c.archived = !c.archived; saveData(); render(); };
      d.onclick = async () => {
        if(!(await askConfirm("Diese Lernkarte löschen?", "Löschen"))) return;
        data.cards = data.cards.filter(x => x.id !== c.id); saveData(); Lernmittel.renderTabs(); render();
      };
      act.append(mv, d); card.appendChild(act); list.appendChild(card);
    });
  }

  /* ---- Üben (nutzt die Vollbild-Ansicht der Lernmittel) ---- */
  function shuffle(a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function practice(list){
    if(!list.length) return;
    queue = shuffle([...list]); idx = 0; flipped = false; knownCount = 0; wrong = []; myAnswer = ""; archivedNow = 0;
    $("viewerTitle").textContent = "Üben"; $("viewer").hidden = false; showCard();
  }
  function answer(ok){
    const c = queue[idx]; c.known = ok; c.tries = (c.tries || 0) + 1;
    c.history = c.history || [];
    c.history.push({ at:new Date().toISOString(), answer:myAnswer, ok });   // Verlauf: eigene Antwort und Ergebnis
    if(c.history.length > 30) c.history.shift();
    // Archiv: zweimal hintereinander gewusst -> gelernt; nicht gewusst -> wieder zu lernen
    const last2 = c.history.slice(-2);
    if(!ok) c.archived = false;
    else if(!c.archived && last2.length === 2 && last2.every(x => x.ok)){ c.archived = true; archivedNow++; }
    myAnswer = ""; saveData();
    Rewards.activity(null);   // zählt den Lerntag
    if(ok) knownCount++; else wrong.push(c);
    idx++; flipped = false; showCard();
  }
  function showCard(){
    const body = $("viewerBody"); body.textContent = "";
    if(idx >= queue.length){ finish(body); return; }
    const c = queue[idx], head = h("div", "card");
    head.append(h("small", "", "Karte " + (idx + 1) + " von " + queue.length), bar(idx / queue.length));
    const card = h("div", "card");
    card.appendChild(h("small", "", flipped ? "Antwort" : "Frage"));
    if(flipped) card.appendChild(h("p", "lt-desc", "Frage: " + c.front));
    card.appendChild(h("div", flipped ? "flash flip" : "flash", flipped ? c.back : c.front));
    if(flipped && myAnswer){
      const mine = h("p", "lt-desc", "Deine Antwort: " + myAnswer); mine.style.whiteSpace = "pre-wrap"; card.appendChild(mine);
    }
    body.append(head, card);
    if(!flipped){
      const wrap = h("div", "field"), l = h("label", "", "Deine Antwort (optional)"), ta = document.createElement("textarea");
      ta.id = "myAns"; l.htmlFor = "myAns"; ta.maxLength = 2000; ta.style.minHeight = "90px"; ta.value = myAnswer;
      ta.placeholder = "Schreibe deine Antwort auf, bevor du umdrehst.";
      wrap.append(l, ta); body.appendChild(wrap);
      const b = h("button", "primary", "Umdrehen"); b.style.width = "100%";
      b.onclick = () => { myAnswer = ta.value.trim(); flipped = true; showCard(); }; body.appendChild(b);
    } else {
      const row = h("div", "pbtns"), no = h("button", "secondary", "Nicht gewusst"), yes = h("button", "primary", "Gewusst");
      no.onclick = () => answer(false); yes.onclick = () => answer(true); row.append(no, yes); body.appendChild(row);
    }
  }
  function finish(body){
    $("viewerTitle").textContent = "Geschafft";
    const rate = queue.length ? knownCount / queue.length : 0;
    if(Rewards.on() && (rate >= 0.8 || archivedNow)){   // Erfolgsfeld mit Konfetti
      const cel = h("div", "celebrate"), conf = h("div", "confetti");
      for(let i = 0; i < 16; i++){
        const p = h("i"); p.style.left = Math.round(Math.random() * 96) + "%";
        p.style.background = "var(--pc-" + PALETTE_KEYS[i % PALETTE_KEYS.length] + ")";
        p.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s"; conf.appendChild(p);
      }
      const st = Rewards.streak().n;
      cel.append(conf, icon("trophy", 52), h("b", "", rate === 1 ? "Perfekt!" : "Stark gemacht!"),
        h("small", "", "Lernserie: " + st + (st === 1 ? " Tag" : " Tage")));
      body.appendChild(cel);
    }
    const c = h("div", "card"); c.style.textAlign = "center";
    c.append(h("h3", "", knownCount + " von " + queue.length + " gewusst"),
             h("p", "lt-desc", wrong.length ? "Übe die übrigen gleich nochmal." : "Super, du wusstest alle Karten!"));
    if(archivedNow) c.appendChild(h("p", "lt-desc", archivedNow + (archivedNow === 1 ? " Karte ist" : " Karten sind") + " jetzt im Archiv, weil du sie zweimal hintereinander gewusst hast."));
    body.appendChild(c);
    if(wrong.length){
      const b = h("button", "primary", "Nicht gewusste nochmal (" + wrong.length + ")"); b.style.cssText = "width:100%;margin-bottom:8px";
      b.onclick = () => practice(wrong); body.appendChild(b);
    }
    if(data.settings.features.ziele !== false){
      const rf = h("button", "secondary", "Kurz reflektieren"); rf.style.cssText = "width:100%;margin-bottom:8px;border:1.5px solid var(--field-border)";
      rf.onclick = () => { $("viewerClose").click(); Ziele.reflect(null); }; body.appendChild(rf);
    }
    const done = h("button", "ghost", "Fertig"); done.style.width = "100%"; done.onclick = () => $("viewerClose").click();
    body.appendChild(done);
  }

  function init(){
    $("ckNew").onclick = openForm; $("ckCancel").onclick = closeForm; $("ckSave").onclick = save;
    $("ckExam").onchange = () => { $("ckSubjectWrap").hidden = !!$("ckExam").value; };
    $("ckFilter").onchange = () => { filter = $("ckFilter").value; render(); };
  }
  return { init, render, quickForm, closeForm, setFilter: f => { filter = f; }, practiceOpen: () => practice(data.cards.filter(c => !c.archived)),
    practiceExam: id => {   // erst die Karten zum Lernen; sind alle gelernt, das Archiv
      const ex = data.exams.find(e => e.id === id), cs = data.cards.filter(c => inExam(c, ex)), todo = cs.filter(c => !c.archived);
      practice(todo.length ? todo : cs);
    } };
})();
