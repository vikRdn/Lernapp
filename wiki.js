/* Lernen unter Prüfungsdruck – wiki.js
   Nachschlagen bei Wikipedia: Suche und Zusammenfassung über die offene Wikipedia-Schnittstelle.
   Gesendet wird nur der Suchbegriff. Funktioniert nur online (in der Chat-Vorschau gesperrt).
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Nachschlagen (Wikipedia)
   ===================================================== */
const Wiki = (() => {
  const $ = id => document.getElementById(id);
  const API = "https://de.wikipedia.org";
  function h(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;
    return e;
  }
  const msg = t => { $("wkMsg").textContent = t; };
  const OFFLINE = "Nachschlagen ist gerade nicht möglich. Prüfe deine Internetverbindung. In der Vorschau im Chat ist es gesperrt, auf deiner Online-Version funktioniert es.";
  async function getJson(url){ const r = await fetch(url); if(!r.ok) throw new Error("HTTP " + r.status); return r.json(); }
  const plain = html => new DOMParser().parseFromString(html || "", "text/html").body.textContent || "";   // Ausschnitt ohne HTML

  async function search(){
    const q = $("wkQuery").value.trim(), list = $("wkResults");
    if(!q){ msg("Gib einen Begriff ein."); $("wkQuery").focus(); return; }
    msg("Suche …"); list.textContent = ""; $("wkArticle").hidden = true;
    try{
      const d = await getJson(API + "/w/api.php?action=query&list=search&format=json&origin=*&srlimit=8&srsearch=" + encodeURIComponent(q));
      const hits = (d.query && d.query.search) || [];
      msg(hits.length ? hits.length + " Treffer. Tippe einen an, um die Zusammenfassung zu sehen." : "Nichts gefunden. Versuche einen anderen Begriff.");
      hits.forEach(x => {
        const b = h("button", "taskrow", x.title);
        b.appendChild(h("small", "", plain(x.snippet).slice(0, 140) + " …"));
        b.onclick = () => openArticle(x.title); list.appendChild(b);
      });
    }catch(e){ msg(OFFLINE); }
  }
  async function openArticle(title){
    msg("Lade Zusammenfassung …");
    try{
      const d = await getJson(API + "/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_")));
      msg(""); renderArticle(d);
    }catch(e){ msg(OFFLINE); }
  }
  function renderArticle(d){
    const box = $("wkArticle"); box.textContent = ""; box.hidden = false;
    const title = String(d.title || "");
    box.appendChild(h("h3", "", title)); box.lastChild.style.marginTop = "0";
    if(d.description) box.appendChild(h("p", "lt-desc", d.description));
    const thumb = d.thumbnail && Lernmittel.parseUrl(d.thumbnail.source);
    if(thumb){ const im = h("img", "wkimg"); im.src = thumb; im.alt = ""; box.appendChild(im); }
    const ex = h("p", "", d.extract || "Keine Zusammenfassung vorhanden."); ex.style.whiteSpace = "pre-wrap"; box.appendChild(ex);
    if(d.type === "disambiguation") box.appendChild(h("p", "lt-desc", "Dieser Begriff hat mehrere Bedeutungen. Suche genauer, zum Beispiel mit dem Fach dazu."));
    const page = d.content_urls && d.content_urls.mobile && Lernmittel.parseUrl(d.content_urls.mobile.page);

    // Als Notiz speichern (mit Quellenangabe und Lizenz)
    const f = h("div", "field"), l = h("label", "", "Als Notiz speichern zu"), sel = document.createElement("select");
    sel.id = "wkExam"; l.htmlFor = "wkExam"; fillExamSelect(sel); f.append(l, sel); box.appendChild(f);
    const done = h("p", "lt-desc", ""); done.setAttribute("role", "status");
    const save = h("button", "primary", "Als Notiz speichern");
    save.onclick = () => {
      const src = "\n\nQuelle: Wikipedia, Artikel „" + title + "“" + (page ? ", " + page : "") + ". Text unter der Lizenz CC BY-SA 4.0.";
      Lernmittel.addNote(title, (d.extract || "") + src, sel.value || null);
      done.textContent = "Gespeichert ✓ Du findest die Notiz unter Lernmittel und kannst daraus Lernkarten machen.";
    };
    box.append(save, done);
    if(page){
      const a = h("a", "linkbtn", "Ganzen Artikel öffnen"); a.href = page; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.style.cssText = "background:var(--bg);color:var(--accent)"; box.appendChild(a);
    }
    box.appendChild(h("p", "lt-desc", "Quelle: Wikipedia, Lizenz CC BY-SA 4.0. Der ganze Artikel öffnet sich in einem neuen Tab."));
    box.scrollIntoView({ block:"start" });
  }
  function init(){
    $("wkGo").onclick = search;
    $("wkQuery").addEventListener("keydown", e => { if(e.key === "Enter") search(); });
  }
  return { init };
})();
