import { getSessionInfo, getAuthHeader } from "./api.js";
import { getConfig } from './config.js';

const config = getConfig();
const DEFAULT_ORDER = [
  "Marvel Studios","Pixar","Walt Disney Pictures","Disney+","DC",
  "Warner Bros. Pictures","Lucasfilm Ltd.","Columbia Pictures","Paramount Pictures","Netflix"
];
const ORDER = (config.studioHubsOrder && config.studioHubsOrder.length)
  ? config.studioHubsOrder
  : DEFAULT_ORDER;

const LOGO_BASE = "slider/src/images/studios/";
const LOCAL_EXTS = [".webp"];
const LOGO_CACHE_KEY = "studioHub_logoUrlCache_v1";
const LOGO_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const VIDEO_EXTS = [".mp4", ".webm"];
const HOVER_VIDEO_TIMEOUT = 4000;

function replaceExt(url, newExt) {
  return url.replace(/\.[a-z0-9]+(?:\?.*)?$/i, newExt);
}

function deriveVideoCandidatesFromLogo(logoUrl) {
  return VIDEO_EXTS.map(ext => replaceExt(logoUrl, ext));
}

function probeVideo(url, timeoutMs = HOVER_VIDEO_TIMEOUT) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const v = document.createElement("video");
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true; resolve(false);
      try { v.src = ""; } catch {}
    }, timeoutMs);

    v.muted = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.src = url;

    const ok = () => { if (done) return; done = true; clearTimeout(timer); resolve(true); };
    const bad = () => { if (done) return; done = true; clearTimeout(timer); resolve(false); };

    v.oncanplay = ok;
    v.onloadeddata = ok;
    v.onerror = bad;
  });
}

async function setupHoverVideo(card, logoUrl) {
  if (!card || !logoUrl) return;

  const candidates = deriveVideoCandidatesFromLogo(logoUrl);
  let playableUrl = null;
  for (const u of candidates) {
    const ok = await probeVideo(u);
    if (ok) { playableUrl = u; break; }
  }
  if (!playableUrl) return;
  let vidEl = null;

  const ensureVideo = () => {
    if (vidEl) return vidEl;

    vidEl = document.createElement("video");
    vidEl.className = "hub-video";
    vidEl.src = playableUrl;
    vidEl.muted = true;
    vidEl.loop = true;
    vidEl.playsInline = true;
    vidEl.preload = "auto";
    vidEl.setAttribute("aria-hidden", "true");
    card.style.position = card.style.position || "relative";
    card.appendChild(vidEl);
    return vidEl;
  };

  const play = () => {
    const v = ensureVideo();
    v.currentTime = 0;
    v.style.opacity = "1";
    v.play().catch(() => {});
  };

  const stop = () => {
    if (!vidEl) return;
    vidEl.pause();
    vidEl.style.opacity = "0";
  };

  card.addEventListener("mouseenter", play);
  card.addEventListener("mouseleave", stop);
  card.addEventListener("focus", play);
  card.addEventListener("blur", stop);
}


function withVer(url, v = "1") {
  if (!url) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(v)}`;
}

function loadLogoCache() {
  try {
    const raw = localStorage.getItem(LOGO_CACHE_KEY);
    if (!raw) return {};
    const { ts, data } = JSON.parse(raw);
    if (!ts || Date.now() - ts > LOGO_CACHE_TTL) return {};
    return data || {};
  } catch { return {}; }
}
function saveLogoCache(map) {
  try { localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: map })); } catch {}
}

function slugify(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[().,™©®'’"&+]/g, " ")
    .replace(/\s+and\s+/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function probeImage(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true; resolve(false);
      try { img.src = ""; } catch {}
    }, timeoutMs);
    img.onload  = () => { if (done) return; done = true; clearTimeout(timer); resolve(true); };
    img.onerror = () => { if (done) return; done = true; clearTimeout(timer); resolve(false); };
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.src = url;
  });
}

async function tryLocalLogo(name) {
  const base = LOGO_BASE + slugify(name);
  for (const ext of LOCAL_EXTS) {
    const url = withVer(`${base}${ext}`);
    if (await probeImage(url)) return url;
  }
  return null;
}

async function resolveLogoUrl(name) {
  const cache = loadLogoCache();
  if (cache[name]) {
    if (await probeImage(cache[name])) return cache[name];
    delete cache[name];
    saveLogoCache(cache);
  }

  const localUrl = await tryLocalLogo(name);
  if (localUrl) {
    cache[name] = localUrl;
    saveLogoCache(cache);
    return localUrl;
  }
  return null;
}

const MANUAL_IDS = {};

const ALIASES = {
  "Marvel Studios": ["marvel studios","marvel","marvel entertainment","marvel studios llc"],
  "Pixar": ["pixar","pixar animation studios","disney pixar"],
  "Walt Disney Pictures": ["walt disney","walt disney pictures"],
  "Disney+": ["disney+","disney plus","disney+ originals","disney plus originals","disney+ studio"],
  "DC": ["DC Entertainment","dc entertainment","dc"],
  "Warner Bros. Pictures": ["warner bros","warner bros.","warner bros pictures","warner bros. pictures","warner brothers"],
  "Lucasfilm Ltd.": ["lucasfilm","lucasfilm ltd","lucasfilm ltd."],
  "Columbia Pictures": ["columbia","columbia pictures","columbia pictures industries"],
  "Paramount Pictures": ["paramount","paramount pictures","paramount pictures corporation"],
  "Netflix": ["netflix","netflix studios","netflix animation","a netflix original","netflix original"]
};
const CORE_TOKENS = {
  "Marvel Studios": ["marvel"],
  "Pixar": ["pixar"],
  "Walt Disney Pictures": ["walt","disney"],
  "Disney+": ["disney","plus"],
  "DC": ["dc","entertainment"],
  "Warner Bros. Pictures": ["warner"],
  "Lucasfilm Ltd.": ["lucasfilm"],
  "Columbia Pictures": ["columbia"],
  "Paramount Pictures": ["paramount"],
  "Netflix": ["netflix"]
};

const LOGO_H = 160;
const CACHE_TTL = 6 * 60 * 60 * 1000;
const MAP_TTL   = 30 * 24 * 60 * 60 * 1000;
const IMG_TTL   = 7  * 24 * 60 * 60 * 1000;
const LS_KEY    = "studioHub_cache_v4";
const MAP_KEY   = "studioHub_nameIdMap_v4";
const IMG_KEY   = "studioHub_backdropMap_v1";
const STUDIO_ITEMS_LIMIT = 120;

let __studioHubBusy = false;
let __fetchAbort = null;

const JUNK_WORDS = ["ltd","ltd.","llc","inc","inc.","company","co.","corp","corp.","the","pictures","studios","animation","film","films","pictures.","studios."];

const nbase = s => (s||"").toLowerCase().replace(/[().,™©®\-:_+]/g," ").replace(/\s+/g," ").trim();
const strip = s => {
  let out = " " + nbase(s) + " ";
  for (const w of JUNK_WORDS) out = out.replace(new RegExp(`\\s${w}\\s`, "g"), " ");
  return out.trim();
};
const toks = s => strip(s).split(" ").filter(Boolean);

function scoreMatch(desired, candidate) {
  const a = new Set(toks(desired));
  const b = new Set(toks(candidate));
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const core = (CORE_TOKENS[desired]||[]).some(c => b.has(nbase(c)));
  if (!core) return 0;
  return 1.0 + inter / Math.min(a.size, b.size);
}

const matches = (desired, cand) => scoreMatch(desired, cand) >= 1.3;
const hJSON = () => ({ "Accept":"application/json", "Authorization": getAuthHeader() });
const loadCache = (k, ttl) => {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > ttl) return null;
    return obj.data;
  } catch { return null; }
};
const saveCache = (k, data) => { try { localStorage.setItem(k, JSON.stringify({ ts: Date.now(), data })); } catch {} };

async function fetchStudios(signal) {
  const url = `/Studios?Limit=300&Recursive=true&SortBy=SortName&SortOrder=Ascending`;
  const res = await fetch(url, { headers: hJSON(), signal });
  if (!res.ok) throw new Error("Studios alınamadı");
  const data = await res.json();
  const items = Array.isArray(data?.Items) ? data.Items : (Array.isArray(data) ? data : []);
  return items.map(s => ({
    Id: s.Id,
    Name: s.Name,
    ImageTags: s.ImageTags || {},
    PrimaryImageTag: s.PrimaryImageTag || (s.ImageTags?.Primary) || null
  }));
}

async function fetchStudioItemsViaUsers(studioId, studioName, userId, signal) {
  const common = `StartIndex=0&Limit=${STUDIO_ITEMS_LIMIT}&Fields=PrimaryImageAspectRatio,ImageTags,BackdropImageTags&Recursive=true&SortOrder=Descending`;
  const urls = [
    `/Users/${userId}/Items?${common}&IncludeItemTypes=Movie,Series&StudioIds=${encodeURIComponent(studioId)}`,
    `/Users/${userId}/Items?${common}&IncludeItemTypes=Movie,Series&Studios=${encodeURIComponent(studioName)}`
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: hJSON(), signal });
      if (!r.ok) continue;
      const data = await r.json();
      const items = Array.isArray(data?.Items) ? data.Items : (Array.isArray(data) ? data : []);
      if (items.length) return items;
    } catch {}
  }
  return [];
}

function buildBackdropUrl(item, index = 0) {
  const tags = item.BackdropImageTags || [];
  const tag = tags[index];
  if (!tag) return null;
  return `/Items/${item.Id}/Images/Backdrop/${index}?tag=${encodeURIComponent(tag)}&quality=90`;
}

function buildPosterUrl(item) {
  const tag = item.ImageTags?.Primary || item.PrimaryImageTag;
  if (!tag) return null;
  return `/Items/${item.Id}/Images/Primary?tag=${encodeURIComponent(tag)}&fillHeight=${LOGO_H}&quality=90`;
}

function pickRandom(arr) { return arr.length ? arr[Math.floor(Math.random()*arr.length)] : null; }
async function chooseBackdropForStudio(studio, userId, signal) {
  const map = loadCache(IMG_KEY, IMG_TTL) || {};
  const cached = map[studio.Id];
  if (cached?.itemId && Number.isInteger(cached?.index)) {
    const itemId = cached.itemId;
    const idx    = cached.index;
    const tag    = cached.tag || null;
    const url = tag
      ? `/Items/${itemId}/Images/Backdrop/${idx}?tag=${encodeURIComponent(tag)}&quality=90`
      : `/Items/${itemId}/Images/Backdrop/${idx}?quality=90`;
    return { itemId, index: idx, url };
  }

  const items = await fetchStudioItemsViaUsers(studio.Id, studio.Name, userId, signal);
  if (!items.length) return null;

  const withBd = items.filter(it => Array.isArray(it.BackdropImageTags) && it.BackdropImageTags.length);
  const candidate = pickRandom(withBd.length ? withBd : items);
  if (!candidate) return null;

  let idx = 0;
  let url = buildBackdropUrl(candidate, idx);

  if (!url) {
    const purl = buildPosterUrl(candidate);
    if (!purl) return null;
    const payload = { studioId: studio.Id, itemId: candidate.Id, index: -1, tag: candidate.ImageTags?.Primary || candidate.PrimaryImageTag || null };
    const newMap = { ...map, [studio.Id]: payload };
    saveCache(IMG_KEY, newMap);
    return { itemId: candidate.Id, index: -1, url: purl };
  }

  const tag = (candidate.BackdropImageTags||[])[idx] || null;
  const payload = { studioId: studio.Id, itemId: candidate.Id, index: idx, tag };
  const newMap = { ...map, [studio.Id]: payload };
  saveCache(IMG_KEY, newMap);

  return { itemId: candidate.Id, index: idx, url };
}

function buildStudioHref(studioId, serverId) {
  return `#/list.html?studioId=${encodeURIComponent(studioId)}${serverId ? `&serverId=${encodeURIComponent(serverId)}` : ""}`;
}
function createBackdropCardShell(title, studio, serverId) {
  const a = document.createElement("a");
  a.className = "hub-card skeleton";
  a.href = studio?.Id ? buildStudioHref(studio.Id, serverId) : "javascript:void(0)";
  a.setAttribute("aria-label", title);

  const overlay = document.createElement("div");
  overlay.className = "hub-overlay";

  const label = document.createElement("div");
  label.className = "hub-title-text";
  label.textContent = title;

  overlay.appendChild(label);
  a.appendChild(overlay);
  return a;
}

function ensureContainer(indexPage) {
  const all = indexPage.querySelectorAll("#studio-hubs");
  if (all.length > 1) {
    for (let i = 1; i < all.length; i++) all[i].remove();
  }

  const homeSections = indexPage.querySelector(".homeSectionsContainer");
  if (!homeSections) return null;

  let section = indexPage.querySelector("#studio-hubs");
  if (!section) {
    section = document.createElement("div");
    section.id = "studio-hubs";
    section.classList.add("homeSection");

    section.innerHTML = `
   <div class="sectionTitleContainer sectionTitleContainer-cards">
     <h2 class="sectionTitle sectionTitle-cards">${config.languageLabels.studioHubs || 'Stüdyo Koleksiyonlarını'}</h2>
   </div>
   <div class="hub-scroll-wrap">
     <button class="hub-scroll-btn hub-scroll-left" aria-label="Sola kaydır" aria-disabled="true">
       <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
     </button>
     <div class="itemsContainer hub-row backdrop-mode" role="list"></div>
     <button class="hub-scroll-btn hub-scroll-right" aria-label="Sağa kaydır" aria-disabled="true">
       <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
     </button>
   </div>
 `;
    const firstChild = homeSections.firstElementChild;
    if (firstChild) {
      homeSections.insertBefore(section, firstChild);
    } else {
      homeSections.appendChild(section);
    }
  }
  return section.querySelector(".hub-row");
}

async function searchStudiosByAliases(desired, signal) {
  const list = [desired, ...(ALIASES[desired] || [])];
  let best = null, bestScore = 0;
  for (const term of list) {
    const url = `/Studios?SearchTerm=${encodeURIComponent(term)}&Limit=20`;
    try {
      const r = await fetch(url, { headers: hJSON(), signal });
      if (!r.ok) continue;
      const data = await r.json();
      const items = Array.isArray(data?.Items) ? data.Items : (Array.isArray(data) ? data : []);
      for (const s of items) {
        const sc = scoreMatch(desired, s.Name);
        if (sc > bestScore) { best = s; bestScore = sc; }
      }
    } catch {}
  }
  if (!best || bestScore < 1.3) return null;
  return { Id: best.Id, Name: best.Name, ImageTags: best.ImageTags || {}, PrimaryImageTag: best.PrimaryImageTag || (best.ImageTags?.Primary) || null };
}

export async function renderStudioHubs() {
  if (!config.enableStudioHubs) return;
  if (__studioHubBusy) return;
  __studioHubBusy = true;

  if (__fetchAbort) { try { __fetchAbort.abort(); } catch {} }
  __fetchAbort = new AbortController();

  try {
    if (!document.getElementById("studioHubsCss")) {
      const link = document.createElement("link");
      link.id = "studioHubsCss";
      link.rel = "stylesheet";
      link.href = "slider/src/studioHubs.css";
      (document.head || document.documentElement).appendChild(link);
    }

    const indexPage = document.querySelector("#indexPage:not(.hide)");
    if (!indexPage) return;

    const row = ensureContainer(indexPage);
    if (!row) return;
    setupScroller(row);
    row.innerHTML = "";

    const { serverId, userId } = getSessionInfo();
    const shells = {};
    const maxCards = Number.isFinite(config.studioHubsCardCount) ? config.studioHubsCardCount : ORDER.length;
  const wanted = ORDER.slice(0, Math.max(1, maxCards));

  for (const desired of wanted) {
  const card = createBackdropCardShell(desired, null, null);
  row.appendChild(card);
  shells[desired] = card;
}
    row.parentElement.style.display = "";

    const cached = loadCache(LS_KEY, CACHE_TTL);
    const studios = cached || await fetchStudios(__fetchAbort.signal).catch(() => []);
    if (!cached && studios.length) saveCache(LS_KEY, studios);
    const nameMap = loadCache(MAP_KEY, MAP_TTL) || {};
    const resolved = [];
    for (const desired of wanted) {
    const manualId = MANUAL_IDS[desired];
    let studio = manualId
      ? { Id: manualId, Name: desired }
      : (nameMap[desired] || studios.find(s => matches(desired, s.Name)) || await searchStudiosByAliases(desired, __fetchAbort.signal));
    if (studio) { resolved.push({ name: desired, studio }); nameMap[desired] = studio; }
  }
    saveCache(MAP_KEY, nameMap);

    await Promise.allSettled(resolved.map(async ({ name, studio }) => {
      const card = shells[name];
      if (!card) return;
      let used = false;
      const logoUrl = await resolveLogoUrl(name);

      if (logoUrl) {
        const old = card.querySelector("img.hub-img");
        if (old) old.remove();

        const img = document.createElement("img");
        img.className = "hub-img hub-logo";
        img.loading = "lazy";
        img.decoding = "async";
        img.fetchPriority = "low";
        img.alt = `${name} logo`;
        img.src = logoUrl;

        card.href = buildStudioHref(studio.Id, serverId);
        card.classList.remove("skeleton");
        card.appendChild(img);
        if (config.studioHubsHoverVideo) {
        setupHoverVideo(card, logoUrl);
      }
        used = true;
      }


      if (!used) {
        const chosen = await chooseBackdropForStudio(studio, userId, __fetchAbort.signal);
        if (!chosen?.url) return;

        const old = card.querySelector("img.hub-img");
        if (old) old.remove();

        const img = document.createElement("img");
        img.className = "hub-img";
        img.loading = "lazy";
        img.decoding = "async";
        img.fetchPriority = "low";
        img.alt = name;
        img.src = chosen.url;

        card.href = buildStudioHref(studio.Id, serverId);
        card.classList.remove("skeleton");
        card.appendChild(img);
      }
    }));

    if (!resolved.length) row.parentElement.style.display = "none";
  } catch (e) {
    console.warn("Studio hubs render hatası:", e);
  } finally {
    __studioHubBusy = false;
    __fetchAbort = null;
  }
}

function setupScroller(row) {
  const section = row.closest("#studio-hubs");
  if (!section) return;
  const btnL = section.querySelector(".hub-scroll-left");
  const btnR = section.querySelector(".hub-scroll-right");

  const step = () => Math.max(240, Math.floor(row.clientWidth * 0.9));

  const updateButtons = () => {
    const max = row.scrollWidth - row.clientWidth - 1;
    const atStart = row.scrollLeft <= 1;
    const atEnd   = row.scrollLeft >= max;
    if (btnL) btnL.setAttribute("aria-disabled", atStart ? "true" : "false");
    if (btnR) btnR.setAttribute("aria-disabled", atEnd   ? "true" : "false");
  };

  if (btnL) btnL.onclick = () => row.scrollBy({ left: -step(), behavior: "smooth" });
  if (btnR) btnR.onclick = () => row.scrollBy({ left:  step(), behavior: "smooth" });

  row.addEventListener("scroll", updateButtons, { passive: true });
  const ro = new ResizeObserver(() => updateButtons());
  ro.observe(row);
  row.addEventListener('touchstart', (e) => {
    e.stopPropagation();
  }, { passive: true });

  row.addEventListener('touchmove', (e) => {
    e.stopPropagation();
  }, { passive: true });

  requestAnimationFrame(updateButtons);
}
