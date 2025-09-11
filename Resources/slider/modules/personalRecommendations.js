import { getSessionInfo, makeApiRequest, getCachedUserTopGenres } from "./api.js";
import { getConfig } from "./config.js";
import { getLanguageLabels } from "../language/index.js";
import { attachMiniPosterHover } from "./studioHubsUtils.js";

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

let   __lastMoveTS   = 0;
let __touchStickyOpen = false;
let __touchLastOpenTS = 0;
const TOUCH_STICKY_GRACE_MS = 1500;

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

window.addEventListener('pointermove', () => { __lastMoveTS = Date.now(); }, {passive:true});

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

function sliderReady() {
  try {
    if (window.__totalSlidesPlanned > 0 && window.__slidesCreated > 0) {
      return window.__slidesCreated >= window.__totalSlidesPlanned && !!document.querySelector("#slides-container .slide.active");
    }
    return !!document.querySelector("#indexPage:not(.hide) #slides-container .slide.active, #homePage:not(.hide) #slides-container .slide.active");
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


let __personalRecsBusy = false;

export async function renderPersonalRecommendations() {
  if (!config.enablePersonalRecommendations && !ENABLE_GENRE_HUBS) return;
  if (__personalRecsBusy) return;
  if (!sliderReady()) {
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

    const { userId, serverId } = getSessionInfo();
    if (config.enablePersonalRecommendations) {
      const section = ensurePersonalRecsContainer(indexPage);
      if (section) {
        const row = section.querySelector(".personal-recs-row");
        if (row) {
          renderSkeletonCards(row, CARD_COUNT);
          const recommendations = await fetchPersonalRecommendations(userId, CARD_COUNT, MIN_RATING);
          renderRecommendationCards(row, recommendations, serverId);
          setupScroller(row);
        }
      }
    }
    if (ENABLE_GENRE_HUBS) {
      await renderGenreHubs(indexPage);
    }
  } catch (error) {
    console.error("Kişisel öneriler / tür hub render hatası:", error);
  } finally {
    document.documentElement.dataset.jmsSoftBlock = "1";
    __personalRecsBusy = false;
  }
}

function ensurePersonalRecsContainer(indexPage) {
  let homeSections =
    indexPage.querySelector(".homeSectionsContainer") ||
    document.querySelector(".homeSectionsContainer") ||
    indexPage;

  const existing = homeSections.querySelector("#personal-recommendations");
  if (existing) existing.remove();

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

  const studioHubs = homeSections.querySelector("#studio-hubs");
  if (studioHubs && studioHubs.nextElementSibling) {
    homeSections.insertBefore(section, studioHubs.nextElementSibling);
  } else {
    homeSections.appendChild(section);
  }

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
  const requested = Math.max(targetCount * 3, 30);
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
  row.innerHTML = "";
  if (!items || !items.length) {
    row.innerHTML = `<div class="no-recommendations">${
      (config.languageLabels && config.languageLabels.noRecommendations) ||
      labels.noRecommendations ||
      "Öneri bulunamadı"
    }</div>`;
    return;
  }
  for (const it of items.slice(0, CARD_COUNT)) {
    row.appendChild(createRecommendationCard(it, serverId));
  }
}

const COMMON_FIELDS = [
  "PrimaryImageAspectRatio",
  "ImageTags",
  "BackdropImageTags",
  "CommunityRating",
  "CriticRating",
  "Genres",
  "UserData",
  "MediaSources",
  "OfficialRating",
  "ProductionYear",
  "CumulativeRunTimeTicks",
  "RunTimeTicks",
].join(",");

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

function buildPosterUrl(item, height = 900, quality = 90) {
  const tag = item.ImageTags?.Primary || item.PrimaryImageTag;
  if (!tag) return "/css/images/placeholder.png";
  return `/Items/${item.Id}/Images/Primary?tag=${encodeURIComponent(tag)}&fillHeight=${height}&quality=${quality}`;
}

function buildLogoUrl(item, width = 320, quality = 90) {
  const tag = item.ImageTags?.Logo || item.LogoImageTag;
  if (!tag) return null;
  return `/Items/${item.Id}/Images/Logo?tag=${encodeURIComponent(tag)}&width=${width}&quality=${quality}`;
}

function createRecommendationCard(item, serverId) {
  const card = document.createElement("div");
  card.className = "card personal-recs-card";
  card.dataset.itemId = item.Id;

  const posterUrl = buildPosterUrl(item, 900, 90);
  const logoUrl = buildLogoUrl(item, 320, 90);
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
          <img class="cardImage" src="${posterUrl}" alt="${item.Name}" loading="lazy">
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
              ${
                logoUrl
                  ? `<img class="prc-logo" src="${logoUrl}" alt="${item.Name} logo" loading="lazy">`
                  : `<div class="prc-logo-fallback" title="${item.Name}">${item.Name}</div>`
              }
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

  const mode = (getConfig()?.globalPreviewMode === 'studioMini') ? 'studioMini' : 'modal';
  attachPreviewByMode(card, item, mode);
  return card;
}

function setupScroller(row) {
  const section = row.closest(".genre-hub-section") || row.closest("#personal-recommendations");
  if (!section) return;

  const btnL = section.querySelector(".hub-scroll-left");
  const btnR = section.querySelector(".hub-scroll-right");

  const canScroll = () => row.scrollWidth > row.clientWidth + 2;
  const step = () => Math.max(240, Math.floor(row.clientWidth * 0.9));

  const updateButtons = () => {
    const max = Math.max(0, row.scrollWidth - row.clientWidth);
    const atStart = !canScroll() || row.scrollLeft <= 1;
    const atEnd = !canScroll() || row.scrollLeft >= max - 1;
    if (btnL) btnL.setAttribute("aria-disabled", atStart ? "true" : "false");
    if (btnR) btnR.setAttribute("aria-disabled", atEnd ? "true" : "false");
  };

  const doScroll = (dir) => {
    if (!canScroll()) return;
    const delta = dir < 0 ? -step() : step();
    const target = row.scrollLeft + delta;
    try { row.scrollTo({ left: target, behavior: "smooth" }); }
    catch { row.scrollLeft = target; }
    requestAnimationFrame(updateButtons);
  };

  if (btnL) btnL.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); doScroll(-1); });
  if (btnR) btnR.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); doScroll(1); });

  row.addEventListener("wheel", (e) => {
    const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
    if (!horizontalIntent) return;
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    row.scrollLeft += delta;
    e.preventDefault();
    requestAnimationFrame(updateButtons);
  }, { passive: false });

  row.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
  row.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });

  row.addEventListener("scroll", updateButtons, { passive: true });
  new ResizeObserver(updateButtons).observe(row);

  requestAnimationFrame(updateButtons);
  setTimeout(updateButtons, 400);
}

async function renderGenreHubs(indexPage) {
  const homeSections =
    indexPage.querySelector(".homeSectionsContainer") ||
    document.querySelector(".homeSectionsContainer") ||
    indexPage;

  const existing = homeSections.querySelector("#genre-hubs");
  if (existing) existing.remove();

  const wrap = document.createElement("div");
  wrap.id = "genre-hubs";
  wrap.className = "homeSection genre-hubs-wrapper";
  homeSections.appendChild(wrap);

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
        <h2 class="sectionTitle sectionTitle-cards">${escapeHtml(genre)}</h2>
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
          for (const it of unique) row.appendChild(createRecommendationCard(it, serverId));
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

  try {
    const data = await makeApiRequest(url);
    const items = Array.isArray(data?.Items) ? data.Items : [];
    saveGenreItemsToCache(genre, items);
    return filterAndTrimByRating(items, minRating, limit);
  } catch (e) {
    console.error("fetchItemsBySingleGenre hata:", e);
    return [];
  }
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
    return data.items;
  } catch { return null; }
}

function saveGenreItemsToCache(genre, items) {
  try {
    const data = { items, timestamp: Date.now() };
    localStorage.setItem(GENRE_ITEMS_LS_PREFIX + genre, JSON.stringify(data));
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
    try { window.tryOpenHoverModal(itemId, anchorEl); return; } catch {}
  }
  if (window.__hoverTrailer && typeof window.__hoverTrailer.open === 'function') {
    try { window.__hoverTrailer.open({ itemId, anchor: anchorEl }); return; } catch {}
  }
  window.dispatchEvent(new CustomEvent('jms:hoverTrailer:open', { detail: { itemId, anchor: anchorEl }}));
}

function safeCloseHoverModal() {
  if (typeof window.closeHoverPreview === 'function') {
    try { window.closeHoverPreview(); return; } catch {}
  }
  if (window.__hoverTrailer && typeof window.__hoverTrailer.close === 'function') {
    try { window.__hoverTrailer.close(); return; } catch {}
  }
  window.dispatchEvent(new CustomEvent('jms:hoverTrailer:close'));
}

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
    return data;
  } catch {
    return null;
  }
}

function savePersonalRecsCache(userId, recommendations) {
  try {
    const data = { userId, recommendations, timestamp: Date.now() };
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
