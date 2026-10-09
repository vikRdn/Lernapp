/* Lernen unter Prüfungsdruck – quiz.js
   Quiz-Modus: aus den eigenen Lernkarten entsteht ein Multiple-Choice-Quiz.
   Falsche Antwortmöglichkeiten sind Antworten anderer Karten (gleiche Prüfung zuerst).
   Das Quiz ändert den Lernstand der Karten nicht (Archiv und Verlauf bleiben dem Üben vorbehalten).
   Nutzt die Vollbild-Ansicht der Lernmittel. Wird als normales Script geladen. */
/* =====================================================
   MODUL: Quiz
   ===================================================== */
const Quiz = (() => {
  const $ = id => document.getElementById(id);
  function h(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;
    return e;
  }
  const clip = (t, n) => t.length > n ? t.slice(0, n - 1) + "…" : t;
  function shuffle(a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  let queue = [], idx = 0, right = 0, wrong = [], cur = null, answered = false;

  function options(card){   // richtige Antwort plus bis zu 3 falsche aus anderen Karten
    const ex = data.exams.find(e => e.id === card.examId), seen = new Set([card.back.trim()]);
    const pool = shuffle(data.cards.filter(c => c.id !== card.id && c.back.trim() && !seen.has(c.back.trim())));
    const same = pool.filter(c => card.examId ? inExam(c, ex) : !c.examId), rest = pool.filter(c => !same.includes(c));
    const wrongs = [];
    [...same, ...rest].forEach(c => { if(wrongs.length < 3 && !seen.has(c.back.trim())){ seen.add(c.back.trim()); wrongs.push(c.back); } });
    return wrongs.length ? shuffle([card.back, ...wrongs]) : [];
  }
  function start(list){
    const playable = list.filter(c => options(c).length >= 2);
    if(!playable.length){ Rewards.toast("Für das Quiz brauchst du mindestens 2 Karten mit verschiedenen Antworten.", "x", true); return; }
    queue = shuffle([...playable]); idx = 0; right = 0; wrong = [];
    $("viewerTitle").textContent = "Quiz"; $("viewer").hidden = false; show();
  }
  function show(){
    const body = $("viewerBody"); body.textContent = ""; answered = false;
    if(idx >= queue.length){ finish(body); return; }
    const card = queue[idx], opts = options(card); cur = { card, opts };
    const head = h("div", "card"), bar = h("div", "bar"), fill = h("i");
    fill.style.width = Math.round(idx / queue.length * 100) + "%"; bar.appendChild(fill);
    head.append(h("small", "", "Frage " + (idx + 1) + " von " + queue.length), bar);
    const q = h("div", "card"); q.append(h("small", "", "Frage"), h("div", "flash", card.front));
    body.append(head, q);
    const list = h("div"); list.setAttribute("role", "group"); list.setAttribute("aria-label", "Antworten");
    opts.forEach(text => {
      const b = h("button", "taskrow qopt", clip(text, 160)); b.type = "button";
      b.onclick = () => pick(b, text, list); list.appendChild(b);
    });
    body.appendChild(list);
  }
  function pick(btn, text, list){
    if(answered) return; answered = true;
    const ok = text === cur.card.back;
    list.querySelectorAll("button").forEach(b => {
      b.disabled = true;
      const isRight = b.textContent === clip(cur.card.back, 160);
      if(isRight){ b.classList.add("qok"); b.prepend(icon("circlecheck", 18), document.createTextNode(" ")); }
      else if(b === btn){ b.classList.add("qbad"); b.prepend(icon("x", 18), document.createTextNode(" ")); }
    });
    if(ok) right++; else wrong.push(cur.card);
    const info = h("p", "lt-desc", ok ? "Richtig!" : "Leider falsch. Die richtige Antwort ist markiert.");
    info.setAttribute("role", "status"); info.style.margin = "10px 0";
    const next = h("button", "primary", idx + 1 < queue.length ? "Weiter" : "Ergebnis"); next.style.width = "100%";
    next.onclick = () => { idx++; show(); };
    $("viewerBody").append(info, next); next.focus({ preventScroll:true });
  }
  function finish(body){
    $("viewerTitle").textContent = "Quiz geschafft";
    Rewards.activity(null);   // zählt als Lerntag
    const c = h("div", "card"); c.style.textAlign = "center";
    c.append(h("h3", "", right + " von " + queue.length + " richtig"),
             h("p", "lt-desc", wrong.length ? "Probiere die falschen gleich noch einmal." : "Alles richtig. Stark!"));
    body.appendChild(c);
    if(wrong.length){
      const b = h("button", "primary", "Falsche nochmal (" + wrong.length + ")"); b.style.cssText = "width:100%;margin-bottom:8px";
      b.onclick = () => start(wrong); body.appendChild(b);
    }
    const done = h("button", "ghost", "Fertig"); done.style.width = "100%"; done.onclick = () => $("viewerClose").click(); body.appendChild(done);
  }
  return { start };
})();
