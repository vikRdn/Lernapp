/* Lernen unter Prüfungsdruck – kalender.js
   Kalender-Export: Prüfungen (mit Erinnerungen), Lernplan-Aufgaben und Ziele als .ics-Datei,
   die sich in jeden Kalender (Handy, iPad, Computer) importieren lässt. Alles bleibt auf dem Gerät.
   Wird als normales Script geladen (Reihenfolge siehe index.html). */
/* =====================================================
   MODUL: Kalender-Export
   ===================================================== */
const Kalender = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  function fold(line){   // lange Zeilen umbrechen (Vorgabe: höchstens 75 Byte pro Zeile)
    const out = []; let rest = line;
    while(rest.length > 36){ out.push(rest.slice(0, 36)); rest = " " + rest.slice(36); }
    out.push(rest); return out.join("\r\n");
  }
  const ymd = iso => iso.replace(/-/g, "");
  function nextDay(iso){ const d = Countdown.dateOf(iso); d.setDate(d.getDate() + 1); const p = v => String(v).padStart(2, "0"); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); }
  function stamp(){ return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""); }
  function alarm(text, trigger){ return ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(text), "TRIGGER:" + trigger, "END:VALARM"]; }
  function event(uid, summary, iso, desc, alarms){   // ganztägiger Termin
    return ["BEGIN:VEVENT", "UID:" + uid + "@lernapp", "DTSTAMP:" + stamp(), "DTSTART;VALUE=DATE:" + ymd(iso), "DTEND;VALUE=DATE:" + nextDay(iso),
            "SUMMARY:" + esc(summary), ...(desc ? ["DESCRIPTION:" + esc(desc)] : []), ...(alarms || []), "END:VEVENT"];
  }
  function build(exams, withTasks, withGoals){
    const today = Countdown.todayIso(), L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lernapp//Lernen unter Pruefungsdruck//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Lernapp"];
    let n = 0;
    exams.forEach(ex => {
      L.push(...event("exam-" + ex.id, "Prüfung: " + ex.subject, ex.date, "Viel Erfolg! Eingetragen in der Lernapp.", [
        ...alarm("Prüfung in 7 Tagen: " + ex.subject, "-P6DT15H"),   // 7 Tage vorher, 9:00 Uhr
        ...alarm("Morgen ist die Prüfung: " + ex.subject, "-PT15H"),   // Vortag, 9:00 Uhr
        ...alarm("Heute ist die Prüfung: " + ex.subject, "PT7H")]));  // am Tag selbst, 7:00 Uhr
      n++;
      if(withTasks) data.tasks.filter(t => t.examId === ex.id && t.status !== "done" && t.date && t.date >= today).forEach(t => {
        L.push(...event("task-" + t.id, "Lernen: " + ex.subject + " – " + t.title.replace(/\s*\([^)]*\)\s*$/, ""), t.date, t.title)); n++;
      });
    });
    if(withGoals) data.goals.filter(g => !g.done && g.due && g.due >= today).forEach(g => { L.push(...event("goal-" + g.id, "Ziel: " + g.text, g.due, "")); n++; });
    L.push("END:VCALENDAR");
    return { text:L.map(fold).join("\r\n") + "\r\n", count:n };
  }
  async function save(exams, withTasks, withGoals, msg){
    if(!exams.length && !(withGoals && data.goals.some(g => !g.done && g.due))){ msg("Es gibt noch keine anstehende Prüfung zum Exportieren."); return; }
    const { text, count } = build(exams, withTasks, withGoals);
    const blob = new Blob([text], { type:"text/calendar" }), fake = { textContent:"" };
    if(!(await Backup.deliver("lernapp-kalender-" + Countdown.todayIso() + ".ics", blob, fake))){ msg(fake.textContent || "Abgebrochen."); return; }
    msg("Kalender-Datei gespeichert (" + count + " Termine). Öffne sie, um die Termine in deinen Kalender zu übernehmen.");
  }
  const upcoming = () => data.exams.filter(e => Countdown.daysUntil(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  function init(){
    $("kcExport").onclick = () => save(upcoming(), $("kc_tasks").checked, $("kc_goals").checked, t => { $("kcMsg").textContent = t; });
  }
  return { init,
    exportExam: id => {   // eine Prüfung mit ihren offenen Lernplan-Aufgaben
      const ex = data.exams.find(e => e.id === id);
      if(ex) save([ex], true, false, t => Rewards.toast(t.startsWith("Kalender-Datei") ? "Kalender-Datei gespeichert" : t, "calendar", true));
    } };
})();
