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

let __personalRecsBusy = false;

export async function renderPersonalRecommendations() {
  if (!config.enablePersonalRecommendations) return;
  if (__personalRecsBusy) return;
  __personalRecsBusy = true;

  try {
    const indexPage =
      document.querySelector("#indexPage:not(.hide)") ||
      document.querySelector("#homePage:not(.hide)");
    if (!indexPage) return;

    const { userId, serverId } = getSessionInfo();
    const section = ensurePersonalRecsContainer(indexPage);
    if (!section) return;

    const row = section.querySelector(".personal-recs-row");
    if (!row) return;
    renderSkeletonCards(row, CARD_COUNT);

    const recommendations = await fetchPersonalRecommendations(userId, CARD_COUNT, MIN_RATING);
    renderRecommendationCards(row, recommendations, serverId);
    setupScroller(row);
  } catch (error) {
    console.error("Kişisel öneriler render hatası:", error);
  } finally {
    __personalRecsBusy = false;
  }
}

function ensurePersonalRecsContainer(indexPage) {
  let homeSections =
    indexPage.querySelector(".homeSectionsContainer") ||
    document.querySelector(".homeSectionsContainer") ||
    indexPage;

  const existing = document.querySelector("#personal-recommendations");
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
  const fields = [
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
  const fields = [
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
  if (/(18\+|R18|ADULT|NC-17)/.test(r)) return "18+";
  if (/(16\+|R16)/.test(r)) return "16+";
  if (/(15\+)/.test(r)) return "15+";
  if (/(13\+|TV-14|PG-13)/.test(r)) return "13+";
  if (/(7\+|TV-Y7)/.test(r)) return "7+";
  if (/(G|PG|TV-G|TV-PG)/.test(r)) return "7+";
  if (/^R\b/.test(r)) return "16+";
  return r;
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
                  ? `<img class=\"prc-logo\" src=\"${logoUrl}\" alt=\"${item.Name} logo\" loading=\"lazy\">`
                  : `<div class=\"prc-logo-fallback\" title=\"${item.Name}\">${item.Name}</div>`
              }
            </div>
            <div class="prc-meta">
              ${ageChip ? `<span class=\"prc-age\">${ageChip}</span><span class=\"prc-dot\">•</span>` : ""}
              ${year ? `<span class=\"prc-year\">${year}</span><span class=\"prc-dot\">•</span>` : ""}
              ${runtime ? `<span class=\"prc-runtime\">${getRuntimeWithIcons(runtime)}</span>` : ""}
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

function getRuntimeWithIcons(runtime) {
  if (!runtime) return '';

  return runtime.replace(/(\d+)s/g, `$1${config.languageLabels?.sn || 'sn'}`)
               .replace(/(\d+)d/g, `$1${config.languageLabels?.dk || 'dk'}`);
}

function getDetailsUrl(itemId, serverId) {
  return `#/details?id=${itemId}&serverId=${encodeURIComponent(serverId)}`;
}

function buildPosterUrl(item, height = 300, quality = 95) {
  const tag = item.ImageTags?.Primary || item.PrimaryImageTag;
  if (!tag) return "/css/images/placeholder.png";
  return `/Items/${item.Id}/Images/Primary?tag=${encodeURIComponent(tag)}&fillHeight=${height}&quality=${quality}`;
}

function buildLogoUrl(item, width = 240, quality = 90) {
  const tag = item.ImageTags?.Logo || item.LogoImageTag;
  if (!tag) return null;
  return `/Items/${item.Id}/Images/Logo?tag=${encodeURIComponent(tag)}&width=${width}&quality=${quality}`;
}

function setupScroller(row) {
  const section = row.closest("#personal-recommendations");
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
    try {
      row.scrollTo({ left: target, behavior: "smooth" });
    } catch {
      row.scrollLeft = target;
    }
    requestAnimationFrame(updateButtons);
  };

  if (btnL) btnL.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); doScroll(-1); });
  if (btnR) btnR.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); doScroll(1); });

  row.addEventListener(
    "wheel",
    (e) => {
      const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      if (!horizontalIntent) return;
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      row.scrollLeft += delta;
      e.preventDefault();
      requestAnimationFrame(updateButtons);
    },
    { passive: false }
  );

  row.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
  row.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });

  row.addEventListener("scroll", updateButtons, { passive: true });
  new ResizeObserver(updateButtons).observe(row);

  requestAnimationFrame(updateButtons);
  setTimeout(updateButtons, 400);
}

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

const __boundPreview = new WeakMap();

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

function detachPreviewHandlers(cardEl) {
  const rec = __boundPreview.get(cardEl);
  if (!rec) return;
  cardEl.removeEventListener('mouseenter', rec.onEnter);
  cardEl.removeEventListener('mouseleave', rec.onLeave);
  __boundPreview.delete(cardEl);
}

const OPEN_DELAY_MS = 250;
const HOVER_REOPEN_COOLDOWN_MS = 300;
const __enterTimers = new WeakMap();
const __enterSeq = new WeakMap();
const __cooldownUntil = new WeakMap();

function clearEnterTimer(cardEl) {
  const t = __enterTimers.get(cardEl);
  if (t) { clearTimeout(t); __enterTimers.delete(cardEl); }
}

function attachHoverTrailer(cardEl, itemLike) {
  if (!cardEl || !itemLike?.Id) return;
  if (!__enterSeq.has(cardEl)) __enterSeq.set(cardEl, 0);

  const onEnter = () => {
    const until = __cooldownUntil.get(cardEl) || 0;
    if (Date.now() < until) return;
    clearEnterTimer(cardEl);
    const seq = (__enterSeq.get(cardEl) || 0) + 1;
    __enterSeq.set(cardEl, seq);
    const timer = setTimeout(() => {
      if ((__enterSeq.get(cardEl) || 0) !== seq) return;
      if (!cardEl.isConnected || !cardEl.matches(':hover')) return;
      try { window.dispatchEvent(new Event('closeAllMiniPopovers')); } catch {}
      safeOpenHoverModal(itemLike.Id, cardEl);
    }, OPEN_DELAY_MS);
    __enterTimers.set(cardEl, timer);
  };

  const onLeave = (e) => {
    clearEnterTimer(cardEl);
    __enterSeq.set(cardEl, (__enterSeq.get(cardEl) || 0) + 1);
    const rt = e?.relatedTarget || null;
    const goingToModal = !!(rt && (rt.closest ? rt.closest('.video-preview-modal') : null));
    if (goingToModal) return;
    safeCloseHoverModal();
    __cooldownUntil.set(cardEl, Date.now() + HOVER_REOPEN_COOLDOWN_MS);
  };

  cardEl.addEventListener('mouseenter', onEnter, { passive: true });
  cardEl.addEventListener('mouseleave', onLeave,  { passive: true });

  __boundPreview.set(cardEl, { mode: 'modal', onEnter, onLeave });
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

window.addEventListener('jms:globalPreviewModeChanged', (ev) => {
  const mode = ev?.detail?.mode === 'studioMini' ? 'studioMini' : 'modal';
  document.querySelectorAll('.personal-recs-card').forEach(cardEl => {
    const itemId = cardEl?.dataset?.itemId;
    if (!itemId) return;
    const itemLike = { Id: itemId, Name: cardEl.querySelector('.prc-logo-fallback')?.title || cardEl.querySelector('.cardImage')?.alt || '' };
    attachPreviewByMode(cardEl, itemLike, mode);
  });
}, { passive: true });
