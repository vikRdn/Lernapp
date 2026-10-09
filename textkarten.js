/* Lernen unter Prüfungsdruck – textkarten.js
   Karten aus Text: Die App erkennt in eingefügtem Text oder in einer Notiz Karten und schlägt sie vor.
   Du wählst vorher, was erkannt werden soll (Vorerkennung), und danach per Häkchen, was übernommen wird.
   Modi:
     auto      alles unten
     text      Fragen und Begriffe (Muster 1, 2, 3, 5)
     formel    Formeln wie E = mc² oder Fläche = a · b (Muster 4, mit Buchstaben)
     rechnung  Rechnungen wie 12 · 4 = 48; fehlt das Ergebnis (12 · 4 =), rechnet die App es aus (Muster 4, nur Zahlen)
   Muster pro Zeile (Aufzählungszeichen werden ignoriert):
     1. Frage ; Antwort        (auch mit Tabulator, " | " oder "::"), in allen Modi
     2. Frage? Antwort         (Antwort in derselben Zeile)
     3. Frage?                 (Antwort steht in den folgenden Zeilen bis zur Leerzeile)
     4. Rechnung = Ergebnis    (Vorderseite "3 + 4 = ?")
     5. Begriff: Erklärung     oder   Begriff – Erklärung
   Alles läuft auf dem Gerät. Eine KI wird nicht benutzt (dafür gibt es eine Vorlage zum Kopieren).
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Karten aus Text
   ===================================================== */
const Textkarten = (() => {
  const $ = id => document.getElementById(id);
  function h(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;
    return e;
  }
  const TEMPLATE = "Erstelle aus dem folgenden Text Lernkarten. Schreibe pro Karte genau eine Zeile im Format:\nFrage ; Antwort\nKeine Nummerierung, keine Überschriften, keine Erklärungen, nur die Zeilen. Fragen kurz, Antworten in einem Satz.\n\nText:\n";
  const MODES = [
    ["auto", "Automatisch", "Erkennt alle Muster."],
    ["text", "Text", "Fragen mit Antwort und Begriffe mit Erklärung."],
    ["formel", "Formeln", "Zeilen wie E = mc² oder Fläche = a · b. Die linke Seite wird zur Frage."],
    ["rechnung", "Rechnungen", "Aufgaben wie 12 · 4 = 48. Fehlt das Ergebnis (12 · 4 =), rechnet die App es aus."]
  ];
  const clean = l => l.replace(/^\s*(?:[-•*·–]|\d{1,3}[.)])\s+/, "").trim();   // Aufzählungszeichen entfernen
  const OPS = "+\\-−–*×·/÷:^";
  const isNumeric = l => /^[\d\s+\-−–*×·/÷:^().,]+$/.test(l) && new RegExp("\\d\\s*[" + OPS + "]\\s*[\\d(.,]").test(l);   // nur Zahlen und Rechenzeichen

  /* Kleiner, sicherer Rechner (ohne eval): + - * / : ^ Klammern, Dezimalkomma */
  function calc(src){
    const s = src.replace(/[×·]/g, "*").replace(/[÷:]/g, "/").replace(/[−–]/g, "-").replace(/,/g, ".").replace(/\s+/g, "");
    let i = 0;
    const num = () => { const m = /^\d+(?:\.\d+)?|^\.\d+/.exec(s.slice(i)); if(!m) throw new Error("x"); i += m[0].length; return parseFloat(m[0]); };
    const prim = () => {
      if(s[i] === "("){ i++; const v = add(); if(s[i] !== ")") throw new Error("x"); i++; return v; }
      if(s[i] === "-"){ i++; return -pow(); }
      if(s[i] === "+"){ i++; return pow(); }
      return num();
    };
    const pow = () => { const b = prim(); if(s[i] === "^"){ i++; return Math.pow(b, pow()); } return b; };
    const mul = () => { let v = pow(); while(s[i] === "*" || s[i] === "/"){ const o = s[i++], r = pow(); v = o === "*" ? v * r : v / r; } return v; };
    const add = () => { let v = mul(); while(s[i] === "+" || s[i] === "-"){ const o = s[i++], r = mul(); v = o === "+" ? v + r : v - r; } return v; };
    const v = add();
    if(i !== s.length || !Number.isFinite(v)) throw new Error("x");
    return v;
  }
  const fmtNum = v => Number(v.toFixed(10)).toLocaleString("de-DE", { maximumFractionDigits:10 });

  /* Zeile mit "=" -> [Vorderseite, Rückseite] oder null (abhängig vom Modus) */
  function equation(raw, mode){
    const m = raw.match(/^([^=]{1,60}?)\s*=\s*([^=]{0,200})$/);
    if(!m) return null;
    const l = m[1].trim(); let r = m[2].trim();
    if(r === "?") r = "";
    const numeric = isNumeric(l);
    if(numeric && mode !== "formel"){   // Rechnung: Ergebnis übernehmen oder ausrechnen
      if(r) return [l + " = ?", r];
      try{ return [l + " = ?", fmtNum(calc(l))]; }catch(e){ return null; }
    }
    if(numeric || !r || mode === "rechnung") return null;
    const hasOp = new RegExp("[" + OPS + "√%²³]").test(l), words = l.split(/\s+/).length;
    const ok = mode === "formel"
      ? /\d|[a-zA-Zα-ωΑ-Ω]/.test(l) && words <= 3 && (hasOp || l.length <= 3 || new RegExp("[" + OPS + "√²³]").test(r))
      : /\d|[a-zA-Z]/.test(l) && (hasOp || l.length <= 3);
    return ok ? [l + " = ?", r] : null;
  }

  function parse(text, mode){
    mode = mode || "auto";
    const lines = String(text).replace(/\r/g, "").split("\n"), out = [], seen = new Set();
    const add = (f, b) => {
      f = String(f).trim(); b = String(b).trim();
      if(f.length < 2 || !b) return false;
      const k = f.toLowerCase(); if(seen.has(k)) return false;
      seen.add(k); out.push({ front:f.slice(0, 500), back:b.slice(0, 1000) }); return true;
    };
    const wantText = mode === "auto" || mode === "text", wantEq = mode !== "text";
    for(let i = 0; i < lines.length && out.length < 200; i++){
      const raw = clean(lines[i]); if(!raw) continue;
      let m = raw.match(/^(.+?)\s*(?:;|\t|\s\|\s|::)\s*(.+)$/);                 // 1: Frage ; Antwort (alle Modi)
      if(m && add(m[1], m[2])) continue;
      if(wantText){
        m = raw.match(/^(.{4,200}?\?)\s+(\S.*)$/);                               // 2: Frage? Antwort
        if(m && add(m[1], m[2])) continue;
        if(/\?$/.test(raw)){                                                    // 3: Frage?  + Antwort in den nächsten Zeilen
          const ans = []; let j = i + 1;
          while(j < lines.length){ const nx = clean(lines[j]); if(!nx || /\?$/.test(nx)) break; ans.push(nx); j++; }
          if(ans.length && add(raw, ans.join(" "))) i = j - 1;
          continue;
        }
      }
      if(wantEq){                                                               // 4: Rechnung oder Formel
        const eq = equation(raw, mode);
        if(eq && add(eq[0], eq[1])) continue;
        if(mode === "rechnung" && isNumeric(raw) && !raw.includes("=")){        // Aufgabe ohne "=": ausrechnen
          try{ add(raw + " = ?", fmtNum(calc(raw))); }catch(e){}
          continue;
        }
      }
      if(wantText){
        m = raw.match(/^([^:–—]{2,40}?)\s*(?::|\s[–—-]\s)\s*(\S.{7,})$/);        // 5: Begriff: Erklärung
        if(m && m[1].split(/\s+/).length <= 5) add(m[1], m[2]);
      }
    }
    return out;
  }

  /* Auswahl der Vorerkennung (Knöpfe + Erklärung) */
  function modeSeg(box, mode, onPick){
    box.textContent = "";
    const seg = h("div", "seg");
    MODES.forEach(([k, label]) => {
      const b = h("button", "", label); b.type = "button"; b.setAttribute("aria-pressed", k === mode);
      b.onclick = () => { onPick(k); modeSeg(box, k, onPick); }; seg.appendChild(b);
    });
    box.append(seg, h("p", "lt-desc", MODES.find(x => x[0] === mode)[2]));
    box.lastChild.style.margin = "-4px 0 12px";
  }

  /* Vorschlagsliste mit Häkchen; ctx = { examId, subject, sourceId, mode } */
  function suggestUI(box, text, ctx){
    box.textContent = "";
    const pairs = parse(text, ctx.mode);
    if(!pairs.length){
      box.appendChild(h("p", "lt-desc", "Ich konnte keine Karten erkennen. Wähle oben eine andere Erkennung oder nutze Zeilen wie „Frage ; Antwort“, „Begriff: Erklärung“ oder „3 + 4 = 7“."));
      return;
    }
    const checks = [], head = h("p", "lt-desc", pairs.length + (pairs.length === 1 ? " Karte erkannt." : " Karten erkannt.") + " Wähle aus, was übernommen wird.");
    head.style.margin = "14px 0 8px";
    const save = h("button", "primary"), msg = h("p", "lt-desc", ""); msg.setAttribute("role", "status");
    const refresh = () => { const n = checks.filter(c => c.checked).length; save.textContent = n + (n === 1 ? " Karte speichern" : " Karten speichern"); save.disabled = !n; };
    const all = h("button", "ghost", "Alle"), none = h("button", "ghost", "Keine");
    all.type = none.type = "button"; all.style.padding = none.style.padding = "4px 10px";
    all.onclick = () => { checks.forEach(c => c.checked = true); refresh(); };
    none.onclick = () => { checks.forEach(c => c.checked = false); refresh(); };
    box.append(head, all, none);
    pairs.forEach(p => {
      const l = h("label", "featrow"), cb = document.createElement("input"), d = h("div");
      cb.type = "checkbox"; cb.checked = true; cb.onchange = refresh; checks.push(cb);
      const b = h("b", "", p.front), s = h("small", "", p.back); s.style.display = "block";
      d.append(b, s); l.append(cb, d); box.appendChild(l);
    });
    save.style.marginTop = "6px";
    save.onclick = () => {
      let n = 0;
      pairs.forEach((p, i) => { if(checks[i].checked){ Lernkarten.create(p.front, p.back, ctx.examId, ctx.subject, ctx.sourceId); n++; } });
      save.disabled = true; checks.forEach(c => c.disabled = true);
      msg.textContent = n + (n === 1 ? " Karte gespeichert" : " Karten gespeichert") + " ✓ Du findest sie unter Lernkarten.";
      Lernkarten.render();
    };
    box.append(save, msg); refresh();
  }
  /* Auswahl + Vorschläge in einem Block (für die Ansicht einer Notiz) */
  function suggestPanel(box, text, ctx){
    box.textContent = "";
    let mode = "auto"; const top = h("div"), res = h("div");
    const run = () => suggestUI(res, text, Object.assign({}, ctx, { mode }));
    box.append(top, res); modeSeg(top, mode, k => { mode = k; run(); }); top.style.marginTop = "10px"; run();
  }

  /* ---- Formular im Lernkarten-Bereich ---- */
  let formMode = "auto";
  function run(){
    if(!$("tkText").value.trim()){ $("tkResult").textContent = ""; $("tkResult").appendChild(h("p", "error", "Bitte füge zuerst einen Text ein.")); $("tkText").focus(); return; }
    const examId = $("tkExam").value || null;
    suggestUI($("tkResult"), $("tkText").value, { examId, subject:examId ? "" : $("tkSubject").value.trim(), sourceId:null, mode:formMode });
  }
  function openForm(){
    $("tkText").value = ""; $("tkSubject").value = ""; $("tkResult").textContent = "";
    fillExamSelect($("tkExam")); $("tkSubjectWrap").hidden = false;
    $("tkForm").hidden = false; $("tkNew").hidden = true; $("tkText").focus();
  }
  function closeForm(){ $("tkForm").hidden = true; $("tkNew").hidden = false; }
  async function copyTemplate(){
    const msg = $("tkCopyMsg");
    try{ await navigator.clipboard.writeText(TEMPLATE); msg.textContent = " Kopiert ✓"; }
    catch(e){ const t = $("tkTemplate"); t.focus(); t.select(); msg.textContent = " Markiert. Kopiere den Text jetzt von Hand."; }
  }
  function init(){
    $("tkTemplate").value = TEMPLATE;
    modeSeg($("tkModeBox"), formMode, k => { formMode = k; if($("tkResult").children.length && $("tkText").value.trim()) run(); });
    $("tkNew").onclick = openForm; $("tkCancel").onclick = closeForm; $("tkCopy").onclick = copyTemplate;
    $("tkExam").onchange = () => { $("tkSubjectWrap").hidden = !!$("tkExam").value; };
    $("tkGo").onclick = run;
  }
  return { init, parse, suggestUI, suggestPanel, closeForm };
})();
