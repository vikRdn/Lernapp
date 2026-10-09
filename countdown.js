/* Lernen unter Prüfungsdruck – countdown.js
   Prüfungs-Countdown und Lernplan (Board)
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Countdown (E2: anlegen, Restzeit, speichern)
   Eine Prüfung = { id, subject, date:"JJJJ-MM-TT", createdAt }
   E3: bearbeiten, löschen, Lernplan als Board
   Eine Aufgabe = { id, examId, title, status:"open"|"doing"|"done",
                    date:"JJJJ-MM-TT"|null, auto:true|false }
   ===================================================== */
const Countdown = (() => {
  const $ = id => document.getElementById(id);
  let editingId = null;      // Prüfung, die gerade bearbeitet wird
  let planExamId = null;     // Prüfung, deren Lernplan offen ist
  let planBackView = "countdown";   // wohin "Zurück" führt (Start oder Countdown)
  let planFilter = "open";   // welche Spalte des Boards sichtbar ist
  const COLS = [["open","Offen"], ["doing","Ich lerne"], ["done","Geschafft"]];

  /* ---- Hilfsfunktionen ---- */
  function el(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;   // textContent = sicher gegen Fremdcode
    return e;
  }
  function button(cls, label, onclick, aria){
    const b = el("button", cls, label); b.onclick = onclick;
    if(aria) b.setAttribute("aria-label", aria);
    return b;
  }
  const pad = v => String(v).padStart(2,"0");
  const isoOf = d => d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
  const dateOf = iso => { const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d); };
  const todayIso = () => isoOf(new Date());
  function daysUntil(iso){   // 0 = heute, 1 = morgen
    return Math.round((dateOf(iso) - dateOf(todayIso())) / 864e5);
  }
  function dayText(n){
    if(n < 0)  return { big:"vorbei", small:"seit " + (-n) + (n === -1 ? " Tag" : " Tagen") };
    if(n === 0) return { big:"Heute", small:"ist die Prüfung" };
    if(n === 1) return { big:"Morgen", small:"ist die Prüfung" };
    return { big:String(n), small:"Tage bis zur Prüfung" };
  }
  const tasksOf = id => data.tasks.filter(t => t.examId === id);

  /* ---- Prüfung anlegen / bearbeiten ---- */
  let examColorKey = "blau";   // Farbe der Prüfung im Formular
  function nextFreeColor(){    // neue Prüfungen bekommen automatisch eine noch nicht benutzte Farbe
    const used = new Set(data.exams.map(e => examKey(e))), free = PALETTE.find(p => !used.has(p[0]));
    return free ? free[0] : PALETTE[data.exams.length % PALETTE.length][0];
  }
  function renderSwatches(){
    const box = $("examColors"); box.textContent = "";
    PALETTE.forEach(([k, name]) => {
      const b = el("button", "sw"); b.type = "button"; b.style.background = "var(--pc-" + k + ")";
      b.setAttribute("aria-label", name); b.setAttribute("aria-pressed", k === examColorKey);
      b.onclick = () => { examColorKey = k; renderSwatches(); }; box.appendChild(b);
    });
  }
  function setForm(open){ $("examForm").hidden = !open; $("examNew").hidden = open; }
  function startAdd(){ resetForm(); setForm(true); window.scrollTo(0,0); $("examSubject").focus(); }
  function resetForm(){
    editingId = null;
    $("examSubject").value = ""; $("examDate").value = ""; $("examError").textContent = "";
    $("examAdd").textContent = "Prüfung speichern"; $("examCancel").hidden = true; setForm(false);
    examColorKey = nextFreeColor(); renderSwatches();
  }
  function startEdit(ex){
    editingId = ex.id;
    $("examSubject").value = ex.subject; $("examDate").value = ex.date; $("examError").textContent = "";
    $("examAdd").textContent = "Änderung speichern"; $("examCancel").hidden = false; setForm(true);
    examColorKey = examKey(ex); renderSwatches();
    window.scrollTo(0,0); $("examSubject").focus();
  }
  async function save(){
    const subject = $("examSubject").value.trim(), date = $("examDate").value, err = $("examError");
    const ex = editingId && data.exams.find(e => e.id === editingId);
    if(!subject){ err.textContent = "Bitte gib ein Fach ein."; $("examSubject").focus(); return; }
    if(!date){ err.textContent = "Bitte wähle ein Datum."; $("examDate").focus(); return; }
    if(date < todayIso() && !(ex && ex.date === date)){
      err.textContent = "Das Datum liegt in der Vergangenheit. Wähle heute oder später."; $("examDate").focus(); return;
    }
    if(ex){
      const changed = ex.date !== date;
      ex.subject = subject; ex.date = date; ex.color = examColorKey;
      saveData();
      if(changed && tasksOf(ex.id).some(t => t.auto) && daysUntil(date) >= 1 &&
         await askConfirm("Das Datum hat sich geändert. Lernplan passend dazu neu erstellen?", "Neu erstellen")) createPlan(ex.id, true);
    } else {
      data.exams.push({ id:newId(), subject, date, color:examColorKey, createdAt:new Date().toISOString() });
      saveData();
    }
    resetForm(); render();
  }
  async function removeExam(ex){
    if(!(await askConfirm('Prüfung "' + ex.subject + '" und den zugehörigen Lernplan löschen?', "Löschen"))) return;
    data.exams = data.exams.filter(e => e.id !== ex.id);
    data.tasks = data.tasks.filter(t => t.examId !== ex.id);
    // Lernmittel dieser Prüfung bleiben erhalten und behalten das Fach
    data.materials.forEach(m => { if(m.examId === ex.id){ m.examId = null; m.subject = m.subject || ex.subject; } });
    data.cards.forEach(c => { if(c.examId === ex.id){ c.examId = null; c.subject = c.subject || ex.subject; } });
    data.goals.forEach(g => { if(g.examId === ex.id) g.examId = null; });
    data.reflections.forEach(r => { if(r.examId === ex.id) r.examId = null; });
    saveData();
    if(editingId === ex.id) resetForm();
    render();
  }

  /* ---- Lernplan erzeugen ----
     Regel: höchstens 8 Lernblöcke, gleichmäßig bis zum Tag vor der Prüfung verteilt.
     Die Texte gehen durch die Lernstrategien: Planen, Organisieren, Elaborieren,
     Wiederholen, Überwachen und zum Schluss Ressourcen (Ruhe, Schlaf, Material). */
  const FIRST = "Überblick: Was kommt dran? Was fehlt mir noch? (Planen)";
  const MIDDLE = [
    "Stoff zusammenfassen oder als Mindmap ordnen (Organisieren)",
    "Ein Thema in eigenen Worten erklären (Elaborieren)",
    "Selbsttest: Fragen ohne Hilfsmittel beantworten (Wiederholen)",
    "Fehler prüfen: Was kann ich schon, was noch nicht? (Überwachen)"
  ];
  const LAST = "Letzte Wiederholung, Material für den Prüfungstag bereitlegen, früh schlafen (Ressourcen)";

  async function createPlan(examId, skipConfirm){
    const ex = data.exams.find(e => e.id === examId), msg = $("planMsg");
    msg.textContent = "";
    const days = daysUntil(ex.date);
    if(days < 1){ msg.textContent = "Für eine Prüfung heute oder in der Vergangenheit kann kein Plan erstellt werden."; return; }
    if(!skipConfirm && tasksOf(examId).some(t => t.auto) &&
       !(await askConfirm("Der bisherige Lernplan wird ersetzt. Eigene Aufgaben bleiben erhalten.", "Ersetzen"))) return;
    data.tasks = data.tasks.filter(t => !(t.examId === examId && t.auto));
    const n = Math.min(days, 8), start = dateOf(todayIso());
    for(let i = 0; i < n; i++){
      const offset = n === 1 ? 0 : Math.round(i * (days - 1) / (n - 1));
      const title = i === n-1 ? LAST : (i === 0 ? FIRST : MIDDLE[(i-1) % MIDDLE.length]);
      data.tasks.push({ id:newId(), examId, title, status:"open", auto:true,
        date:isoOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)) });
    }
    saveData(); planFilter = "open"; renderPlan();
  }

  /* ---- Anzeige: Prüfungsliste ---- */
  function render(){
    const list = $("examList"); list.textContent = "";
    if(!data.exams.length){
      list.appendChild(el("div", "card empty", "Noch keine Prüfung. Tippe oben auf „Neue Prüfung“."));
      return;
    }
    [...data.exams].sort((a,b) => a.date.localeCompare(b.date)).forEach(ex => {
      const t = dayText(daysUntil(ex.date)), card = el("div", "card");
      card.style.borderLeft = "var(--bar,6px) solid var(--pc-" + examKey(ex) + ")";
      const top = el("div", "exam"), left = el("div");
      left.append(el("h3", "", ex.subject),
        el("small", "", dateOf(ex.date).toLocaleDateString("de-DE", { weekday:"long", day:"numeric", month:"long", year:"numeric" })));
      const right = el("div", "days", t.big); right.appendChild(el("small", "", t.small));
      top.append(left, right); card.appendChild(top);
      makeTappable(top, () => openPlan(ex.id), "Lernplan von " + ex.subject + " öffnen");
      const tk = tasksOf(ex.id);
      if(tk.length) card.appendChild(el("p", "prog", tk.filter(x => x.status === "done").length + " von " + tk.length + " Aufgaben geschafft"));
      const act = el("div", "actions");
      act.append(button("ghost", "Lernplan", () => openPlan(ex.id)),
                 button("ghost", "Bearbeiten", () => startEdit(ex)),
                 button("ghost danger", "Löschen", () => removeExam(ex)));
      card.appendChild(act); list.appendChild(card);
    });
  }

  /* ---- Anzeige: Lernplan-Board (eine Spalte nach der anderen, handyfreundlich) ---- */
  function openPlan(id){
    planBackView = $("view-home").hidden ? "countdown" : "home";
    $("planBack").textContent = planBackView === "home" ? "‹ Zurück zur Startseite" : "‹ Zurück zum Countdown";
    planExamId = id; planFilter = "open"; $("planMsg").textContent = ""; renderPlan(); showView("plan"); }
  function moveTask(t, step){
    t.status = COLS[COLS.findIndex(c => c[0] === t.status) + step][0];
    saveData(); renderPlan();
    if(t.status === "done") Rewards.activity("Aufgabe geschafft");
  }
  function renderPlan(){
    const ex = data.exams.find(e => e.id === planExamId);
    if(!ex){ showView("countdown"); return; }
    const dn = daysUntil(ex.date), tk = tasksOf(ex.id);
    $("planTitle").textContent = ex.subject;
    $("planTitle").style.cssText = "border-left:var(--bar,6px) solid var(--pc-" + examKey(ex) + ");padding-left:10px";
    $("planSub").textContent = dn < 0 ? "Die Prüfung ist vorbei." : dn === 0 ? "Die Prüfung ist heute."
      : dn === 1 ? "Die Prüfung ist morgen." : "Noch " + dn + " Tage bis zur Prüfung.";
    $("planGen").textContent = tk.some(t => t.auto) ? "Lernplan neu erstellen" : "Lernplan automatisch erstellen";

    // E10: Lernmaterial dieser Prüfung (Lernmittel, Lernkarten) direkt erreichbar
    const nMat = data.materials.filter(m => inExam(m, ex)).length, nCards = data.cards.filter(c => inExam(c, ex)).length;
    const pm = $("planMat"); pm.textContent = "";
    pm.appendChild(el("small", "", "Lernmaterial zu dieser Prüfung"));
    const mrow = el("div", "actions"); mrow.style.margin = "6px -12px -10px";
    const iconBtn = (name, label, fn) => { const b = button("ghost", " " + label, fn); b.prepend(icon(name, 18)); return b; };
    mrow.appendChild(iconBtn("folder", "Lernmittel (" + nMat + ")", () => Lernmittel.showFor(ex.id, "material")));
    if(nCards) mrow.appendChild(iconBtn("cards", "Karten üben (" + nCards + ")", () => Lernkarten.practiceExam(ex.id)));
    mrow.appendChild(button("ghost", "+ Hinzufügen", () => { showView("lernmittel"); Lernmittel.add(ex.id); }));
    pm.appendChild(mrow);

    const seg = $("planSeg"); seg.textContent = "";
    COLS.forEach(([key, label]) => {
      const b = button("", label + " (" + tk.filter(t => t.status === key).length + ")", () => { planFilter = key; renderPlan(); });
      b.setAttribute("aria-pressed", key === planFilter); seg.appendChild(b);
    });

    const list = $("planList"); list.textContent = "";
    const shown = tk.filter(t => t.status === planFilter).sort((a,b) => (a.date || "9").localeCompare(b.date || "9"));
    if(!shown.length){
      list.appendChild(el("div", "card empty", tk.length ? "Hier ist gerade nichts." :
        "Noch keine Aufgaben. Erstelle unten einen Lernplan oder füge eigene Aufgaben hinzu."));
    }
    shown.forEach(t => {
      const card = el("div", "card task"), txt = el("div");
      txt.appendChild(el("span", "", t.title));
      if(t.date) txt.appendChild(el("small", "", dateOf(t.date).toLocaleDateString("de-DE", { weekday:"short", day:"numeric", month:"short" })));
      const btns = el("div", "btns"), idx = COLS.findIndex(c => c[0] === t.status);
      const mb = (name, fn, aria) => { const b = button("mini", "", fn, aria); b.appendChild(icon(name, 18)); return b; };
      if(idx > 0) btns.appendChild(mb("left", () => moveTask(t, -1), "Zurück nach " + COLS[idx-1][1]));
      if(idx < 2) btns.appendChild(mb("right", () => moveTask(t, 1), "Weiter nach " + COLS[idx+1][1]));
      btns.appendChild(mb("x", () => { data.tasks = data.tasks.filter(x => x.id !== t.id); saveData(); renderPlan(); }, "Aufgabe löschen"));
      card.append(txt, btns); list.appendChild(card);
    });
  }
  function addTask(){
    const inp = $("taskTitle"), title = inp.value.trim();
    if(!title){ $("planMsg").textContent = "Bitte gib eine Aufgabe ein."; inp.focus(); return; }
    $("planMsg").textContent = "";
    data.tasks.push({ id:newId(), examId:planExamId, title, status:"open", date:null, auto:false });
    saveData(); inp.value = ""; planFilter = "open"; renderPlan();
  }

  function init(){
    $("examDate").min = todayIso();
    $("examAdd").onclick = save;
    examColorKey = nextFreeColor(); renderSwatches();
    $("examNew").onclick = startAdd;
    $("examCancel").onclick = resetForm;
    $("examSubject").addEventListener("keydown", e => { if(e.key === "Enter") save(); });
    $("planBack").onclick = () => { showView(planBackView); render(); };
    $("planGen").onclick = () => createPlan(planExamId);
    $("taskAdd").onclick = addTask;
    $("taskTitle").addEventListener("keydown", e => { if(e.key === "Enter") addTask(); });
    // Beim Zurückkehren in die App neu rechnen (falls ein neuer Tag begonnen hat)
    document.addEventListener("visibilitychange", () => { if(!document.hidden){ $("examDate").min = todayIso(); render(); if(planExamId && !document.getElementById("view-plan").hidden) renderPlan(); } });
    render();
  }
  return { init, render, resetForm, openPlan, startAdd, daysUntil, dateOf, dayText, todayIso };
})();
