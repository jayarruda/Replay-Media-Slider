import { makeApiRequest, updateFavoriteStatus, getSessionInfo } from "./api.js";
import { getConfig } from "./config.js";
import { getVideoQualityText } from "./containerUtils.js";

let __miniPop = null;
let __miniCloseTimer = null;
let __cssLoaded = false;
const DETAILS_TTL = 60 * 60 * 1000;
const detailsCache = new Map();

const config = getConfig();

function ensureCss() {
  if (__cssLoaded) return;
  const link = document.createElement("link");
  link.id = "studioHubsMiniCss";
  link.rel = "stylesheet";
  link.href = "slider/src/studioHubsMini.css";
  (document.head || document.documentElement).appendChild(link);
  __cssLoaded = true;
}

 function ensureMiniPopover() {
   if (__miniPop) return __miniPop;

   const el = document.createElement("div");
   el.className = "mini-poster-popover";
   el.innerHTML = `
     <div class="mini-bg" aria-hidden="true"></div>
     <div class="mini-overlay">
      <div class="mini-meta">
        <div class="mini-topline">
          <div class="mini-left">
            <span class="mini-year">📅 <b class="v"></b></span>
            <span class="mini-dot" aria-hidden="true">•</span>
            <span class="mini-runtime">⏱️ <b class="v"></b></span>
             <span class="mini-quality-inline"></span>
          </div>
        </div>
        <div class="mini-ratings">
          <span class="mini-star" title="Community">⭐ <b class="v"></b></span>
          <span class="mini-tomato" title="Critic">🍅 <b class="v"></b></span>
          <span class="mini-age" title="Age"></span>
        </div>
        <div class="mini-tags"></div>
        <div class="mini-audio"></div>
      </div>
       <p class="mini-overview"></p>
     </div>
   `;
  const host = window.__studioHubPreviewContainer || document.body;
  host.appendChild(el);

   __miniPop = el;
   return el;
 }


function scheduleHideMini(delay = 140) {
  if (__miniCloseTimer) clearTimeout(__miniCloseTimer);
  __miniCloseTimer = setTimeout(() => hideMiniPopover(), delay);
}

export function hideMiniPopover() {
  if (__miniCloseTimer) { clearTimeout(__miniCloseTimer); __miniCloseTimer = null; }
  if (!__miniPop) return;
  __miniPop.classList.remove("visible");
  setTimeout(() => {
    if (!__miniPop.classList.contains("visible")) {
      __miniPop.style.display = "none";
    }
  }, 180);
}

function posNear(anchor, pop) {
  const margin = 8;
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const r = anchor.getBoundingClientRect();

  pop.style.display = "block";
  pop.style.opacity = "0";
  pop.style.pointerEvents = "none";

  const pw = Math.min(pop.offsetWidth || 360, vw - 2 * margin);
  const ph = Math.min(pop.offsetHeight || 260, vh - 2 * margin);

  const spaceRight  = vw - r.right  - margin;
  const spaceLeft   = r.left        - margin;
  const spaceBottom = vh - r.bottom - margin;
  const spaceTop    = r.top         - margin;

  let place = "right";
  if (spaceRight >= pw) place = "right";
  else if (spaceLeft >= pw) place = "left";
  else if (spaceBottom >= ph) place = "bottom";
  else if (spaceTop >= ph) place = "top";
  else {
    const arr = [
      { side: "right",  size: spaceRight },
      { side: "left",   size: spaceLeft },
      { side: "bottom", size: spaceBottom },
      { side: "top",    size: spaceTop }
    ].sort((a,b) => b.size - a.size);
    place = arr[0].side;
  }

  let left, top;
  switch (place) {
    case "right":  left = r.right + margin; top = r.top + (r.height - ph)/2; break;
    case "left":   left = r.left - margin - pw; top = r.top + (r.height - ph)/2; break;
    case "bottom": left = r.left + (r.width - pw)/2; top = r.bottom + margin; break;
    case "top":    left = r.left + (r.width - pw)/2; top = r.top - margin - ph; break;
  }
  left = Math.max(margin, Math.min(left, vw - margin - pw));
  top  = Math.max(margin, Math.min(top,  vh - margin - ph));

  pop.style.left = `${Math.round(left + window.scrollX)}px`;
  pop.style.top  = `${Math.round(top  + window.scrollY)}px`;
  pop.style.opacity = "";
  pop.style.pointerEvents = "";
}

function ticksToHMin(ticks) {
  if (!ticks || typeof ticks !== "number") return "";
  const totalMinutes = Math.round(ticks / 600000000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hLbl = (config?.languageLabels?.sa ?? "h");
  const mLbl = (config?.languageLabels?.dk ?? "m");
  if (h > 0) return `${h}${hLbl} ${m}${mLbl}`;
  return `${m}${mLbl}`;
}

function uniq(arr) { return Array.from(new Set(arr)); }

const LANG_SHORT = {
  tur: "TR", tr: "TR", turkish:"TR",
  eng: "EN", en: "EN", english:"EN",
  deu: "DE", ger:"DE", de:"DE", german:"DE",
  fra: "FR", fre:"FR", fr:"FR", french:"FR",
  rus: "RU", ru:"RU", russian:"RU",
  spa: "ES", es:"ES", spanish:"ES",
  ita: "IT", it:"IT", italian:"IT",
  jpn: "JA", ja:"JA", japanese:"JA",
  kor: "KO", ko:"KO", korean:"KO",
  zho: "ZH", chi:"ZH", zh:"ZH", chinese:"ZH"
};

function shortLang(v) {
  if (!v) return null;
  const s = String(v).toLowerCase();
  return LANG_SHORT[s] || LANG_SHORT[s.slice(0,2)] || s.slice(0,2).toUpperCase();
}

function buildPosterUrl(it, h = 400, q = 95) {
  const tag = it?.ImageTags?.Primary || it?.PrimaryImageTag;
  if (!tag) return null;
  return `/Items/${it.Id}/Images/Primary?tag=${encodeURIComponent(tag)}&fillHeight=${h}&quality=${q}`;
}

function buildBackdropUrl(it, idx = 0) {
  const t = (it?.BackdropImageTags || [])[idx];
  if (!t) return null;
  return `/Items/${it.Id}/Images/Backdrop/${idx}?tag=${encodeURIComponent(t)}&quality=90`;
}

async function getDetails(itemId, abortSignal) {
  const cached = detailsCache.get(itemId);
  if (cached && (Date.now() - cached.ts) < DETAILS_TTL) return cached.data;
  const fields = [
    "Overview","Genres","RunTimeTicks","OfficialRating","ProductionYear",
    "CommunityRating","CriticRating","ImageTags","BackdropImageTags",
    "UserData","MediaStreams"
  ].join(",");
  try {
    const data = await makeApiRequest(`/Items/${itemId}?Fields=${fields}`, { signal: abortSignal });
    detailsCache.set(itemId, { ts: Date.now(), data });
    return data;
  } catch (e) {
    return null;
  }
}

function fillMiniContent(pop, itemBase, details) {
  const yearWrap = pop.querySelector(".mini-year");
  const yearEl   = pop.querySelector(".mini-year .v");
  const rtWrap   = pop.querySelector(".mini-runtime");
  const rtEl     = pop.querySelector(".mini-runtime .v");
  const dotEl    = pop.querySelector(".mini-dot");
  const starWrap = pop.querySelector(".mini-star");
  const starVal  = pop.querySelector(".mini-star .v");
  const tomWrap  = pop.querySelector(".mini-tomato");
  const tomVal   = pop.querySelector(".mini-tomato .v");
  const ageWrap  = pop.querySelector(".mini-age");
  const tagsEl   = pop.querySelector(".mini-tags");
  const audioEl  = pop.querySelector(".mini-audio");
  const qualityEl= pop.querySelector(".mini-quality-inline");
   const ovEl     = pop.querySelector(".mini-overview");
   const bgEl     = pop.querySelector(".mini-bg");
   const item = { ...itemBase, ...details };
   const poster = buildPosterUrl(item, 600, 95) || buildBackdropUrl(item, 0);
   bgEl.style.backgroundImage = poster ? `url("${poster}")` : "none";

  const hasYear = !!item.ProductionYear;
  yearEl.textContent = hasYear ? String(item.ProductionYear) : "";
  yearWrap.style.display = hasYear ? "" : "none";

  const rtTxt = ticksToHMin(item.RunTimeTicks) || "";
  const hasRt = rtTxt.length > 0;
  rtEl.textContent = rtTxt;
  rtWrap.style.display = hasRt ? "" : "none";

  let hasQual = false;

  const hasCommunity = (typeof item.CommunityRating === "number");
  starVal.textContent = hasCommunity ? item.CommunityRating.toFixed(1) : "";
  starWrap.style.display = hasCommunity ? "" : "none";

  const hasCritic = (typeof item.CriticRating === "number");
  tomVal.textContent = hasCritic ? `${Math.round(item.CriticRating)}%` : "";
  tomWrap.style.display = hasCritic ? "" : "none";

  const hasAge = !!item.OfficialRating;
  ageWrap.textContent = hasAge ? item.OfficialRating : "";
  ageWrap.style.display = hasAge ? "" : "none";

  const gs = Array.isArray(item.Genres) ? item.Genres.slice(0,3) : [];
  if (gs.length) {
    tagsEl.innerHTML = gs.map(g => `<span class="mini-tag">${g}</span>`).join("");
    tagsEl.style.display = "";
  } else {
    tagsEl.innerHTML = "";
    tagsEl.style.display = "none";
  }

   let langs = [];
   const streams = Array.isArray(item.MediaStreams) ? item.MediaStreams : [];
   langs = uniq(streams.filter(s => s?.Type === "Audio")
                       .map(s => shortLang(s?.Language || s?.DisplayLanguage || s?.DisplayTitle))
                       .filter(Boolean)
                 ).slice(0,3);
  if (langs.length) {
    audioEl.innerHTML = `<span class="mini-audio-badge">🔊 ${langs.join(" • ")}</span>`;
    audioEl.style.display = "";
  } else {
    audioEl.innerHTML = "";
    audioEl.style.display = "none";
  }

  const videoStream = Array.isArray(item.MediaStreams)
    ? item.MediaStreams.find(s => s?.Type === "Video")
    : null;
  if (videoStream) {
    const html = getVideoQualityText(videoStream);
    if (html && html.trim().length) {
      qualityEl.innerHTML = html;
      qualityEl.style.display = "";
      hasQual = true;
    } else { qualityEl.innerHTML = ""; qualityEl.style.display = "none"; }
  } else { qualityEl.innerHTML = ""; qualityEl.style.display = "none"; }

  if (dotEl) dotEl.style.display = (hasYear && (hasRt || hasQual)) ? "" : "none";

   const ov = (item.Overview || "").trim();
   ovEl.textContent = ov;
 }

export function attachMiniPosterHover(cardEl, itemLike) {
  if (!cardEl || !itemLike || !itemLike.Id) return;

  ensureCss();
  const pop = ensureMiniPopover();

  let overTimer = null;

  const open = async () => {
    if (overTimer) { clearTimeout(overTimer); overTimer = null; }
    const details = await getDetails(itemLike.Id, null);
    fillMiniContent(pop, itemLike, details || {});
    posNear(cardEl, pop);
    requestAnimationFrame(() => pop.classList.add("visible"));
  };

  const scheduleOpen = () => {
    if (overTimer) clearTimeout(overTimer);
    overTimer = setTimeout(open, 160);
  };

  const cancelOpen = () => {
    if (overTimer) { clearTimeout(overTimer); overTimer = null; }
  };

  cardEl.addEventListener("mouseenter", scheduleOpen);
  cardEl.addEventListener("mouseleave", () => {
    cancelOpen();
    scheduleHideMini(120);
  });
  cardEl.addEventListener("focus", scheduleOpen);
  cardEl.addEventListener("blur", () => {
    cancelOpen();
    scheduleHideMini(120);
  });
}
