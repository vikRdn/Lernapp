/* Lernen unter Prüfungsdruck – backup.js
   Backup und Lernpaket (Export/Import)
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Backup (E11: Export/Import als Datei)
   Datei = { app:"lernapp", version:1, exportedAt, data:{...}, files:{ id:{dataUrl} } }
   Beim Einspielen wird jeder Eintrag geprüft, bevor er übernommen wird.
   Das Format ist auch die Grundlage für späteres Teilen von Kartensets.
   ===================================================== */
const Backup = (() => {
  const $ = id => document.getElementById(id);
  const str = v => typeof v === "string";
  const okExam = e => e && str(e.id) && str(e.subject) && str(e.date) && /^\d{4}-\d{2}-\d{2}$/.test(e.date);
  const okTask = t => t && str(t.id) && str(t.examId) && str(t.title) && ["open", "doing", "done"].includes(t.status);
  const okMat = m => m && str(m.id) && str(m.title) && str(m.createdAt) && ["note", "image", "pdf", "link"].includes(m.type);
  const okCard = c => c && str(c.id) && str(c.front) && str(c.back) && str(c.createdAt);

  async function deliver(name, blob, msg){   // Datei speichern: in der claude.ai-Ansicht über die Plattform, sonst als Download
    try{
      const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
      if(dl){ await dl.save({ filename:name, data:blob }); return true; }
    }catch(e){
      if(e && e.code === "declined"){ msg.textContent = "Abgebrochen. Es wurde nichts gespeichert."; return false; }
    }
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  }

  async function exportAll(){
    const msg = $("bkMsg"), btn = $("bkExport");
    msg.textContent = "Backup wird erstellt …"; btn.disabled = true;
    try{
      const files = await Lernmittel.exportFiles();
      const payload = { app:"lernapp", version:1, exportedAt:new Date().toISOString(), data, files };
      const blob = new Blob([JSON.stringify(payload)], { type:"application/json" });
      if(!(await deliver("lernapp-backup-" + Countdown.todayIso() + ".json", blob, msg))) return;
      data.settings.lastBackup = new Date().toISOString(); saveData();
      msg.textContent = "Backup erstellt (" + (blob.size / 1048576).toFixed(1) + " MB). Schau in deinen Downloads nach der Datei.";
    }catch(e){
      msg.textContent = "Das Backup konnte nicht erstellt werden.";
    }finally{ btn.disabled = false; }
  }

  async function importFile(file){
    const msg = $("bkMsg2"); msg.textContent = "";
    let p;
    try{ p = JSON.parse(await file.text()); }catch(e){ msg.textContent = "Die Datei ist kein gültiges Backup."; return; }
    if(p && p.kind === "package"){ msg.textContent = "Das ist ein Lernpaket. Füge es weiter unten unter „Lernpaket hinzufügen“ hinzu."; return; }
    if(!p || p.app !== "lernapp" || p.version !== 1 || !p.data || !Array.isArray(p.data.exams)){
      msg.textContent = "Das ist kein Backup dieser App."; return;
    }
    const when = p.exportedAt ? new Date(p.exportedAt).toLocaleDateString("de-DE") : "unbekanntem Datum";
    if(!(await askConfirm("Backup vom " + when + " einspielen? Deine aktuellen Daten werden ersetzt.", "Einspielen"))) return;
    try{
      const d = p.data, list = (k, ok) => (Array.isArray(d[k]) ? d[k] : []).filter(ok);
      await Lernmittel.importFiles(p.files || {});
      data.exams = list("exams", okExam); data.tasks = list("tasks", okTask);
      data.materials = list("materials", okMat); data.cards = list("cards", okCard);
      data.goals = list("goals", g => g && str(g.id) && str(g.text) && typeof g.done === "boolean");
      data.reflections = list("reflections", r => r && str(r.id) && str(r.createdAt) && Number.isInteger(r.confidence) && r.confidence >= 1 && r.confidence <= 5);
      data.learnTypeResult = d.learnTypeResult || null;
      data.stats = { days:(d.stats && Array.isArray(d.stats.days) ? d.stats.days : []).filter(x => str(x) && /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-90) };
      data.settings = Object.assign(defaultData().settings, d.settings || {});
      data.settings.features = Object.assign(defaultData().settings.features, data.settings.features);
      saveData(); location.reload();
    }catch(e){
      msg.textContent = "Das Einspielen ist fehlgeschlagen. Möglicherweise ist der Speicher voll.";
    }
  }


  /* ---- Lernpaket: nur Lerninhalte teilen (ohne Prüfungen, Termine, eigene Antworten) ----
     Datei = { app, kind:"package", version:1, name, materials:[{key,type,title,text,url,fileName}],
               cards:[{front,back}], files:{ key:{dataUrl} } }
     Beim Hinzufügen werden neue IDs vergeben und alles geprüft; vorhandene Daten bleiben unverändert. */
  const PK_KINDS = ["note", "image", "pdf", "link"];
  const okPkMat = m => m && PK_KINDS.includes(m.type) && str(m.title) && m.title.trim() &&
    (m.type !== "note" || (str(m.text) && m.text.trim())) && (m.type !== "link" || (str(m.url) && Lernmittel.parseUrl(m.url)));
  const okPkCard = c => c && str(c.front) && str(c.back) && c.front.trim() && c.back.trim();
  const okDataUrl = (type, u) => str(u) && u.length < 40 * 1048576 &&
    (type === "image" ? /^data:image\/(jpeg|png|webp|gif);base64,/.test(u) : /^data:application\/pdf;base64,/.test(u));

  function render(){   // Auswahlfelder der Einstellungen füllen
    const sel = $("pkSource"), keep = sel.value; sel.textContent = "";
    filterOptions([...data.materials, ...data.cards]).forEach(([v, label]) => {
      const o = document.createElement("option"); o.value = v; o.textContent = label; sel.appendChild(o);
    });
    if([...sel.options].some(o => o.value === keep)) sel.value = keep;
    fillExamSelect($("pkTarget"));
  }
  async function pkExport(){
    const msg = $("pkMsg"), btn = $("pkExport"); msg.textContent = "";
    const f = $("pkSource").value;
    const kinds = PK_KINDS.filter(k => $("pk_" + k).checked);
    const mats = data.materials.filter(m => filterMatch(m, f) && kinds.includes(m.type));
    const cards = $("pk_cards").checked ? data.cards.filter(c => filterMatch(c, f)) : [];
    if(!mats.length && !cards.length){ msg.textContent = "Dazu gibt es nichts zu teilen. Wähle eine andere Auswahl oder andere Inhalte."; return; }
    let name = "Lernpaket";
    if(f.startsWith("exam:")){ const ex = data.exams.find(e => e.id === f.slice(5)); if(ex) name = ex.subject; }
    else if(f.startsWith("subject:")){ const m = [...data.materials, ...data.cards].find(x => !x.examId && (x.subject || "").toLowerCase() === f.slice(8)); if(m) name = m.subject; }
    btn.disabled = true; msg.textContent = "Lernpaket wird erstellt …";
    try{
      const files = await Lernmittel.exportFiles(new Set(mats.map(m => m.id)));
      const pkg = { app:"lernapp", kind:"package", version:1, name, createdAt:new Date().toISOString(),
        materials:mats.map(m => ({ key:m.id, type:m.type, title:m.title, text:m.text, url:m.url, fileName:m.fileName })),
        cards:cards.map(c => ({ front:c.front, back:c.back })), files };
      const blob = new Blob([JSON.stringify(pkg)], { type:"application/json" });
      const fname = "lernpaket-" + name.replace(/[^\wäöüÄÖÜß-]+/g, "_").slice(0, 40) + "-" + Countdown.todayIso() + ".json";
      if(!(await deliver(fname, blob, msg))) return;
      msg.textContent = "Lernpaket erstellt: " + mats.length + " Lernmittel und " + cards.length + " Karten (" + (blob.size / 1048576).toFixed(1) + " MB).";
    }catch(e){ msg.textContent = "Das Lernpaket konnte nicht erstellt werden."; }
    finally{ btn.disabled = false; }
  }
  async function pkImport(file){
    const msg = $("pkMsg2"); msg.textContent = "";
    let p;
    try{ p = JSON.parse(await file.text()); }catch(e){ msg.textContent = "Die Datei ist kein gültiges Lernpaket."; return; }
    if(!p || p.app !== "lernapp" || p.kind !== "package" || p.version !== 1 || !Array.isArray(p.materials) || !Array.isArray(p.cards)){
      msg.textContent = p && p.app === "lernapp" && p.data ? "Das ist ein komplettes Backup, kein Lernpaket. Spiele es oben unter „Backup einspielen“ ein." : "Das ist kein Lernpaket dieser App.";
      return;
    }
    const files = p.files && typeof p.files === "object" ? p.files : {};
    const mats = p.materials.slice(0, 300).filter(okPkMat).filter(m => m.type === "note" || m.type === "link" || okDataUrl(m.type, (files[m.key] || {}).dataUrl));
    const cards = p.cards.slice(0, 1000).filter(okPkCard);
    if(!mats.length && !cards.length){ msg.textContent = "Das Lernpaket enthält nichts, was sich hinzufügen lässt."; return; }
    const name = str(p.name) && p.name.trim() ? p.name.trim().slice(0, 60) : "Lernpaket";
    if(!(await askConfirm("Lernpaket „" + name + "“ mit " + mats.length + " Lernmitteln und " + cards.length + " Lernkarten hinzufügen? Deine vorhandenen Daten bleiben unverändert.", "Hinzufügen"))) return;
    const examId = $("pkTarget").value || null, subject = examId ? "" : name, now = new Date().toISOString();
    try{
      for(const m of mats){
        const id = newId(), item = { id, type:m.type, title:m.title.trim().slice(0, 80), examId, subject, createdAt:now };
        if(m.type === "note") item.text = m.text.slice(0, 20000);
        else if(m.type === "link") item.url = Lernmittel.parseUrl(m.url);
        else {
          const u = files[m.key].dataUrl;
          await Lernmittel.putDataUrl(id, u);
          item.fileName = str(m.fileName) ? m.fileName.slice(0, 120) : ""; item.mime = u.slice(5, u.indexOf(";"));
          item.size = Math.round((u.length - u.indexOf(",") - 1) * 0.75);
        }
        data.materials.push(item);
      }
      cards.forEach(c => data.cards.push({ id:newId(), front:c.front.trim().slice(0, 500), back:c.back.trim().slice(0, 1000),
        examId, subject, sourceId:null, known:null, tries:0, history:[], createdAt:now }));
      saveData(); Lernmittel.render();
      msg.textContent = "Hinzugefügt ✓ (" + mats.length + " Lernmittel, " + cards.length + " Karten). Du findest sie im Tab Lernmittel.";
    }catch(e){ msg.textContent = "Das Hinzufügen ist fehlgeschlagen. Möglicherweise ist der Speicher voll."; }
  }

  async function wipe(){
    if(!(await askConfirm("Wirklich alle deine Daten löschen? Das kann nicht rückgängig gemacht werden.", "Alles löschen"))) return;
    try{   // Einstellungen (Design, Bereiche, Einführung erledigt) bleiben, damit die Einführung nicht neu startet
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign(defaultData(), { settings:data.settings })));
    }catch(e){}
    try{ await Lernmittel.clearFiles(); }catch(e){}
    location.reload();
  }

  function init(){
    $("bkExport").onclick = exportAll;
    $("bkPick").onclick = () => $("bkFile").click();
    $("bkFile").onchange = () => { const f = $("bkFile").files[0]; if(f) importFile(f); $("bkFile").value = ""; };
    $("bkWipe").onclick = wipe;
    $("pkExport").onclick = pkExport;
    $("pkPick").onclick = () => $("pkFile").click();
    $("pkFile").onchange = () => { const f = $("pkFile").files[0]; if(f) pkImport(f); $("pkFile").value = ""; };
    render();
  }
  return { init, render };
})();
