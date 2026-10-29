// Local-first storage (IndexedDB) + sync with a private GitHub repo.
// Every file is a record {path, data, sha, dirty, updatedAt}; paths mirror the repo.

const DB_NAME = "preseason", STORE = "files";
const DEFAULT_REPO = "japoperotti/pre-season-data";
const DIRS = ["sessions", "checkins"];

let dbp = null;
function db() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "path" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode), req = fn(t.objectStore(STORE));
    t.oncomplete = () => res(req ? req.result : undefined);
    t.onerror = () => rej(t.error);
  });
}
export const getFile = p => tx("readonly", s => s.get(p));
export const allFiles = () => tx("readonly", s => s.getAll());
const putFile = rec => tx("readwrite", s => s.put(rec));
const delFile = p => tx("readwrite", s => s.delete(p));

/* ---------- config ---------- */
export function config() {
  let token = "", repo = DEFAULT_REPO;
  try { token = localStorage.getItem("gh_token") || ""; repo = localStorage.getItem("gh_repo") || DEFAULT_REPO; } catch (e) {}
  return { token, repo };
}
export function setConfig({ token, repo }) {
  try {
    if (token != null) localStorage.setItem("gh_token", token.trim());
    if (repo != null) localStorage.setItem("gh_repo", repo.trim() || DEFAULT_REPO);
  } catch (e) {}
}

/* ---------- status ---------- */
const listeners = new Set();
export const status = { state: "idle", lastSync: null, pending: 0, error: "" };
try { status.lastSync = +localStorage.getItem("last_sync") || null; } catch (e) {}
export function onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(patch) { Object.assign(status, patch); listeners.forEach(fn => fn(status)); }
async function countPending() { return (await allFiles()).filter(r => r.dirty).length; }

/* ---------- local writes ---------- */
// Saves locally at once; sync is scheduled unless opts.sync === false.
export async function save(path, data, opts = {}) {
  const old = await getFile(path);
  await putFile({ path, data, sha: old ? old.sha : null, dirty: true, updatedAt: Date.now() });
  emit({ pending: await countPending() });
  if (opts.sync !== false) scheduleSync(opts.delay ?? 1500);
}
// Removes a file that never reached GitHub; returns false if it already did.
export async function discard(path) {
  const old = await getFile(path);
  if (old && old.sha) return false;
  await delFile(path);
  emit({ pending: await countPending() });
  return true;
}

/* ---------- GitHub ---------- */
const enc = s => {
  const b = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(bin);
};
const dec = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, "")), c => c.charCodeAt(0)));

async function gh(method, path, body) {
  const { token, repo } = config();
  const url = `https://api.github.com/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
  const r = await fetch(url, {
    method, cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.status === 404 && method === "GET") return null;
  if (!r.ok) { const e = new Error("GitHub " + r.status); e.status = r.status; throw e; }
  return r.status === 204 ? null : r.json();
}

async function push(rec) {
  const body = {
    message: (rec.path.startsWith("sessions/") ? "Sessione " : "Aggiorna ") + rec.path,
    content: enc(JSON.stringify(rec.data, null, 2) + "\n")
  };
  if (rec.sha) body.sha = rec.sha;
  let res;
  try { res = await gh("PUT", rec.path, body); }
  catch (e) {
    // sha missing or stale: the phone's copy wins for files it writes
    if (e.status !== 409 && e.status !== 422) throw e;
    const cur = await gh("GET", rec.path);
    if (cur) body.sha = cur.sha; else delete body.sha;
    res = await gh("PUT", rec.path, body);
  }
  const now = await getFile(rec.path);
  if (!now) return;
  now.sha = res.content.sha;
  if (now.updatedAt === rec.updatedAt) now.dirty = false;
  await putFile(now);
}

async function pullFile(path, sha) {
  const f = await gh("GET", path);
  if (!f) return;
  await putFile({ path, data: JSON.parse(dec(f.content)), sha: f.sha || sha, dirty: false, updatedAt: Date.now() });
}

async function pull() {
  const changed = [];
  const plan = await gh("GET", "plan.json");
  if (plan) {
    const loc = await getFile("plan.json");
    if (!loc || (!loc.dirty && loc.sha !== plan.sha)) {
      await putFile({ path: "plan.json", data: JSON.parse(dec(plan.content)), sha: plan.sha, dirty: false, updatedAt: Date.now() });
      changed.push("plan.json");
    }
  }
  const local = new Map((await allFiles()).map(r => [r.path, r]));
  for (const dir of DIRS) {
    const list = (await gh("GET", dir)) || [];
    const remote = new Set();
    for (const it of list) {
      if (it.type !== "file" || !it.name.endsWith(".json")) continue;
      remote.add(it.path);
      const loc = local.get(it.path);
      if (!loc || (!loc.dirty && loc.sha !== it.sha)) { await pullFile(it.path, it.sha); changed.push(it.path); }
    }
    // deleted on the Mac: drop the local copy if it was in sync
    for (const [p, r] of local) if (p.startsWith(dir + "/") && r.sha && !r.dirty && !remote.has(p)) { await delFile(p); changed.push(p); }
  }
  return changed;
}

let timer = null, running = null;
export function scheduleSync(delay = 1500) {
  clearTimeout(timer);
  timer = setTimeout(() => sync(), delay);
}
// Pushes dirty files, then pulls. Resolves to the list of changed paths.
export function sync() {
  clearTimeout(timer);
  return running ||= (async () => {
    const { token } = config();
    try {
      if (!token) { emit({ state: "off", pending: await countPending() }); return []; }
      if (!navigator.onLine) { emit({ state: "offline", pending: await countPending() }); return []; }
      emit({ state: "syncing", error: "" });
      for (const rec of (await allFiles()).filter(r => r.dirty)) await push(rec);
      const changed = await pull();
      const t = Date.now();
      try { localStorage.setItem("last_sync", String(t)); } catch (e) {}
      emit({ state: "ok", lastSync: t, pending: await countPending() });
      return changed;
    } catch (e) {
      const msg = e.status === 401 ? "Token non valido o scaduto" : e.status === 403 ? "Il token non ha i permessi sul repo" : e.status === 404 ? "Repo non trovato" : navigator.onLine ? "Errore di sincronizzazione" : "Offline";
      emit({ state: navigator.onLine ? "error" : "offline", error: msg, pending: await countPending().catch(() => 0) });
      return [];
    } finally { running = null; }
  })();
}

export async function init() {
  try { navigator.storage && navigator.storage.persist && await navigator.storage.persist(); } catch (e) {}
  emit({ pending: await countPending(), state: config().token ? "idle" : "off" });
}
