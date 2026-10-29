import * as store from "./store.js";
import { todayISO, weekOf, effWeek, phaseFor, availableDays, mainDays, dayExercises, findExercise, programExercises, lastPerformance, topKg, suggestion, buildSets } from "./plan.js";

const VERSION = "2.2.2";

/* ---------- utils ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const parseNum = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : null; };
const fmtN = n => n == null ? "–" : String(Math.round(n * 100) / 100).replace(".", ",");
const fmtSec = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const fmtDate = iso => new Date(iso + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = d => new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const unitOf = m => m === "sec" ? "sec" : m === "m" ? "m" : "rip.";
const unitLong = m => m === "sec" ? "secondi" : m === "m" ? "metri" : "ripetizioni";
const repStep = m => m === "reps" ? 1 : 5;

const P = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  checkSm: '<path d="M6 12.5l4 4L18 8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  chevR: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  chevL: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  list: '<g fill="currentColor"><circle cx="5" cy="7" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="5" cy="17" r="1.6"/></g><path d="M9.5 7h10M9.5 12h10M9.5 17h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  gear: '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/></g>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  book: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H10c1.1 0 2 .9 2 2v13c0-.8-.7-1.5-1.5-1.5h-5c-.8 0-1.5-.7-1.5-1.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H14c-1.1 0-2 .9-2 2v13c0-.8.7-1.5 1.5-1.5h5c.8 0 1.5-.7 1.5-1.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  today: '<g fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke-linecap="round"/></g><circle cx="12" cy="15" r="2" fill="currentColor"/>',
  history: '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v3.7h3.7"/><path d="M12 8v4.3l2.8 1.7"/></g>',
  plan: '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8.5h8M8 12h8M8 15.5h5"/></g>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor"/>',
  run: '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="14.5" cy="4.5" r="1.8"/><path d="M8 21l3-5.5 3 2.5 1-5M6 11l3.5-3h4l2.5 3 3 1"/><path d="M11 8l-1.5 5"/></g>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
  heartFill: '<path d="M12 20.5s-8-4.9-8-10.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.9c0 5.7-8 10.6-8 10.6z" fill="currentColor"/>',
  flame: '<path d="M12 2.5c.6 3.2-1.6 4.8-3.1 6.8C7.6 11 7 12.6 7 14.4a5 5 0 0 0 10 0c0-2.4-1.2-4-2.4-5.3.2 1.6-.4 2.9-1.6 3.4.6-3.4-.2-6.8-1-10z" fill="currentColor"/>',
  house: '<path d="M4 11l8-6.5 8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
  clock: '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></g>',
  dumbbell: '<g fill="currentColor"><rect x="2.5" y="9" width="3" height="6" rx="1"/><rect x="5.5" y="6.5" width="3" height="11" rx="1.2"/><rect x="15.5" y="6.5" width="3" height="11" rx="1.2"/><rect x="18.5" y="9" width="3" height="6" rx="1"/><rect x="8.5" y="11" width="7" height="2" rx="1"/></g>',
  target: '<g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/></g><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
  timer: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M10 2.5h4"/></g>',
  stack: '<g fill="currentColor"><rect x="4" y="13" width="4" height="7" rx="1.2"/><rect x="10" y="8" width="4" height="12" rx="1.2"/><rect x="16" y="4" width="4" height="16" rx="1.2"/></g>'
};
const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
// Activity-style concentric rings: items [{v, max, color}], outermost first
function rings(items, size = 112) {
  const c0 = size / 2, sw = size * 0.135, gap = size * 0.02;
  return `<svg class="rings" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${items.map((it, k) => {
    const r = c0 - sw / 2 - k * (sw + gap), c = 2 * Math.PI * r, f = Math.min(1, it.max ? it.v / it.max : 0);
    return `<circle cx="${c0}" cy="${c0}" r="${r}" fill="none" stroke="${it.color}" stroke-opacity=".22" stroke-width="${sw}"/>` +
      (f > 0 ? `<circle cx="${c0}" cy="${c0}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 ${c0} ${c0})"/>` : "");
  }).join("")}</svg>`;
}

/* ---------- state ---------- */
const S = {
  plan: null, sessions: [], checkins: {}, active: null,
  tab: "oggi", view: "tabs", pickDay: null, minimal: false,
  exIdx: 0, howOpen: {}, rest: null, work: null, sheet: null,
  histMode: "sessioni", planDay: "A", home: false, deferred: false
};
const UI_KEYS = ["tab", "view", "exIdx", "howOpen", "rest", "work", "minimal", "home", "histMode", "planDay"];
function saveUI() { try { localStorage.setItem("ui", JSON.stringify(Object.fromEntries(UI_KEYS.map(k => [k, S[k]])))); } catch (e) {} }
function loadUI() { try { Object.assign(S, JSON.parse(localStorage.getItem("ui") || "{}")); } catch (e) {} }

/* ---------- data ---------- */
async function loadData() {
  const files = await store.allFiles();
  const plan = files.find(f => f.path === "plan.json");
  S.plan = plan ? plan.data : null;
  const sess = files.filter(f => f.path.startsWith("sessions/")).map(f => f.data);
  const inProgress = sess.filter(s => s.status === "in_corso").sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
  // keep the in-memory workout: it is newer than anything on disk
  if (!S.active || !inProgress.some(s => s.id === S.active.id)) S.active = inProgress[0] || null;
  S.sessions = sess.filter(s => s.status === "completata")
    .sort((a, b) => b.date.localeCompare(a.date) || (b.endedAt || "").localeCompare(a.endedAt || ""));
  S.checkins = Object.fromEntries(files.filter(f => f.path.startsWith("checkins/")).map(f => [f.path.slice(9, -5), f.data]));
  if (!S.active && (S.view === "workout" || S.view === "finish")) { S.view = "tabs"; S.rest = null; S.work = null; }
}
const sessionPath = s => "sessions/" + s.id + ".json";
function persistActive() { if (S.active) store.save(sessionPath(S.active), S.active, { sync: false }); saveUI(); }

const week = () => weekOf(S.plan, todayISO());
const days = () => availableDays(S.plan, week());
const gymSessions = () => S.sessions.filter(s => s.type === "gym");
// sessions of the current program, by its own week numbers
const inProgram = s => s.date >= S.plan.startDate;
const progWeek = s => weekOf(S.plan, s.date);
function nextDay() {
  const ds = mainDays(S.plan, week()), last = gymSessions().find(s => inProgram(s) && ds.includes(s.day));
  if (!ds.length) return days()[0];
  return last ? ds[(ds.indexOf(last.day) + 1) % ds.length] : ds[0];
}
// last time this exercise was done, same place (gym/home), counting the old program's ids
function lastFor(ex, before) {
  const def = findExercise(S.plan, ex.id) || {};
  return lastPerformance(S.sessions, [ex.id, ...(def.aliases || [])], before, ex.mode || "gym");
}

/* ---------- keep the screen awake ---------- */
const Awake = {
  on: false, lock: null,
  enable() {
    this.on = true;
    const v = $("#keepawake");
    try { const p = v.play(); p && p.catch(() => {}); } catch (e) {}
    this.acquire();
  },
  async acquire() {
    if (!this.on || document.visibilityState !== "visible" || this.lock) return;
    try {
      if ("wakeLock" in navigator) {
        this.lock = await navigator.wakeLock.request("screen");
        this.lock.addEventListener("release", () => { this.lock = null; });
      }
    } catch (e) { this.lock = null; }
  },
  disable() {
    this.on = false;
    try { this.lock && this.lock.release(); } catch (e) {}
    this.lock = null;
    try { $("#keepawake").pause(); } catch (e) {}
  }
};

/* ---------- sound ---------- */
let actx = null;
function unlockAudio() {
  try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) {}
}
function beep(times = 3) {
  try {
    unlockAudio();
    for (let k = 0; k < times; k++) {
      const g = actx.createGain(), o = actx.createOscillator(), t = actx.currentTime + k * 0.28;
      o.frequency.value = k === times - 1 ? 1175 : 880;
      o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.start(t); o.stop(t + 0.24);
    }
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
}

/* ---------- toast ---------- */
function toast(t) {
  const el = $("#toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 2000);
}

/* ---------- render ---------- */
function render(force) {
  const a = document.activeElement;
  if (!force && a && /INPUT|TEXTAREA/.test(a.tagName) && a.type !== "checkbox" && a.closest("#app,#sheet-root")) { S.deferred = true; return; }
  S.deferred = false;
  const app = $("#app");
  const inWk = S.active && (S.view === "workout" || S.view === "finish");
  document.documentElement.className = S.plan ? "d-" + (inWk ? S.active.day : S.tab === "oggi" ? currentDay() : S.tab === "scheda" && S.plan.days[S.planDay] ? S.planDay : "B") : "";
  if (!S.plan) app.innerHTML = viewSetup();
  else if (S.view === "workout" && S.active) app.innerHTML = viewWorkout();
  else if (S.view === "finish" && S.active) app.innerHTML = viewFinish();
  else app.innerHTML = ({ oggi: viewOggi, storico: viewStorico, scheda: viewScheda }[S.tab] || viewOggi)();
  renderTabbar();
  renderSheet();
  renderOverlay();
}
function renderTabbar() {
  const tb = $("#tabbar");
  const show = S.plan && (S.view === "tabs" || !S.active);
  tb.classList.toggle("hidden", !show);
  $("#edge").style.display = show ? "" : "none";
  if (!show) return;
  const tabs = [["oggi", "Oggi", "today"], ["storico", "Storico", "history"], ["scheda", "Scheda", "plan"]];
  tb.innerHTML = `<div class="in">${tabs.map(([k, l, ic]) => `<button data-act="tab" data-v="${k}" aria-selected="${S.tab === k}">${icon(ic)}<span>${l}</span></button>`).join("")}</div>`;
}

/* ---------- setup ---------- */
function viewSetup() {
  const c = store.config(), st = store.status;
  return `<div class="setup">
    <img class="app-icon" src="icons/icon-180.png" alt="">
    <div class="large-nav" style="margin:0 0 6px"><h1>Pre-season</h1></div>
    <p class="muted" style="margin:0 4px 20px">Collega il repo privato dei dati. Serve una volta sola: poi l'app funziona anche offline.</p>
    <div class="group" style="padding:4px 16px 16px">
      <label class="field-label" for="tok">Token GitHub</label>
      <input class="field" id="tok" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…" value="${esc(c.token)}">
      <label class="field-label" for="repo">Repo dei dati</label>
      <input class="field" id="repo" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(c.repo)}">
    </div>
    ${st.error ? `<div class="err">${esc(st.error)}</div>` : ""}
    <div style="margin-top:20px"><button class="btn" data-act="connect">${st.state === "syncing" ? "Collegamento…" : "Collega"}</button></div>
  </div>`;
}

/* ---------- Oggi ---------- */
function estMinutes(list) {
  return Math.round(list.reduce((a, e) => a + e.sets * ((e.measure === "sec" ? e.reps * (e.perSide ? 2 : 1) : 40) + e.rest), 0) / 60 / 5) * 5;
}
const currentDay = () => S.pickDay && days().includes(S.pickDay) ? S.pickDay : nextDay();
// by calendar week of the program, so the days before the start count as week 0
const weekSessions = w => S.sessions.filter(s => progWeek(s) === w);
// consecutive program weeks with every planned session done (the current one counts once done)
function weekStreak() {
  const w = effWeek(week());
  const full = n => weekSessions(n).filter(s => s.type === "gym" && mainDays(S.plan, n).includes(s.day)).length >= mainDays(S.plan, n).length;
  let n = full(w) ? w : w - 1, k = 0;
  while (n >= 1 && full(n)) { k++; n--; }
  return k;
}
function viewOggi() {
  const p = S.plan, w = week(), ew = effWeek(w), tot = p.totalWeeks || 6, ph = phaseFor(p, ew);
  const ds = days(), md = mainDays(p, w), day = currentDay();
  const wkS = weekSessions(w);
  const gym = wkS.filter(s => s.type === "gym" && md.includes(s.day)).length, run = wkS.filter(s => s.type === "run").length;
  const optDays = ds.filter(d => p.days[d].optional), opt = wkS.filter(s => s.type === "gym" && optDays.includes(s.day)).length;
  const pains = wkS.map(s => s.ankle).filter(v => v != null);
  const ankleAvg = pains.length ? Math.round(pains.reduce((x, y) => x + y, 0) / pains.length * 10) / 10 : null;
  const ci = S.checkins["w" + String(ew).padStart(2, "0")];
  const streak = weekStreak();
  const runsGoal = p.runsPerWeek || 1;
  const progress = w < 1 ? 0 : Math.min(w, tot);
  const actCard = `<button class="act-card" data-act="tab" data-v="scheda">
    <div class="act-head">${icon("flame")} ${w < 1 ? "Si parte " + fmtDate(p.startDate) : w > tot ? "Stagione" : "Settimana " + w}<span class="r">${esc(ph ? ph.name : "")} ${icon("chevR")}</span></div>
    <div class="act-body">
      <div class="legend">
        <div><div class="k" style="color:var(--move)">Allenamenti</div><div class="n num">${gym}<small>/${md.length}</small></div></div>
        <div><div class="k" style="color:var(--lime)">Corsa</div><div class="n num">${run}<small>/${runsGoal}</small></div></div>
        <div><div class="k" style="color:var(--cyan)">${w > tot ? "Mobilità" : "Programma"}</div><div class="n num">${w > tot ? opt : progress}<small>${w > tot ? "" : "/" + tot}</small></div></div>
      </div>
      ${rings([{ v: gym, max: md.length, color: "var(--move)" }, { v: run, max: runsGoal, color: "var(--lime)" }, { v: w > tot ? opt : progress, max: w > tot ? 1 : tot, color: "var(--cyan)" }], 96)}
    </div>
  </button>`;
  const a = S.active;
  let main;
  if (a) {
    const doneEx = a.exercises.filter(e => e.sets.length && e.sets.every(x => x.done)).length;
    main = `<div class="next-card d-${esc(a.day)}">
      <div class="next-head"><span class="tile">${esc(a.day)}</span><div><div class="k">In corso${a.home ? " · a casa" : ""}</div><h2>${esc(a.dayTitle || "")}</h2></div></div>
      <div class="facts"><span>${icon("dumbbell")} ${doneEx}/${a.exercises.length} esercizi</span><span>${icon("clock")} dalle ${fmtTime(a.startedAt)}</span></div>
      <button class="btn day" data-act="resume">${icon("play")} Riprendi</button>
    </div>`;
  } else {
    const dd = p.days[day];
    const list = dayExercises(p, day, { week: w, minimal: S.minimal && !dd.optional, home: S.home });
    const mainEx = list.filter(e => e.block === "main");
    main = `<div class="day-picker" role="group" aria-label="Giorno">${ds.map(d => `<button class="day-dot d-${d}" data-act="pick-day" data-v="${d}" aria-pressed="${d === day}"><b>${d}</b>${esc(p.days[d].short || p.days[d].title.split(/[ ,]/)[0])}</button>`).join("")}</div>
    <div class="next-card">
      <div class="next-head"><span class="tile">${esc(day)}</span><div><div class="k">${dd.optional ? "Facoltativa" : day === nextDay() ? "Prossimo" : "Giorno " + esc(day)}</div><h2>${esc(dd.title)}</h2></div></div>
      <div class="facts"><span>${icon("clock")} ${estMinutes(list)} min</span><span>${icon("dumbbell")} ${mainEx.length} esercizi</span>${S.home ? `<span>${icon("house")} a casa</span>` : ""}</div>
      <div class="ex-names">${list.some(e => e.block === "warmup") ? `<span class="dim">Riscaldamento</span>` : ""}${mainEx.map(e => `<span>${esc(e.name)}</span>`).join("")}${list.some(e => e.block === "ankle") ? `<span class="dim">Caviglia</span>` : ""}</div>
      <div class="toggles">
        <button class="toggle-chip" data-act="home" aria-pressed="${S.home}">${icon("house")} A casa</button>
        ${dd.optional ? "" : `<button class="toggle-chip" data-act="minimal" aria-pressed="${S.minimal}">${icon("bolt")} Minima</button>`}
      </div>
      <button class="btn day" data-act="start" data-v="${esc(day)}">${icon("play")} Inizia</button>
    </div>`;
  }
  return `<div class="top-bar">
      <button class="circle-btn" data-act="settings" aria-label="Impostazioni">${icon("gear")}</button>
      <button class="circle-btn" data-act="open-checkin" aria-label="Check-in settimanale" style="color:var(--move)">${icon(ci ? "heartFill" : "heart")}</button>
    </div>
    <h1 class="title-xl">Oggi</h1>
    <div class="meta-row"><span class="l">${icon("today")} ${cap(new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }))}</span>${streak ? `<span class="streak">${icon("flame")} ${streak} sett.</span>` : ""}</div>
    ${actCard}
    <div class="sec-title">Allenamento</div>
    ${main}
    <div class="sec-title">Settimana</div>
    <div class="stack">
      <button class="stat-card" style="--c:var(--green)" data-act="open-run"><span class="tile">${icon("run")}</span><div><div class="t">Corsa</div><div class="v num">${run}<small> di ${runsGoal}</small></div></div><span class="chev">${icon("chevR")}</span></button>
      <button class="stat-card" style="--c:var(--move)" data-act="open-checkin"><span class="tile">${icon("heartFill")}</span><div><div class="t">Check-in</div><div class="v">${ci ? "Fatto" : "Da fare"}</div></div><span class="chev">${icon("chevR")}</span></button>
      <div class="stat-card" style="--c:var(--cyan)"><span class="tile">${icon("target")}</span><div><div class="t">Caviglia, media</div><div class="v num">${ankleAvg == null ? "–" : fmtN(ankleAvg)}<small>${ankleAvg == null ? "" : " / 10"}</small></div></div></div>
      ${optDays.length ? `<div class="stat-card" style="--c:var(--cyan)"><span class="tile">${icon("stack")}</span><div><div class="t">Mobilità facoltativa</div><div class="v num">${opt}</div></div></div>` : ""}
    </div>
    ${syncLine()}`;
}
function syncLine() {
  const st = store.status;
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "adesso" : m < 60 ? m + " min fa" : fmtDate(todayISO(new Date(t))) + " " + fmtTime(t); };
  let cls = "", txt = "";
  if (st.state === "off") { cls = "err"; txt = "Sincronizzazione non configurata"; }
  else if (st.state === "syncing") { cls = "warn"; txt = "Sincronizzazione…"; }
  else if (st.state === "error") { cls = "err"; txt = st.error; }
  else if (st.state === "offline" || !navigator.onLine) { cls = "warn"; txt = "Offline" + (st.pending ? ` · ${st.pending} da inviare` : ""); }
  else if (st.pending) { cls = "warn"; txt = `${st.pending} da inviare`; }
  else { cls = "ok"; txt = st.lastSync ? "Sincronizzato " + ago(st.lastSync) : "Sincronizzato"; }
  return `<button class="sync-line" data-act="sync" style="width:100%"><span class="s-dot ${cls}"></span>${esc(txt)} · v${VERSION}</button>`;
}

/* ---------- start / resume ---------- */
function startWorkout(day) {
  const p = S.plan, w = week(), ph = phaseFor(p, effWeek(w)), date = todayISO();
  const minimal = S.minimal && !p.days[day].optional;
  const list = dayExercises(p, day, { week: w, minimal, home: S.home });
  S.active = {
    id: `${date}-${day}-${uid()}`, type: "gym", status: "in_corso", date, week: w, phase: ph ? ph.name : null,
    day, dayTitle: p.days[day].title, minimal, home: S.home,
    startedAt: new Date().toISOString(), endedAt: null, durationMin: null,
    exercises: list.map(ex => ({
      id: ex.id, name: ex.name, mode: ex.mode, block: ex.block, load: ex.load, measure: ex.measure, perSide: !!ex.perSide, step: ex.step,
      target: { sets: ex.sets, reps: ex.reps, rest: ex.rest },
      sets: buildSets(ex, lastFor(ex)), feel: null, like: null, failed: false, note: ""
    })),
    ankle: null, rpe: null, note: "", app: VERSION
  };
  S.view = "workout"; S.exIdx = 0; S.rest = null; S.work = null; S.howOpen = {};
  unlockAudio(); Awake.enable();
  persistActive(); render(); window.scrollTo(0, 0);
}
function resumeWorkout() {
  S.view = "workout";
  const firstOpen = S.active.exercises.findIndex(e => e.sets.some(s => !s.done));
  if (S.exIdx >= S.active.exercises.length) S.exIdx = Math.max(0, firstOpen);
  unlockAudio(); Awake.enable(); saveUI(); render(); window.scrollTo(0, 0);
}

/* ---------- workout ---------- */
const curEx = () => S.active.exercises[S.exIdx];
function planEx(e) {
  const d = findExercise(S.plan, e.id) || {}, h = e.mode === "home" ? (d.home || {}) : {};
  return { ...d, ...h, how: h.how || d.how, note: h.note ?? d.note, ...e };
}
function stepper(ei, si, f, val, unit) {
  return `<div class="stepper">
    <button data-act="step" data-ex="${ei}" data-i="${si}" data-f="${f}" data-d="-1" aria-label="Meno">−</button>
    <button class="val ${val == null ? "empty" : ""}" data-act="edit" data-ex="${ei}" data-i="${si}" data-f="${f}" aria-label="${unit}: ${fmtN(val)}, tocca per scrivere"><b>${val == null ? "–" : fmtN(val)}</b></button>
    <button data-act="step" data-ex="${ei}" data-i="${si}" data-f="${f}" data-d="1" aria-label="Più">+</button>
  </div>`;
}
function howBlock(h) {
  if (!h) return "";
  if (typeof h === "string") return `<div class="how"><p>${esc(h)}</p></div>`;
  return `<div class="how">
    ${h.why ? `<h4>A cosa serve</h4><p>${esc(h.why)}</p>` : ""}
    ${h.setup ? `<h4>Posizione</h4><p>${esc(h.setup)}</p>` : ""}
    ${h.steps?.length ? `<h4>Esecuzione</h4><ol>${h.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
    ${h.cues?.length ? `<h4>Da ricordare</h4><ul class="cues">${h.cues.map(s => `<li>${icon("checkSm")}${esc(s)}</li>`).join("")}</ul>` : ""}
    ${h.avoid?.length ? `<h4>Da evitare</h4><ul class="avoid">${h.avoid.map(s => `<li>${icon("x")}${esc(s)}</li>`).join("")}</ul>` : ""}
    ${h.progression ? `<h4>Progressione</h4><p>${esc(h.progression)}</p>` : ""}
  </div>`;
}
const setTxt = (e, s) => e.load === "none" || (e.load === "bw+" && !+s.kg) ? `${fmtN(s.reps)} ${unitOf(e.measure)}` : `${e.load === "bw+" ? "+" : ""}${fmtN(s.kg)} kg × ${fmtN(s.reps)}${e.measure === "reps" ? "" : " " + unitOf(e.measure)}`;
function bestSet(e) {
  const d = e.sets.filter(s => s.done);
  return d.reduce((a, s) => (e.load !== "none" ? (+s.kg || 0) > (+a.kg || 0) : (+s.reps || 0) > (+a.reps || 0)) ? s : a, d[0]);
}
const feelLbl = { facile: "Facile", giusto: "Giusto", duro: "Duro" };

function viewWorkout() {
  const a = S.active, ei = S.exIdx, e = curEx(), pe = planEx(e), n = a.exercises.length;
  const pend = e.sets.findIndex(s => !s.done);
  const last = lastFor(e, a);
  const sugg = suggestion({ ...pe, sets: e.target.sets, reps: e.target.reps }, last);
  const howOpen = S.howOpen[e.id] ?? !last;
  const hasLoad = e.load !== "none";
  const segs = a.exercises.map((x, i) => { const d = x.sets.filter(s => s.done).length, t = x.sets.length || 1; return `<i class="${i === ei ? "cur" : ""}"><b style="width:${Math.round(d / t * 100)}%"></b></i>`; }).join("");
  const loadLbl = e.load === "bw+" ? "+kg" : "kg";
  const rows = e.sets.map((s, i) => `<div class="set ${hasLoad ? "" : "one"} ${s.done ? "done" : ""} ${i === pend ? "current" : ""}">
      <span class="set-n">${i + 1}</span>
      ${hasLoad ? stepper(ei, i, "kg", s.kg, loadLbl) : ""}
      ${stepper(ei, i, "reps", s.reps, unitLong(e.measure))}
      <button class="check ${s.done ? "on" : ""}" data-act="toggle-set" data-ex="${ei}" data-i="${i}" aria-label="Serie ${i + 1} ${s.done ? "fatta, tocca per annullare" : "da fare"}">${icon("check")}</button>
    </div>`).join("");
  let primary;
  if (pend >= 0) primary = e.measure === "sec"
    ? `<button class="btn day" data-act="primary">${icon("play")} Avvia serie ${pend + 1} · ${fmtSec(e.sets[pend].reps)}</button>`
    : `<button class="btn day" data-act="primary">${icon("check")} Serie ${pend + 1} di ${e.sets.length} fatta</button>`;
  else if (ei < n - 1) primary = `<button class="btn green" data-act="primary">Prossimo esercizio ${icon("chevR")}</button>`;
  else primary = `<button class="btn green" data-act="primary">Termina allenamento</button>`;
  const elapsed = Math.floor((Date.now() - new Date(a.startedAt)) / 1000);
  return `<div class="wk-bar">
      <div class="wk-bar-top">
        <button class="circle-btn" data-act="end-menu" aria-label="Fine allenamento">${icon("x")}</button>
        <div class="wk-bar-mid">Giorno ${esc(a.day)}<small class="js-elapsed num">${fmtSec(elapsed)}</small></div>
        <button class="circle-btn" data-act="open-list" aria-label="Tutti gli esercizi">${icon("list")}</button>
      </div>
      <div class="segs" aria-hidden="true">${segs}</div>
    </div>
    <div class="wk-head" id="wk-swipe"><div class="txt">
      <div class="wk-kicker">${e.block === "ankle" ? "Caviglia · " : e.block === "warmup" ? "Riscaldamento · " : ""}Esercizio ${ei + 1} di ${n}</div>
      <h1 class="wk-title">${esc(e.name)}${e.mode === "home" ? '<span class="tag">a casa</span>' : ""}</h1>
      <div class="wk-sub"><b>${e.target.sets} × ${fmtN(e.target.reps)}</b> ${unitLong(e.measure)}${e.perSide ? " per lato" : ""}${e.target.rest ? " · recupero " + fmtSec(e.target.rest) : ""}</div>
      ${pe.note ? `<div class="foot" style="margin-top:6px">${esc(pe.note)}</div>` : ""}
    </div>
      <div class="wk-ring">${rings([{ v: e.sets.filter(x => x.done).length, max: e.sets.length, color: "var(--day)" }], 76)}<span><div>${e.sets.filter(x => x.done).length}/${e.sets.length}<small>SERIE</small></div></span></div>
    </div>
    <div class="group">
      <button class="how-toggle" data-act="how" data-v="${esc(e.id)}" aria-expanded="${howOpen}">${icon("book", "ic")}Come si fa<span class="chev">${icon("chevR")}</span></button>
      ${howOpen ? howBlock(pe.how) : ""}
    </div>
    ${last ? `<div class="card" style="margin-top:12px">
      <div class="last"><div><div class="lbl">Ultima volta · ${fmtDate(last.session.date)}</div><div class="val num">${setTxt(last.ex, bestSet(last.ex))}</div></div>
      ${last.ex.feel ? `<span class="pill">${feelLbl[last.ex.feel]}</span>` : ""}</div>
      ${sugg && pend >= 0 ? `<button class="suggest" data-act="apply-sugg" data-v="${sugg.kg}">${icon("bolt")}<span><b>Prova ${fmtN(sugg.kg)} kg</b><small>${esc(sugg.why)}</small></span></button>` : ""}
    </div>` : ""}
    <div class="section-h">Serie</div>
    <div class="group">
      <div class="sets-head ${hasLoad ? "" : "one"}"><span></span>${hasLoad ? `<span>${e.load === "bw+" ? "Zavorra kg" : "kg"}</span>` : ""}<span>${unitLong(e.measure)}</span><span></span></div>
      ${rows}
    </div>
    <div class="sets-actions"><button class="link" data-act="add-set">Aggiungi serie</button>${e.sets.length > 1 ? `<button class="link red" data-act="rm-set">Rimuovi ultima</button>` : ""}</div>
    <div class="section-h">Com'è andato</div>
    <div class="card">
      <div class="seg lg" role="group" aria-label="Fatica">${["facile", "giusto", "duro"].map(f => `<button data-act="feel" data-v="${f}" aria-pressed="${e.feel === f}">${feelLbl[f]}</button>`).join("")}</div>
      <div class="chips" style="margin-top:10px">
        <button class="chip green" data-act="like" data-v="1" aria-pressed="${e.like === 1}">👍 Mi piace</button>
        <button class="chip orange" data-act="like" data-v="-1" aria-pressed="${e.like === -1}">👎 Non mi piace</button>
        <button class="chip red" data-act="failed" aria-pressed="${!!e.failed}">Non riuscito</button>
      </div>
      <textarea class="field" data-bind="exnote" placeholder="Nota: sensazioni, tecnica, dolori" style="margin-top:12px;min-height:60px">${esc(e.note)}</textarea>
    </div>
    <div class="wk-bottom"><div class="in">
      <button class="nav" data-act="prev" ${ei === 0 ? "disabled" : ""} aria-label="Esercizio precedente">${icon("chevL")}</button>
      ${primary}
      <button class="nav" data-act="next" ${ei >= n - 1 ? "disabled" : ""} aria-label="Esercizio successivo">${icon("chevR")}</button>
    </div></div>`;
}

function goEx(i) {
  if (i < 0 || i >= S.active.exercises.length) return;
  S.exIdx = i; saveUI(); render(true); window.scrollTo(0, 0);
}
function cascade(e, i, f, oldV, newV) {
  e.sets[i][f] = newV;
  for (let j = i + 1; j < e.sets.length; j++) if (!e.sets[j].done && e.sets[j][f] === oldV) e.sets[j][f] = newV;
}
function stepValue(ei, i, f, dir) {
  const e = S.active.exercises[ei], s = e.sets[i];
  const st = f === "kg" ? (e.step || planEx(e).step || 2.5) : repStep(e.measure);
  const old = s[f];
  const v = Math.max(0, Math.round(((old ?? 0) + dir * st) * 100) / 100);
  cascade(e, i, f, old, v);
  persistActive(); render(true);
}
function toggleSet(ei, i) {
  const e = S.active.exercises[ei], s = e.sets[i];
  if (s.done) { s.done = false; s.doneAt = null; s.rest = null; persistActive(); render(true); return; }
  if (e.measure === "sec") { startWork(ei, i); return; }
  markDone(ei, i);
}
function markDone(ei, i) {
  const a = S.active, e = a.exercises[ei], s = e.sets[i];
  if (e.load === "kg" && s.kg == null) s.kg = 0;
  s.done = true; s.doneAt = new Date().toISOString();
  const exDone = e.sets.every(x => x.done);
  const allDone = a.exercises.every(x => x.sets.every(y => y.done));
  if (exDone && ei === S.exIdx && ei < a.exercises.length - 1) S.exIdx = ei + 1;
  if (allDone) { toast("Ultima serie fatta. Ottimo lavoro"); persistActive(); render(true); return; }
  if (e.target.rest > 0) startRest(ei, i, exDone);
  persistActive(); render(true); window.scrollTo(0, 0);
}
function primaryAction() {
  const e = curEx(), pend = e.sets.findIndex(s => !s.done);
  if (pend >= 0) return toggleSet(S.exIdx, pend);
  if (S.exIdx < S.active.exercises.length - 1) return goEx(S.exIdx + 1);
  S.view = "finish"; saveUI(); render(true); window.scrollTo(0, 0);
}

/* ---------- rest + timed sets ---------- */
function nextLabel(ei, i, exDone) {
  const a = S.active, e = a.exercises[ei];
  if (!exDone) {
    const nx = e.sets.findIndex(s => !s.done);
    const s = e.sets[nx];
    return { title: `Serie ${nx + 1} di ${e.sets.length}`, sub: `${esc(e.name)} · ${setTxt(e, s)}` };
  }
  const nextEx = a.exercises.slice(ei + 1).find(x => x.sets.some(s => !s.done)) || a.exercises.find(x => x.sets.some(s => !s.done));
  if (!nextEx) return { title: "Fine allenamento", sub: "" };
  const s = nextEx.sets.find(x => !x.done);
  return { title: `Prossimo: ${esc(nextEx.name)}`, sub: `${nextEx.sets.length} serie · ${setTxt(nextEx, s)}` };
}
function startRest(ei, i, exDone) {
  const total = S.active.exercises[ei].target.rest ?? 90, now = Date.now();
  S.rest = { start: now, end: now + total * 1000, total, ei, i, exDone, fired: false };
  saveUI(); tickStart();
}
function closeRest() {
  const r = S.rest; if (!r) return;
  const s = S.active?.exercises[r.ei]?.sets[r.i];
  if (s) s.rest = { planned: r.total, actual: Math.round((Date.now() - r.start) / 1000) };
  S.rest = null; persistActive(); render(true);
}
function startWork(ei, i) {
  const e = S.active.exercises[ei], sec = +e.sets[i].reps || e.target.reps || 30;
  const phases = e.perSide ? [{ label: "Lato sinistro", sec }, { label: "Cambia lato", sec: 5, sw: true }, { label: "Lato destro", sec }] : [{ label: "Tieni", sec }];
  unlockAudio();
  S.work = { ei, i, phases, pi: 0, phaseStart: Date.now(), phaseEnd: Date.now() + phases[0].sec * 1000 };
  saveUI(); tickStart(); render(true);
}
function stopWork(complete) {
  const w = S.work; if (!w) return;
  const s = S.active.exercises[w.ei].sets[w.i];
  if (!complete && w.pi === 0) s.reps = Math.max(1, Math.round((Date.now() - w.phaseStart) / 1000));
  S.work = null;
  markDone(w.ei, w.i);
}

let tickIv = null;
function tickStart() { if (!tickIv) tickIv = setInterval(tick, 250); tick(); }
function tick() {
  const now = Date.now();
  const el = $(".js-elapsed");
  if (el && S.active) el.textContent = fmtSec((now - new Date(S.active.startedAt)) / 1000);
  if (S.work) {
    const w = S.work;
    if (now >= w.phaseEnd) {
      w.pi++;
      if (w.pi >= w.phases.length) { beep(3); stopWork(true); return; }
      beep(w.phases[w.pi].sw ? 1 : 2);
      w.phaseStart = now; w.phaseEnd = now + w.phases[w.pi].sec * 1000; saveUI(); renderOverlay(); return;
    }
    updateRing((w.phaseEnd - now) / 1000, w.phases[w.pi].sec, false);
  } else if (S.rest) {
    const r = S.rest, left = (r.end - now) / 1000;
    if (left <= 0 && !r.fired) { r.fired = true; saveUI(); beep(3); renderOverlay(); }
    updateRing(left, r.total, left <= 0);
  } else if (!S.active || S.view !== "workout") { clearInterval(tickIv); tickIv = null; }
}
const C = 2 * Math.PI * 92;
function updateRing(left, total, over) {
  const t = $(".js-t"), fg = $(".js-fg");
  if (!t || !fg) return;
  t.textContent = over ? "+" + fmtSec(-left) : fmtSec(Math.ceil(left));
  fg.style.strokeDashoffset = over ? 0 : C * (1 - Math.max(0, Math.min(1, left / total)));
}
function ringSvg() { return `<svg class="ring" viewBox="0 0 200 200"><circle class="bg" cx="100" cy="100" r="92"/><circle class="fg js-fg" cx="100" cy="100" r="92" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>`; }

function renderOverlay() {
  const ov = $("#overlay");
  const show = S.active && S.view === "workout" && (S.rest || S.work);
  document.body.classList.toggle("lock", !!show || !!S.sheet);
  if (!show) { ov.innerHTML = ""; return; }
  if (S.work) {
    const w = S.work, e = S.active.exercises[w.ei], ph = w.phases[w.pi];
    ov.innerHTML = `<div class="ov work" role="timer">
      <div class="ov-top"><div class="ov-kicker">${esc(ph.label)}</div><div class="ov-next">${esc(e.name)}<small>Serie ${w.i + 1} di ${e.sets.length}</small></div></div>
      <div class="ring-wrap">${ringSvg()}<div class="ring-txt"><div class="t js-t">${fmtSec(ph.sec)}</div><div class="t-sub">${w.phases.length > 1 ? `Fase ${w.pi + 1} di ${w.phases.length}` : "&nbsp;"}</div></div></div>
      <button class="ov-main" data-act="work-stop">Fine serie</button>
    </div>`;
  } else {
    const r = S.rest, over = r.end <= Date.now(), nx = nextLabel(r.ei, r.i, r.exDone), e = S.active.exercises[r.ei];
    const fb = r.exDone ? `<div class="ov-fb">
        <div class="q">Com'era ${esc(e.name)}?</div>
        <div class="chips">${["facile", "giusto", "duro"].map(f => `<button class="chip" data-act="feel" data-ex="${r.ei}" data-v="${f}" aria-pressed="${e.feel === f}">${feelLbl[f]}</button>`).join("")}</div>
        <div class="chips"><button class="chip green" data-act="like" data-ex="${r.ei}" data-v="1" aria-pressed="${e.like === 1}">👍</button><button class="chip orange" data-act="like" data-ex="${r.ei}" data-v="-1" aria-pressed="${e.like === -1}">👎</button><button class="chip red" data-act="failed" data-ex="${r.ei}" aria-pressed="${!!e.failed}">Non riuscito</button></div>
      </div>` : "";
    ov.innerHTML = `<div class="ov rest ${over ? "over" : ""}" role="timer">
      <div class="ov-top"><div class="ov-kicker">${over ? "Recupero finito" : "Recupero"}</div><div class="ov-next">${nx.title}<small>${nx.sub}</small></div></div>
      <div class="ring-wrap">${ringSvg()}<div class="ring-txt"><div class="t js-t">${fmtSec(r.total)}</div><div class="t-sub">${over ? "oltre il recupero" : "fine alle " + fmtTime(r.end)}</div></div></div>
      <div class="ov-btns"><button class="circ" data-act="rest-adj" data-v="-15">−15</button><button class="circ orange" data-act="rest-adj" data-v="15">+15</button></div>
      ${fb}
      <button class="ov-main" data-act="rest-close">${over ? "Vai" : "Salta recupero"}</button>
    </div>`;
  }
  tick();
}

/* ---------- finish ---------- */
function scale(name, val, from, to) {
  const n = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return `<div class="scale ${n.length === 5 ? "s5" : n.length === 10 ? "s10" : ""}" role="group">${n.map(i => `<button data-act="scale" data-name="${name}" data-v="${i}" aria-pressed="${val === i}">${i}</button>`).join("")}</div>`;
}
function sessionStats(s) {
  const sets = s.exercises.reduce((a, e) => a + e.sets.filter(x => x.done).length, 0);
  const vol = Math.round(s.exercises.filter(e => e.load === "kg").reduce((a, e) => a + e.sets.filter(x => x.done).reduce((b, x) => b + (+x.kg || 0) * (+x.reps || 0), 0), 0));
  const min = s.durationMin ?? (s.startedAt ? Math.round(((s.endedAt ? new Date(s.endedAt) : new Date()) - new Date(s.startedAt)) / 60000) : null);
  return { sets, vol, min };
}
function exSummaryRows(s) {
  return s.exercises.map(e => {
    const d = e.sets.filter(x => x.done);
    const last = lastFor(e, s);
    let delta = "";
    if (e.load !== "none" && d.length && last) {
      const diff = Math.round((topKg(e) - topKg(last.ex)) * 100) / 100;
      if (diff) delta = `<span class="${diff > 0 ? "delta-up" : "delta-down"}">${diff > 0 ? "+" : ""}${fmtN(diff)} kg</span>`;
    }
    return `<div class="row"><div class="grow"><div class="row-title">${esc(e.name)}</div>
      <div class="setline">${d.length ? d.map(x => e.load === "none" ? fmtN(x.reps) : `${fmtN(x.kg)}×${fmtN(x.reps)}`).join(" · ") + (e.measure !== "reps" ? " " + unitOf(e.measure) : "") : "non fatto"}${e.feel ? " · " + feelLbl[e.feel] : ""}${e.failed ? " · non riuscito" : ""}${e.like === 1 ? " · 👍" : e.like === -1 ? " · 👎" : ""}</div>
      ${e.note ? `<div class="setline">${esc(e.note)}</div>` : ""}</div>${delta}</div>`;
  }).join("");
}
function viewFinish() {
  const a = S.active, st = sessionStats(a);
  return `<div class="large-nav" style="margin-top:12px"><h1>Riepilogo</h1></div>
  <div class="subhead">Giorno ${esc(a.day)} · ${esc(a.dayTitle || "")}</div>
  <div class="stats">
    <div class="stat"><b class="num">${st.min ?? "–"}</b><span>minuti</span></div>
    <div class="stat"><b class="num">${st.sets}</b><span>serie</span></div>
    <div class="stat"><b class="num">${st.vol}</b><span>kg sollevati</span></div>
  </div>
  <div class="section-h">Esercizi</div>
  <div class="group">${exSummaryRows(a)}</div>
  <div class="section-h">Come stai</div>
  <div class="card">
    <span class="field-label" style="margin-top:0">Dolore alla caviglia (0-10)</span>${scale("ankle", a.ankle, 0, 10)}
    <span class="field-label">Fatica della sessione (RPE 1-10)</span>${scale("rpe", a.rpe, 1, 10)}
    <span class="field-label">Note</span><textarea class="field" data-bind="note" placeholder="Come è andata, cosa hai sentito">${esc(a.note)}</textarea>
  </div>
  <div class="action-list" style="padding-top:20px">
    <button class="btn" data-act="save-workout">Salva allenamento</button>
    <button class="btn gray" data-act="back-workout">Torna all'allenamento</button>
  </div>`;
}
async function saveWorkout() {
  const a = S.active;
  a.status = "completata"; a.endedAt = new Date().toISOString();
  a.durationMin = Math.round((new Date(a.endedAt) - new Date(a.startedAt)) / 60000);
  await store.save(sessionPath(a), a, { delay: 0 });
  S.active = null; S.view = "tabs"; S.tab = "oggi"; S.rest = null; S.work = null; S.pickDay = null;
  Awake.disable(); saveUI();
  await loadData(); render(true); window.scrollTo(0, 0);
  toast("Allenamento salvato");
}
async function cancelWorkout() {
  const a = S.active;
  const gone = await store.discard(sessionPath(a));
  if (!gone) { a.status = "annullata"; await store.save(sessionPath(a), a); }
  S.active = null; S.view = "tabs"; S.rest = null; S.work = null; S.sheet = null;
  Awake.disable(); saveUI(); await loadData(); render(true);
  toast("Allenamento annullato");
}

/* ---------- Storico ---------- */
function viewStorico() {
  const p = S.plan;
  const seg = `<div class="seg" role="group" style="margin:0 0 4px">${[["sessioni", "Sessioni"], ["esercizi", "Esercizi"]].map(([k, l]) => `<button data-act="hist-mode" data-v="${k}" aria-pressed="${S.histMode === k}">${l}</button>`).join("")}</div>`;
  let body = "";
  if (S.histMode === "sessioni") {
    if (!S.sessions.length) body = `<div class="empty">Nessun allenamento ancora.</div>`;
    const byWeek = {};
    // sessions before the program start belong to the September program
    S.sessions.forEach(s => { const w = Math.max(0, progWeek(s)); (byWeek[w] ||= []).push(s); });
    body += Object.keys(byWeek).map(Number).sort((a, b) => b - a).map(w => {
      const ph = phaseFor(p, w);
      return `<div class="section-h">${w === 0 ? "Prima del " + fmtDate(p.startDate) : `Settimana ${w}${ph ? " · " + esc(ph.name) : ""}`}</div><div class="group">${byWeek[w].map(s => {
        const isRun = s.type === "run", st = isRun ? null : sessionStats(s);
        const sub = isRun ? `${s.minutes ?? "–"} min · ${esc(s.kind || "")}` : s.exercises.length ? `${st.sets} serie${st.min ? " · " + st.min + " min" : ""}${s.rpe ? " · RPE " + s.rpe : ""}` : "Dati non salvati dalla vecchia app";
        return `<button class="row with-badge" data-act="open-session" data-v="${esc(s.id)}"><span class="badge d-${isRun ? "R" : esc(s.day)}">${isRun ? icon("run") : esc(s.day)}</span><div class="grow"><div class="row-title">${isRun ? "Corsa" : esc(s.dayTitle || "Giorno " + s.day)}</div><div class="row-sub">${fmtDate(s.date)} · ${sub}</div></div><span class="chev">${icon("chevR")}</span></button>`;
      }).join("")}</div>`;
    }).join("");
  } else {
    const all = programExercises(p);
    body = `<div class="group" style="margin-top:16px">${all.map(e => {
      const ids = [e.id, ...(e.aliases || [])];
      const hist = gymSessions().map(s => s.exercises.find(x => ids.includes(x.id) && (x.mode || "gym") === "gym")).filter(x => x && x.sets.some(y => y.done));
      if (!hist.length) return `<button class="row" data-act="open-exercise" data-v="${esc(e.id)}"><div class="grow"><div class="row-title">${esc(e.name)}</div><div class="row-sub">Mai fatto</div></div><span class="chev">${icon("chevR")}</span></button>`;
      const loadEx = e.load !== "none";
      const now = loadEx ? topKg(hist[0]) : Math.max(...hist[0].sets.filter(s => s.done).map(s => +s.reps || 0));
      const first = loadEx ? topKg(hist[hist.length - 1]) : Math.max(...hist[hist.length - 1].sets.filter(s => s.done).map(s => +s.reps || 0));
      const diff = Math.round((now - first) * 100) / 100;
      return `<button class="row" data-act="open-exercise" data-v="${esc(e.id)}"><div class="grow"><div class="row-title">${esc(e.name)}</div><div class="row-sub">${hist.length} ${hist.length === 1 ? "volta" : "volte"} · ultimo ${fmtN(now)} ${loadEx ? "kg" : unitOf(e.measure)}</div></div>${diff ? `<span class="${diff > 0 ? "delta-up" : "delta-down"}">${diff > 0 ? "+" : ""}${fmtN(diff)}</span>` : ""}<span class="chev">${icon("chevR")}</span></button>`;
    }).join("")}</div>`;
  }
  const gs = gymSessions().filter(inProgram), st = gs.map(sessionStats);
  const sum = k => st.reduce((x, y) => x + (y[k] || 0), 0);
  const mins = sum("min");
  const summary = `<div class="grid2" style="margin-bottom:18px">
    <div class="mini" style="--c:var(--move)"><span class="tile sm">${icon("flame")}</span><div><div class="v num">${gs.length}</div><div class="t">Allenamenti</div></div></div>
    <div class="mini" style="--c:var(--lime)"><span class="tile sm">${icon("stack")}</span><div><div class="v num">${sum("sets")}</div><div class="t">Serie</div></div></div>
    <div class="mini" style="--c:var(--blue)"><span class="tile sm">${icon("dumbbell")}</span><div><div class="v num">${fmtN(Math.round(sum("vol") / 100) / 10)}<small style="font-size:15px"> t</small></div><div class="t">Sollevate</div></div></div>
    <div class="mini" style="--c:var(--cyan)"><span class="tile sm">${icon("clock")}</span><div><div class="v num">${Math.floor(mins / 60)}h ${mins % 60}m</div><div class="t">In palestra</div></div></div>
  </div>`;
  return `<div class="top-bar"><span></span><span></span></div><h1 class="title-xl">Storico</h1><div class="meta-row"><span class="l">${icon("today")} Dal ${fmtDate(S.plan.startDate)}</span></div>${summary}${seg}${body}`;
}

/* ---------- Scheda ---------- */
function viewScheda() {
  const p = S.plan, w = week();
  const tabs = Object.keys(p.days || {}).sort();
  const d = tabs.includes(S.planDay) ? S.planDay : tabs[0], dd = p.days[d];
  const list = dayExercises(p, d, { week: w });
  const rows = l => l.map(e => `<button class="row" data-act="open-exercise" data-v="${esc(e.id)}"><div class="grow"><div class="row-title">${esc(e.name)}</div><div class="row-sub">${e.sets} × ${e.reps} ${unitLong(e.measure)}${e.perSide ? " per lato" : ""}${e.rest ? " · recupero " + fmtSec(e.rest) : ""}</div></div><span class="chev">${icon("chevR")}</span></button>`).join("");
  const sec = (title, block) => { const l = list.filter(e => e.block === block); return l.length ? `<div class="section-h">${title}</div><div class="group">${rows(l)}</div>` : ""; };
  return `<div class="top-bar"><span></span><span></span></div><h1 class="title-xl">Scheda</h1><div class="subhead" style="margin-top:8px">Settimana ${effWeek(w)}: serie e ripetizioni di questa settimana</div>
  <div class="day-picker" role="group">${tabs.map(k => `<button class="day-dot d-${k}" data-act="plan-day" data-v="${k}" aria-pressed="${k === d}"><b>${k}</b></button>`).join("")}</div>
  <div class="hero-head" style="margin:18px 4px 0"><span class="badge d-${esc(d)}">${esc(d)}</span><div><div class="wk-kicker">${dd.optional ? "Facoltativa" : dd.weeks ? "Settimane " + esc(dd.weeks.replace("-99", " in poi")) : ""}</div><h2 style="font-size:20px">${esc(dd.title)}</h2></div></div>
  ${dd.note ? `<p class="foot" style="margin:6px 4px 0">${esc(dd.note)}</p>` : ""}
  ${sec("Riscaldamento", "warmup")}${sec("Esercizi", "main")}${sec("Blocco caviglia", "ankle")}
  <div class="section-h">Settimana tipo</div><div class="card">${esc(p.schedule)}</div>
  <div class="section-h">Fasi</div><div class="group">${(p.phases || []).map(f => `<div class="row"><div class="grow"><div class="row-title">${f.to >= 99 ? "Dalla sett. " + f.from : f.from === f.to ? "Sett. " + f.from : `Sett. ${f.from}-${f.to}`} · ${esc(f.name)}${w >= f.from && w <= f.to ? ' <span class="pill blue">ora</span>' : ""}</div><div class="row-sub">${esc(f.note)}</div></div></div>`).join("")}</div>
  <div class="section-h">Regole</div><div class="group">${(p.rules || []).map(r => `<div class="row"><div class="grow" style="font-size:15px">${esc(r)}</div></div>`).join("")}</div>
  <div class="section-f">La scheda si modifica con Claude, nel repo dei dati.</div>`;
}

/* ---------- sheets ---------- */
function openSheet(sh) { S.sheet = sh; renderSheet(); }
function closeSheet() { S.sheet = null; renderSheet(); renderOverlay(); if (S.deferred) render(true); }
function sheetWrap(title, body, { left = "", right = `<button class="txt-btn bold" data-act="close-sheet">Fine</button>`, cls = "" } = {}) {
  return `<div class="scrim" data-act="close-sheet"></div><div class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-grab"></div>
    <div class="sheet-nav"><div class="l">${left}</div><h3>${esc(title)}</h3><div class="r">${right}</div></div>${body}</div>`;
}
function renderSheet() {
  const root = $("#sheet-root"), sh = S.sheet;
  document.body.classList.toggle("lock", !!sh || !!(S.active && S.view === "workout" && (S.rest || S.work)));
  if (!sh) { root.innerHTML = ""; root.dataset.type = ""; return; }
  const a = document.activeElement;
  if (sh.type === "settings" && a && a.tagName === "INPUT" && root.contains(a)) return;
  const fn = { num: sheetNum, list: sheetList, end: sheetEnd, settings: sheetSettings, run: sheetRun, checkin: sheetCheckin, session: sheetSession, exercise: sheetExercise }[sh.type];
  // same sheet re-rendered after a tap: no slide-in again, keep the scroll position
  const prev = root.dataset.type === sh.type ? root.querySelector(".sheet") : null, top = prev ? prev.scrollTop : 0;
  root.innerHTML = fn ? fn(sh) : "";
  root.dataset.type = sh.type;
  if (prev) root.querySelectorAll(".sheet,.scrim").forEach(el => { el.classList.add("static"); if (el.classList.contains("sheet")) el.scrollTop = top; });
  if (sh.type === "num") { const inp = $("#num-in"); inp && (inp.focus(), inp.select()); }
}
function sheetNum(sh) {
  const e = S.active.exercises[sh.ei], v = e.sets[sh.i][sh.f];
  const isKg = sh.f === "kg";
  const deltas = isKg ? [0.5, 1, 2.5, 10] : e.measure === "reps" ? [1, 2, 5, 10] : [5, 10, 15, 30];
  const unit = isKg ? (e.load === "bw+" ? "kg di zavorra" : "kg") : unitLong(e.measure);
  return sheetWrap(`${e.name} · serie ${sh.i + 1}`, `
    <input id="num-in" class="num-big" inputmode="decimal" enterkeyhint="done" autocomplete="off" value="${v == null ? "" : fmtN(v)}" placeholder="0" aria-label="${unit}">
    <div class="num-unit">${unit}</div>
    <div class="deltas">${deltas.map(d => `<button class="minus" data-act="num-delta" data-v="${-d}">−${fmtN(d)}</button>`).join("")}${deltas.map(d => `<button class="plus" data-act="num-delta" data-v="${d}">+${fmtN(d)}</button>`).join("")}</div>
    <p class="section-f" style="margin:14px 4px 0">Le serie successive con lo stesso valore si aggiornano insieme.</p>`,
    { left: `<button class="txt-btn" data-act="close-sheet">Annulla</button>`, right: `<button class="txt-btn bold" data-act="num-ok">Fatto</button>` });
}
function commitNum() {
  const sh = S.sheet, e = S.active.exercises[sh.ei];
  const raw = $("#num-in").value.trim();
  const v = raw === "" ? (sh.f === "kg" && e.load === "kg" ? null : 0) : parseNum(raw);
  if (raw !== "" && v == null) { toast("Numero non valido"); return; }
  cascade(e, sh.i, sh.f, e.sets[sh.i][sh.f], v == null ? null : Math.max(0, Math.round(v * 100) / 100));
  S.sheet = null; persistActive(); render(true);
}
function sheetList() {
  const a = S.active;
  return sheetWrap("Esercizi", `<div class="group">${a.exercises.map((e, i) => {
    const d = e.sets.filter(s => s.done).length;
    return `<button class="row" data-act="jump" data-v="${i}"><div class="grow"><div class="row-title" style="${i === S.exIdx ? "color:var(--blue);font-weight:600" : ""}">${esc(e.name)}</div><div class="row-sub">${d} di ${e.sets.length} serie${e.block === "ankle" ? " · caviglia" : ""}</div></div>${d === e.sets.length && d ? `<span style="color:var(--green)">${icon("check")}</span>` : ""}</button>`;
  }).join("")}</div>`);
}
function sheetEnd() {
  return sheetWrap("Fine allenamento", `<div class="action-list">
    <button class="btn" data-act="go-finish">Termina e salva</button>
    <button class="btn red-txt" data-act="cancel-workout">Annulla allenamento</button>
    <button class="btn gray" data-act="close-sheet">Continua ad allenarti</button></div>`, { right: "" });
}
function sheetSettings() {
  const c = store.config(), st = store.status;
  return sheetWrap("Impostazioni", `
    <div class="section-h">Sincronizzazione</div>
    <div class="group">
      <div class="row"><span class="grow">Stato</span><span class="detail">${esc(st.state === "ok" ? "OK" : st.state === "syncing" ? "In corso" : st.state === "off" ? "Non configurata" : st.state === "offline" ? "Offline" : st.error || "–")}</span></div>
      <div class="row"><span class="grow">Da inviare</span><span class="detail num">${st.pending}</span></div>
      <div class="row"><span class="grow">Ultima sincronizzazione</span><span class="detail">${st.lastSync ? fmtTime(st.lastSync) : "–"}</span></div>
      <button class="row" data-act="sync"><span class="grow" style="color:var(--blue)">Sincronizza ora</span></button>
    </div>
    <div class="section-h">GitHub</div>
    <div class="group" style="padding:4px 16px 16px">
      <label class="field-label" for="tok">Token</label>
      <input class="field" id="tok" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="github_pat_…" value="${esc(c.token)}">
      <label class="field-label" for="repo">Repo dei dati</label>
      <input class="field" id="repo" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(c.repo)}">
      <div style="margin-top:14px"><button class="btn gray" data-act="save-config">Salva e sincronizza</button></div>
    </div>
    <div class="section-h">App</div>
    <div class="group">
      <button class="row" data-act="export"><span class="grow" style="color:var(--blue)">Esporta tutti i dati (JSON)</span></button>
      <button class="row" data-act="reload"><span class="grow" style="color:var(--blue)">Ricarica app</span></button>
      <div class="row"><span class="grow">Versione</span><span class="detail">${VERSION}</span></div>
    </div>`);
}
function sheetRun(sh) {
  const r = sh.data;
  return sheetWrap("Corsa", `
    <div class="card" style="margin-top:8px">
      <span class="field-label" style="margin-top:0">Minuti</span>
      <div class="stepper" style="grid-template-columns:56px 1fr 56px;height:52px"><button data-act="run-min" data-v="-5">−</button><button class="val"><b class="num">${r.minutes}</b></button><button data-act="run-min" data-v="5">+</button></div>
      <span class="field-label">Tipo</span>
      <div class="seg lg">${(S.plan.runKinds || ["Facile", "Con variazioni"]).map(k => `<button data-act="run-kind" data-v="${esc(k)}" aria-pressed="${r.kind === k}">${esc(k)}</button>`).join("")}</div>
      <span class="field-label">Dolore alla caviglia (0-10)</span>${scale("run-ankle", r.ankle, 0, 10)}
      <span class="field-label">Note</span><textarea class="field" data-bind="run-note" placeholder="Terreno, sensazioni">${esc(r.note)}</textarea>
    </div>
    <div style="margin-top:16px"><button class="btn" data-act="save-run">Salva corsa</button></div>`,
    { left: `<button class="txt-btn" data-act="close-sheet">Annulla</button>`, right: "" });
}
function testsBlock(c, w) {
  const t = S.plan.tests;
  if (!t || !(t.weeks || []).includes(w)) return "";
  const v = (id, side) => c.tests?.[id]?.[side] ?? "";
  return `<div class="section-h">Test di partenza</div>
    <div class="card">
      <p class="foot" style="margin:0 0 4px">${esc(t.note || "")}</p>
      ${t.items.map(it => `<span class="field-label">${esc(it.name)} (${esc(it.unit)})</span>
        <p class="foot" style="margin:-4px 0 8px">${esc(it.how)}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <input class="field" inputmode="decimal" placeholder="Sinistra" aria-label="${esc(it.name)} sinistra" data-bind="test:${it.id}:sx" value="${esc(v(it.id, "sx"))}">
          <input class="field" inputmode="decimal" placeholder="Destra" aria-label="${esc(it.name)} destra" data-bind="test:${it.id}:dx" value="${esc(v(it.id, "dx"))}">
        </div>`).join("")}
    </div>`;
}
// items whose left/right gap is over 10%
function asymmetric(tests) {
  return (S.plan.tests?.items || []).filter(it => {
    const a = parseNum(tests?.[it.id]?.sx), b = parseNum(tests?.[it.id]?.dx);
    return a != null && b != null && Math.max(a, b) > 0 && Math.abs(a - b) / Math.max(a, b) > 0.1;
  }).map(it => it.name);
}
function sheetCheckin(sh) {
  const c = sh.data, w = Math.max(1, week());
  return sheetWrap(`Check-in settimana ${w}`, `
    <p class="section-f" style="margin:4px 4px 12px">Compilalo la domenica. Lo leggiamo insieme nell'analisi settimanale.</p>
    <div class="card">
      <span class="field-label" style="margin-top:0">Sonno (1-5)</span>${scale("ci-sleep", c.sleep, 1, 5)}
      <span class="field-label">Energia (1-5)</span>${scale("ci-energy", c.energy, 1, 5)}
      <span class="field-label">Caviglia a fine settimana (0-10)</span>${scale("ci-ankle", c.ankle, 0, 10)}
      <span class="field-label">Note</span><textarea class="field" data-bind="ci-note" placeholder="Cosa è andato bene, cosa no">${esc(c.note)}</textarea>
    </div>
    ${testsBlock(c, w)}
    <div style="margin-top:16px"><button class="btn" data-act="save-checkin">Salva check-in</button></div>`,
    { left: `<button class="txt-btn" data-act="close-sheet">Annulla</button>`, right: "" });
}
function sheetSession(sh) {
  const s = S.sessions.find(x => x.id === sh.id);
  if (!s) return "";
  if (s.type === "run") return sheetWrap("Corsa", `<div class="sheet-title">${fmtDate(s.date)}</div>
    <div class="group"><div class="row"><span class="grow">Durata</span><span class="detail">${s.minutes ?? "–"} min</span></div><div class="row"><span class="grow">Tipo</span><span class="detail">${esc(s.kind || "–")}</span></div><div class="row"><span class="grow">Caviglia</span><span class="detail">${s.ankle ?? "–"}</span></div></div>
    ${s.note ? `<div class="section-h">Note</div><div class="card">${esc(s.note)}</div>` : ""}`);
  const st = sessionStats(s);
  return sheetWrap(`Giorno ${s.day}`, `<div class="sheet-title">${esc(s.dayTitle || "")}</div><div class="subhead" style="margin-bottom:12px">${fmtDate(s.date)}${s.minimal ? " · versione minima" : ""}</div>
    ${s.migrationNote ? `<div class="card foot">${esc(s.migrationNote)}</div>` : `
    <div class="stats"><div class="stat"><b class="num">${st.min ?? "–"}</b><span>minuti</span></div><div class="stat"><b class="num">${s.ankle ?? "–"}</b><span>caviglia</span></div><div class="stat"><b class="num">${s.rpe ?? "–"}</b><span>RPE</span></div></div>
    <div class="section-h">Esercizi</div><div class="group">${exSummaryRows(s)}</div>`}
    ${s.note ? `<div class="section-h">Note</div><div class="card">${esc(s.note)}</div>` : ""}`);
}
function sheetExercise(sh) {
  const e = findExercise(S.plan, sh.id);
  if (!e) return "";
  const ids = [e.id, ...(e.aliases || [])];
  const hist = gymSessions().map(s => ({ s, x: s.exercises.find(y => ids.includes(y.id)) })).filter(h => h.x && h.x.sets.some(y => y.done));
  const hm = e.home ? { ...e, ...e.home } : null;
  return sheetWrap(e.name, `<div class="sheet-title">${esc(e.name)}</div>
    <div class="subhead" style="text-transform:none;margin-bottom:12px">${e.sets} × ${e.reps} ${unitLong(e.measure || "reps")}${e.perSide ? " per lato" : ""} · recupero ${fmtSec(e.rest || 90)}</div>
    ${e.note ? `<p class="foot" style="margin:0 4px 12px">${esc(e.note)}</p>` : ""}
    <div class="section-h">Come si fa</div><div class="group" style="padding-top:12px">${howBlock(e.how)}</div>
    <div class="section-h">A casa</div>
    <div class="card"><div class="row-title">${esc(hm && hm.name !== e.name ? hm.name : "Uguale")}</div><div class="setline">${hm ? `${hm.sets} × ${hm.reps} ${unitLong(hm.measure || "reps")}${hm.perSide ? " per lato" : ""}` : ""}${hm && hm.note ? (hm ? " · " : "") + esc(hm.note) : ""}</div></div>
    ${hm && e.home.how ? `<div class="group" style="padding-top:12px;margin-top:8px">${howBlock(e.home.how)}</div>` : ""}
    <div class="section-h">Storico</div>
    ${hist.length ? `<div class="group">${hist.map(h => `<div class="row"><div class="grow"><div class="row-title">${fmtDate(h.s.date)}</div><div class="setline">${h.x.mode === "home" ? "a casa · " : ""}${h.x.sets.filter(y => y.done).map(y => (h.x.load || e.load) === "none" ? fmtN(y.reps) : fmtN(y.kg) + "×" + fmtN(y.reps)).join(" · ")}${h.x.feel ? " · " + feelLbl[h.x.feel] : ""}</div></div></div>`).join("")}</div>` : `<div class="empty">Mai fatto.</div>`}`);
}

/* ---------- actions ---------- */
async function connect() {
  render(true);
  const changed = await store.sync();
  await loadData();
  if (!S.plan && store.status.state === "ok") store.status.error = "Nel repo non c'è plan.json";
  render(true);
  return changed;
}
function exportData() {
  store.allFiles().then(files => {
    const blob = new Blob([JSON.stringify(Object.fromEntries(files.map(f => [f.path, f.data])), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `pre-season-${todayISO()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
}

document.addEventListener("click", async ev => {
  const t = ev.target.closest("[data-act]");
  if (!t) return;
  const act = t.dataset.act, v = t.dataset.v;
  const ei = t.dataset.ex != null ? +t.dataset.ex : S.exIdx, i = +t.dataset.i;
  switch (act) {
    case "tab": S.tab = v; S.view = "tabs"; saveUI(); render(true); window.scrollTo(0, 0); break;
    case "settings": openSheet({ type: "settings" }); break;
    case "connect": store.setConfig({ token: $("#tok").value, repo: $("#repo").value }); connect(); break;
    case "save-config": store.setConfig({ token: $("#tok").value, repo: $("#repo").value }); S.sheet = null; renderSheet(); connect().then(() => toast(store.status.state === "ok" ? "Sincronizzato" : store.status.error || "Non sincronizzato")); break;
    case "sync": store.sync().then(async ch => { if (ch.length) await loadData(); render(); }); render(); break;
    case "export": exportData(); break;
    case "reload": location.reload(); break;
    case "pick-day": S.pickDay = v; render(true); break;
    case "minimal": S.minimal = !S.minimal; saveUI(); render(true); break;
    case "home": S.home = !S.home; saveUI(); render(true); break;
    case "start": startWorkout(v); break;
    case "resume": resumeWorkout(); break;
    case "step": stepValue(ei, i, t.dataset.f, +t.dataset.d); break;
    case "edit": openSheet({ type: "num", ei, i, f: t.dataset.f }); break;
    case "num-delta": { const inp = $("#num-in"); const n = Math.max(0, Math.round(((parseNum(inp.value) ?? 0) + +v) * 100) / 100); inp.value = fmtN(n); break; }
    case "num-ok": commitNum(); break;
    case "toggle-set": toggleSet(ei, i); break;
    case "primary": primaryAction(); break;
    case "prev": goEx(S.exIdx - 1); break;
    case "next": goEx(S.exIdx + 1); break;
    case "jump": S.sheet = null; goEx(+v); break;
    case "open-list": openSheet({ type: "list" }); break;
    case "how": S.howOpen[v] = t.getAttribute("aria-expanded") !== "true"; saveUI(); render(true); break;
    case "apply-sugg": {
      const e = curEx(), kg = +v, top = Math.max(0, ...e.sets.filter(s => !s.done).map(s => +s.kg || 0)), d = kg - top;
      e.sets.forEach(s => { if (!s.done) s.kg = Math.max(0, Math.round(((+s.kg || 0) + d) * 100) / 100); });
      persistActive(); render(true); toast(`Carico a ${fmtN(kg)} kg`); break;
    }
    case "add-set": { const e = curEx(), l = e.sets[e.sets.length - 1]; e.sets.push({ kg: l ? l.kg : null, reps: l ? l.reps : e.target.reps, done: false, doneAt: null, rest: null }); persistActive(); render(true); break; }
    case "rm-set": { const e = curEx(); if (e.sets.length > 1) { e.sets.pop(); persistActive(); render(true); } break; }
    case "feel": { const e = S.active.exercises[ei]; e.feel = e.feel === v ? null : v; persistActive(); S.rest || S.work ? renderOverlay() : render(true); break; }
    case "like": { const e = S.active.exercises[ei]; e.like = e.like === +v ? null : +v; persistActive(); S.rest ? renderOverlay() : render(true); break; }
    case "failed": { const e = S.active.exercises[ei]; e.failed = !e.failed; persistActive(); S.rest ? renderOverlay() : render(true); break; }
    case "rest-adj": { const r = S.rest; if (!r) break; const d = +v * 1000; r.end = Math.max(Date.now(), r.end + d); r.total = Math.max(5, r.total + +v); if (r.end > Date.now()) r.fired = false; saveUI(); renderOverlay(); break; }
    case "rest-close": closeRest(); break;
    case "work-stop": stopWork(false); break;
    case "end-menu": openSheet({ type: "end" }); break;
    case "go-finish": S.sheet = null; S.view = "finish"; saveUI(); render(true); window.scrollTo(0, 0); break;
    case "back-workout": S.view = "workout"; saveUI(); render(true); break;
    case "cancel-workout": if (confirm("Annullare l'allenamento? Le serie fatte non verranno salvate.")) cancelWorkout(); break;
    case "save-workout": saveWorkout(); break;
    case "scale": {
      const n = +v, name = t.dataset.name;
      if (name === "ankle" || name === "rpe") { S.active[name] = S.active[name] === n ? null : n; persistActive(); render(true); }
      else if (name === "run-ankle") { S.sheet.data.ankle = n; renderSheet(); }
      else if (name.startsWith("ci-")) { S.sheet.data[name.slice(3)] = n; renderSheet(); }
      break;
    }
    case "close-sheet": closeSheet(); break;
    case "open-run": openSheet({ type: "run", data: { minutes: 30, kind: (S.plan.runKinds || ["Facile"])[0], ankle: null, note: "" } }); break;
    case "run-min": S.sheet.data.minutes = Math.max(5, S.sheet.data.minutes + +v); renderSheet(); break;
    case "run-kind": S.sheet.data.kind = v; renderSheet(); break;
    case "save-run": {
      const r = S.sheet.data, date = todayISO();
      const s = { id: `${date}-R-${uid()}`, type: "run", status: "completata", date, week: week(), minutes: r.minutes, kind: r.kind, ankle: r.ankle, note: r.note, endedAt: new Date().toISOString(), app: VERSION };
      await store.save(sessionPath(s), s, { delay: 0 });
      S.sheet = null; await loadData(); render(true); toast("Corsa salvata"); break;
    }
    case "open-checkin": {
      const k = "w" + String(Math.max(1, week())).padStart(2, "0"), c = S.checkins[k];
      openSheet({ type: "checkin", data: c ? { ...c } : { sleep: null, energy: null, ankle: null, note: "" } }); break;
    }
    case "save-checkin": {
      const c = S.sheet.data, w = Math.max(1, week());
      if (c.sleep == null || c.energy == null || c.ankle == null) { toast("Compila sonno, energia e caviglia"); break; }
      const k = "w" + String(w).padStart(2, "0");
      await store.save(`checkins/${k}.json`, { ...c, week: w, date: todayISO() }, { delay: 0 });
      const asym = asymmetric(c.tests);
      S.sheet = null; await loadData(); render(true);
      toast(asym.length ? `Differenza sopra il 10%: ${asym.join(", ")}. Segnalalo al fisioterapista` : "Check-in salvato"); break;
    }
    case "hist-mode": S.histMode = v; saveUI(); render(true); break;
    case "plan-day": S.planDay = v; saveUI(); render(true); break;
    case "open-session": openSheet({ type: "session", id: v }); break;
    case "open-exercise": openSheet({ type: "exercise", id: v }); break;
  }
});

document.addEventListener("input", ev => {
  const b = ev.target.dataset.bind;
  if (!b) return;
  const val = ev.target.value;
  if (b === "exnote") { curEx().note = val; persistActive(); }
  else if (b === "note") { S.active.note = val; persistActive(); }
  else if (b === "run-note" || b === "ci-note") S.sheet.data.note = val;
  else if (b.startsWith("test:")) {
    const [, id, side] = b.split(":"), t = (S.sheet.data.tests ||= {});
    (t[id] ||= {})[side] = parseNum(val);
  }
});
document.addEventListener("keydown", ev => {
  if (ev.key === "Enter" && ev.target.id === "num-in") { ev.preventDefault(); commitNum(); }
});
document.addEventListener("focusout", () => setTimeout(() => {
  const a = document.activeElement;
  if (S.deferred && !(a && /INPUT|TEXTAREA/.test(a.tagName))) render(true);
}, 0));

// swipe between exercises
let sx = null, sy = null;
document.addEventListener("touchstart", ev => {
  if (S.view !== "workout" || S.rest || S.work || S.sheet || ev.target.closest(".stepper,textarea,input,.seg,.chips")) { sx = null; return; }
  sx = ev.touches[0].clientX; sy = ev.touches[0].clientY;
}, { passive: true });
document.addEventListener("touchend", ev => {
  if (sx == null) return;
  const dx = ev.changedTouches[0].clientX - sx, dy = ev.changedTouches[0].clientY - sy;
  sx = null;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 50) goEx(S.exIdx + (dx < 0 ? 1 : -1));
}, { passive: true });

// the screen lock and audio need a user gesture after a reload
document.addEventListener("pointerdown", () => {
  if (S.active && S.view === "workout" && !Awake.on) { unlockAudio(); Awake.enable(); }
}, true);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (Awake.on) { Awake.acquire(); try { $("#keepawake").play().catch(() => {}); } catch (e) {} }
    if (S.rest || S.work) renderOverlay();
    store.sync().then(async ch => { if (ch.length) { await loadData(); render(); } });
  } else {
    store.sync();
  }
});
window.addEventListener("online", () => store.sync().then(async ch => { if (ch.length) await loadData(); render(); }));
window.addEventListener("offline", () => render());
store.onStatus(() => {
  if (!S.sheet || S.sheet.type === "settings") {
    if (S.view === "tabs" && S.tab === "oggi" || !S.plan) render();
    if (S.sheet && S.sheet.type === "settings") renderSheet();
  }
});

/* ---------- boot ---------- */
(async function boot() {
  loadUI();
  await store.init();
  await loadData();
  if (S.active && (S.rest || S.work || S.view === "workout")) { S.view = S.view === "finish" ? "finish" : "workout"; tickStart(); }
  if (!S.active) { S.view = "tabs"; S.rest = null; S.work = null; }
  render(true);
  const changed = await store.sync();
  if (changed.length) { await loadData(); render(); }
  if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => r.update()).catch(() => {});
    // a new version took over: reload, unless a workout is on screen
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController && !(S.active && S.view !== "tabs")) location.reload();
    });
  }
})();
