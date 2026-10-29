// Program logic: weeks, phases, the exercise list of a day, history and load suggestions.

export function todayISO(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export function weekOf(plan, iso) {
  const s = new Date(plan.startDate + "T00:00:00"), d = new Date(iso + "T00:00:00");
  return Math.floor((d - s) / (7 * 864e5)) + 1;
}
// Before the start date the program shows week 1.
export const effWeek = w => Math.max(1, w);
export function phaseFor(plan, w) {
  return (plan.phases || []).find(p => w >= p.from && w <= p.to) || null;
}
// "4-5", "7-99", "7-" (open), "3"
const inRange = (range, w) => {
  const [a, b] = String(range).split("-");
  return w >= +a && w <= (b === undefined ? +a : b === "" ? Infinity : +b);
};

export function availableDays(plan, w) {
  return Object.keys(plan.days || {}).sort().filter(d => !plan.days[d].weeks || inRange(plan.days[d].weeks, effWeek(w)));
}
export const mainDays = (plan, w) => availableDays(plan, w).filter(d => !plan.days[d].optional);

function allDefs(plan) {
  return [...(plan.warmup || []), ...Object.values(plan.days || {}).flatMap(d => d.exercises || []), ...(plan.ankle || [])].filter(e => e.id);
}
export function findExercise(plan, id) {
  return allDefs(plan).find(x => x.id === id) || null;
}
// Unique exercises of the program (warm-up excluded), for lists and history.
export function programExercises(plan) {
  const seen = new Set();
  return [...Object.values(plan.days || {}).flatMap(d => d.exercises || []), ...(plan.ankle || [])]
    .map(e => e.ref ? findExercise(plan, e.ref) : e).filter(e => e && !seen.has(e.id) && seen.add(e.id));
}

// Exercise as prescribed this week: week variants, phase set factor, home version.
function resolve(plan, raw, w, phase, block, home) {
  let ex = raw;
  if (raw.ref) {
    const base = findExercise(plan, raw.ref);
    if (!base) return null;
    const { ref, ...patch } = raw;
    ex = { ...base, ...patch, weeks: {}, onlyWeeks: undefined };
  }
  if (ex.onlyWeeks && !inRange(ex.onlyWeeks, w)) return null;
  let out = { load: "kg", measure: "reps", step: 2.5, rest: 90, ...ex, block, mode: "gym" };
  for (const [range, patch] of Object.entries(ex.weeks || {})) if (inRange(range, w)) Object.assign(out, patch);
  if (home) {
    const h = ex.home || {};
    out = { ...out, ...h, how: h.how || out.how, note: h.note ?? out.note, mode: "home", gymName: out.name };
    for (const [range, patch] of Object.entries(h.weeks || {})) if (inRange(range, w)) Object.assign(out, patch);
  }
  if (phase && phase.setFactor) out.sets = Math.max(2, Math.round(out.sets * phase.setFactor));
  return out;
}
export function dayExercises(plan, day, { week, minimal = false, home = false } = {}) {
  const w = effWeek(week), ph = phaseFor(plan, w), d = plan.days?.[day] || {};
  const map = (list, block) => (list || []).map(e => resolve(plan, e, w, ph, block, home)).filter(Boolean);
  let main = map(d.exercises, "main");
  if (minimal) main = main.slice(0, 3);
  return [...(d.warmup ? map(plan.warmup, "warmup") : []), ...main, ...(d.ankle ? map(plan.ankle, "ankle") : [])];
}

/* ---------- history ---------- */
// sessions: newest first, completed only. `before`: only sessions that came earlier than it.
// ids: the exercise id plus its aliases from the previous program. mode: "gym" or "home".
const earlier = (s, b) => s.id !== b.id && (s.date < b.date || (s.date === b.date && (s.endedAt || "") < (b.endedAt || "~")));
export function lastPerformance(sessions, ids, before, mode = "gym") {
  ids = [].concat(ids);
  for (const s of sessions) {
    if (s.type !== "gym" || (before && !earlier(s, before))) continue;
    const e = (s.exercises || []).find(x => ids.includes(x.id) && (x.mode || "gym") === mode);
    if (e && e.sets.some(x => x.done)) return { session: s, ex: e };
  }
  return null;
}
export const topKg = e => Math.max(0, ...e.sets.filter(s => s.done).map(s => +s.kg || 0));

// Next load to try, or null: +step when last time every planned rep was done and it wasn't hard;
// +2 steps when the reps drop (new heavier phase).
export function suggestion(ex, last) {
  if (!last || ex.load === "none") return null;
  const e = last.ex, done = e.sets.filter(s => s.done), top = topKg(e);
  if (ex.load === "kg" && !top) return null;
  const tReps = e.target?.reps ?? ex.reps;
  if (ex.reps < tReps) return { kg: top + 2 * ex.step, why: "Meno ripetizioni: carico più alto" };
  const allReps = done.length >= (e.target?.sets ?? ex.sets) && done.every(s => (+s.reps || 0) >= tReps);
  if (allReps && !e.failed && e.feel !== "duro") return { kg: top + ex.step, why: "Ultima volta hai chiuso tutte le ripetizioni" };
  return null;
}

// Planned sets for a new session, pre-filled with last time's loads.
export function buildSets(ex, last) {
  const prev = last ? last.ex.sets.filter(s => s.done) : [];
  return Array.from({ length: ex.sets }, (_, i) => {
    const p = prev[i] || prev[prev.length - 1];
    let kg = null;
    if (ex.load === "kg") kg = p && p.kg != null ? +p.kg : null;
    if (ex.load === "bw+") kg = p && p.kg != null ? +p.kg : 0;
    return { kg, reps: ex.reps, done: false, doneAt: null, rest: null };
  });
}
