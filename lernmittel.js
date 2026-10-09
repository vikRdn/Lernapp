/* Lernen unter Prüfungsdruck – lernmittel.js
   Lernmittel: Notizen, Bilder, PDFs, Links (Dateien in IndexedDB)
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Lernmittel (E7: Notizen, Bilder, PDFs speichern und öffnen)
   Ein Lernmittel = { id, type:"note"|"image"|"pdf", title, text (nur Notiz),
                      examId|null, subject, fileName, mime, size, createdAt }
   Die Daten (Metadaten + Notiztext) liegen im normalen Speicher (data.materials).
   Die Dateien selbst (Blobs) liegen in IndexedDB unter derselben id,
   weil der normale Speicher dafür zu klein ist.
   E8 ergänzt: Filter und Gruppierung, Zuordnung ändern
   E10 ergänzt: Typ "link" (m.url, nur http/https), Suche, Verknüpfung mit dem Countdown
   ===================================================== */
const Lernmittel = (() => {
  const $ = id => document.getElementById(id);
  const MAX_BYTES = 25 * 1024 * 1024;   // größte erlaubte Datei
  const MAX_EDGE = 1600;                // Bilder werden auf diese Kantenlänge verkleinert
  const KINDS = [["note", "Notiz", "note"], ["image", "Bild", "image"], ["pdf", "PDF", "pdf"], ["link", "Link", "link"]];   // [Art, Name, Symbol]
  let kind = "note", saving = false, viewerUrl = null;
  let pane = "material";   // E9: "material" oder "cards" (Lernkarten)
  let filter = "all", editingId = null;   // E8: gewählter Filter, Lernmittel im Bearbeiten-Modus

  function h(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;
    return e;
  }
  const hostOf = u => { try{ return new URL(u).hostname; }catch(e){ return ""; } };
  function parseUrl(raw){   // nur echte http(s)-Adressen erlauben (kein javascript: und Ähnliches)
    if(!raw) return null;
    try{
      const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : "https://" + raw);
      return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".") ? u.href : null;
    }catch(e){ return null; }
  }
  const fmtSize = b => b < 1048576 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(1) + " MB";

  /* ---- Dateispeicher (IndexedDB) ---- */
  let dbp = null;
  function db(){
    if(!dbp){
      dbp = new Promise((res, rej) => {
        if(!window.indexedDB) return rej(new Error("IndexedDB fehlt"));
        const rq = indexedDB.open("lernapp-files", 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore("files");
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      });
      dbp.catch(() => { dbp = null; });
    }
    return dbp;
  }
  function tx(mode, fn){   // eine Aktion im Dateispeicher ausführen
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction("files", mode), rq = fn(t.objectStore("files"));
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = t.onabort = () => rej(t.error || new Error("Speichern fehlgeschlagen"));
    }));
  }
  const putFile = (id, blob) => tx("readwrite", st => st.put(blob, id));
  const getFile = id => tx("readonly", st => st.get(id));
  const delFile = id => tx("readwrite", st => st.delete(id));

  /* ---- Bilder ---- */
  function toDataUrl(blob){
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
  }
  async function shrinkImage(file, edge = MAX_EDGE, quality = 0.82){   // als JPEG mit höchstens MAX_EDGE Pixeln speichern
    const url = await toDataUrl(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("decode")); i.src = url; });
    const k = Math.min(1, edge / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);   // weißer Grund für PNG mit Transparenz
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("decode")), "image/jpeg", quality));
  }

  /* ---- Formular ---- */
  function setKind(k){
    kind = k;
    const seg = $("lmKind"); seg.textContent = "";
    KINDS.forEach(([key, label]) => {
      const b = h("button", "", label); b.setAttribute("aria-pressed", key === kind);
      b.onclick = () => { setKind(key); }; seg.appendChild(b);
    });
    const note = kind === "note", link = kind === "link";
    $("lmTextWrap").hidden = !note; $("lmFileWrap").hidden = note || link; $("lmUrlWrap").hidden = !link;
    $("lmTitleLabel").textContent = note ? "Titel" : "Titel (optional)";
    $("lmFileLabel").textContent = "Datei"; $("lmPick").textContent = kind === "image" ? "Bild auswählen" : "PDF auswählen"; $("lmPicked").textContent = "";
    $("lmFile").accept = kind === "image" ? "image/*" : "application/pdf,.pdf";
    $("lmFile").value = ""; $("lmError").textContent = "";
  }
  function fillExams(){ fillExamSelect($("lmExam")); $("lmSubjectWrap").hidden = false; }
  function openForm(m){   // ohne m: neues Lernmittel, mit m: bearbeiten
    editingId = m ? m.id : null;
    ["lmTitle", "lmText", "lmSubject", "lmUrl"].forEach(id => $(id).value = "");
    fillExams(); setKind(m ? m.type : "note");
    $("lmKind").hidden = !!m;                          // Art lässt sich nachträglich nicht ändern
    if(m){
      $("lmFileWrap").hidden = true;                   // die Datei bleibt, wie sie ist
      $("lmTitle").value = m.title; $("lmText").value = m.text || ""; $("lmUrl").value = m.url || "";
      $("lmExam").value = m.examId || ""; $("lmSubject").value = m.subject || "";
      $("lmSubjectWrap").hidden = !!m.examId;
    }
    $("lmSave").textContent = m ? "Änderung speichern" : "Speichern";
    $("lmForm").hidden = false; $("lmNew").hidden = true; $("lmForm").scrollIntoView(); $("lmTitle").focus();
  }
  function closeForm(){
    editingId = null; $("lmKind").hidden = false;
    $("lmForm").hidden = true; $("lmNew").hidden = false; $("lmError").textContent = "";
  }

  async function save(){
    if(saving) return;
    const err = $("lmError"), title = $("lmTitle").value.trim(), examId = $("lmExam").value || null;
    const file = $("lmFile").files[0], text = $("lmText").value.trim();
    err.textContent = "";
    let url = null;
    if(kind === "note"){
      if(!title){ err.textContent = "Bitte gib einen Titel ein."; $("lmTitle").focus(); return; }
      if(!text){ err.textContent = "Bitte schreibe etwas in die Notiz."; $("lmText").focus(); return; }
    } else if(kind === "link"){
      url = parseUrl($("lmUrl").value.trim());
      if(!url){ err.textContent = "Bitte gib eine gültige Adresse ein, zum Beispiel www.beispiel.de."; $("lmUrl").focus(); return; }
    } else if(!editingId){
      if(!file){ err.textContent = "Bitte wähle eine Datei aus."; return; }
      if(file.size > MAX_BYTES){ err.textContent = "Die Datei ist größer als 25 MB. Wähle eine kleinere Datei."; return; }
      const okType = kind === "image" ? file.type.startsWith("image/") : (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
      if(!okType){ err.textContent = kind === "image" ? "Das ist kein Bild." : "Das ist keine PDF-Datei."; return; }
    }
    if(editingId){   // nur Titel, Text und Zuordnung ändern
      const old = data.materials.find(x => x.id === editingId);
      if(old){
        old.title = title || old.title;
        if(old.type === "note") old.text = text;
        if(old.type === "link") old.url = url;
        old.examId = examId; old.subject = examId ? "" : $("lmSubject").value.trim();
        saveData();
      }
      closeForm(); render(); return;
    }
    const m = { id:newId(), type:kind, title:title || (file ? file.name.replace(/\.[^.]+$/, "") : url ? hostOf(url) : ""),
                examId, subject: examId ? "" : $("lmSubject").value.trim(), createdAt:new Date().toISOString() };
    saving = true; $("lmSave").disabled = true;
    try{
      if(kind === "note") m.text = text;
      else if(kind === "link") m.url = url;
      else {
        const blob = kind === "image" ? await shrinkImage(file) : file;
        await putFile(m.id, blob);
        if(kind === "image") m.thumb = await toDataUrl(await shrinkImage(blob, 128, 0.6));   // kleine Vorschau für die Liste
        m.fileName = file.name; m.mime = blob.type || file.type; m.size = blob.size;
      }
      data.materials.push(m); saveData();
      closeForm(); render();
    }catch(e){
      err.textContent = e && e.message === "decode"
        ? "Das Bild konnte nicht gelesen werden. Versuche ein anderes Bild."
        : "Die Datei konnte nicht gespeichert werden. Möglicherweise ist der Speicher voll oder gesperrt.";
    }finally{ saving = false; $("lmSave").disabled = false; }
  }

  /* ---- Liste ---- */
  const matches = m => {
    const ex = m.examId && data.exams.find(e => e.id === m.examId);
    return filterMatch(m, filter) && searchMatch([m.title, m.text, m.subject, m.fileName, m.url, ex ? ex.subject : ""]);
  };
  function renderFilter(){
    const wrap = $("lmFilterWrap"), sel = $("lmFilter"), all = data.materials;
    wrap.hidden = !all.length; sel.textContent = "";
    if(!all.length){ filter = "all"; return; }
    const opts = filterOptions(all);
    if(!opts.some(o => o[0] === filter)) filter = "all";
    opts.forEach(([v, label]) => { const o = document.createElement("option"); o.value = v; o.textContent = label; sel.appendChild(o); });
    sel.value = filter;
  }
  /* Umschalter Material / Lernkarten */
  function renderTabs(){
    const seg = $("lmTabs"); seg.textContent = "";
    [["material", "Material (" + data.materials.length + ")"], ["cards", "Lernkarten (" + data.cards.length + ")"]].forEach(([k, label]) => {
      const b = h("button", "", label); b.setAttribute("aria-pressed", k === pane); b.onclick = () => setPane(k); seg.appendChild(b);
    });
  }
  function setPane(k){
    pane = k; $("lmMaterialPane").hidden = k !== "material"; $("lmCardsPane").hidden = k !== "cards";
    renderTabs(); if(k === "cards") Lernkarten.render();
  }
  const thumbBusy = new Set();
  async function ensureThumb(m){   // Vorschau für ältere Bilder nachträglich erzeugen (einmalig)
    if(thumbBusy.has(m.id)) return; thumbBusy.add(m.id);
    try{
      const b = await getFile(m.id);
      if(b){ m.thumb = await toDataUrl(await shrinkImage(b, 128, 0.6)); saveData(); if(pane === "material") render(); }
    }catch(e){}
  }
  function render(){
    const list = $("lmList"); list.textContent = "";
    $("lmSearchWrap").hidden = !(data.materials.length || data.cards.length);
    renderTabs(); renderFilter();
    if(pane === "cards") Lernkarten.render();
    if(!data.materials.length){
      list.appendChild(h("div", "card empty", "Noch keine Lernmittel. Tippe oben auf „Lernmittel hinzufügen“."));
      return;
    }
    const shown = [...data.materials].filter(matches).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    if(!shown.length) list.appendChild(h("div", "card empty", "Keine Treffer."));
    shown.forEach(m => {
      const exam = m.examId && data.exams.find(e => e.id === m.examId);
      const where = exam ? "Prüfung: " + exam.subject : m.subject ? "Fach: " + m.subject : "Ohne Zuordnung";
      const card = h("div", "card"), row = h("div", "lm-item"), info = h("div");
      const meta = h("small", "", where + (m.size ? " · " + fmtSize(m.size) : m.url ? " · " + hostOf(m.url) : "")), dot = examDot(m.examId);
      if(dot) meta.prepend(dot);
      info.append(h("h3", "", m.title), meta);
      const lead = h("span", "ico");
      if(m.type === "image" && m.thumb){ const im = h("img", "thumb"); im.src = m.thumb; im.alt = ""; row.append(im, info); }
      else { lead.appendChild(icon(KINDS.find(k => k[0] === m.type)[2], 26)); row.append(lead, info); if(m.type === "image") ensureThumb(m); }
      const act = h("div", "actions");
      const o = h("button", "ghost", "Öffnen"); o.onclick = () => open(m);
      const e = h("button", "ghost", "Bearbeiten"); e.onclick = () => openForm(m);
      const d = h("button", "ghost danger", "Löschen"); d.onclick = () => remove(m);
      act.append(o, e, d); card.append(row, act); list.appendChild(card);
    });
  }
  async function remove(m){
    if(!(await askConfirm("„" + m.title + "“ löschen?", "Löschen"))) return;
    data.materials = data.materials.filter(x => x.id !== m.id);
    saveData();
    if(m.type !== "note"){ try{ await delFile(m.id); }catch(e){} }
    render();
  }

  /* ---- Ansehen ---- */
  async function open(m){
    const body = $("viewerBody"); body.textContent = "";
    $("viewerTitle").textContent = m.title; $("viewer").hidden = false;
    if(m.type === "note"){ body.append(h("div", "card noteview", m.text), Lernkarten.quickForm(m)); return; }
    if(m.type === "link"){   // Link: in neuem Tab öffnen (Einbetten in die App ist bei fremden Seiten nicht möglich)
      const safe = parseUrl(m.url), c = h("div", "card");
      c.appendChild(h("small", "", "Externe Seite"));
      const t = h("p", "", m.url); t.style.overflowWrap = "anywhere"; c.appendChild(t);
      if(safe){
        const a = h("a", "linkbtn", "Link öffnen"); a.href = safe; a.target = "_blank"; a.rel = "noopener noreferrer";
        c.append(a, h("p", "lt-desc", "Der Link öffnet sich in einem neuen Tab. Du verlässt dann diese App."));
      } else c.appendChild(h("p", "error", "Diese Adresse ist nicht erlaubt."));
      body.appendChild(c); return;
    }
    let blob = null;
    try{ blob = await getFile(m.id); }catch(e){}
    if(!blob){ body.appendChild(h("div", "card empty", "Die Datei wurde nicht gefunden. Möglicherweise hat der Browser den Speicher geleert.")); return; }
    if(m.type === "image"){
      const img = h("img"); img.alt = m.title; img.src = await toDataUrl(blob); body.appendChild(img);
    } else {
      viewerUrl = URL.createObjectURL(blob);
      const a = h("a", "", "PDF in neuem Tab öffnen"); a.href = viewerUrl; a.target = "_blank"; a.rel = "noopener";
      a.style.cssText = "display:block;padding:0 0 12px;color:var(--accent)";
      const f = h("iframe"); f.src = viewerUrl; f.title = m.title; body.append(a, f);
    }
  }
  function closeViewer(){
    $("viewer").hidden = true; $("viewerBody").textContent = "";
    if(viewerUrl){ URL.revokeObjectURL(viewerUrl); viewerUrl = null; }
    renderTabs(); if(pane === "cards") Lernkarten.render();   // Zahlen und Karten-Status aktualisieren
  }

  /* ---- Backup: Dateien aus dem und in den Dateispeicher (E11) ---- */
  async function exportFiles(only){   // only: optionale Menge von Lernmittel-IDs
    const out = {};
    for(const m of data.materials){
      if(m.type !== "image" && m.type !== "pdf") continue;
      if(only && !only.has(m.id)) continue;
      try{ const b = await getFile(m.id); if(b) out[m.id] = { dataUrl:await toDataUrl(b) }; }catch(e){}
    }
    return out;
  }
  function dataUrlToBlob(u){
    const [head, b64] = u.split(","), mime = (head.match(/:(.*?);/) || [])[1] || "application/octet-stream";
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type:mime });
  }
  async function importFiles(files){
    const ids = Object.keys(files);
    if(!ids.length) return;
    for(const id of ids){
      if(files[id] && typeof files[id].dataUrl === "string") await putFile(id, dataUrlToBlob(files[id].dataUrl));
    }
  }
  const clearFiles = () => tx("readwrite", st => st.clear());

  function init(){
    $("lmNew").onclick = () => openForm();
    $("lmFilter").onchange = () => { filter = $("lmFilter").value; render(); };
    $("lmSearch").oninput = () => { searchQuery = $("lmSearch").value.trim(); render(); };
    $("lmCancel").onclick = closeForm;
    $("lmSave").onclick = save;
    $("lmPick").onclick = () => $("lmFile").click();
    $("lmFile").onchange = () => {   // gewählte Datei sichtbar machen
      const f = $("lmFile").files[0];
      $("lmPicked").textContent = f ? "Gewählt: " + f.name + " (" + fmtSize(f.size) + ")" : "";
    };
    $("lmExam").onchange = () => { $("lmSubjectWrap").hidden = !!$("lmExam").value; };   // Fach nur ohne Prüfung
    $("viewerClose").onclick = closeViewer;
    document.addEventListener("keydown", e => { if(e.key === "Escape" && !$("viewer").hidden && !dialogDone) closeViewer(); });
    render();
  }
  return { init, render, renderTabs, exportFiles, importFiles, clearFiles, closeForm, closeViewer, setPane, parseUrl,
    putDataUrl: (id, u) => putFile(id, dataUrlToBlob(u)),
    add: examId => {   // Formular öffnen, optional mit vorgewählter Prüfung
      setPane("material"); openForm();
      if(examId){ $("lmExam").value = examId; $("lmSubjectWrap").hidden = true; }
    },
    showFor: (examId, which) => {   // Lernmittel oder Karten einer Prüfung anzeigen (vom Lernplan aus)
      searchQuery = ""; $("lmSearch").value = "";
      filter = "exam:" + examId; Lernkarten.setFilter("exam:" + examId);
      setPane(which); showView("lernmittel");
    } };
})();
