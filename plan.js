// Program logic: weeks, phases, the exercise list of a day, history and load suggestions.

export function todayISO(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export function weekOf(plan, iso) {
  const s = new Date(plan.startDate + "T00:00:00"), d = new Date(iso + "T00:00:00");
  return Math.floor((d - s) / (7 * 864e5)) + 1;
}
export function phaseFor(plan, w) {
  return (plan.phases || []).find(p => w >= p.from && w <= p.to) || null;
}
const inRange = (range, w) => {
  const [a, b] = String(range).split("-").map(Number);
  return w >= a && w <= (b || a);
};

// Exercise as prescribed this week: week variants, phase set factor, and the day's place.
function resolve(ex, w, phase, block) {
  if (ex.onlyWeeks && !inRange(ex.onlyWeeks, w)) return null;
  const out = { load: "kg", measure: "reps", step: 2.5, rest: 90, ...ex, block };
  for (const [range, patch] of Object.entries(ex.weeks || {})) if (inRange(range, w)) Object.assign(out, patch);
  if (phase && phase.setFactor) out.sets = Math.max(2, Math.round(out.sets * phase.setFactor));
  return out;
}
export function dayExercises(plan, day, { week, minimal = false } = {}) {
  const ph = phaseFor(plan, week);
  let main = (plan.days?.[day]?.exercises || []).map(e => resolve(e, week, ph, "main")).filter(Boolean);
  if (minimal) main = main.slice(0, 3);
  const ankle = (plan.ankle || []).map(e => resolve(e, week, ph, "ankle")).filter(Boolean);
  return main.concat(ankle);
}
export function findExercise(plan, id) {
  for (const d of Object.values(plan.days || {})) { const e = (d.exercises || []).find(x => x.id === id); if (e) return e; }
  return (plan.ankle || []).find(x => x.id === id) || null;
}

/* ---------- history ---------- */
// sessions: newest first, completed only. `before`: only sessions that came earlier than it.
const earlier = (s, b) => s.id !== b.id && (s.date < b.date || (s.date === b.date && (s.endedAt || "") < (b.endedAt || "~")));
export function lastPerformance(sessions, exId, before) {
  for (const s of sessions) {
    if (s.type !== "gym" || (before && !earlier(s, before))) continue;
    const e = (s.exercises || []).find(x => x.id === exId);
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
