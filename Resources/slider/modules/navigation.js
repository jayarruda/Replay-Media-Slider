import { stopSlideTimer, startSlideTimer } from "./timer.js";
import { SLIDE_DURATION } from "./timer.js";
import { getConfig } from './config.js';
import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';
import { resetProgressBar } from "./progressBar.js";
import { getCurrentIndex, setCurrentIndex, setRemainingTime } from "./sliderState.js";
import { applyContainerStyles } from "./positionUtils.js"
import { playNow, getVideoStreamUrl, fetchItemDetails, updateFavoriteStatus, getCachedUserTopGenres, getGenresForDot, fetchLocalTrailers, pickBestLocalTrailer, goToDetailsPage } from "./api.js";
import { applySlideAnimation, applyDotPosterAnimation} from "./animations.js";
import { getVideoQualityText } from "./containerUtils.js";
import { getYoutubeEmbedUrl, isValidUrl } from "./utils.js";

let videoModal, modalVideo, modalTitle, modalMeta, modalMatchInfo, modalGenres, modalPlayButton, modalFavoriteButton, modalEpisodeLine, modalButtonsContainer, modalMatchButton;
let modalHoverState = false;
let isMouseInItem = false;
let isMouseInModal = false;
let modalHideTimeout = null;
let itemHoverAbortController = null;
let _cacheMaintenanceStarted = false;
let _ytApiLoading = false;
let _ytApiReady = false;
let _lastModalHideAt = 0;
let _currentHoverItemId = null;
let _hoverOpenTimer = null;
let _lastItemEnterAt = 0;
let _isModalClosing = false;
let _modalClosingUntil = 0;
let _playbackToken = 0;
let _soundOn = true;

const OPEN_HOVER_DELAY_MS   = 500;
const REOPEN_COOLDOWN_MS    = 150;
const CROSS_ITEM_SETTLE_MS  = 180;
const HARD_CLOSE_BUFFER_MS = 30;
const config = getConfig();
const currentLang = config.defaultLanguage || getDefaultLanguage();
if (!config.languageLabels) {
  config.languageLabels = getLanguageLabels(currentLang) || {};
}
const previewPreloadCache = new Map();
   if (typeof document !== 'undefined' && (document.hidden || document.visibilityState === 'hidden')) {
  closeVideoModal();
}
const DEVICE_MEM_GB = typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory : 4;
const PREVIEW_MAX_ENTRIES = Math.max(50, Math.min(200, Math.floor(DEVICE_MEM_GB * 60)));
const PREVIEW_TTL_MS = 5 * 60 * 1000;
const PREVIEW_EVICT_BATCH = Math.max(10, Math.floor(PREVIEW_MAX_ENTRIES * 0.15));
const _ytPlayers = new Map();
const _ytReadyMap = new Map();
const _ytReadyResolvers = [];
const _seriesTrailerCache = new Map();


const MODAL_ANIM = {
  openMs: 340,
  closeMs: 180,
  ease: 'cubic-bezier(.41,.4,.36,1.01)',
  scaleFrom: 0.6,
  scaleTo: 1,
  opacityFrom: 0.8,
  opacityTo: 1
};

const OPEN_ANIM_MS = MODAL_ANIM.openMs;

export function setModalAnimation(opts = {}) {
  Object.assign(MODAL_ANIM, opts);
  injectOrUpdateModalStyle();
}

function L(key, fallback = '') {
  try { return (getConfig()?.languageLabels?.[key]) ?? fallback; }
  catch { return fallback; }
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
function modalIsVisible() {
  return !!(videoModal && videoModal.style.display !== 'none' && document.body.contains(videoModal));
}

function hardStopPlayback() {
  try {
    hideTrailerIframe();

    if (modalVideo) {
      if (modalVideo._hls) {
        modalVideo._hls.destroy();
        delete modalVideo._hls;
      }
      modalVideo.pause();
      modalVideo.removeAttribute('src');
      modalVideo.load();
      modalVideo.style.opacity = '0';
      modalVideo.style.display = 'none';
    }
  } catch (e) {}
}


async function gatePlaybackStart(expectedItemId) {
  await sleep(OPEN_ANIM_MS);
  if (!modalIsVisible()) return false;
  if (expectedItemId && videoModal?.dataset?.itemId && videoModal.dataset.itemId !== String(expectedItemId)) {
    return false;
  }
  if (typeof getClosingRemaining === 'function' && getClosingRemaining() > 0) {
    await sleep(getClosingRemaining());
    if (!modalIsVisible()) return false;
  }
  return true;
}


async function resolveLocalTrailerUrlFor(item, { signal } = {}) {
  try {
    if (!item?.Id) return { url: null, level: null };
    const locals = await fetchLocalTrailers(item.Id, { signal });
    if (!locals || locals.length === 0) return { url: null, level: null };
    const best = pickBestLocalTrailer(locals);
    if (!best?.Id) return { url: null, level: null };
    const url = await getVideoStreamUrl(best.Id);
    return url ? { url, level: 'local', trailerItem: best } : { url: null, level: null };
  } catch {
    return { url: null, level: null };
  }
}

async function getSeriesTrailerUrl(seriesId) {
  if (!seriesId) return null;
  if (_seriesTrailerCache.has(seriesId)) return _seriesTrailerCache.get(seriesId);

  try {
    const series = await fetchItemDetails(seriesId);
    const url = pickYouTubeTrailerUrl(series?.RemoteTrailers);
    _seriesTrailerCache.set(seriesId, url || null);
    return url || null;
  } catch {
    _seriesTrailerCache.set(seriesId, null);
    return null;
  }
}

async function openModalForDot(dot, itemId, signal) {
  if (videoModal) {
    hardStopPlayback();
    resetModalInfo(videoModal);
    resetModalButtons();
    videoModal.style.display = 'none';
  }

  const item = await fetchItemDetails(itemId, { signal });
  if (signal?.aborted) return;
  if (!videoModal || !document.body.contains(videoModal)) {
    const modalElements = createVideoModal({ showButtons: true });
    if (!modalElements) return;
    videoModal = modalElements.modal;
    modalVideo = modalElements.video;
    modalTitle = modalElements.title;
    modalMeta = modalElements.meta;
    modalMatchInfo = modalElements.matchInfo;
    modalGenres = modalElements.genres;
    modalPlayButton = modalElements.playButton;
    modalFavoriteButton = modalElements.favoriteButton;
    modalEpisodeLine = modalElements.episodeLine;
    modalMatchButton = modalElements.matchButton;
    bindModalEvents(videoModal);
  }

  const domUrl = getBackdropFromDot(dot);
  const itemUrl = getBackdropFromItem(item);
  videoModal.setBackdrop(domUrl || itemUrl || null);

  videoModal.dataset.itemId = itemId;
  positionModalRelativeToDot(videoModal, dot);
  if (videoModal.style.display !== 'block') {
    animatedShow(videoModal);
  } else {
    videoModal.style.display = 'block';
  }
  applyVolumePreference();

  const videoUrl = await preloadVideoPreview(itemId);
  if (signal?.aborted) return;
  await updateModalContent(item, videoUrl);
}


function setGlobalSound(on) {
  _soundOn = !!on;
  applyVolumePreference();
}

function applyVolumePreference() {
  const volumeButton = videoModal?.querySelector?.('.preview-volume-button');
  const trailerIframe = videoModal?.querySelector?.('.preview-trailer-iframe');
  const trailerVisible = trailerIframe && trailerIframe.style.display !== 'none';
  if (trailerVisible) {
    const player = _ytPlayers.get(trailerIframe);
    if (player && typeof player.mute === 'function') {
      try {
        if (_soundOn) {
          if (typeof player.unMute === 'function') player.unMute();
          if (typeof player.setVolume === 'function') player.setVolume(100);
        } else {
          player.mute();
        }
      } catch {}
    } else {
      try {
        const src = trailerIframe.src || '';
        const hasMute = src.includes('mute=');
        let next = src;
        if (hasMute) {
          next = src.replace(/mute=(0|1)/, `mute=${_soundOn ? '0' : '1'}`);
        } else {
          next += (src.includes('?') ? '&' : '?') + `mute=${_soundOn ? '0' : '1'}`;
        }
        if (next !== src) trailerIframe.src = next;
      } catch {}
    }
    if (volumeButton) {
      volumeButton.innerHTML = _soundOn
        ? '<i class="fa-solid fa-volume-high"></i>'
        : '<i class="fa-solid fa-volume-xmark"></i>';
    }
    return;
  }
  if (modalVideo) {
    modalVideo.muted = !_soundOn;
    modalVideo.volume = _soundOn ? 1.0 : 0.0;
  }
  if (volumeButton) {
    volumeButton.innerHTML = _soundOn
      ? '<i class="fa-solid fa-volume-high"></i>'
      : '<i class="fa-solid fa-volume-xmark"></i>';
  }
}

async function findSeriesIdByClimbing(item) {
  if (!item) return null;
  if (item.Type === 'Series') return item.Id || null;
  let probeId = item.SeriesId || item.ParentId || null;
  while (probeId) {
    const p = await fetchItemDetails(probeId);
    if (!p) break;
    if (p.Type === 'Series') return p.Id || probeId;
    probeId = p.ParentId || null;
  }
  return null;
}

function pickYouTubeTrailerUrl(remoteTrailers = []) {
  if (!Array.isArray(remoteTrailers)) return null;
  for (const t of remoteTrailers) {
    const raw = t?.Url;
    if (!raw) continue;
    const embed = getYoutubeEmbedUrl(raw);
    if (embed && isValidUrl(embed)) return embed;
  }
  return null;
}

async function resolveTrailerUrlFor(item) {
  const local = await resolveLocalTrailerUrlFor(item);
  if (local.url) return local;
  const itemUrl = pickYouTubeTrailerUrl(item?.RemoteTrailers);
  if (itemUrl) return { url: itemUrl, level: 'item' };
  const seriesId = await findSeriesIdByClimbing(item);
  if (seriesId) {
    const seriesUrl = await getSeriesTrailerUrl(seriesId);
    if (seriesUrl) return { url: seriesUrl, level: 'series' };
  }
  return { url: null, level: null };
}

function ensureYTAPI() {
  if (typeof YT !== 'undefined' && typeof YT.Player === 'function') {
    _ytApiReady = true;
    return Promise.resolve();
  }

  if (_ytApiLoading) {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (typeof YT !== 'undefined' && typeof YT.Player === 'function') {
          clearInterval(checkInterval);
          _ytApiReady = true;
          resolve();
        }
      }, 100);
    });
  }

  _ytApiLoading = true;
  return new Promise((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onload = () => {
    };
    document.head.appendChild(tag);
    setTimeout(() => {
      if (typeof YT !== 'undefined' && typeof YT.Player === 'function') {
        _ytApiReady = true;
        _ytApiLoading = false;
        resolve();
      } else {
        console.warn('YouTube API zaman aşımına uğradı, API olmadan devam ediyor');
        _ytApiReady = false;
        _ytApiLoading = false;
        resolve();
      }
    }, 3000);
  });
}

function getYTPlayerForIframe(iframe) {
  if (!iframe) return null;

  let p = _ytPlayers.get(iframe);
  if (p) return p;

  if (typeof YT === 'undefined' || typeof YT.Player !== 'function') {
    return null;
  }
  try {
    p = new YT.Player(iframe, {
      events: {
        onReady: (ev) => {
  try {
    if (_soundOn) {
      if (typeof ev.target.unMute === 'function') ev.target.unMute();
      if (typeof ev.target.setVolume === 'function') ev.target.setVolume(100);
    } else {
      if (typeof ev.target.mute === 'function') ev.target.mute();
    }

    const btn = videoModal?.querySelector?.('.preview-volume-button');
    if (btn) {
      btn.innerHTML = _soundOn
        ? '<i class="fa-solid fa-volume-high"></i>'
        : '<i class="fa-solid fa-volume-xmark"></i>';
    }
  } catch (error) {}
},
        onStateChange: (event) => {
  if (event.data === YT.PlayerState.PLAYING) {
    try { videoModal?.hideBackdrop?.(); } catch {}
            const btn = videoModal?.querySelector?.('.preview-volume-button');
            if (btn && typeof event.target.getVolume === 'function') {
              try {
                const volume = event.target.getVolume();
                btn.innerHTML = volume === 0
                  ? '<i class="fa-solid fa-volume-xmark"></i>'
                  : '<i class="fa-solid fa-volume-high"></i>';
              } catch (error) {
              }
            }
          }
        }
      }
    });

    _ytPlayers.set(iframe, p);
    return p;

  } catch (error) {
    return null;
  }
}

function now() { return Date.now(); }

function cacheGet(id) {
  const entry = previewPreloadCache.get(id);
  if (!entry) return null;

  if (entry.expiresAt < now()) {
    previewPreloadCache.delete(id);
    return null;
  }

  previewPreloadCache.delete(id);
  previewPreloadCache.set(id, { ...entry, lastAccess: now() });
  return entry.url;
}

function cacheSet(id, url) {
  const entry = {
    url,
    createdAt: now(),
    lastAccess: now(),
    expiresAt: now() + PREVIEW_TTL_MS
  };

  if (previewPreloadCache.has(id)) previewPreloadCache.delete(id);
  previewPreloadCache.set(id, entry);
  pruneOverLimit();
  return url;
}

function pruneExpired() {
  const t = now();
  for (const [id, entry] of previewPreloadCache) {
    if (entry.expiresAt < t) previewPreloadCache.delete(id);
  }
}

function pruneOverLimit() {
  const overflow = previewPreloadCache.size - PREVIEW_MAX_ENTRIES;
  if (overflow <= 0) return;
  let toEvict = Math.max(overflow, PREVIEW_EVICT_BATCH);

  for (const [id] of previewPreloadCache) {
    previewPreloadCache.delete(id);
    if (--toEvict <= 0) break;
  }
}

export async function preloadVideoPreview(itemId) {
  const hit = cacheGet(itemId);
  if (hit) return hit;

  try {
    const url = await getVideoStreamUrl(itemId);
    return cacheSet(itemId, url);
  } catch (e) {
    return null;
  }
}

function shouldHideModal() {
  return !isMouseInItem && !isMouseInModal;
}

function closeVideoModal() {
  if (!videoModal || videoModal.style.display === "none") return;
  _isModalClosing = true;
  _modalClosingUntil = Date.now() + MODAL_ANIM.closeMs + HARD_CLOSE_BUFFER_MS;

  modalHoverState = false;
  clearTimeout(modalHideTimeout);
  hardStopPlayback();

  videoModal.style.transition =
    `opacity ${MODAL_ANIM.closeMs}ms ${MODAL_ANIM.ease}, ` +
    `transform ${MODAL_ANIM.closeMs}ms ${MODAL_ANIM.ease}`;
  videoModal.style.opacity = String(MODAL_ANIM.opacityFrom);
  videoModal.style.transform = `scale(${MODAL_ANIM.scaleFrom})`;

  setTimeout(() => {
    if (videoModal) {
      clearTransientOverlays(videoModal);
      videoModal.style.display = 'none';
    }
    _lastModalHideAt = Date.now();
    _isModalClosing = false;
  }, MODAL_ANIM.closeMs);
}


function handleVisibilityChange() {
  if (document.hidden || document.visibilityState === 'hidden') {
    closeVideoModal();
  }
}

function destroyVideoModal() {
  if (videoModal) {
   hideTrailerIframe();
   clearTransientOverlays(videoModal);
    videoModal.removeEventListener('mouseenter', () => { isMouseInModal = true; });
    videoModal.removeEventListener('mouseleave', () => { isMouseInModal = false; });
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.src = '';
      if (modalVideo._hls) {
        modalVideo._hls.destroy();
        delete modalVideo._hls;
      }
    }
    videoModal.remove();
    videoModal = null;
    modalVideo = null;
  }
  isMouseInModal = false;
}

function getOrCreateTrailerIframe() {
   if (!videoModal) return null;
  const container = videoModal.querySelector?.('.video-container');
  if (!container) return null;
   let iframe = videoModal.querySelector?.('.preview-trailer-iframe');
   if (!iframe) {
     iframe = document.createElement('iframe');
     iframe.className = 'preview-trailer-iframe';
     iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
     iframe.referrerPolicy = 'origin-when-cross-origin';
     iframe.allowFullscreen = true;
     Object.assign(iframe.style, {
       width: '100%',
       height: '100%',
       border: 'none',
       display: 'none',
       position: 'absolute',
       inset: '0'
     });
     container.appendChild(iframe);
   }
   return iframe;
 }

function hideTrailerIframe() {
  if (!videoModal) return;
  const iframe = videoModal.querySelector?.('.preview-trailer-iframe');
  if (!iframe) return;

  const p = _ytPlayers.get(iframe);
  if (p) {
  try {
    if (p.stopVideo) p.stopVideo();
    if (p.mute) p.mute();
    if (p.destroy) p.destroy();
  } catch {}
  _ytPlayers.delete(iframe);
  _ytReadyMap.delete(iframe);
}
  iframe.src = '';
  iframe.style.display = 'none';
  const volumeButton = videoModal.querySelector('.preview-volume-button');
  if (volumeButton) {
    if (modalVideo) {
      volumeButton.innerHTML = modalVideo.muted
        ? '<i class="fa-solid fa-volume-xmark"></i>'
        : '<i class="fa-solid fa-volume-high"></i>';
    } else {
      volumeButton.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
    delete volumeButton.dataset.ytMuted;
  }
  clearTransientOverlays(videoModal);
}

export function changeSlide(direction) {
  const slides = document.querySelectorAll(".slide");
  if (!slides.length) return;

  stopSlideTimer();
  resetProgressBar();

  const currentIndex = getCurrentIndex();
  const newIndex = (currentIndex + direction + slides.length) % slides.length;
  setCurrentIndex(newIndex);
  displaySlide(newIndex);

  setRemainingTime(SLIDE_DURATION);
  startSlideTimer();
}

export function updateActiveDot() {
  const currentIndex = getCurrentIndex();
  const dots = document.querySelectorAll(".dot");
  const config = getConfig();

  dots.forEach(dot => {
    const wasActive = dot.classList.contains("active");
    const dotIndex = Number(dot.dataset.index);
    const isActive = dotIndex === currentIndex;

    dot.classList.toggle("active", isActive);

    if (config.dotPosterMode && config.enableDotPosterAnimations) {
      if (wasActive !== isActive) {
        applyDotPosterAnimation(dot, isActive);
      }
    }
  });

  if (config.dotPosterMode) {
    centerActiveDot({ smooth: true, force: true });
  }
}

export function createDotNavigation() {
  const config = getConfig();
  if (!config.showDotNavigation) {
    const existingDotContainer = document.querySelector(".dot-navigation-container");
    if (existingDotContainer) existingDotContainer.remove();
    return;
  }

  const dotType = config.dotBackgroundImageType;
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) return;

  const slidesContainer = indexPage.querySelector("#slides-container");
  if (!slidesContainer) {
    console.warn("Slayt konteynırı bulunamadı, nokta navigasyonu oluşturulamıyor");
    return;
  }

  const slides = slidesContainer.querySelectorAll(".slide");
  if (!slides || slides.length === 0) return;

  let dotContainer = slidesContainer.querySelector(".dot-navigation-container");
  if (!dotContainer) {
    dotContainer = document.createElement("div");
    dotContainer.className = "dot-navigation-container";
    applyContainerStyles(dotContainer, 'existingDot');
    slidesContainer.appendChild(dotContainer);
  }

  const currentIndex = getCurrentIndex();

  if (config.dotPosterMode) {
    dotContainer.innerHTML = "";
    dotContainer.classList.add("dot-poster-mode");

    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "dot-scroll-wrapper";

    const slidesArray = Array.from(slides);

    const dotElements = slidesArray.map((slide, index) => {
    const itemId = slide.dataset.itemId;
    if (!itemId) {
        console.warn(`Dot oluşturulamadı: slide ${index} için itemId eksik`);
        return null;
    }

    const dot = document.createElement("div");
    dot.className = "dot poster-dot";
    dot.dataset.index = index;
    dot.dataset.itemId = itemId;

    const imageUrl = dotType === "useSlideBackground"
        ? slide.dataset.background
        : slide.dataset[dotType];

    if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.className = "dot-poster-image";
        image.style.opacity = config.dotBackgroundOpacity || 0.3;
        image.style.filter = `blur(${config.dotBackgroundBlur ?? 10}px)`;
        dot.appendChild(image);
    }

    try {
        const mediaStreams = slide.dataset.mediaStreams ? JSON.parse(slide.dataset.mediaStreams) : [];
        const videoStream = mediaStreams.find(s => s.Type === "Video");
        if (videoStream) {
            const qualityText = getVideoQualityText(videoStream);
            if (qualityText) {
                const qualityBadge = document.createElement("div");
                qualityBadge.className = "dot-quality-badge";
                qualityBadge.innerHTML = `${qualityText}`;
                dot.appendChild(qualityBadge);
                const style = document.createElement("style");
            }
        }
    } catch (e) {
        console.warn("Video kalite bilgisi yüklenirken hata:", e);
    }

        const positionTicks = Number(slide.dataset.playbackpositionticks);
        const runtimeTicks = Number(slide.dataset.runtimeticks);

        if (config.showPlaybackProgress && !isNaN(positionTicks) && !isNaN(runtimeTicks) && positionTicks > 0 && positionTicks < runtimeTicks) {
            const progressContainer = document.createElement("div");
            progressContainer.className = "dot-progress-container";

            const barWrapper = document.createElement("div");
            barWrapper.className = "dot-duration-bar-wrapper";

            const bar = document.createElement("div");
            bar.className = "dot-duration-bar";
            const percentage = Math.min((positionTicks / runtimeTicks) * 100, 100);
            bar.style.width = `${percentage.toFixed(1)}%`;

            const remainingMinutes = Math.round((runtimeTicks - positionTicks) / 600000000);
            const text = document.createElement("span");
            text.className = "dot-duration-remaining";
            text.innerHTML = `<i class="fa-regular fa-hourglass-half"></i> ${remainingMinutes} ${config.languageLabels.dakika} ${config.languageLabels.kaldi}`;

            barWrapper.appendChild(bar);
            progressContainer.appendChild(barWrapper);
            progressContainer.appendChild(text);
            dot.appendChild(progressContainer);
        }

        const playButtonContainer = document.createElement("div");
        playButtonContainer.className = "dot-play-container";

        const playButton = document.createElement("button");
        playButton.className = "dot-play-button";
        playButton.textContent = config.languageLabels.izle;

        playButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        const itemId = slide.dataset.itemId;
        if (!itemId) {
        alert("Oynatma başarısız: itemId bulunamadı");
        return;
      }
      closeVideoModal();
      try {
        await playNow(itemId);
      } catch (error) {
        console.error("Oynatma hatası:", error);
        alert("Oynatma başarısız: " + error.message);
      } finally {
        closeVideoModal();
      }
    });

        const matchBadge = document.createElement("div");
        matchBadge.className = "dot-match-div";
        matchBadge.textContent = `...% ${config.languageLabels.uygun}`;

        playButtonContainer.appendChild(playButton);
        playButtonContainer.appendChild(matchBadge);
        dot.appendChild(playButtonContainer);

        dot.classList.toggle("active", index === currentIndex);

        if (config.dotPosterMode && config.enableDotPosterAnimations) {
            applyDotPosterAnimation(dot, index === currentIndex);
        }

        const style = document.createElement("style");
        style.textContent = `
            .dot-quality-badge {
              position: absolute;
              bottom: 24px;
              left: 2px;
              color: white;
              display: flex;
              gap: 2px;
              flex-direction: column;
          }

            .dot-quality-badge img.range-icon,.dot-quality-badge  img.codec-icon,.dot-quality-badge  img.quality-icon {
              width: 20px;
              height: 14px;
              background: rgba(30,30,40,.7);
              border-radius: 4px;
              padding: 1px;
          }

          .quality-badge .codec-icon {
                display: none;
            }
            .dot-quality-badge img {
              transition: all 0.3s ease;
              object-fit: contain;
    }
        `;
        dot.appendChild(style);

        dot.addEventListener("click", () => {
            if (index !== getCurrentIndex()) {
                changeSlide(index - getCurrentIndex());
            }
        });

      dot.addEventListener("mouseenter", () => {
      isMouseInItem = true;
      clearTimeout(modalHideTimeout);
      modalHoverState = true;
      if (dot.abortController) dot.abortController.abort();
      dot.abortController = new AbortController();
      const { signal } = dot.abortController;
      const itemId = dot.dataset.itemId;
      if (!itemId) return;
      scheduleOpenForItem(dot, itemId, signal, async () => {
      if (!isMouseInItem && !isMouseInModal) return;
      try {
      await openModalForDot(dot, itemId, signal);

      const item = await fetchItemDetails(itemId, { signal });
      const isFavorite = item.UserData?.IsFavorite || false;
      const isPlayed   = item.UserData?.Played || false;
      const positionTicks = Number(item.UserData?.PlaybackPositionTicks || 0);
      const runtimeTicks  = Number(item.RunTimeTicks || 0);
      const hasPartialPlayback = positionTicks > 0 && positionTicks < runtimeTicks;

      const playButton = dot.querySelector('.dot-play-button');
      if (playButton) {
        playButton.textContent = getPlayButtonText({
          isPlayed,
          hasPartialPlayback,
          labels: config.languageLabels
        });
      }

      const matchPercentage = await calculateMatchPercentage(item.UserData, item);
      const matchBadge = dot.querySelector('.dot-match-div');
      if (matchBadge) {
        matchBadge.textContent = `${matchPercentage}% ${config.languageLabels.uygun}`;
      }

      dot.dataset.favorite = isFavorite.toString();
      dot.dataset.played   = isPlayed.toString();
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Poster dot hover hatası:', error);
        if (videoModal) videoModal.style.display = 'none';
      }
    }
  });
});
      dot.addEventListener("mouseleave", () => {
      isMouseInItem = false;

      if (dot.abortController) {
      dot.abortController.abort();
      dot.abortController = null;
    }

      if (_hoverOpenTimer) {
      clearTimeout(_hoverOpenTimer);
      _hoverOpenTimer = null;
    }
      startModalHideTimer();
});

      return dot;
      }).filter(Boolean);

      setTimeout(() => {
      const createdDots = Array.from(scrollWrapper.querySelectorAll('.poster-dot'));
      createdDots.forEach(dot => {
      const itemId = dot.dataset.itemId;
      if (itemId) preloadVideoPreview(itemId);
    });

      if (previewPreloadCache.size > PREVIEW_MAX_ENTRIES) {
      clearVideoPreloadCache({ mode: 'overLimit' });
    }
  }, 0);

      dotElements.forEach(dot => scrollWrapper.appendChild(dot));
      setTimeout(async () => {
      const dotItemIds = dotElements.map(dot => dot.dataset.itemId).filter(Boolean);
      await preloadGenreData(dotItemIds);
      for (const dot of dotElements) {
        try {
            const itemId = dot.dataset.itemId;
            const item = await fetchItemDetails(itemId);
            const isFavorite = item.UserData?.IsFavorite || false;
            const isPlayed = item.UserData?.Played || false;
            const positionTicks = Number(item.UserData?.PlaybackPositionTicks || 0);
            const runtimeTicks = Number(item.RunTimeTicks || 0);
            const hasPartialPlayback = positionTicks > 0 && positionTicks < runtimeTicks;
            const playButton = dot.querySelector('.dot-play-button');
            if (playButton) {
            playButton.textContent = getPlayButtonText({
            isPlayed,
            hasPartialPlayback,
            labels: config.languageLabels
          });
        }
            const matchPercentage = await calculateMatchPercentage(item.UserData, item);
            const matchBadge = dot.querySelector('.dot-match-div');
            if (matchBadge) {
                matchBadge.textContent = `${matchPercentage}% ${config.languageLabels.uygun}`;
            }
            dot.dataset.favorite = isFavorite.toString();
            dot.dataset.played = isPlayed.toString();

        } catch (error) {
            console.error(`Dot verileri yüklenirken hata (${dot.dataset.itemId}):`, error);
        }
    }
}, 0);

    const leftArrow = document.createElement("button");
    leftArrow.className = "dot-arrow dot-arrow-left";
    leftArrow.innerHTML = "&#10094;";
    leftArrow.addEventListener("click", () => {
        scrollWrapper.scrollBy({ left: -scrollWrapper.clientWidth, behavior: "smooth" });
    });

    const rightArrow = document.createElement("button");
    rightArrow.className = "dot-arrow dot-arrow-right";
    rightArrow.innerHTML = "&#10095;";
    rightArrow.addEventListener("click", () => {
        scrollWrapper.scrollBy({ left: scrollWrapper.clientWidth, behavior: "smooth" });
    });

    dotContainer.append(leftArrow, scrollWrapper, rightArrow);
    const resizeObserver = new ResizeObserver(() => {
        centerActiveDot();
    });
    resizeObserver.observe(scrollWrapper);

    setTimeout(centerActiveDot, 300);
    return;
  }

  dotContainer.innerHTML = "";
  const currentDotIndex = getCurrentIndex();

  slides.forEach((slide, index) => {
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.dataset.index = index;

    const imageUrl = dotType === "useSlideBackground"
      ? slide.dataset.background
      : slide.dataset[dotType];

    if (imageUrl) {
      const imageOverlay = document.createElement("div");
      imageOverlay.className = "dot-image-overlay";
      imageOverlay.style.backgroundImage = `url(${imageUrl})`;
      imageOverlay.style.backgroundSize = "cover";
      imageOverlay.style.backgroundPosition = "center";
      imageOverlay.style.opacity = config.dotBackgroundOpacity || 0.3;
      imageOverlay.style.filter = `blur(${config.dotBackgroundBlur ?? 10}px)`;
      dot.appendChild(imageOverlay);
    }

    dot.classList.toggle("active", index === currentDotIndex);
    dot.addEventListener("click", () => {
      if (index !== getCurrentIndex()) {
        changeSlide(index - getCurrentIndex());
      }
    });

    dotContainer.appendChild(dot);
  });
}

function centerActiveDot({ smooth = true, force = false } = {}) {
  const scrollWrapper = document.querySelector(".dot-scroll-wrapper");
  const activeDot = scrollWrapper?.querySelector(".poster-dot.active");
  if (!scrollWrapper || !activeDot) return;

  const wrapperRect = scrollWrapper.getBoundingClientRect();
  const dotRect = activeDot.getBoundingClientRect();

  const isFullyVisible =
    dotRect.left >= wrapperRect.left &&
    dotRect.right <= wrapperRect.right;

  const dotCenter = dotRect.left + dotRect.width / 2;
  const isRoughlyCentered =
    dotCenter > wrapperRect.left + wrapperRect.width * 0.4 &&
    dotCenter < wrapperRect.right - wrapperRect.width * 0.4;

  if (!force && isFullyVisible && isRoughlyCentered) return;

  const scrollAmount =
    activeDot.offsetLeft - scrollWrapper.clientWidth / 2 + activeDot.offsetWidth / 2;

  scrollWrapper.scrollTo({
    left: scrollAmount,
    behavior: smooth ? "smooth" : "auto",
  });
}

export function displaySlide(index) {
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) return;

  const slides = indexPage.querySelectorAll(".slide");
  if (!slides.length) return;

  if (!document.querySelector(".dot-navigation-container")) {
    createDotNavigation();
  }

  const currentSlide = slides[index];
  if (!currentSlide) return;

  const currentIndex = getCurrentIndex();
  const direction = index > currentIndex ? 1 : -1;
  const activeSlide = indexPage.querySelector(".slide.active");

  if (activeSlide) {
    applySlideAnimation(activeSlide, currentSlide, direction);
  } else {
    currentSlide.style.display = "block";
    currentSlide.style.opacity = "1";
  }

  if (activeSlide) {
    applySlideAnimation(activeSlide, currentSlide, direction);
  }

  slides.forEach(slide => {
    if (slide !== currentSlide) {
      slide.classList.remove("active");
      setTimeout(() => {
        if (!slide.classList.contains("active")) {
          slide.style.display = "none";
        }
      }, getConfig().slideAnimationDuration || 300);
    }
  });

  currentSlide.style.display = "block";
  setTimeout(() => {
    currentSlide.classList.add("active");
    currentSlide.dispatchEvent(new CustomEvent("slideActive"));
    const directorContainer = currentSlide.querySelector(".director-container");
    if (directorContainer) {
      showAndHideElementWithAnimation(directorContainer, {
        girisSure: config.girisSure,
        aktifSure: config.aktifSure,
        transitionDuration: 600,
      });
    }
  }, 50);

  updateActiveDot();
  initSliderArrows(currentSlide);
  initSwipeEvents();
}

function initSliderArrows(slide) {
  const actorContainer = slide.querySelector(".artist-container");
  const leftArrow = slide.querySelector(".slider-arrow.left");
  const rightArrow = slide.querySelector(".slider-arrow.right");

  if (!actorContainer || !leftArrow || !rightArrow) return;

  const updateArrows = () => {
    const maxScrollLeft = actorContainer.scrollWidth - actorContainer.clientWidth;
    leftArrow.classList.toggle("hidden", actorContainer.scrollLeft <= 0);
    rightArrow.classList.toggle("hidden", actorContainer.scrollLeft >= maxScrollLeft - 1);
  };

  leftArrow.onclick = () => {
    actorContainer.scrollBy({ left: -actorContainer.clientWidth, behavior: "smooth" });
    setTimeout(updateArrows, 300);
  };

  rightArrow.onclick = () => {
    actorContainer.scrollBy({ left: actorContainer.clientWidth, behavior: "smooth" });
    setTimeout(updateArrows, 300);
  };

  actorContainer.addEventListener("scroll", updateArrows);
  setTimeout(updateArrows, 100);
}

export function initSwipeEvents() {
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) return;

  const slidesContainer = indexPage.querySelector("#slides-container");
  if (!slidesContainer) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let isHorizontalSwipe = false;

  const handleTouchStart = (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    isHorizontalSwipe = false;
    e.stopImmediatePropagation?.();
  };

  const handleTouchMove = (e) => {
    const moveX = e.changedTouches[0].screenX - touchStartX;
    const moveY = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(moveX) > Math.abs(moveY) && Math.abs(moveX) > 10) {
      isHorizontalSwipe = true;
      e.preventDefault();
    } else {
      isHorizontalSwipe = false;
    }
    e.stopImmediatePropagation?.();
  };

  const handleTouchEnd = (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      changeSlide(deltaX > 0 ? -1 : 1);
    }

    isHorizontalSwipe = false;
    e.stopImmediatePropagation?.();
  };

  slidesContainer.addEventListener("touchstart", handleTouchStart, { passive: false });
  slidesContainer.addEventListener("touchmove", handleTouchMove, { passive: false });
  slidesContainer.addEventListener("touchend", handleTouchEnd, { passive: true });
}

export function showAndHideElementWithAnimation(el, config) {
  const {
    girisSure = 0,
    aktifSure = 2000,
    transitionDuration = 600,
  } = config;
  el.style.transition = "none";
  el.style.opacity = "0";
  el.style.transform = "scale(0.95)";
  el.style.display = "none";
  setTimeout(() => {
    el.style.display = "flex";
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease`;
      el.style.opacity = "1";
      el.style.transform = "scale(1)";
      setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "scale(0.95)";
        setTimeout(() => {
          el.style.display = "none";
        }, transitionDuration);
      }, aktifSure);
    });
  }, girisSure);
}

function injectOrUpdateModalStyle() {
  const id = 'video-modal-modern-style';
  const style = document.getElementById(id) || document.createElement('style');
  style.id = id;
  style.textContent = `
    .video-preview-modal {
      position: absolute;
      width: 400px;
      height: 320px;
      background: rgba(24, 27, 38, 0.97);
      border-radius: 20px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.38), 0 1.5px 4px rgba(0,0,0,.09);
      z-index: 1000;
      display: none;
      overflow: hidden;
      transform: translateY(5px) scale(${MODAL_ANIM.scaleFrom});
      opacity: ${MODAL_ANIM.opacityFrom};
      transition:
      opacity ${MODAL_ANIM.openMs}ms ${MODAL_ANIM.ease},
      transform ${MODAL_ANIM.openMs}ms ${MODAL_ANIM.ease};
      font-family: "Inter","Netflix Sans","Helvetica Neue",Helvetica,Arial,sans-serif;
      pointer-events: auto;
      border: 1.5px solid rgba(255, 255, 255, 0.10);
      backdrop-filter: blur(18px) saturate(160%);
      user-select: none;
      }
      .video-preview-modal .preview-backdrop {
      position: absolute;
      inset: 10px 10px 130px 10px;
      border-radius: 12px;
      padding: 10px;
      box-sizing: border-box;
      object-fit: cover;
      width: 100%;
      height: 190px;
      background-position: center;
      opacity: 0;
      transition: opacity .25s ease;
      pointer-events: none;
      z-index: 0;
      left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
      .video-preview-modal .preview-episode {
        grid-column: 1 / 3;
        color: #e5e6fb;
        font-size: 13.5px;
        opacity: .95;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .video-preview-modal .video-container {
      width: 100%;
      height: 200px;
      padding: 10px;
      box-sizing: border-box;
      background: linear-gradient(160deg, rgba(33,36,54,.97) 65%, rgba(52,56,80,0.19));
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      box-shadow: 0 4px 18px 0 rgba(20,20,50,.06);
    }
      .video-preview-modal .preview-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        background: #111;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.21);
        transition: opacity 0.7s;
      }
      .video-preview-modal .preview-info {
      padding: 16px 18px 12px 18px;
      position: absolute;
      bottom: -5px;
      left: 0;
      right: 0px;
      z-index: 2;
      background: linear-gradient(0deg, rgba(24,27,38, 0.94) 60%, transparent 100%);
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-rows: repeat(3, auto);
      gap: 6px 16px;
      align-items: end;
    }
      .video-preview-modal .preview-match {
        color: #46d369;
        font-weight: 600;
        font-size: 12px;
        border-radius: 6px;
        background: rgba(70, 211, 105, 0.15);
        padding: 2px 8px;
        letter-spacing: 0.02em;
        display: inline-flex;
        align-items: center;
      }
      .video-preview-modal .preview-title {
        grid-column: 1 / 2;
        color: #fff;
        font-weight: 700;
        font-size: 1.24rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        margin: 0 0 2px 0;
        padding: 0;
        text-shadow: 0 2px 8px rgba(0, 0, 0, .42);
        line-height: 1.13;
      }
      .video-preview-modal .preview-meta {
        grid-column: 1/3;
        color: #b9badb;
        font-size: 13px;
        display: flex;
        flex-wrap: wrap;
        gap: 14px 10px;
        width: 100%;
        opacity: 0.95;
        align-items: center;
        margin: 0 0 -6px 0;
      }
      .video-preview-modal img.range-icon, img.codec-icon, img.quality-icon {
        width: 24px;
        height: 18px;
        background: rgba(30,30,40,.7);
        border-radius: 4px;
        padding: 1px;
      }
      .video-preview-modal .preview-genres {
        grid-column: 1/3;
        display: flex;
        gap: 8px;
        margin-top: 2px;
        font-size: 12.7px;
        color: #a8aac7;
        width: 99%;
        overflow: hidden;
      }
      .video-preview-modal .genre-badge {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: inline-block;
      }
      .video-preview-modal .genre-separator {
        color: #a8aac7;
        margin: 0 4px;
      }
      .video-preview-modal .preview-genres span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
      .video-preview-modal .preview-buttons {
        display: flex;
        gap: 12px;
        position: absolute;
        top: 62%;
        left: 50%;
        z-index: 4;
        opacity: 1;
        pointer-events: auto;
        padding: 5px 0;
        transform: translateX(-50%) scale(1);
      }
      .video-preview-modal button {
        outline: none;
        border: none;
        padding: 0;
        background: none;
        font: inherit;
      }
      .video-preview-modal .preview-play-button {
        background: linear-gradient(94deg, #fff 78%, #eee 100%);
        color: #000;
        border-radius: 4px;
        padding: 8px 18px 8px 16px;
        font-size: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
        height: 32px;
        cursor: pointer;
        min-width: 82px;
        box-shadow: 0 2px 8px 0 rgba(23, 22, 31, 0.05);
        transition: box-shadow .18s, transform .15s;
        text-wrap-mode: nowrap;
        font-weight: 700;
        text-overflow: ellipsis;
        text-shadow: 0 2px 8px rgba(0, 0, 0, .42);
        line-height: 1.13;
      }
      .video-preview-modal .preview-play-button:hover {
        background: linear-gradient(92deg, #f5f4f9 64%, #fff 100%);
        box-shadow: 0 4px 16px 0 rgba(21,12,50,.11);
        transform: scale(1.05);
      }
      .video-preview-modal .preview-favorite-button,
      .video-preview-modal .preview-info-button,
      .video-preview-modal .preview-volume-button,
      .video-preview-modal .preview-match-button {
        background: rgba(56, 60, 90, 0.76);
        color: #fff;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 15px;
        border: 1px solid rgba(194, 194, 255, 0.17);
        transition: background .18s, transform .15s;
        box-shadow: 0 1px 4px 0 rgba(23,22,31,0.07);
      }
      .video-preview-modal .preview-favorite-button.favorited {
        background: linear-gradient(80deg,#3fc37d 65%,#158654 100%);
        color: #fff;
        border: 1px solid #25e098;
      }
      .video-preview-modal .preview-match-button {
        background: rgba(70, 211, 105, 0.15);
        color: #46d369;
        border: 1px solid rgba(70, 211, 105, 0.3);
        font-weight: 600;
        font-size: 12px;
        border-radius: 6px;
        width: auto;
        padding: 0 8px;
        min-width: 50px;
      }
      .video-preview-modal .preview-favorite-button:hover,
      .video-preview-modal .preview-info-button:hover,
      .video-preview-modal .preview-volume-button:hover,
      .video-preview-modal .preview-match-button:hover {
        background: rgba(81, 85, 140, 0.98);
        transform: scale(1.09);
      }
      @media (max-width: 550px) {
        .video-preview-modal {
          width: 98vw;
          min-width: unset;
          border-radius: 13px;
          height: 260px;
        }
        .video-preview-modal .video-container { height: 110px; border-radius: 9px;}
        .video-preview-modal .preview-info { padding: 10px 8px 8px 12px; }
        .video-preview-modal .preview-buttons {
          top: 6px;
          right: 7px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .video-preview-modal .preview-match-button {
          order: -1;
          margin-right: auto;
        }
      }
    `;
  if (!style.isConnected) document.head.appendChild(style);
}

function createVideoModal({ showButtons = true } = {}) {
  if (!config || config.previewModal === false) {
    return null;
  }

  injectOrUpdateModalStyle();

  if (typeof config !== 'undefined' && config.previewModal !== false) {
    destroyVideoModal();
    const modal = document.createElement('div');
    modal.className = 'video-preview-modal';
    modal.style.display = 'none';
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    const backdropImg = document.createElement('img');
    backdropImg.className = 'preview-backdrop';
    backdropImg.alt = '';
    backdropImg.decoding = 'async';
    backdropImg.loading = 'lazy';
    videoContainer.appendChild(backdropImg);
    const video = document.createElement('video');
    video.className = 'preview-video';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x-webkit-airplay', 'allow');
    video.autoplay = true;
    video.muted = !_soundOn;
    video.loop = true;
    video.playsInline = true;
    video.addEventListener('error', () => {
      const src = video.currentSrc || video.src;
      if (!src) return;
    });
    video.addEventListener('stalled', () => video.load());
    video.addEventListener('playing', () => {
  video.style.opacity = '1';
  try { videoModal?.hideBackdrop?.(); } catch {}
});

    const infoContainer = document.createElement('div');
    infoContainer.className = 'preview-info';
    const title = document.createElement('div');
    title.className = 'preview-title';
    const meta = document.createElement('div');
    meta.className = 'preview-meta';
    const genres = document.createElement('div');
    genres.className = 'preview-genres';
    const episodeLine = document.createElement('div');
    episodeLine.className = 'preview-episode';

    infoContainer.append(title, episodeLine, meta, genres);
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'preview-buttons';
    modalButtonsContainer = buttonsContainer;
    const matchButton = document.createElement('button');
    matchButton.className = 'preview-match-button';
    matchButton.textContent = '';

    const playButton = document.createElement('button');
    playButton.className = 'preview-play-button';
    playButton.innerHTML = `<i class="fa-solid fa-play"></i>${L('izle') ? ' ' + L('izle') : ''}`;

    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'preview-favorite-button';
    favoriteButton.innerHTML = '<i class="fa-solid fa-plus"></i>';

    const infoButton = document.createElement('button');
    infoButton.className = 'preview-info-button';
    infoButton.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';

    const volumeButton = document.createElement('button');
    volumeButton.className = 'preview-volume-button';

    buttonsContainer.append(matchButton, playButton, favoriteButton, infoButton, volumeButton);

    playButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const itemId = modal.dataset.itemId;
    if (!itemId) {
      alert("Oynatma başarısız: itemId bulunamadı");
      return;
    }
    closeVideoModal();
    try {
      await playNow(itemId);
    } catch (error) {
      console.error("Oynatma hatası:", error);
      alert("Oynatma başarısız: " + error.message);
    } finally {
      closeVideoModal();
    }
  });

    favoriteButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      const itemId = modal.dataset.itemId;
      if (!itemId) return;

      try {
        const isFavorite = favoriteButton.classList.contains('favorited');
        await updateFavoriteStatus(itemId, !isFavorite);

        favoriteButton.classList.toggle('favorited', !isFavorite);
        favoriteButton.innerHTML = isFavorite
          ? '<i class="fa-solid fa-plus"></i>'
          : '<i class="fa-solid fa-check"></i>';
        const slide = document.querySelector(`.slide[data-item-id="${itemId}"]`);
        if (slide) {
          const item = await fetchItemDetails(itemId);
          const isFavorite = item.UserData?.IsFavorite || false;
          const isPlayed = item.UserData?.Played || false;
          slide.dataset.favorite = isFavorite.toString();
          slide.dataset.played = isPlayed.toString();
        }
      } catch (error) {
        console.error("Favori durumu güncelleme hatası:", error);
      }
    });

    infoButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = modal.dataset.itemId;
      if (!itemId) return;
      if (window.showItemDetailsPage) {
        window.showItemDetailsPage(itemId);
      } else {
        const dialog = document.querySelector('.dialogContainer');
        if (dialog) {
          const event = new CustomEvent('showItemDetails', {
            detail: { Id: itemId }
          });
          document.dispatchEvent(event);
        } else {
          goToDetailsPage(itemId);
        }
      }
    });

    volumeButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      const trailerIframe = videoModal?.querySelector?.('.preview-trailer-iframe');
      const trailerVisible = trailerIframe && trailerIframe.style.display !== 'none';

      if (trailerVisible) {
        console.log('YouTube fragman ses kontrolü');
        try {
          const player = _ytPlayers.get(trailerIframe);
          if (!player || typeof player.getVolume !== 'function') {
            console.log('Player hazır değil veya fonksiyonları yok, manuel ses kontrolü');
            toggleYouTubeVolumeManual(trailerIframe, volumeButton);
            return;
          }

          try {
            const volume = player.getVolume();
            const isMuted = volume === 0 || (typeof player.isMuted === 'function' ? player.isMuted() : false);
            if (isMuted || volume === 0) {
              if (typeof player.unMute === 'function') player.unMute();
              if (typeof player.setVolume === 'function') player.setVolume(100);
              volumeButton.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
              console.log('Ses açıldı');
            } else {
              if (typeof player.mute === 'function') player.mute();
              volumeButton.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
              console.log('Ses kapatıldı');
            }
          } catch (error) {
            console.error('Player ses kontrol hatası:', error);
            toggleYouTubeVolumeManual(trailerIframe, volumeButton);
          }

        } catch (error) {
          console.error('YouTube ses kontrolü hatası:', error);
          toggleYouTubeVolumeManual(trailerIframe, volumeButton);
        }
        return;
      }

      if (modalVideo) {
        modalVideo.muted = !modalVideo.muted;
        modalVideo.volume = modalVideo.muted ? 0 : 1.0;
        volumeButton.innerHTML = modalVideo.muted
          ? '<i class="fa-solid fa-volume-xmark"></i>'
          : '<i class="fa-solid fa-volume-high"></i>';
      }
    });

    [playButton, favoriteButton, infoButton, volumeButton, matchButton].forEach(button => {
      button.addEventListener('mouseenter', () => button.style.transform = 'scale(1.11)');
      button.addEventListener('mouseleave', () => button.style.transform = '');
    });

    modal.addEventListener('mouseenter', () => { modalHoverState = true; clearTimeout(modalHideTimeout); });
    modal.addEventListener('mouseleave', () => { modalHoverState = false; modalHideTimeout = setTimeout(closeVideoModal, 50); });

    modal.addEventListener('click', (e) => {
      setGlobalSound(!_soundOn);
      if (e.target === modal || e.target.classList.contains('video-container')) {
        const trailerIframe = modal.querySelector('.preview-trailer-iframe');
        const trailerVisible = trailerIframe && trailerIframe.style.display !== 'none';

        if (trailerVisible) {
          if (volumeButton) {
            volumeButton.click();
          }
        } else if (modalVideo) {
          modalVideo.muted = !modalVideo.muted;
          modalVideo.volume = modalVideo.muted ? 0 : 1.0;
          if (volumeButton) {
            volumeButton.innerHTML = modalVideo.muted
              ? '<i class="fa-solid fa-volume-xmark"></i>'
              : '<i class="fa-solid fa-volume-high"></i>';
          }
        }
      }
    });

    videoContainer.appendChild(video);
    modal.appendChild(videoContainer);
    modal.setBackdrop = function(url) {
  try {
    if (!url) return;
    backdropImg.src = url;
    backdropImg.style.opacity = '1';;
  } catch {}
};

modal.hideBackdrop = function() {
  try { backdropImg.style.opacity = '0'; } catch {}
};
    if (showButtons) modal.appendChild(buttonsContainer);
    modal.appendChild(infoContainer);

    modal.initHlsPlayer = async function(url) {
    if (video._hls) {
    video._hls.destroy();
    delete video._hls;
  }
    video.pause();
    video.src = '';
    video.load();
    video.style.opacity = '0';
    video.style.transition = 'opacity 0.3s ease-in-out';
    hideTrailerIframe();
    video.style.display = 'block';
    if (showButtons) {
      modal.appendChild(buttonsContainer);
    }
      await sleep(150);

      if (Hls.isSupported() && url.includes('.m3u8')) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          startLevel: -1,
          abrEwmaDefaultEstimate: 500000,
          abrBandWidthFactor: 0.95,
          abrBandWidthUpFactor: 0.7,
          abrEwmaSlowVoD: 5000
        });

        hls.loadSource(url);
        hls.attachMedia(video);
        const startAt = 10 * 60;
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          hls.startLoad(startAt);
          Promise.resolve(video.play()).catch(e => {
            if (e.name !== 'AbortError') console.warn('Video oynatma hatası:', e);
          });
        });
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setTimeout(() => startVideoPlayback(url), 150);
                break;
            }
          }
          else if (data.details === Hls.ErrorDetails.BUFFER_APPEND_ERROR) {
            hls.recoverMediaError();
          }
        });
        video._hls = hls;
      } else {
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
          video.currentTime = 10 * 60;
          Promise.resolve(video.play()).catch(e => {
            if (e.name !== 'AbortError') console.warn('Video oynatma hatası:', e);
          });
        }, { once: true });
      }
    };

    modal.cleanupHls = function() {
      if (video && video._hls) {
        video._hls.destroy();
        delete video._hls;
      }
      hideTrailerIframe();
    };

    document.body.appendChild(modal);
    videoModal = modal;
    modalVideo = video;
    if (typeof bindModalEvents === "function") bindModalEvents(modal);

    return {
      modal,
      video,
      title,
      meta,
      genres,
      matchButton,
      playButton,
      favoriteButton,
      infoButton,
      volumeButton,
      episodeLine,
      buttonsContainer
    };
  }
}

function positionModalRelativeToDot(modal, dot) {
  const dotRect = dot.getBoundingClientRect();
  const modalWidth = 400;
  const modalHeight = 320;
  const windowPadding = 20;
  const edgeThreshold = 100;
  const verticalOffset = -10;

  let left = dotRect.left + window.scrollX + (dotRect.width - modalWidth) / 2;
  let top = dotRect.top + window.scrollY - modalHeight + verticalOffset;

  if (dotRect.right > window.innerWidth - edgeThreshold) {
    left = window.innerWidth - modalWidth - windowPadding;
  }

  else if (dotRect.left < edgeThreshold) {
    left = windowPadding;
  }

  if (top < windowPadding) {
    top = dotRect.bottom + window.scrollY + 15;

    if (top + modalHeight > window.innerHeight + window.scrollY - windowPadding) {
      top = dotRect.top + window.scrollY - modalHeight + verticalOffset;
    }
  }

  left = Math.max(windowPadding, Math.min(left, window.innerWidth - modalWidth - windowPadding));
  top = Math.max(windowPadding, Math.min(top, window.innerHeight + window.scrollY - modalHeight - windowPadding));

  modal.style.left = `${left}px`;
  modal.style.top = `${top}px`;
}

function softStopPlayback() {
  try {
    const iframe = videoModal?.querySelector?.('.preview-trailer-iframe');
    if (iframe) {
      const p = _ytPlayers.get(iframe);
      try {
        if (p?.pauseVideo) p.pauseVideo();
        if (p?.mute) p.mute();
      } catch {}
    }
    if (modalVideo) {
      try { modalVideo.pause(); } catch {}
      modalVideo.muted = true;
      modalVideo.volume = 0;
    }
  } catch {}
}

function startModalHideTimer() {
  clearTimeout(modalHideTimeout);
  modalHideTimeout = setTimeout(() => {
    if (shouldHideModal() && videoModal) {
      _isModalClosing = true;
      _modalClosingUntil = Date.now() + MODAL_ANIM.closeMs + HARD_CLOSE_BUFFER_MS;

      videoModal.style.transition =
        `opacity ${MODAL_ANIM.closeMs}ms ${MODAL_ANIM.ease}, ` +
        `transform ${MODAL_ANIM.closeMs}ms ${MODAL_ANIM.ease}`;
      videoModal.style.opacity = String(MODAL_ANIM.opacityFrom);
      videoModal.style.transform = `scale(${MODAL_ANIM.scaleFrom})`;
      softStopPlayback();

      setTimeout(() => {
        if (shouldHideModal() && videoModal) {
          hardStopPlayback();
          resetModalInfo(videoModal);
          resetModalButtons();
          _lastModalHideAt = Date.now();
          _isModalClosing = false;
          clearTransientOverlays(videoModal);
          videoModal.style.display = 'none';
        }
      }, MODAL_ANIM.closeMs);
    }
  }, 150);
}


export async function calculateMatchPercentage(userData = {}, item = {}) {
  let score = 50;

  if (typeof userData.PlayedPercentage === 'number') {
    if (userData.PlayedPercentage > 90) score += 15;
    else if (userData.PlayedPercentage > 50) score += 5;
    else if (userData.PlayedPercentage > 20) score += 2;
  }

  if (typeof item.CommunityRating === 'number') {
    if (item.CommunityRating >= 8.5) score += 30;
    else if (item.CommunityRating >= 7.5) score += 24;
    else if (item.CommunityRating >= 6.5) score += 8;
  }

  const userTopGenres = await getCachedUserTopGenres(5);
  const itemGenres = item.Genres || [];
  const genreMatches = itemGenres.filter(itemGenre =>
    userTopGenres.includes(itemGenre)
  );

  if (genreMatches.length > 0) {
    if (genreMatches.length === 1) score += 5;
    else if (genreMatches.length === 2) score += 10;
    else if (genreMatches.length >= 3) score += 15;
  }

  const currentYear = new Date().getFullYear();
  if (item.ProductionYear && currentYear - item.ProductionYear <= 5) {
    score += 4;
  }

  const familyFriendlyRatings = ["G", "PG", "TV-G", "TV-PG"];
  if (familyFriendlyRatings.includes(item.OfficialRating)) {
    score += 3;
  }

  if (userData.Played) {
    score -= 5;
  }

  return Math.max(0, Math.min(Math.round(score), 100));
}
window.addEventListener("blur", closeVideoModal);
document.addEventListener("visibilitychange", handleVisibilityChange);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', destroyVideoModal);
  window.addEventListener('pagehide', destroyVideoModal);
}

async function preloadGenreData(itemIds) {
  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) return;

  const genreMap = new Map();

  await Promise.all(
    itemIds.map(async (itemId) => {
      try {
        const item = await fetchItemDetails(itemId);
        if (item && Array.isArray(item.Genres)) {
          genreMap.set(itemId, item.Genres);
        }
      } catch (err) {
      }
    })
  );
}

async function updateModalContent(item, videoUrl) {
  if (videoModal?.dataset?.itemId && item?.Id && String(item.Id) !== String(videoModal.dataset.itemId)) {
    return;
  }
  const config = getConfig();
  clearTransientOverlays(videoModal);
  if (modalVideo && modalVideo._hls) {
    modalVideo._hls.destroy();
    delete modalVideo._hls;
  }

  const onlyTrailer = !!config.onlyTrailerInPreviewModal;
  const preferTrailer = !!config.preferTrailersInPreviewModal;
  const trailerInfo = await resolveTrailerUrlFor(item);
  const trailerUrl = trailerInfo.url;
  const isLocal = trailerInfo.level === 'local';
  const isYTValid = !!trailerUrl && (trailerInfo.level === 'item' || trailerInfo.level === 'series');

  let noTrailerDiv = videoModal.querySelector('.no-trailer-message');
  if (noTrailerDiv) noTrailerDiv.remove();

  if (onlyTrailer) {
    if (isLocal) {
      hideTrailerIframe();
      if (modalVideo) { modalVideo.style.display = 'block'; }
      if (await gatePlaybackStart(item?.Id)) {
      videoModal.initHlsPlayer(trailerUrl);
  }
      addTrailerTip(videoModal, config.languageLabels?.yerelFragman || 'Yerel fragman');
    } else if (isYTValid) {
      hideTrailerIframe();
      if (modalVideo) { modalVideo.style.display = 'none'; modalVideo.src = ''; }
      const iframe = getOrCreateTrailerIframe();
      iframe.src = trailerUrl;
      iframe.style.display = 'block';
      applyVolumePreference();
      ensureYTAPI().then(() => getYTPlayerForIframe(iframe));
      addTrailerTip(videoModal, trailerInfo.level === 'series'
        ? (config.languageLabels?.diziFragmani || 'Dizi fragmanı')
        : (config.languageLabels?.fragman || 'Fragman'));
    } else {
      hideTrailerIframe();
      if (modalVideo) { modalVideo.style.display = 'none'; modalVideo.src = ''; }
      showNoTrailerMessage(videoModal, config.languageLabels?.trailerNotAvailable || 'Fragman bulunamadı');
    }
  }
  else if (preferTrailer) {
    if (isLocal) {
      hideTrailerIframe();
      if (modalVideo) { modalVideo.style.display = 'block'; }
      if (await gatePlaybackStart(item?.Id)) {
      videoModal.initHlsPlayer(trailerUrl);
    }
      addTrailerTip(videoModal, config.languageLabels?.yerelFragman || 'Yerel fragman');
    } else if (isYTValid) {
      if (modalVideo) {
        try { modalVideo.pause(); } catch {}
        modalVideo.style.opacity = '0';
        modalVideo.style.display = 'none';
        modalVideo.src = '';
      }
      const iframe = getOrCreateTrailerIframe();
      if (iframe) {
        iframe.src = trailerUrl;
        iframe.style.display = 'block';
        const volumeButton = videoModal?.querySelector?.('.preview-volume-button');
        if (volumeButton) volumeButton.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        ensureYTAPI().then(() => { getYTPlayerForIframe(iframe); });
        addTrailerTip(
         videoModal,
         trailerInfo.level === 'series'
           ? (config.languageLabels?.diziFragmani || 'Dizi fragmanı')
           : (config.languageLabels?.fragman || 'Fragman')
       );
      } else if (videoUrl) {
        if (await gatePlaybackStart(item?.Id)) {
        videoModal.initHlsPlayer(videoUrl);
        }
      }
    } else if (videoUrl) {
      if (await gatePlaybackStart(item?.Id)) {
      videoModal.initHlsPlayer(videoUrl);
      }
    } else {
      hideTrailerIframe();
      if (modalVideo) {
        try { modalVideo.pause(); } catch {}
        modalVideo.src = '';
        modalVideo.style.display = 'none';
      }
    }
  }
  else {
    if (videoUrl) {
      if (await gatePlaybackStart(item?.Id)) {
      videoModal.initHlsPlayer(videoUrl);
      }
    } else if (isLocal) {
      hideTrailerIframe();
      if (modalVideo) { modalVideo.style.display = 'block'; }
      if (await gatePlaybackStart(item?.Id)) {
      videoModal.initHlsPlayer(trailerUrl);
      }
      addTrailerTip(videoModal, config.languageLabels?.yerelFragman || 'Yerel fragman');
    } else if (isYTValid) {
      const iframe = getOrCreateTrailerIframe();
      if (await gatePlaybackStart(item?.Id)) {
      iframe.src = trailerUrl;
      iframe.style.display = 'block';
      ensureYTAPI().then(() => getYTPlayerForIframe(iframe));
    }
      addTrailerTip(videoModal, trailerInfo.level === 'series'
        ? (config.languageLabels?.diziFragmani || 'Dizi fragmanı')
        : (config.languageLabels?.fragman || 'Fragman'));
    } else {
      hideTrailerIframe();
      if (modalVideo) {
        try { modalVideo.pause(); } catch {}
        modalVideo.src = '';
        modalVideo.style.display = 'none';
      }
    }
  }

  if (item?.Type === 'Episode') {
  const seriesTitle =
    item.SeriesName ||
    item.Series?.Name ||
    '';

  if (modalTitle) modalTitle.textContent = seriesTitle || (item.Name || item.Title || '');

  if (modalEpisodeLine) {
    modalEpisodeLine.style.display = 'block';
    modalEpisodeLine.textContent = formatSeasonEpisodeLine(item, config.languageLabels);
  }
} else {
  if (modalTitle) modalTitle.textContent = item.Name || item.Title || '';
  if (modalEpisodeLine) {
    modalEpisodeLine.textContent = '';
    modalEpisodeLine.style.display = 'none';
  }
}

  const positionTicks = Number(item.UserData?.PlaybackPositionTicks || 0);
  const runtimeTicks = Number(item.RunTimeTicks || 0);
  const hasPartialPlayback = positionTicks > 0 && positionTicks < runtimeTicks;
  const isPlayed = item.UserData?.Played || false;
  const isFavorite = item.UserData?.IsFavorite || false;
  const videoStream = item.MediaStreams ? item.MediaStreams.find(s => s.Type === "Video") : null;
  const qualityText = videoStream ? getVideoQualityText(videoStream) : '';

  modalMeta.innerHTML = [
    qualityText,
    item.ProductionYear,
    item.CommunityRating ? parseFloat(item.CommunityRating).toFixed(1) : null,
    runtimeTicks ? `${Math.floor(runtimeTicks / 600000000)} ${config.languageLabels.dk}` : null
  ].filter(Boolean).join(' • ');

  const matchPercentage = await calculateMatchPercentage(item.UserData, item);
  if (modalMatchButton) {
  modalMatchButton.textContent = `${matchPercentage}%`;
}

  modalGenres.innerHTML = '';
    if (item.Genres && item.Genres.length > 0) {
      const limitedGenres = item.Genres.slice(0, 3);
      limitedGenres.forEach((genre, index) => {
        const genreBadge = document.createElement('span');
        genreBadge.className = 'genre-badge';
        genreBadge.textContent = genre.trim();
        modalGenres.appendChild(genreBadge);
        if (index < limitedGenres.length - 1) {
          const separator = document.createElement('span');
          separator.className = 'genre-separator';
          separator.textContent = ' • ';
          separator.style.margin = '0 4px';
          separator.style.color = '#a8aac7';
          modalGenres.appendChild(separator);
        }
      });
    }

  modalPlayButton.innerHTML = `<i class="fa-solid fa-play"></i> ${getPlayButtonText({
    isPlayed,
    hasPartialPlayback,
    labels: config.languageLabels
  })}`;
  modalFavoriteButton.classList.toggle('favorited', isFavorite);
  modalFavoriteButton.innerHTML = isFavorite
    ? '<i class="fa-solid fa-check"></i>'
    : '<i class="fa-solid fa-plus"></i>';
    if (modalButtonsContainer) {
    modalButtonsContainer.style.opacity = '1';
    modalButtonsContainer.style.pointerEvents = 'auto';
  }
  applyVolumePreference();
}

function clearVideoPreloadCache(opts = {}) {
  const { mode = 'all', itemId, test } = opts;
  try {
    switch (mode) {
      case 'expired':
        pruneExpired();
        break;
      case 'overLimit':
        pruneOverLimit();
        break;
      case 'item':
        if (itemId) previewPreloadCache.delete(itemId);
        break;
      case 'predicate':
        if (typeof test === 'function') {
          for (const [id, entry] of previewPreloadCache) {
            if (test(id, entry)) previewPreloadCache.delete(id);
          }
        }
        break;
      case 'all':
      default:
        previewPreloadCache.clear();
        break;
    }
  } catch {}
}

function addTrailerTip(videoModal, text) {
  let tip = videoModal.querySelector('.trailer-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'trailer-tip';
    Object.assign(tip.style, {
      position: 'absolute',
      top: '11px',
      left: '11px',
      fontSize: '11px',
      padding: '3px 8px',
      borderRadius: '6px',
      background: 'rgba(0,0,0,.45)',
      color: '#eee',
      zIndex: '1',
      pointerEvents: 'none'
    });
    videoModal.querySelector('.video-container')?.appendChild(tip);
  }
  tip.textContent = text;
}

function showNoTrailerMessage(videoModal, text) {
  clearTransientOverlays(videoModal);
  let noTrailerDiv = videoModal.querySelector('.no-trailer-message');
  if (!noTrailerDiv) {
    noTrailerDiv = document.createElement('div');
    noTrailerDiv.className = 'no-trailer-message';
    noTrailerDiv.innerHTML = `
      <i class="fa-solid fa-circle-exclamation" style="margin-right:8px;color:#f66;"></i>
      ${text}
    `;
    Object.assign(noTrailerDiv.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#ccc',
      fontSize: '18px',
      fontWeight: '500',
      textAlign: 'center',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    videoModal.querySelector('.video-container')?.appendChild(noTrailerDiv);
  }
}

function getClosingRemaining() {
  return Math.max(0, _modalClosingUntil - Date.now());
}

function animatedShow(modal) {
  if (!modal) return;
  modal.style.display = 'block';
  modal.style.transition = 'none';
  modal.style.opacity = String(MODAL_ANIM.opacityFrom);
  modal.style.transform = `scale(${MODAL_ANIM.scaleFrom})`;

  requestAnimationFrame(() => {
    modal.style.transition =
      `opacity ${MODAL_ANIM.openMs}ms ${MODAL_ANIM.ease}, ` +
      `transform ${MODAL_ANIM.openMs}ms ${MODAL_ANIM.ease}`;
    modal.style.opacity = String(MODAL_ANIM.opacityTo);
    modal.style.transform = `scale(${MODAL_ANIM.scaleTo})`;
  });
}

function prepareForNextOpen(modal) {
  if (!modal) return;
  modal.style.transform = 'scale(0.7)';
}

function scheduleOpenForItem(itemEl, itemId, signal, openFn) {
  if (_hoverOpenTimer) {
    clearTimeout(_hoverOpenTimer);
    _hoverOpenTimer = null;
  }
  _currentHoverItemId = itemId;
  _lastItemEnterAt = Date.now();

  const sinceHide = Date.now() - _lastModalHideAt;
  const needCooldown = Math.max(0, REOPEN_COOLDOWN_MS - sinceHide);
  const settleLeft = Math.max(0, CROSS_ITEM_SETTLE_MS);
  const closingLeft = getClosingRemaining();

  let delay = Math.max(OPEN_HOVER_DELAY_MS, needCooldown, settleLeft, closingLeft);

  const run = async () => {
    const stillClosing = getClosingRemaining();
    if (stillClosing > 0) {
      _hoverOpenTimer = setTimeout(run, stillClosing);
      return;
    }
    if (_currentHoverItemId !== itemId || signal?.aborted) return;
    await openFn();
  };

  _hoverOpenTimer = setTimeout(run, delay);
}

export function setupHoverForAllItems() {
  if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) return;
  if (!config || config.previewModal === false) return;
  if (typeof config !== 'undefined' && config.allPreviewModal !== false) {
    const items = document.querySelectorAll('.cardImageContainer');
    items.forEach(item => {
    item.addEventListener('mouseenter', async () => {
      isMouseInItem = true;
      clearTimeout(modalHideTimeout);

      if (itemHoverAbortController) itemHoverAbortController.abort();
      itemHoverAbortController = new AbortController();
      const { signal } = itemHoverAbortController;

      const itemId =
        item.dataset.itemId ||
        item.dataset.id ||
        (item.closest('[data-id]') && item.closest('[data-id]').dataset.id);
      if (!itemId) return;

      scheduleOpenForItem(item, itemId, signal, async () => {
  if (!isMouseInItem && !isMouseInModal) return;
  try {
    if (videoModal) {
      hardStopPlayback();
      resetModalInfo(videoModal);
      resetModalButtons();
      videoModal.style.display = 'none';
    }

    const itemDetails = await fetchItemDetails(itemId, { signal });
    if (signal.aborted || !itemDetails) {
      closeVideoModal();
      return;
    }

    if (itemDetails.Genres && itemDetails.Genres.length > 3) {
      itemDetails.Genres = itemDetails.Genres.slice(0, 3);
    }

    const videoTypes = ['Movie', 'Episode', 'Series', 'Season'];
    if (!videoTypes.includes(itemDetails.Type)) {
      closeVideoModal();
      return;
    }

    if (!videoModal || !document.body.contains(videoModal)) {
      const modalElements = createVideoModal({ showButtons: true });
      if (!modalElements) return;
      videoModal = modalElements.modal;
      modalVideo = modalElements.video;
      modalTitle = modalElements.title;
      modalMeta = modalElements.meta;
      modalMatchInfo = modalElements.matchInfo;
      modalGenres = modalElements.genres;
      modalPlayButton = modalElements.playButton;
      modalFavoriteButton = modalElements.favoriteButton;
      modalEpisodeLine = modalElements.episodeLine;
      modalMatchButton = modalElements.matchButton;
      bindModalEvents(videoModal);
    }

    let domBackdrop = null;
    domBackdrop = item.dataset?.background || item.dataset?.backdrop || null;

    const itemBackdrop = getBackdropFromItem(itemDetails);
    videoModal.setBackdrop(domBackdrop || itemBackdrop || null);

    if (!isMouseInItem && !isMouseInModal) return;

    videoModal.dataset.itemId = itemId;
    positionModalRelativeToItem(videoModal, item);
    animatedShow(videoModal);
    applyVolumePreference();

    let videoUrl = null;
    try { videoUrl = await preloadVideoPreview(itemId); } catch {}
    if (signal.aborted || videoModal?.dataset?.itemId !== String(itemId)) return;

    await updateModalContent(itemDetails, videoUrl);

  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Öğe hover hatası:', error);
      if (videoModal) videoModal.style.display = 'none';
      }
    }
  });
});

    item.addEventListener('mouseleave', (e) => {
    isMouseInItem = false;
    const goingToModal = !!(e.relatedTarget && videoModal && videoModal.contains(e.relatedTarget));
    if (goingToModal) {
      return;
      }
        if (_hoverOpenTimer) { clearTimeout(_hoverOpenTimer); _hoverOpenTimer = null; }
        if (itemHoverAbortController) itemHoverAbortController.abort();
        startModalHideTimer();
        });
    });
  }
}

  function bindModalEvents(modal) {
    modal.addEventListener('mouseenter', () => {
      isMouseInModal = true;
      clearTimeout(modalHideTimeout);
    });
    modal.addEventListener('mouseleave', (e) => {
      isMouseInModal = false;
      if (e.relatedTarget && e.relatedTarget.classList && e.relatedTarget.classList.contains('cardImageContainer')) {
        return;
      }
      startModalHideTimer();
    });
  }

function positionModalRelativeToItem(modal, item, options = {}) {
  const defaults = {
    modalWidth: 400,
    modalHeight: 320,
    windowPadding: 16,
    animationDuration: 400,
    openAnimation: 'cubic-bezier(.33,1.3,.7,1)',
    openTransform: 'scale(1)',
    openOpacity: '1',
    closedTransform: 'scale(0.7)',
    closedOpacity: '1',
    preferredPosition: 'center',
    autoReposition: true
  };

  const settings = {...defaults, ...options};
  const modalStyle = modal.style;
  const positionModal = () => {
    const itemRect = item.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = itemRect.left + scrollX + (itemRect.width - settings.modalWidth) / 2;
    let top = itemRect.top + scrollY + (itemRect.height - settings.modalHeight) / 2;
    switch(settings.preferredPosition) {
      case 'top':
        top = itemRect.top + scrollY - settings.modalHeight - 10;
        break;
      case 'bottom':
        top = itemRect.bottom + scrollY + 10;
        break;
      case 'left':
        left = itemRect.left + scrollX - settings.modalWidth - 10;
        break;
      case 'right':
        left = itemRect.right + scrollX + 10;
        break;
    }
    const maxLeft = viewportWidth + scrollX - settings.modalWidth - settings.windowPadding;
    const maxTop = viewportHeight + scrollY - settings.modalHeight - settings.windowPadding;

    left = Math.max(settings.windowPadding, Math.min(left, maxLeft));
    top = Math.max(settings.windowPadding, Math.min(top, maxTop));
    modalStyle.position = 'absolute';
    modalStyle.width = `${settings.modalWidth}px`;
    modalStyle.height = `${settings.modalHeight}px`;
    modalStyle.left = `${left}px`;
    modalStyle.top = `${top}px`;
    modalStyle.transformOrigin = 'center center';
  };
  const animateModal = () => {
    modalStyle.transition = 'none';
    modalStyle.opacity = settings.closedOpacity;
    modalStyle.transform = settings.closedTransform;

    requestAnimationFrame(() => {
      modalStyle.transition = `opacity ${settings.animationDuration}ms ${settings.openAnimation},
                              transform ${settings.animationDuration}ms ${settings.openAnimation}`;
      modalStyle.opacity = settings.openOpacity;
      modalStyle.transform = settings.openTransform;
    });
  };
  positionModal();
  animateModal();
  if (settings.autoReposition) {
    window.addEventListener('resize', positionModal);
    return () => {
      window.removeEventListener('resize', positionModal);
    };
  }
}

function formatSeasonEpisodeLine(ep) {
    const sWord = L('season', 'Season');
    const eWord = L('episode', 'Episode');
    const sNum  = ep?.ParentIndexNumber;
    const eNum  = ep?.IndexNumber;
    const eTitle = ep?.Name ? ` – ${ep.Name}` : '';
    const numberFirst = new Set(['tur']);

    let left = '', right = '';
    if (numberFirst.has(currentLang)) {
        if (sNum != null) left = `${sNum}. ${sWord}`;
        if (eNum != null) right = `${eNum}. ${eWord}`;
    } else {
        if (sNum != null) left = `${sWord} ${sNum}`;
        if (eNum != null) right = `${eWord} ${eNum}`;
    }
    const mid = left && right ? ' • ' : '';
    return `${left}${mid}${right}${eTitle}`.trim();
}

function getPlayButtonText({ isPlayed, hasPartialPlayback, labels }) {
  if (isPlayed && !hasPartialPlayback) return L('izlendi', 'İzlendi');
  if (hasPartialPlayback) return L('devamet', 'Devam et');
  return L('izle', 'İzle');
}

function startCacheMaintenance() {
  if (_cacheMaintenanceStarted) return;
  _cacheMaintenanceStarted = true;

  setInterval(() => clearVideoPreloadCache({ mode: 'expired' }), 60_000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) clearVideoPreloadCache({ mode: 'expired' });
  });
}

startCacheMaintenance();

 function clearTransientOverlays(modal = videoModal) {
   try {
     const vc = modal?.querySelector?.('.video-container');
     if (!vc) return;
     vc.querySelectorAll('.trailer-tip, .no-trailer-message').forEach(n => n.remove());
   } catch {}
 }

 function resetModalButtons() {
  try {
    if (modalButtonsContainer) {
      modalButtonsContainer.style.opacity = '0';
      modalButtonsContainer.style.pointerEvents = 'none';
    }
    if (modalPlayButton) {
      modalPlayButton.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
    if (modalFavoriteButton) {
      modalFavoriteButton.classList.remove('favorited');
      modalFavoriteButton.innerHTML = '<i class="fa-solid fa-plus"></i>';
    }
    const vb = videoModal?.querySelector?.('.preview-volume-button');
    if (vb) vb.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    applyVolumePreference();
  } catch {}
}

function resetModalInfo(modal = videoModal) {
  try {
    if (!modal) return;
    if (modalTitle) modalTitle.textContent = '';
    if (modalEpisodeLine) { modalEpisodeLine.textContent = ''; modalEpisodeLine.style.display = 'none'; }
    if (modalMeta) modalMeta.textContent = '';
    if (modalMatchInfo) modalMatchInfo.textContent = '';
    if (modalGenres) modalGenres.innerHTML = '';
    if (modal?.dataset) modal.dataset.itemId = '';
  } catch {}
}

window.addEventListener("beforeunload", () => {
  destroyVideoModal();
  clearVideoPreloadCache({ mode: 'all' });
});
function getBackdropFromDot(dot) {
  const img = dot?.querySelector?.('.dot-poster-image');
  if (img?.src) return img.src;
  const slideEl = document.querySelector(`.slide[data-item-id="${dot?.dataset?.itemId}"]`);
  if (slideEl) {
    return slideEl.dataset.background || slideEl.dataset.backdrop || slideEl.dataset.primaryimage || null;
  }
  return null;
}

function getBackdropFromItem(item) {
  if (item?.BackdropImageTags?.length) {
    const tag = item.BackdropImageTags[0];
    return `/Items/${item.Id}/Images/Backdrop?tag=${tag}`;
  }
  if (item?.ImageTags?.Primary) {
    const tag = item.ImageTags.Primary;
    return `/Items/${item.Id}/Images/Primary?tag=${tag}`;
  }
  return null;
}
