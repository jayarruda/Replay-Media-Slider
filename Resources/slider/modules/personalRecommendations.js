import { getSessionInfo, makeApiRequest, getCachedUserTopGenres } from "./api.js";
import { getConfig } from "./config.js";
import { getLanguageLabels } from "../language/index.js";
import { attachMiniPosterHover } from "./studioHubsUtils.js";
import { openGenreExplorer } from "./genreExplorer.js";

const config = getConfig();
const labels = getLanguageLabels?.() || {};
const CARD_COUNT = Number.isFinite(config.studioHubsCardCount)
  ? Math.max(1, config.studioHubsCardCount | 0)
  : 12;
const MIN_RATING = Number.isFinite(config.studioHubsMinRating)
  ? Math.max(0, Number(config.studioHubsMinRating))
  : 0;
const CACHE_TTL = Number.isFinite(config.personalRecsCacheTtlMs)
  ? Math.max(60_000, Number(config.personalRecsCacheTtlMs))
  : 6 * 60 * 60 * 1000;
const LS_KEY = "personalRecs_cache_v2";
const PLACEHOLDER_URL = (config.placeholderImage) || '/web/slider/src/images/placeholder.png';
const GENRE_LS_KEY = "genreHubs_cache_v2";
const GENRE_TTL = CACHE_TTL;
const ENABLE_GENRE_HUBS = !!config.enableGenreHubs;
const GENRE_ROWS_COUNT = Number.isFinite(config.studioHubsGenreRowsCount)
  ? Math.max(1, config.studioHubsGenreRowsCount | 0)
  : 4;
const GENRE_ITEMS_LS_PREFIX = "genreItems_cache_v2:";
const GENRE_ROW_CARD_COUNT = Number.isFinite(config.studioHubsGenreCardCount)
  ? Math.max(1, config.studioHubsGenreCardCount | 0)
  : 10;
const __hoverIntent = new WeakMap();
const __enterTimers = new WeakMap();
const __enterSeq     = new WeakMap();
const __cooldownUntil= new WeakMap();
const __openTokenMap = new WeakMap();
const __boundPreview = new WeakMap();
const OPEN_DELAY_MS = 250;
const HOVER_REOPEN_COOLDOWN_MS = 300;

let __personalRecsBusy = false;
let   __lastMoveTS   = 0;
let __pmLast = 0;
window.addEventListener('pointermove', () => {
  const now = Date.now();
  if (now - __pmLast > 80) { __pmLast = now; __lastMoveTS = now; }
}, {passive:true});
let __touchStickyOpen = false;
let __touchLastOpenTS = 0;
const TOUCH_STICKY_GRACE_MS = 1500;
const __imgIO = new IntersectionObserver((entries) => {
  for (const ent of entries) {
    const img = ent.target;
    const data = img.__data || {};
    if (ent.isIntersecting) {
      if (!img.__hiRequested) {
        img.__hiRequested = true;
        img.__phase = 'hi';
        if (data.hqSrcset) img.srcset = data.hqSrcset;
        if (data.hqSrc)    img.src    = data.hqSrc;
      }
    } else {
      try { img.removeAttribute('srcset'); } catch {}
      if (data.lqSrc && img.src !== data.lqSrc) img.src = data.lqSrc;
      img.__phase = 'lq';
      img.__hiRequested = false;
      img.classList.add('is-lqip');
      img.__hydrated = false;
  }
  }
}, { rootMargin: '600px 0px' });

function buildPosterUrlLQ(item) {
  return buildPosterUrl(item, 120, 25);
}

function buildPosterUrlHQ(item) {
  return buildPosterUrl(item, 540, 72);
}

function hardWipeHoverModalDom() {
  const modal = document.querySelector('.video-preview-modal');
  if (!modal) return;
  try { modal.dataset.itemId = ""; } catch {}
  modal.querySelectorAll('img').forEach(img => {
    try { img.removeAttribute('src'); img.removeAttribute('srcset'); } catch {}
  });
  modal.querySelectorAll('[data-field="title"],[data-field="subtitle"],[data-field="meta"],[data-field="genres"]').forEach(el => {
    el.textContent = '';
  });
  try {
    const matchBtn = modal.querySelector('.preview-match-button');
    if (matchBtn) {
      matchBtn.textContent = '';
      matchBtn.style.display = 'none';
    }
  } catch {}
  try {
    const btns = modal.querySelector('.preview-buttons');
    if (btns) {
      btns.style.opacity = '0';
      btns.style.pointerEvents = 'none';
    }
    const playBtn = modal.querySelector('.preview-play-button');
    if (playBtn) playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    const favBtn = modal.querySelector('.preview-favorite-button');
    if (favBtn) {
      favBtn.classList.remove('favorited');
      favBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    }
    const volBtn = modal.querySelector('.preview-volume-button');
    if (volBtn) volBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
  } catch {}

  modal.classList.add('is-skeleton');
}

function currentIndexPage() {
  return document.querySelector("#indexPage:not(.hide)") || document.querySelector("#homePage:not(.hide)") || document.body;
}

function getHomeSectionsContainer(indexPage) {
  return (
    indexPage.querySelector(".homeSectionsContainer") ||
    document.querySelector(".homeSectionsContainer") ||
    indexPage
  );
}

function insertAfter(parent, node, ref) {
  if (!parent || !node) return;
  if (ref && ref.parentElement === parent) {
    ref.insertAdjacentElement('afterend', node);
  } else {
    parent.appendChild(node);
  }
}

function enforceOrder(homeSectionsHint) {
  const cfg = getConfig();
  const studio = document.getElementById('studio-hubs');
  const recs  = document.getElementById('personal-recommendations');
  const genre = document.getElementById('genre-hubs');
  const parent = (studio && studio.parentElement) || homeSectionsHint || getHomeSectionsContainer(currentIndexPage());
  if (!parent) return;
  if (cfg.placePersonalRecsUnderStudioHubs && studio && recs) {
    insertAfter(parent, recs, studio);
  }
  if (cfg.placeGenreHubsUnderStudioHubs && studio && genre) {
    const ref = (cfg.placePersonalRecsUnderStudioHubs && recs && recs.parentElement === parent) ? recs : studio;
    insertAfter(parent, genre, ref);
  }
}

function placeSection(sectionEl, homeSections, underStudio) {
  if (!sectionEl) return;
  const studio = document.getElementById('studio-hubs');
  const targetParent = (studio && studio.parentElement) || homeSections || getHomeSectionsContainer(currentIndexPage());
  const placeNow = () => {
    if (underStudio && studio && targetParent) {
      insertAfter(targetParent, sectionEl, studio);
    } else {
      (targetParent || document.body).appendChild(sectionEl);
    }
    enforceOrder(targetParent);
  };

  placeNow();
  if (underStudio && !studio) {
    let mo = null;
    let tries = 0;
    const maxTries = 50;
    const stop = () => { try { mo.disconnect(); } catch {} mo = null; };

    mo = new MutationObserver(() => {
      tries++;
      const s = document.getElementById('studio-hubs');
      if (s && s.parentElement) {
        const newParent = s.parentElement;
        insertAfter(newParent, sectionEl, s);
        enforceOrder(newParent);
        stop();
      } else if (tries >= maxTries) {
        stop();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      const s = document.getElementById('studio-hubs');
      if (s && s.parentElement) {
        insertAfter(s.parentElement, sectionEl, s);
        enforceOrder(s.parentElement);
        stop();
      }
    }, 3000);
  }
}

function hydrateBlurUp(img, { lqSrc, hqSrc, hqSrcset, fallback }) {
  const fb = fallback || PLACEHOLDER_URL;

  img.__data = { lqSrc, hqSrc, hqSrcset, fallback: fb };
  img.__phase = 'lq';
  img.__hiRequested = false;

  try { img.removeAttribute('srcset'); } catch {}
  if (lqSrc) {
    if (img.src !== lqSrc) img.src = lqSrc;
  } else {
    img.src = fb;
  }
  img.classList.add('is-lqip');
  img.__hydrated = false;

  const onError = () => {
    if (img.__phase === 'hi') {
      try { img.removeAttribute('srcset'); } catch {}
      if (lqSrc) {
    if (img.src !== lqSrc) img.src = lqSrc;
  } else {
    img.src = fb;
  }
      img.classList.add('is-lqip');
      img.__phase = 'lq';
      img.__hiRequested = false;
    }
  };

  const onLoad = () => {
    if (img.__phase === 'hi') {
      img.classList.remove('is-lqip');
      img.__hydrated = true;
    }
  };

  img.__onErr = onError;
  img.__onLoad = onLoad;
  img.addEventListener('error', onError, { passive: true });
  img.addEventListener('load',  onLoad,  { passive: true });

  __imgIO.observe(img);
}

function unobserveImage(img) {
  try { __imgIO.unobserve(img); } catch {}
  try { img.removeEventListener('error', img.__onErr); } catch {}
  try { img.removeEventListener('load',  img.__onLoad); } catch {}
  delete img.__onErr;
  delete img.__onLoad;
  if (img) { img.removeAttribute('srcset'); }
}

(function ensureGlobalTouchOutsideCloser(){
  if (window.__jmsTouchCloserBound) return;
  window.__jmsTouchCloserBound = true;
  document.addEventListener('pointerdown', (e) => {
    if (!__touchStickyOpen) return;
    const inModal = e.target?.closest?.('.video-preview-modal');
    if (!inModal) {
      try { safeCloseHoverModal(); } catch {}
      __touchStickyOpen = false;
    }
  }, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (!__touchStickyOpen) return;
    if (e.key === 'Escape') {
      try { safeCloseHoverModal(); } catch {}
      __touchStickyOpen = false;
    }
  });
})();

function clearEnterTimer(cardEl) {
  const t = __enterTimers.get(cardEl);
  if (t) { clearTimeout(t); __enterTimers.delete(cardEl); }
}

function isHoveringCardOrModal(cardEl) {
  try {
    const overCard  = cardEl?.isConnected && cardEl.matches(':hover');
    const overModal = !!document.querySelector('.video-preview-modal:hover');
    return !!(overCard || overModal);
  } catch { return false; }
}

function schedulePostOpenGuard(cardEl, token, delay=120) {
  setTimeout(() => {
    if (__openTokenMap.get(cardEl) !== token) return;
    if (!isHoveringCardOrModal(cardEl)) {
      try { safeCloseHoverModal(); } catch {}
    }
  }, delay);
}

function scheduleClosePollingGuard(cardEl, tries=6, interval=90) {
  let count = 0;
  const iid = setInterval(() => {
    count++;
    if (isHoveringCardOrModal(cardEl)) { clearInterval(iid); return; }
    if (Date.now() - __lastMoveTS > 80 || count >= tries) {
      try { safeCloseHoverModal(); } catch {}
      clearInterval(iid);
    }
  }, interval);
}

function pageReady() {
  try {
    const page =
      document.querySelector("#indexPage:not(.hide)") ||
      document.querySelector("#homePage:not(.hide)");
    if (!page) return false;
    const hasSections = !!(page.querySelector(".homeSectionsContainer") || document.querySelector(".homeSectionsContainer"));
    return !!page && (hasSections || true);
  } catch { return false; }
}

let __recsRetryTimer = null;
function scheduleRecsRetry(ms = 600) {
  clearTimeout(__recsRetryTimer);
  __recsRetryTimer = setTimeout(() => {
    __recsRetryTimer = null;
    renderPersonalRecommendations();
  }, ms);
}

export async function renderPersonalRecommendations() {
  if (!config.enablePersonalRecommendations && !ENABLE_GENRE_HUBS) return;
  if (__personalRecsBusy) return;
  if (!pageReady()) {
    scheduleRecsRetry(700);
    return;
  }
  __personalRecsBusy = true;

  try {
    document.documentElement.dataset.jmsSoftBlock = "1";
    const indexPage =
      document.querySelector("#indexPage:not(.hide)") ||
      document.querySelector("#homePage:not(.hide)");
    if (!indexPage) return;

    const jobs = [];

    if (config.enablePersonalRecommendations) {
      const section = ensurePersonalRecsContainer(indexPage);
      if (section) {
        const row = section.querySelector(".personal-recs-row");
         if (row) {
          if (!row.dataset.mounted || row.childElementCount === 0) {
            row.dataset.mounted = "1";
            renderSkeletonCards(row, CARD_COUNT);
            setupScroller(row);
          }
        }
        jobs.push((async () => {
          const { userId, serverId } = getSessionInfo();
          const recommendations = await fetchPersonalRecommendations(userId, CARD_COUNT, MIN_RATING);
          renderRecommendationCards(row, recommendations, serverId);
        })());
      }
    }

    if (ENABLE_GENRE_HUBS) {
      jobs.push(renderGenreHubs(indexPage));
    }

    try {
      const target = indexPage || document.body;
      const mo = new MutationObserver(() => {
        const hsc = indexPage.querySelector(".homeSectionsContainer") || document.querySelector(".homeSectionsContainer");
        if (hsc) {
          try {
            hsc.querySelectorAll('.itemsContainer').forEach(el => el.dispatchEvent(new Event('scroll')));
          } catch {}
          mo.disconnect();
        }
      });
      mo.observe(target, { childList: true, subtree: true });
    } catch {}

    await Promise.allSettled(jobs);
    try { enforceOrder(getHomeSectionsContainer(indexPage)); } catch {}
  } catch (error) {
    console.error("Kişisel öneriler / tür hub render hatası:", error);
  } finally {
    try { delete document.documentElement.dataset.jmsSoftBlock; } catch {}
    __personalRecsBusy = false;
  }
}

function ensurePersonalRecsContainer(indexPage) {
  const homeSections = getHomeSectionsContainer(indexPage);
  let existing = document.getElementById("personal-recommendations");
  if (existing) {
    placeSection(existing, homeSections, !!getConfig().placePersonalRecsUnderStudioHubs);
    return existing;
  }
  const section = document.createElement("div");
  section.id = "personal-recommendations";
  section.classList.add("homeSection", "personal-recs-section");
  section.innerHTML = `
    <div class="sectionTitleContainer sectionTitleContainer-cards">
      <h2 class="sectionTitle sectionTitle-cards">
        ${(config.languageLabels && config.languageLabels.personalRecommendations) || labels.personalRecommendations || "Sana Özel Öneriler"}
      </h2>
    </div>

    <div class="personal-recs-scroll-wrap">
      <button class="hub-scroll-btn hub-scroll-left" aria-label="${(config.languageLabels && config.languageLabels.scrollLeft) || "Sola kaydır"}" aria-disabled="true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <div class="itemsContainer personal-recs-row" role="list"></div>
      <button class="hub-scroll-btn hub-scroll-right" aria-label="${(config.languageLabels && config.languageLabels.scrollRight) || "Sağa kaydır"}" aria-disabled="true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
      </button>
    </div>
  `;
  placeSection(section, homeSections, !!getConfig().placePersonalRecsUnderStudioHubs);
  return section;
}

function renderSkeletonCards(row, count = 8) {
  row.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "card personal-recs-card skeleton";
    el.innerHTML = `
      <div class="cardBox">
        <div class="cardImageContainer">
          <div class="cardImage"></div>
          <div class="prc-gradient"></div>
          <div class="prc-overlay">
            <div class="prc-type-badge skeleton-line" style="width:40px;height:18px;border-radius:4px;"></div>
            <div class="prc-logo-row">
              <div class="prc-logo-fallback skeleton-line" style="width:60%;height:20px;"></div>
            </div>
            <div class="prc-meta">
              <span class="skeleton-line" style="width:42px;height:18px;border-radius:999px;"></span>
              <span class="prc-dot">•</span>
              <span class="skeleton-line" style="width:38px;height:12px;"></span>
              <span class="prc-dot">•</span>
              <span class="skeleton-line" style="width:38px;height:12px;"></span>
            </div>
            <div class="prc-genres">
              <span class="skeleton-line" style="width:90px;height:12px;"></span>
            </div>
          </div>
        </div>
      </div>
    `;
    row.appendChild(el);
  }
}

async function fetchPersonalRecommendations(userId, targetCount = 12, minRating = 0) {
  const cached = loadPersonalRecsCache();
  if (cached && cached.userId === userId) {
    return filterAndTrimByRating(cached.recommendations, minRating, targetCount);
  }
  try {
    const topGenres = await getCachedUserTopGenres(3);
    const recs = await fetchUnwatchedByGenres(userId, topGenres, targetCount, minRating);
    savePersonalRecsCache(userId, recs);
    return filterAndTrimByRating(recs, minRating, targetCount);
  } catch (err) {
    console.error("Kişisel öneriler alınırken hata:", err);
    const fb = await getFallbackRecommendations(userId, targetCount * 3);
    savePersonalRecsCache(userId, fb);
    return filterAndTrimByRating(fb, minRating, targetCount);
  }
}

async function fetchUnwatchedByGenres(userId, genres, targetCount = 20, minRating = 0) {
  if (!genres || !genres.length) {
    const fb = await getFallbackRecommendations(userId, targetCount * 3);
    return filterAndTrimByRating(fb, minRating, targetCount);
  }

  const genresParam = encodeURIComponent(genres.join("|"));
  const fields = COMMON_FIELDS;
  const requested = Math.max(targetCount * 2, 20);
  const sort = "Random,CommunityRating,DateCreated";

  const url =
    `/Users/${userId}/Items?` +
    `IncludeItemTypes=Movie,Series&Recursive=true&Filters=IsUnplayed&` +
    `Genres=${genresParam}&Fields=${fields}&` +
    `SortBy=${sort}&SortOrder=Descending&Limit=${requested}`;

  try {
    const data = await makeApiRequest(url);
    const items = Array.isArray(data?.Items) ? data.Items : [];
    return filterAndTrimByRating(items, minRating, targetCount);
  } catch (err) {
    console.error("Türe göre içerik alınırken hata:", err);
    const fb = await getFallbackRecommendations(userId, requested);
    return filterAndTrimByRating(fb, minRating, targetCount);
  }
}

async function getFallbackRecommendations(userId, limit = 20) {
  const fields = COMMON_FIELDS;
  const url =
    `/Users/${userId}/Items?` +
    `IncludeItemTypes=Movie,Series&Recursive=true&Filters=IsUnplayed&` +
    `Fields=${fields}&` +
    `SortBy=Random,CommunityRating&SortOrder=Descending&Limit=${limit}`;

  try {
    const data = await makeApiRequest(url);
    return Array.isArray(data?.Items) ? data.Items : [];
  } catch (err) {
    console.error("Fallback öneriler alınırken hata:", err);
    return [];
  }
}

function filterAndTrimByRating(items, minRating, maxCount) {
  const seen = new Set();
  const out = [];
  for (const it of items || []) {
    if (!it || !it.Id) continue;
    if (seen.has(it.Id)) continue;
    seen.add(it.Id);
    const score = Number(it.CommunityRating);
    if (minRating > 0 && !(Number.isFinite(score) && score >= minRating)) continue;
    out.push(it);
    if (out.length >= maxCount) break;
  }
  return out;
}

function renderRecommendationCards(row, items, serverId) {
  try { row.querySelectorAll('.personal-recs-card').forEach(el => el.dispatchEvent(new Event('jms:cleanup'))); } catch {}
  row.innerHTML = "";
  if (!items || !items.length) {
    row.innerHTML = `<div class="no-recommendations">${(config.languageLabels?.noRecommendations) || labels.noRecommendations || "Öneri bulunamadı"}</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  const slice = items.slice(0, CARD_COUNT);
  for (let i = 0; i < slice.length; i++) {
    const card = createRecommendationCard(slice[i], serverId, i < 2);
    frag.appendChild(card);
  }
  row.appendChild(frag);
}

const COMMON_FIELDS = [
  "PrimaryImageAspectRatio",
  "ImageTags",
  "CommunityRating",
  "Genres",
  "OfficialRating",
  "ProductionYear",
  "CumulativeRunTimeTicks",
  "RunTimeTicks",
].join(",");

function buildPosterSrcSet(item) {
  const hs = [240, 360, 540, 720];
  const q  = 50;
  const ar = Number(item.PrimaryImageAspectRatio) || 0.6667;
  return hs.map(h => `${buildPosterUrl(item, h, q)} ${Math.round(h * ar)}w`).join(", ");
}

function formatRuntime(ticks) {
  if (!ticks) return null;
  const minutes = Math.floor(ticks / 600000000);
  if (minutes < 60) return `${minutes}d`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}s ${remainingMinutes}d` : `${hours}s`;
}

function normalizeAgeChip(rating) {
  if (!rating) return null;
  const r = String(rating).toUpperCase().trim();
  if (/(18\+|R18|ADULT|NC-17|X-RATED|XXX|ADULTS ONLY|AO)/.test(r)) return "18+";
  if (/(17\+|R|TV-MA)/.test(r)) return "17+";
  if (/(16\+|R16|M|MATURE)/.test(r)) return "16+";
  if (/(15\+|TV-15)/.test(r)) return "15+";
  if (/(13\+|TV-14|PG-13|TEEN)/.test(r)) return "13+";
  if (/(12\+|TV-12)/.test(r)) return "12+";
  if (/(10\+|TV-Y10)/.test(r)) return "10+";
  if (/(7\+|TV-Y7|E10\+|E10)/.test(r)) return "7+";
  if (/(G|PG|TV-G|TV-PG|E|EVERYONE|U|UC|UNIVERSAL)/.test(r)) return "7+";
  if (/(ALL AGES|ALL|TV-Y|KIDS|Y)/.test(r)) return "0+";
  return r;
}

function getRuntimeWithIcons(runtime) {
  if (!runtime) return '';
  return runtime.replace(/(\d+)s/g, `$1${config.languageLabels?.sa || 'sa'}`)
               .replace(/(\d+)d/g, `$1${config.languageLabels?.dk || 'dk'}`);
}

function getDetailsUrl(itemId, serverId) {
  return `#/details?id=${itemId}&serverId=${encodeURIComponent(serverId)}`;
}

function buildPosterUrl(item, height = 540, quality = 72) {
  const tag = item.ImageTags?.Primary || item.PrimaryImageTag;
  if (!tag) return null;
  return `/Items/${item.Id}/Images/Primary?tag=${encodeURIComponent(tag)}&maxHeight=${height}&quality=${quality}&EnableImageEnhancers=false`;
}

function buildLogoUrl(item, width = 220, quality = 72) {
  const tag = item.ImageTags?.Logo || item.LogoImageTag;
  if (!tag) return null;
  return `/Items/${item.Id}/Images/Logo?tag=${encodeURIComponent(tag)}&width=${width}&quality=${quality}`;
}

function createRecommendationCard(item, serverId, aboveFold = false) {
  const card = document.createElement("div");
  card.className = "card personal-recs-card";
  card.dataset.itemId = item.Id;

  const posterUrlHQ = buildPosterUrlHQ(item);
  const posterSetHQ = posterUrlHQ ? buildPosterSrcSet(item) : "";
  const posterUrlLQ = buildPosterUrlLQ(item);
  const logoUrl = buildLogoUrl(item, 320, 80);
  const year = item.ProductionYear || "";
  const ageChip = normalizeAgeChip(item.OfficialRating || "");
  const runtimeTicks = item.Type === "Series" ? item.CumulativeRunTimeTicks : item.RunTimeTicks;
  const runtime = formatRuntime(runtimeTicks);
  const genres = Array.isArray(item.Genres) ? item.Genres.slice(0, 3).join(", ") : "";
  const isSeries = item.Type === "Series";
  const typeLabel = isSeries
    ? ((config.languageLabels && config.languageLabels.dizi) || "Dizi")
    : ((config.languageLabels && config.languageLabels.film) || "Film");
  const typeIcon = isSeries ? '🎬' : '🎞️';
  const community = Number.isFinite(item.CommunityRating)
    ? `<div class="community-rating" title="Community Rating">⭐ ${item.CommunityRating.toFixed(1)}</div>`
    : "";

  card.innerHTML = `
    <div class="cardBox">
      <a class="cardLink" href="${getDetailsUrl(item.Id, serverId)}">
        <div class="cardImageContainer">
          <img class="cardImage"
            alt="${item.Name}"
            loading="lazy"
            decoding="async"
            fetchpriority="${aboveFold ? 'high' : 'low'}">
          <div class="prc-top-badges">
            ${community}
            <div class="prc-type-badge">
              <span class="prc-type-icon">${typeIcon}</span>
              ${typeLabel}
            </div>
          </div>
          <div class="prc-gradient"></div>
          <div class="prc-overlay">
            <div class="prc-logo-row">
              ${logoUrl
                ? `<img class="prc-logo" alt="${item.Name} logo" loading="lazy" decoding="async">`
                : `<div class="prc-logo-fallback" title="${item.Name}">${item.Name}</div>`}
            </div>
            <div class="prc-meta">
              ${ageChip ? `<span class="prc-age">${ageChip}</span><span class="prc-dot">•</span>` : ""}
              ${year ? `<span class="prc-year">${year}</span><span class="prc-dot">•</span>` : ""}
              ${runtime ? `<span class="prc-runtime">${getRuntimeWithIcons(runtime)}</span>` : ""}
            </div>
            ${genres ? `<div class="prc-genres">${genres}</div>` : ""}
          </div>
        </div>
      </a>
    </div>
  `;

  const img = card.querySelector('.cardImage');
try { img.setAttribute('sizes', '(max-width: 640px) 45vw, (max-width: 1200px) 22vw, 220px'); } catch {}
if (posterUrlHQ) {
  hydrateBlurUp(img, {
    lqSrc: posterUrlLQ,
    hqSrc: posterUrlHQ,
    hqSrcset: posterSetHQ,
    fallback: PLACEHOLDER_URL
  });
} else {
    try { img.style.display = 'none'; } catch {}
    const noImg = document.createElement('div');
    noImg.className = 'prc-noimg-label';
    noImg.textContent =
      (config.languageLabels && (config.languageLabels.noImage || config.languageLabels.loadingText))
      || (labels.noImage || 'Görsel yok');
    noImg.style.minHeight = '220px';
    noImg.style.display = 'flex';
    noImg.style.alignItems = 'center';
    noImg.style.justifyContent = 'center';
    noImg.style.textAlign = 'center';
    noImg.style.padding = '12px';
    noImg.style.fontWeight = '600';
    card.querySelector('.cardImageContainer')?.prepend(noImg);
  }

  const logoImg = card.querySelector('.prc-logo');
  if (logoImg && logoUrl) {
  hydrateBlurUp(logoImg, { lqSrc: logoUrl, hqSrc: logoUrl, hqSrcset: '', fallback: '' });
  logoImg.classList.remove('is-lqip');
}

  const mode = (getConfig()?.globalPreviewMode === 'studioMini') ? 'studioMini' : 'modal';
  const defer = window.requestIdleCallback || ((fn)=>setTimeout(fn, 0));
  defer(() => attachPreviewByMode(card, item, mode));
  card.addEventListener('jms:cleanup', () => {
    unobserveImage(img);
    if (logoImg) unobserveImage(logoImg);
  }, { once: true });
  return card;
}

function setupScroller(row) {
  if (row.dataset.scrollerMounted === "1") {
    requestAnimationFrame(() => row.dispatchEvent(new Event('scroll')));
    return;
  }
  row.dataset.scrollerMounted = "1";
  const section = row.closest(".genre-hub-section") || row.closest("#personal-recommendations");
  if (!section) return;

  const btnL = section.querySelector(".hub-scroll-left");
  const btnR = section.querySelector(".hub-scroll-right");

  const canScroll = () => row.scrollWidth > row.clientWidth + 2;
  const step = () => Math.max(240, Math.floor(row.clientWidth * 0.9));

    let _rafToken = null;
    const updateButtonsNow = () => {
    const max = Math.max(0, row.scrollWidth - row.clientWidth);
    const atStart = !canScroll() || row.scrollLeft <= 1;
    const atEnd = !canScroll() || row.scrollLeft >= max - 1;
    if (btnL) btnL.setAttribute("aria-disabled", atStart ? "true" : "false");
    if (btnR) btnR.setAttribute("aria-disabled", atEnd ? "true" : "false");
  };

  const scheduleUpdate = () => {
    if (_rafToken) return;
    _rafToken = requestAnimationFrame(() => {
      _rafToken = null;
      updateButtonsNow();
    });
  };

  const doScroll = (dir) => {
    if (!canScroll()) return;
    const delta = dir < 0 ? -step() : step();
    const target = row.scrollLeft + delta;
    try { row.scrollTo({ left: target, behavior: "smooth" }); }
    catch { row.scrollLeft = target; }
    scheduleUpdate();
  };

  if (btnL) btnL.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); doScroll(-1); });
  if (btnR) btnR.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); doScroll(1); });

  const onWheel = (e) => {
    const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
    if (!horizontalIntent) return;
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    row.scrollLeft += delta;
    e.preventDefault();
    scheduleUpdate();
  };
  row.addEventListener("wheel", onWheel, { passive: false });

  const onTs = (e)=>e.stopPropagation();
  const onTm = (e)=>e.stopPropagation();
  row.addEventListener("touchstart", onTs, { passive: true });
  row.addEventListener("touchmove", onTm, { passive: true });

  const onScroll = () => scheduleUpdate();
  row.addEventListener("scroll", onScroll, { passive: true });
  const ro = new ResizeObserver(() => scheduleUpdate());
  ro.observe(row);
  row.__ro = ro;
  row.addEventListener('jms:cleanup', () => {
    try { row.removeEventListener("wheel", onWheel); } catch {}
    try { row.removeEventListener("scroll", onScroll); } catch {}
    try { row.removeEventListener("touchstart", onTs); } catch {}
    try { row.removeEventListener("touchmove", onTm); } catch {}
    try { ro.disconnect(); } catch {}
  }, { once:true });

  requestAnimationFrame(() => updateButtonsNow());
  setTimeout(() => updateButtonsNow(), 400);
}

async function renderGenreHubs(indexPage) {
  const homeSections = getHomeSectionsContainer(indexPage);

  const existing = homeSections.querySelector("#genre-hubs");
  let wrap = document.getElementById("genre-hubs");
  if (wrap) {
    if (wrap.parentElement !== homeSections) {
      homeSections.appendChild(wrap);
    }
    try { abortAllGenreFetches(); } catch {}
    try {
      wrap.querySelectorAll('.personal-recs-card,.genre-row').forEach(el => {
        el.dispatchEvent(new Event('jms:cleanup'));
      });
      wrap.querySelectorAll('.genre-row').forEach(r => {
        if (r.__ro) { try { r.__ro.disconnect(); } catch {} delete r.__ro; }
      });
    } catch {}
    wrap.innerHTML = '';
  } else {
    wrap = document.createElement("div");
    wrap.id = "genre-hubs";
    wrap.className = "homeSection genre-hubs-wrapper";
  }

  placeSection(wrap, homeSections, !!getConfig().placeGenreHubsUnderStudioHubs);
  enforceOrder(homeSections);

  const { userId, serverId } = getSessionInfo();
  const allGenres = await getCachedGenresWeekly(userId);
  if (!allGenres || !allGenres.length) return;
  const picked = pickOrderedFirstK(allGenres, GENRE_ROWS_COUNT);
  if (!picked.length) return;
  const seenIds = new Set();
  const sections = picked.map(genre => {
    const section = document.createElement("div");
    section.className = "homeSection genre-hub-section";
    section.innerHTML = `
      <div class="sectionTitleContainer sectionTitleContainer-cards">
        <h2 class="sectionTitle sectionTitle-cards gh-title">
  <span class="gh-title-text">${escapeHtml(genre)}</span>
  <div class="gh-see-all" data-genre="${escapeHtml(genre)}"
              aria-label="${(config.languageLabels?.seeAll) || "Tümünü gör"}"
              title="${(config.languageLabels?.seeAll) || "Tümünü gör"}">
        <span class="material-icons">keyboard_arrow_right</span>
      </div>
      <span class="gh-see-all-tip">${(config.languageLabels?.seeAll) || "Tümünü gör"}</span>
</h2>
      </div>
      <div class="personal-recs-scroll-wrap">
        <button class="hub-scroll-btn hub-scroll-left" aria-label="${(config.languageLabels && config.languageLabels.scrollLeft) || "Sola kaydır"}" aria-disabled="true">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <div class="itemsContainer genre-row" role="list"></div>
        <button class="hub-scroll-btn hub-scroll-right" aria-label="${(config.languageLabels && config.languageLabels.scrollRight) || "Sağa kaydır"}" aria-disabled="true">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
      </div>
    `;
    wrap.appendChild(section);
    const seeAllBtn = section.querySelector('.gh-see-all');
if (seeAllBtn) {
  seeAllBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openGenreExplorer(genre);
  }, { passive: false });
}
    const row = section.querySelector(".genre-row");
    renderSkeletonCards(row, GENRE_ROW_CARD_COUNT);
    return { genre, section, row };
  });
  const CONCURRENCY = 5;
  let idx = 0;

  async function worker() {
    while (idx < sections.length) {
      const my = idx++;
      const { genre, row } = sections[my];
      try {
        const items = await fetchItemsBySingleGenre(userId, genre, GENRE_ROW_CARD_COUNT * 3, MIN_RATING);
        const unique = [];
        for (const it of items) {
          if (!seenIds.has(it.Id)) {
            unique.push(it);
            seenIds.add(it.Id);
          }
          if (unique.length >= GENRE_ROW_CARD_COUNT) break;
        }
        row.innerHTML = "";
        if (!unique.length) {
          row.innerHTML = `<div class="no-recommendations">${labels.noRecommendations || "Uygun içerik yok"}</div>`;
        } else {
          for (const it of unique) row.appendChild(createRecommendationCard(it, serverId, false));
        }
        setupScroller(row);
      } catch (err) {
        console.warn("Genre hub yüklenemedi:", sections[my].genre, err);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, sections.length) }, () => worker()));
  try {
    const mode = (getConfig()?.globalPreviewMode === 'studioMini') ? 'studioMini' : 'modal';
    wrap.querySelectorAll('.personal-recs-card').forEach(cardEl => {
      const itemId = cardEl?.dataset?.itemId;
      if (!itemId) return;
      const itemLike = {
        Id: itemId,
        Name: cardEl.querySelector('.prc-logo-fallback')?.title || cardEl.querySelector('.cardImage')?.alt || ''
      };
      attachPreviewByMode(cardEl, itemLike, mode);
    });
  } catch {}
}


async function fetchItemsBySingleGenre(userId, genre, limit = 30, minRating = 0) {
  const cached = loadGenreItemsFromCache(genre);
  if (cached) return filterAndTrimByRating(cached, minRating, limit);

  const fields = COMMON_FIELDS;
  const g = encodeURIComponent(genre);
  const url =
    `/Users/${userId}/Items?` +
    `IncludeItemTypes=Movie,Series&Recursive=true&Filters=IsUnplayed&` +
    `Genres=${g}&Fields=${fields}&` +
    `SortBy=Random,CommunityRating,DateCreated&SortOrder=Descending&Limit=${Math.max(60, limit * 3)}`;

  const ctrl = new AbortController();
  __genreFetchCtrls.add(ctrl);
  try {
    const data = await makeApiRequest(url, { signal: ctrl.signal });
    const items = Array.isArray(data?.Items) ? data.Items : [];
    saveGenreItemsToCache(genre, items);
    return filterAndTrimByRating(items, minRating, limit);
  } catch (e) {
    if (e?.name !== 'AbortError') console.error("fetchItemsBySingleGenre hata:", e);
    return [];
    } finally {
    __genreFetchCtrls.delete(ctrl);
  }
}

const __genreFetchCtrls = new Set();
function abortAllGenreFetches(){
  for (const c of __genreFetchCtrls) { try { c.abort(); } catch {} }
  __genreFetchCtrls.clear();
}

function pickOrderedFirstK(allGenres, k) {
  const order = Array.isArray(config.genreHubsOrder) && config.genreHubsOrder.length
    ? config.genreHubsOrder
    : allGenres;
  const setAvail = new Set(allGenres.map(g => String(g).toLowerCase()));
  const picked = [];
  for (const g of order) {
    if (!g) continue;
    if (setAvail.has(String(g).toLowerCase())) {
      picked.push(g);
      if (picked.length >= k) break;
    }
  }
  if (picked.length < k) {
    for (const g of allGenres) {
      if (picked.includes(g)) continue;
      picked.push(g);
      if (picked.length >= k) break;
    }
  }
  return picked;
}

function loadGenreItemsFromCache(genre) {
  try {
    const raw = localStorage.getItem(GENRE_ITEMS_LS_PREFIX + genre);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.timestamp || !Array.isArray(data.items)) return null;
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    if (data.items.some(it => !it || !Array.isArray(it.Genres))) {
      return null;
    }
    return data.items;
  } catch { return null; }
}

function saveGenreItemsToCache(genre, items) {
  try {
    const data = { items: toSlimList(items), timestamp: Date.now() };
    localStorage.setItem(GENRE_ITEMS_LS_PREFIX + genre, JSON.stringify(data));
    enforceGenreCacheLRU();
  } catch {}
}

const GENRE_INDEX_KEY = "genreItems_index_v1";
const GENRE_LRU_MAX = 24;
function enforceGenreCacheLRU() {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(GENRE_INDEX_KEY);
    const idx = raw ? JSON.parse(raw) : [];
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(GENRE_ITEMS_LS_PREFIX)) keys.push(k);
    }
    const pairs = keys.map(k => {
      try { return [k, JSON.parse(localStorage.getItem(k))?.timestamp || 0]; }
      catch { return [k, 0]; }
    }).sort((a,b) => a[1]-b[1]);
    while (pairs.length > GENRE_LRU_MAX) {
      const [oldK] = pairs.shift();
      try { localStorage.removeItem(oldK); } catch {}
    }
    localStorage.setItem(GENRE_INDEX_KEY, JSON.stringify({ t: now, keys: pairs.map(p=>p[0]) }));
  } catch {}
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function getCachedGenresWeekly(userId) {
  const cached = loadGenresCache();
  if (cached && cached.userId === userId) return cached.genres;

  try {
    const list = await fetchAllGenres(userId);
    const genres = uniqueNormalizedGenres(list);
    saveGenresCache(userId, genres);
    return genres;
  } catch (e) {
    console.warn("Tür listesi alınamadı, önbellekten/boş dönülüyor:", e);
    return cached?.genres || [];
  }
}

async function fetchAllGenres(userId) {
  const url =
    `/Items/Filters?UserId=${encodeURIComponent(userId)}` +
    `&IncludeItemTypes=Movie,Series&Recursive=true`;

  const r = await makeApiRequest(url);
  const genres = Array.isArray(r?.Genres) ? r.Genres : [];
  return genres.map(g => String(g || "").trim()).filter(Boolean);
}

function uniqueNormalizedGenres(list) {
  const seen = new Set();
  const out = [];
  for (const g of list) {
    const k = g.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(g); }
  }
  return out;
}

function loadGenresCache() {
  try {
    const raw = localStorage.getItem(GENRE_LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.timestamp || !Array.isArray(data.genres)) return null;
    if (Date.now() - data.timestamp > GENRE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function saveGenresCache(userId, genres) {
  try {
    const data = { userId, genres, timestamp: Date.now() };
    localStorage.setItem(GENRE_LS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Tür önbelleği kaydedilemedi:", e);
  }
}

function safeOpenHoverModal(itemId, anchorEl) {
  if (typeof window.tryOpenHoverModal === 'function') {
    try { window.tryOpenHoverModal(itemId, anchorEl, { bypass: true }); return; } catch {}
  }
  if (window.__hoverTrailer && typeof window.__hoverTrailer.open === 'function') {
    try { window.__hoverTrailer.open({ itemId, anchor: anchorEl, bypass: true }); return; } catch {}
  }
  window.dispatchEvent(new CustomEvent('jms:hoverTrailer:open', { detail: { itemId, anchor: anchorEl, bypass: true }}));
}

function safeCloseHoverModal() {
  if (typeof window.closeHoverPreview === 'function') {
    try { window.closeHoverPreview(); return; } catch {}
  }
  if (window.__hoverTrailer && typeof window.__hoverTrailer.close === 'function') {
    try { window.__hoverTrailer.close(); return; } catch {}
  }
  window.dispatchEvent(new CustomEvent('jms:hoverTrailer:close'));
  try { hardWipeHoverModalDom(); } catch {}
}

const CACHE_ITEM_FIELDS = [
  "Id","Name","Type","ImageTags","PrimaryImageTag","LogoImageTag",
  "CommunityRating","OfficialRating","ProductionYear","RunTimeTicks","CumulativeRunTimeTicks",
  "Genres"
];

function toSlimItem(it){
  if (!it) return null;
  const slim = {};
  for (const k of CACHE_ITEM_FIELDS) slim[k] = it[k];
  return slim;
}
function toSlimList(list){ return (list||[]).map(toSlimItem).filter(Boolean); }

function attachHoverTrailer(cardEl, itemLike) {
  if (!cardEl || !itemLike?.Id) return;
  if (!__enterSeq.has(cardEl)) __enterSeq.set(cardEl, 0);

  const onEnter = (e) => {
    const isTouch = e?.pointerType === 'touch';
    const until = __cooldownUntil.get(cardEl) || 0;
    if (Date.now() < until) return;

    __hoverIntent.set(cardEl, true);
    clearEnterTimer(cardEl);

    const seq = (__enterSeq.get(cardEl) || 0) + 1;
    __enterSeq.set(cardEl, seq);

    const timer = setTimeout(() => {
      if ((__enterSeq.get(cardEl) || 0) !== seq) return;
      if (!__hoverIntent.get(cardEl)) return;
      if (!isTouch) {
        if (!cardEl.isConnected || !cardEl.matches(':hover')) return;
      }
      try { window.dispatchEvent(new Event('closeAllMiniPopovers')); } catch {}

      const token = (Date.now() ^ Math.random()*1e9) | 0;
      __openTokenMap.set(cardEl, token);

      try { hardWipeHoverModalDom(); } catch {}
      safeOpenHoverModal(itemLike.Id, cardEl);

      if (isTouch) {
        __touchStickyOpen = true;
        __touchLastOpenTS = Date.now();
      }
      if (!isTouch) schedulePostOpenGuard(cardEl, token, 140);
    }, OPEN_DELAY_MS);

    __enterTimers.set(cardEl, timer);
  };

  const onLeave = (e) => {
    const isTouch = e?.pointerType === 'touch';
    __hoverIntent.set(cardEl, false);
    clearEnterTimer(cardEl);
    __enterSeq.set(cardEl, (__enterSeq.get(cardEl) || 0) + 1);
    if (isTouch && __touchStickyOpen) {
      if (Date.now() - __touchLastOpenTS <= TOUCH_STICKY_GRACE_MS) return;
      return;
    }

    const rt = e?.relatedTarget || null;
    const goingToModal = !!(rt && (rt.closest ? rt.closest('.video-preview-modal') : null));
    if (goingToModal) return;

    try { safeCloseHoverModal(); } catch {}
    try { hardWipeHoverModalDom(); } catch {}
    __cooldownUntil.set(cardEl, Date.now() + HOVER_REOPEN_COOLDOWN_MS);
    scheduleClosePollingGuard(cardEl, 6, 90);
  };
  cardEl.addEventListener('pointerenter', onEnter, { passive: true });
  cardEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') onEnter(e);
  }, { passive: true });

  cardEl.addEventListener('pointerleave', onLeave,  { passive: true });
  __boundPreview.set(cardEl, { mode: 'modal', onEnter, onLeave });
}


function detachPreviewHandlers(cardEl) {
  const rec = __boundPreview.get(cardEl);
  if (!rec) return;
  cardEl.removeEventListener('pointerenter', rec.onEnter);
  cardEl.removeEventListener('pointerleave', rec.onLeave);
  clearEnterTimer(cardEl);
  __hoverIntent.delete(cardEl);
  __openTokenMap.delete(cardEl);
  __boundPreview.delete(cardEl);
}

function attachPreviewByMode(cardEl, itemLike, mode) {
  detachPreviewHandlers(cardEl);
  if (mode === 'studioMini') {
    attachMiniPosterHover(cardEl, itemLike);
    __boundPreview.set(cardEl, { mode: 'studioMini', onEnter: ()=>{}, onLeave: ()=>{} });
  } else {
    attachHoverTrailer(cardEl, itemLike);
  }
}

window.addEventListener("jms:all-slides-ready", () => {
  if (!__personalRecsBusy) scheduleRecsRetry(0);
}, { once: true, passive: true });

window.addEventListener('jms:globalPreviewModeChanged', (ev) => {
  const mode = ev?.detail?.mode === 'studioMini' ? 'studioMini' : 'modal';
  document.querySelectorAll('.personal-recs-card').forEach(cardEl => {
    const itemId = cardEl?.dataset?.itemId;
    if (!itemId) return;
    const itemLike = { Id: itemId, Name: cardEl.querySelector('.prc-logo-fallback')?.title || cardEl.querySelector('.cardImage')?.alt || '' };
    attachPreviewByMode(cardEl, itemLike, mode);
  });
}, { passive: true });

function loadPersonalRecsCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.timestamp) return null;
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    if (Array.isArray(data.recommendations) &&
        data.recommendations.some(it => !it || !Array.isArray(it.Genres))) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function savePersonalRecsCache(userId, recommendations) {
  try {
    const data = { userId, recommendations: toSlimList(recommendations), timestamp: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Öneri önbelleği kaydedilemedi:", error);
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
