/* Lernen unter Prüfungsdruck – tour.js
   Rundgang mit kleinen Vorschauen
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Rundgang (Spotlight-Tour mit kleinen Vorschauen)
   Hebt echte Elemente der App hervor und wechselt dabei die Ansicht.
   Die Karte zeigt eine kleine, selbstständige Vorschau zum Ausprobieren.
   Die Vorschauen sind nur Beispiele: Sie lesen und schreiben keine echten Daten.
   Schritte stehen in STEPS; "feature" überspringt abgewählte Bereiche.
   ===================================================== */
const Tour = (() => {
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function h(tag, cls, text){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text !== undefined) e.textContent = text;
    return e;
  }
  function buttons(box, items, onPick){   // Auswahl-Knöpfe, einer ist gedrückt
    const row = h("div", "pvrow");
    items.forEach(([k, label]) => {
      const b = h("button", "pvb", label); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.onclick = () => { row.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); onPick(k); };
      row.appendChild(b);
    });
    box.appendChild(row);
  }

  /* ---- Vorschauen ---- */
  const PREVIEWS = {
    add(box){
      const out = h("p", "pvr", "Tippe auf eine Auswahl und sieh, was passiert.");
      buttons(box, [["p", "Prüfung"], ["l", "Lerninhalt"]], k => {
        out.textContent = k === "p" ? "→ Du trägst Fach und Datum ein. Danach siehst du die Tage bis zur Prüfung."
                                    : "→ Du legst eine Notiz, ein Bild, ein PDF oder einen Link an.";
      });
      box.appendChild(out);
    },
    menu(box){
      const info = { home:"Start: nächste Prüfung und was heute dran ist.", countdown:"Countdown: deine Prüfungen und der Lernplan.",
        lerntyp:"Lerntyp: Test mit Tipps, wie du am besten lernst.", lernmittel:"Lernmittel: Notizen, Bilder, PDFs, Links und Lernkarten.",
        settings:"Einstellungen: Aussehen, Backup und Lernpaket teilen." };
      const out = h("p", "pvr", "Tippe auf einen Bereich.");
      buttons(box, [["home", "Start"], ["countdown", "Countdown"], ["lerntyp", "Lerntyp"], ["lernmittel", "Lernmittel"], ["settings", "Einstellungen"]], k => { out.textContent = info[k]; });
      box.appendChild(out);
    },
    exam(box){
      const f = h("div", "pvf"), out = h("div", "pvr");
      const name = document.createElement("input"); name.type = "text"; name.value = "Mathe"; name.maxLength = 20; name.setAttribute("aria-label", "Fach (Beispiel)");
      const sel = document.createElement("select"); sel.setAttribute("aria-label", "Datum (Beispiel)");
      [[7, "in 7 Tagen"], [14, "in 14 Tagen"], [30, "in 30 Tagen"]].forEach(([v, l]) => { const o = document.createElement("option"); o.value = v; o.textContent = l; sel.appendChild(o); });
      sel.value = "14";
      const go = h("button", "pvb", "Beispiel speichern"); go.type = "button";
      go.onclick = () => {
        const n = Number(sel.value), c = h("div", "pvcard");
        c.style.borderLeft = "6px solid var(--accent)";
        c.append(h("b", "", name.value.trim() || "Fach"), h("small", "", n + " Tage bis zur Prüfung"), h("small", "", "Lernplan: " + Math.min(n, 8) + " Lernblöcke bis zum Tag vor der Prüfung"));
        out.textContent = ""; out.appendChild(c);
      };
      f.append(name, sel, go); box.append(f, out);
    },
    test(box){
      const opts = [["visuell", "Mit Skizzen und Farben"], ["auditiv", "Indem ich es laut erkläre"], ["schreiben", "Mit Zusammenfassungen"], ["handelnd", "Mit Aufgaben und Üben"]];
      const names = { visuell:"Visuell", auditiv:"Auditiv", schreiben:"Lesen und Schreiben", handelnd:"Handelnd" };
      const pick = new Set(), col = h("div", "pvcol"), out = h("p", "pvr", "Wähle eine oder zwei Antworten.");
      box.appendChild(h("p", "pvq", "Wie merkst du dir Stoff am besten? (bis zu 2 Antworten)")).style.margin = "0 0 8px";
      const refresh = () => {
        const a = [...pick].map(k => names[k]);
        out.textContent = !a.length ? "Wähle eine oder zwei Antworten." : a.length === 1
          ? "Beispiel-Ergebnis: Schwerpunkt " + a[0] + ". Dazu bekommst du passende Tipps."
          : "Beispiel-Ergebnis: Mischung aus " + a[0] + " und " + a[1] + ". Dazu bekommst du passende Tipps.";
      };
      opts.forEach(([k, label]) => {
        const b = h("button", "pvb", label); b.type = "button"; b.setAttribute("aria-pressed", "false");
        b.onclick = () => { if(pick.has(k)) pick.delete(k); else if(pick.size < 2) pick.add(k); b.setAttribute("aria-pressed", pick.has(k)); refresh(); };
        col.appendChild(b);
      });
      box.append(col, out);
    },
    material(box){
      const info = { note:"Notiz: schreibe Gedanken oder Zusammenfassungen auf. Daraus machst du später Lernkarten.",
        image:"Bild: ein Foto vom Tafelbild oder Heft. Es wird verkleinert und nur auf deinem Gerät gespeichert.",
        pdf:"PDF: ein Skript oder Arbeitsblatt, nur auf deinem Gerät gespeichert.", link:"Link: die Adresse einer Seite. Sie öffnet sich in einem neuen Tab." };
      const out = h("p", "pvr", "Tippe auf eine Art, um zu sehen, wofür sie da ist.");
      buttons(box, [["note", "Notiz"], ["image", "Bild"], ["pdf", "PDF"], ["link", "Link"]], k => { out.textContent = info[k]; });
      box.appendChild(out);
    },
    cards(box){
      const card = h("div", "pvcard"), q = h("b", "", "Woraus besteht ein Bruch?"), a = h("div", "", ""), out = h("p", "pvr", "");
      const mine = document.createElement("textarea"); mine.placeholder = "Deine Antwort (optional)"; mine.style.minHeight = "60px"; mine.maxLength = 200;
      const flip = h("button", "pvb", "Umdrehen"); flip.type = "button";
      const row = h("div", "pvrow"); row.hidden = true;
      flip.onclick = () => { a.textContent = "Antwort: Aus Zähler und Nenner."; a.style.margin = "8px 0"; row.hidden = false; flip.hidden = true; };
      [["Gewusst", "✓ Gewusst. Im Verlauf der Karte gespeichert (nur Beispiel)."], ["Nicht gewusst", "✗ Nicht gewusst. Die Karte kommt bald wieder dran (nur Beispiel)."]].forEach(([label, msg]) => {
        const b = h("button", "pvb", label); b.type = "button"; b.onclick = () => { out.textContent = msg; }; row.appendChild(b);
      });
      card.append(q, mine, a, flip, row); box.append(card, out);
    },
    theme(box){
      const wrap = h("div", "pvtheme"), sample = h("div", "pvsample");
      sample.append(h("b", "", "Mathe"), h("small", "", "12 Tage bis zur Prüfung"), h("span", "pvsb", "Speichern"));
      wrap.appendChild(sample);
      const setDark = d => { wrap.style.setProperty("--pbg", d ? "#000" : "#f2f2f7"); wrap.style.setProperty("--pcard", d ? "#1c1c1e" : "#fff"); wrap.style.setProperty("--ptext", d ? "#f5f5f7" : "#1c1c1e"); };
      buttons(box, [["l", "Hell"], ["d", "Dunkel"]], k => setDark(k === "d"));
      const sw = h("div", "swatches"); sw.style.margin = "10px 0 0";
      PALETTE.forEach(([k, name]) => {
        const b = h("button", "sw"); b.type = "button"; b.style.background = "var(--pc-" + k + ")"; b.setAttribute("aria-label", name);
        b.onclick = () => wrap.style.setProperty("--pacc", "var(--pc-" + k + ")"); sw.appendChild(b);
      });
      box.append(sw, wrap);
    },
    backup(box){
      const out = h("p", "pvr", "Tippe auf einen Knopf.");
      buttons(box, [["b", "Backup erstellen"], ["l", "Lernpaket teilen"]], k => {
        out.textContent = k === "b" ? "→ Eine Datei mit allen deinen Daten wird gespeichert. Hebe sie gut auf. (Hier nur ein Beispiel.)"
          : "→ Du wählst eine Prüfung und teilst nur Lerninhalte, ohne Termine und eigene Antworten. (Hier nur ein Beispiel.)";
      });
      box.appendChild(out);
    }
  };

  const STEPS = [
    { view:"home", title:"Willkommen im Rundgang",
      text:"Ich zeige dir die App an Beispielen. Du kannst überall ausprobieren. Nichts davon wird gespeichert." },
    { view:"home", target:"#homeAdd", title:"Schnell hinzufügen", preview:"add",
      text:"Mit diesem Knopf legst du eine Prüfung oder einen Lerninhalt an. Das geht von der Startseite aus immer." },
    { view:"home", menu:true, target:"#drawer", title:"Das Menü", preview:"menu",
      text:"Mit dem Menü-Symbol oben links öffnest du das Menü. Am Computer steht es immer links." },
    { view:"countdown", feature:"countdown", target:"#examNew", title:"Prüfungen eintragen", preview:"exam",
      text:"Trage Fach und Datum ein. Du siehst die Tage bis dahin und bekommst einen Lernplan mit Aufgaben zum Abhaken." },
    { view:"lerntyp", feature:"lerntyp", target:"#ltBox > *", title:"Lerntyp-Test", preview:"test",
      text:"15 kurze Fragen zeigen dir, wie du am besten lernst, und geben dir passende Tipps." },
    { view:"lernmittel", feature:"lernmittel", target:"#lmNew", title:"Lernmittel sammeln", preview:"material",
      text:"Lege Notizen, Bilder, PDFs oder Links an und ordne sie einer Prüfung zu." },
    { view:"lernmittel", feature:"lernmittel", target:"#lmTabs", title:"Lernkarten", preview:"cards",
      text:"Aus Notizen machst du Lernkarten und übst sie. Deine eigenen Antworten werden im Verlauf gespeichert." },
    { view:"home", target:"#btnTheme", title:"Aussehen", preview:"theme",
      text:"Hell oder dunkel, dazu Farben und Design findest du auch in den Einstellungen." },
    { view:"settings", target:"#bkExport", title:"Backup und Teilen", preview:"backup",
      text:"Erstelle ab und zu ein Backup, damit nichts verloren geht. Mit einem Lernpaket teilst du nur Lerninhalte." },
    { view:"home", title:"Fertig!", text:"Mit dem ? oben siehst du die Einführung wieder. Den Rundgang findest du in den Einstellungen." }
  ];
  let steps = [], i = 0, running = false, token = 0;

  function place(el){   // Lichtkegel und Hinweiskarte positionieren
    const spot = $("tourSpot"), tip = $("tourTip"), pad = 8;
    spot.classList.remove("pulse");
    if(el){
      const r = el.getBoundingClientRect();
      spot.style.left = (r.left - pad) + "px"; spot.style.top = (r.top - pad) + "px";
      spot.style.width = (r.width + 2 * pad) + "px"; spot.style.height = (r.height + 2 * pad) + "px";
      spot.classList.add("pulse");
      const lower = r.top + r.height / 2 > innerHeight * 0.55;   // Ziel unten: Hinweis nach oben
      tip.style.top = lower ? "calc(env(safe-area-inset-top,0px) + 12px)" : "auto";
      tip.style.bottom = lower ? "auto" : "calc(env(safe-area-inset-bottom,0px) + 12px)";
    } else {   // kein Ziel: nur Hinweis in der Mitte
      spot.style.left = "50%"; spot.style.top = "40%"; spot.style.width = "0px"; spot.style.height = "0px";
      tip.style.top = "12%"; tip.style.bottom = "auto";
    }
  }
  async function show(){
    const my = ++token, st = steps[i], pv = $("tourPreview");
    $("tourCount").textContent = "Schritt " + (i + 1) + " von " + steps.length;
    $("tourTitle").textContent = st.title; $("tourText").textContent = st.text;
    pv.textContent = ""; pv.hidden = !st.preview;
    if(st.preview){
      const box = h("div", "pv"); box.appendChild(h("small", "pvt", "Zum Ausprobieren (nur ein Beispiel)"));
      PREVIEWS[st.preview](box); pv.appendChild(box);
    }
    $("tourBack").style.visibility = i ? "visible" : "hidden";
    $("tourNext").textContent = i === steps.length - 1 ? "Fertig" : "Weiter";
    showView(st.view); setMenu(!!st.menu);
    await sleep(st.menu ? 330 : 90);
    if(my !== token) return;
    let el = st.target ? document.querySelector(st.target) : null;
    if(el && !el.getClientRects().length) el = null;   // Element nicht sichtbar -> ohne Hervorhebung zeigen
    if(el && !st.menu) el.scrollIntoView({ block:"center" });
    place(el); $("tourNext").focus({ preventScroll:true });
  }
  function start(){
    steps = STEPS.filter(s => !s.feature || data.settings.features[s.feature]);
    i = 0; running = true; $("tour").hidden = false; show();
  }
  function end(){
    running = false; token++; $("tour").hidden = true; setMenu(false);
    data.settings.tourDone = true; saveData(); showView("home");
  }
  function init(){
    $("tourNext").onclick = () => { if(i < steps.length - 1){ i++; show(); } else end(); };
    $("tourBack").onclick = () => { if(i > 0){ i--; show(); } };
    $("tourEnd").onclick = end;
    $("tourStart").onclick = start;
    window.addEventListener("resize", () => { if(running) show(); });
    document.addEventListener("keydown", e => { if(e.key === "Escape" && running) end(); });
  }
  return { init, start };
})();
