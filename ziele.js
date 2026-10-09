/* Lernen unter Prüfungsdruck – ziele.js
   Ziele & Reflexion: Lernziele setzen (planen) und nach dem Lernen zurückschauen (überwachen, anpassen).
   Ein Ziel      = { id, text, examId|null, due:"JJJJ-MM-TT"|null, done, createdAt, doneAt|null }
   Eine Reflexion = { id, examId|null, goalId|null, goalText, confidence:1–5, good, change, createdAt }   (goalId: Reflexion zu einem erreichten Ziel)
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Ziele & Reflexion
   ===================================================== */
const Ziele = (() => {
  const $ = id => document.getElementById(id);
  function h(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;
    return e;
  }
  function bar(frac){ const b = h("div", "bar"), f = h("i"); f.style.width = Math.round(frac * 100) + "%"; b.appendChild(f); return b; }
  const CONF = ["sehr unsicher", "eher unsicher", "teils, teils", "eher sicher", "sehr sicher"];
  let pane = "goals", showDone = false, conf = 3, reflectGoal = null;   // reflectGoal: Ziel, zu dem gerade reflektiert wird
  const examName = id => { const ex = id && data.exams.find(e => e.id === id); return ex ? ex.subject : ""; };
  const fmt = iso => Countdown.dateOf(iso).toLocaleDateString("de-DE", { weekday:"short", day:"numeric", month:"short" });

  /* ---- Umschalter Ziele / Reflexion ---- */
  function renderTabs(){
    const seg = $("zgTabs"); seg.textContent = "";
    const open = data.goals.filter(g => !g.done).length;
    [["goals", "Ziele (" + open + " offen)"], ["reflect", "Reflexion (" + data.reflections.length + ")"]].forEach(([k, label]) => {
      const b = h("button", "", label); b.type = "button"; b.setAttribute("aria-pressed", k === pane);
      b.onclick = () => setPane(k); seg.appendChild(b);
    });
  }
  function setPane(k){ pane = k; $("zgGoals").hidden = k !== "goals"; $("zgReflect").hidden = k !== "reflect"; render(); }

  /* ---- Ziele ---- */
  function renderIdeas(){   // Vorschläge, auf Wunsch passend zum Lerntyp
    const box = $("zgIdeas"); box.textContent = "";
    const t = h("small", "", data.learnTypeResult ? "Vorschläge passend zu deinem Lerntyp:" : "Vorschläge:");
    t.style.cssText = "display:block;color:var(--muted);margin-bottom:6px";
    const col = h("div", "pvcol"); col.style.marginBottom = "12px";
    LernTest.goalIdeas().forEach(idea => {
      const b = h("button", "pvb", idea); b.type = "button";
      b.onclick = () => { $("zgText").value = idea; $("zgText").focus(); }; col.appendChild(b);
    });
    box.append(t, col);
  }
  function openGoal(){
    $("zgText").value = ""; $("zgDue").value = ""; $("zgError").textContent = "";
    fillExamSelect($("zgExam")); renderIdeas();
    $("zgForm").hidden = false; $("zgNew").hidden = true; $("zgText").focus();
  }
  function closeGoal(){ $("zgForm").hidden = true; $("zgNew").hidden = false; }
  function saveGoal(){
    const text = $("zgText").value.trim();
    if(!text){ $("zgError").textContent = "Bitte schreibe dein Ziel auf."; $("zgText").focus(); return; }
    data.goals.push({ id:newId(), text:text.slice(0, 200), examId:$("zgExam").value || null, due:$("zgDue").value || null,
                      done:false, createdAt:new Date().toISOString(), doneAt:null });
    saveData(); closeGoal(); render();
  }
  async function toggle(g){
    g.done = !g.done; g.doneAt = g.done ? new Date().toISOString() : null; saveData();
    if(g.done) Rewards.activity("Ziel erreicht");
    render();
    if(g.done && await askConfirm("Ziel erreicht! Möchtest du kurz dazu reflektieren?", "Reflektieren")){ setPane("reflect"); openReflect(g.examId, g); }
  }
  function goalRow(g, today){
    const row = h("div", g.done ? "goal done" : "goal");
    const chk = h("button", "chk"); chk.type = "button"; chk.setAttribute("aria-pressed", g.done);
    chk.setAttribute("aria-label", g.done ? "Wieder als offen markieren" : "Als erreicht abhaken");
    chk.appendChild(icon(g.done ? "circlecheck" : "circle", 28)); chk.onclick = () => toggle(g);
    const txt = h("div", "gtext"); txt.appendChild(h("span", "", g.text));
    const meta = [], name = examName(g.examId), late = !g.done && g.due && g.due < today;
    if(name) meta.push(name);
    if(g.due) meta.push(late ? "überfällig seit " + fmt(g.due) : "bis " + fmt(g.due));
    if(g.done && g.doneAt) meta.push("erreicht am " + new Date(g.doneAt).toLocaleDateString("de-DE"));
    if(meta.length){
      const sm = h("small", "", meta.join(" · ")), dot = examDot(g.examId);
      if(dot) sm.prepend(dot);
      if(late) sm.style.color = "#ff3b30";
      txt.appendChild(sm);
    }
    if(g.done){   // Reflexion zum erreichten Ziel schreiben oder ansehen
      const rs = data.reflections.filter(r => r.goalId === g.id);
      const rb = h("button", "ghost", rs.length ? "Reflexion ansehen (" + rs.length + ")" : "Reflexion schreiben"); rb.type = "button";
      rb.style.cssText = "padding:6px 0;display:block";
      rb.onclick = () => { setPane("reflect"); if(!rs.length) openReflect(g.examId, g); };
      txt.appendChild(rb);
    }
    const del = h("button", "mini"); del.type = "button"; del.setAttribute("aria-label", "Ziel löschen"); del.appendChild(icon("x", 18));
    del.onclick = async () => {
      if(!(await askConfirm("Dieses Ziel löschen?", "Löschen"))) return;
      data.goals = data.goals.filter(x => x.id !== g.id); saveData(); render();
    };
    row.append(chk, txt, del); return row;
  }
  function renderGoals(){
    const list = $("zgList"); list.textContent = "";
    const today = Countdown.todayIso();
    if(!data.goals.length){
      list.appendChild(h("div", "card empty", "Noch keine Ziele. Ein Ziel hilft dir, dein Lernen zu planen. Tippe oben auf „Neues Ziel“."));
      return;
    }
    const open = data.goals.filter(g => !g.done).sort((a,b) => (a.due || "9").localeCompare(b.due || "9"));
    const done = data.goals.filter(g => g.done).sort((a,b) => (b.doneAt || "").localeCompare(a.doneAt || ""));
    if(!open.length) list.appendChild(h("div", "card empty", "Alle Ziele erreicht. Setz dir ein neues!"));
    open.forEach(g => { const c = h("div", "card"); c.appendChild(goalRow(g, today)); list.appendChild(c); });
    if(done.length){
      const c = h("div", "card"), tg = h("button", "fold"); tg.type = "button"; tg.setAttribute("aria-expanded", showDone);
      tg.append(document.createTextNode("Erreicht (" + done.length + ")"), icon("down", 20));
      tg.onclick = () => { showDone = !showDone; renderGoals(); };
      c.appendChild(tg);
      if(showDone) done.forEach(g => { const r = goalRow(g, today); r.style.marginTop = "14px"; c.appendChild(r); });
      list.appendChild(c);
    }
  }

  /* ---- Reflexion ---- */
  function renderConf(){
    const seg = $("rfConf"); seg.textContent = "";
    [1, 2, 3, 4, 5].forEach(v => {
      const b = h("button", "", String(v)); b.type = "button";
      b.setAttribute("aria-pressed", v === conf); b.setAttribute("aria-label", v + " von 5: " + CONF[v - 1]);
      b.onclick = () => { conf = v; renderConf(); }; seg.appendChild(b);
    });
    $("rfConfText").textContent = conf + " von 5: " + CONF[conf - 1];
  }
  function openReflect(examId, goal){   // goal: optional, Reflexion zu diesem erreichten Ziel
    reflectGoal = goal || null;
    $("rfGoalInfo").hidden = !goal; $("rfGoalInfo").textContent = goal ? "Zum Ziel: " + goal.text : "";
    $("rfGoodL").textContent = goal ? "Was hat dir geholfen, dein Ziel zu erreichen?" : "Was lief gut?";
    $("rfChangeL").textContent = goal ? "Was machst du beim nächsten Ziel anders?" : "Was machst du beim nächsten Mal anders?";
    fillExamSelect($("rfExam")); $("rfExam").value = examId || "";
    $("rfGood").value = ""; $("rfChange").value = ""; $("rfError").textContent = "";
    conf = 3; renderConf();
    $("rfForm").hidden = false; $("rfNew").hidden = true; $("rfGood").focus();
  }
  function closeReflect(){ $("rfForm").hidden = true; $("rfNew").hidden = false; reflectGoal = null; }
  function saveReflect(){
    const good = $("rfGood").value.trim(), change = $("rfChange").value.trim();
    if(!good && !change){ $("rfError").textContent = "Schreib mindestens einen kurzen Satz."; $("rfGood").focus(); return; }
    data.reflections.push({ id:newId(), examId:$("rfExam").value || null, goalId:reflectGoal ? reflectGoal.id : null,
                            goalText:reflectGoal ? reflectGoal.text.slice(0, 200) : "", confidence:conf, good:good.slice(0, 1000),
                            change:change.slice(0, 1000), createdAt:new Date().toISOString() });
    saveData(); closeReflect(); render();
  }
  function renderReflect(){
    const list = $("rfList"); list.textContent = "";
    if(!data.reflections.length){
      list.appendChild(h("div", "card empty", "Noch keine Reflexion. Schau nach dem Lernen kurz zurück: Was lief gut, was machst du anders?"));
      return;
    }
    const all = [...data.reflections].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    all.forEach((r, i) => {
      const c = h("div", "card"), name = examName(r.examId);
      const head = h("small", "", new Date(r.createdAt).toLocaleDateString("de-DE", { weekday:"short", day:"numeric", month:"short", year:"numeric" }) + (name ? " · " + name : ""));
      head.style.cssText = "display:block;color:var(--muted)";
      const dot = examDot(r.examId); if(dot) head.prepend(dot);
      const prev = r.examId ? all.slice(i + 1).find(x => x.examId === r.examId) : null;   // ältere Reflexion zur selben Prüfung
      const s = h("p", "prog", "Sicherheit: " + r.confidence + " von 5 (" + CONF[r.confidence - 1] + ")" + (prev ? " · vorher " + prev.confidence + " von 5" : ""));
      c.append(head);
      if(r.goalText){ const gl = h("p", "ck-back", r.goalText); gl.prepend(h("b", "", "Ziel: ")); gl.style.color = "var(--text)"; c.appendChild(gl); }
      c.append(s, bar(r.confidence / 5));
      if(r.good){ const p = h("p", "ck-back", r.good); p.prepend(h("b", "", "Lief gut: ")); c.appendChild(p); }
      if(r.change){ const p = h("p", "ck-back", r.change); p.prepend(h("b", "", "Nächstes Mal: ")); c.appendChild(p); }
      const act = h("div", "actions"), d = h("button", "ghost danger", "Löschen");
      d.onclick = async () => {
        if(!(await askConfirm("Diese Reflexion löschen?", "Löschen"))) return;
        data.reflections = data.reflections.filter(x => x.id !== r.id); saveData(); render();
      };
      act.appendChild(d); c.appendChild(act); list.appendChild(c);
    });
  }

  function render(){ renderTabs(); if(pane === "goals") renderGoals(); else renderReflect(); }
  function init(){
    $("zgNew").onclick = openGoal; $("zgCancel").onclick = closeGoal; $("zgSave").onclick = saveGoal;
    $("rfNew").onclick = () => openReflect(null); $("rfCancel").onclick = closeReflect; $("rfSave").onclick = saveReflect;
    render();
  }
  return { init, render,
    reflect: (examId, goal) => { showView("ziele"); setPane("reflect"); openReflect(examId, goal); },   // z. B. nach einer Übung
    openGoals: () => data.goals.filter(g => !g.done).length };
})();
