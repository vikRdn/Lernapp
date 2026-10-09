/* Lernen unter Prüfungsdruck – fokus.js
   Fokus-Timer: Lernblöcke und Pausen im Wechsel (Aufmerksamkeit und Anstrengung steuern).
   Gelernte Minuten werden pro Tag in data.stats.minutes gezählt (JJJJ-MM-TT -> Minuten, höchstens 90 Tage).
   Der Timer rechnet mit der echten Uhrzeit (endAt), bleibt also auch bei gedrosselten Browsern genau.
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Fokus-Timer
   ===================================================== */
const Fokus = (() => {
  const $ = id => document.getElementById(id);
  const BASE_TITLE = document.title;
  const pad = v => String(v).padStart(2, "0");
  const keyOf = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const fmt = ms => { const s = Math.ceil(ms / 1000); return pad(Math.floor(s / 60)) + ":" + pad(s % 60); };
  const cfg = () => data.settings.focus;
  let mode = "work", running = false, endAt = 0, remaining = 0, timer = null, accum = 0, lastTick = 0, audio = null;
  const total = () => (mode === "work" ? cfg().work : cfg().brk) * 60000;

  function draw(){
    const left = running ? Math.max(0, endAt - Date.now()) : remaining;
    $("fkTime").textContent = fmt(left);
    $("fkMode").textContent = mode === "work" ? "Lernen" : "Pause";
    $("fkBar").style.width = Math.round((1 - left / total()) * 100) + "%";
    $("fkStart").textContent = running ? "Anhalten" : (remaining < total() ? "Weiter" : "Start");
    document.title = running ? "(" + fmt(left) + ") " + BASE_TITLE : BASE_TITLE;
  }
  function addMinutes(m){   // Lernzeit des Tages erhöhen
    const m2 = data.stats.minutes, k = keyOf(new Date());
    m2[k] = (m2[k] || 0) + m;
    const keys = Object.keys(m2).sort(); while(keys.length > 90) delete m2[keys.shift()];
    saveData(); Rewards.activity(null);   // zählt auch als Lerntag für die Serie
  }
  function logPartial(){   // angefangenen Lernblock anteilig zählen (ab 1 Minute)
    if(mode === "work"){ const m = Math.floor(Math.min(accum, total()) / 60000); if(m >= 1) addMinutes(m); }
    accum = 0;
  }
  function beep(){
    try{ if(navigator.vibrate) navigator.vibrate([200, 100, 200]); }catch(e){}
    try{
      if(!audio) return;
      [0, 0.25].forEach(t => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(audio.destination);
        o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.18);
      });
    }catch(e){}
  }
  function tick(){
    const now = Date.now();
    if(mode === "work") accum += now - lastTick;
    lastTick = now;
    if(endAt - now <= 0) finish(); else draw();
  }
  function finish(){
    clearInterval(timer); running = false;
    if(mode === "work"){
      addMinutes(cfg().work); beep();
      Rewards.toast("Lernblock geschafft. Zeit für eine Pause.", "timer", true); mode = "break";
    } else {
      beep(); Rewards.toast("Pause vorbei. Weiter geht's.", "timer", true); mode = "work";
    }
    accum = 0; remaining = total(); draw(); renderWeek();
  }
  function pause(){ tick(); if(!running) return; clearInterval(timer); running = false; remaining = Math.max(0, endAt - Date.now()); draw(); }
  function start(){
    if(running){ pause(); return; }
    if(!audio){ try{ audio = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} }   // Klang erst nach einem Tipp erlaubt
    if(audio && audio.resume) audio.resume();
    if(remaining <= 0) remaining = total();
    endAt = Date.now() + remaining; lastTick = Date.now(); running = true;
    clearInterval(timer); timer = setInterval(tick, 250); draw();
  }
  function reset(){ if(running) pause(); logPartial(); mode = "work"; remaining = total(); draw(); renderWeek(); }
  function skip(){ if(running) pause(); logPartial(); mode = mode === "work" ? "break" : "work"; remaining = total(); draw(); renderWeek(); }

  /* ---- Lernzeit der letzten 7 Tage ---- */
  function days(){
    const out = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      out.push({ key:keyOf(d), label:d.toLocaleDateString("de-DE", { weekday:"short" }), min:data.stats.minutes[keyOf(d)] || 0 });
    }
    return out;
  }
  const weekMinutes = () => days().reduce((s, d) => s + d.min, 0);
  function renderWeek(){
    const ds = days(), max = Math.max(30, ...ds.map(d => d.min)), box = $("fkWeek"); box.textContent = "";
    ds.forEach((d, i) => {
      const col = document.createElement("div"), val = document.createElement("small"), bar = document.createElement("i"), lab = document.createElement("small");
      val.textContent = d.min ? String(d.min) : ""; bar.style.height = Math.max(2, Math.round(d.min / max * 80)) + "px";
      lab.textContent = d.label; if(i === 6) lab.style.fontWeight = "700";
      col.append(val, bar, lab); box.appendChild(col);
    });
    const today = ds[6].min, week = ds.reduce((s, d) => s + d.min, 0);
    $("fkSum").textContent = "Heute: " + today + " Min. · Letzte 7 Tage: " + week + " Min.";
  }
  function fillSelect(sel, values, current){
    sel.textContent = "";
    [...new Set([...values, current])].sort((a, b) => a - b).forEach(v => { const o = document.createElement("option"); o.value = v; o.textContent = v + " Min."; sel.appendChild(o); });
    sel.value = String(current);
  }
  function render(){ draw(); renderWeek(); }
  function init(){
    fillSelect($("fkWork"), [15, 25, 35, 45, 60], cfg().work); fillSelect($("fkBreak"), [5, 10, 15], cfg().brk);
    $("fkWork").onchange = () => { cfg().work = Number($("fkWork").value); saveData(); if(!running){ if(mode === "work") remaining = total(); draw(); } };
    $("fkBreak").onchange = () => { cfg().brk = Number($("fkBreak").value); saveData(); if(!running){ if(mode === "break") remaining = total(); draw(); } };
    $("fkStart").onclick = start; $("fkReset").onclick = reset; $("fkSkip").onclick = skip;
    document.addEventListener("visibilitychange", () => { if(running) tick(); });
    remaining = total(); render();
  }
  return { init, render, weekMinutes };
})();
