import { stopSlideTimer, startSlideTimer, SLIDE_DURATION, clearAllTimers } from "./timer.js";
import { resetProgressBar } from "./progressBar.js";
import { getConfig } from './config.js';
import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';
import { getCurrentIndex, setCurrentIndex, setRemainingTime } from "./sliderState.js";
import { applyContainerStyles } from "./positionUtils.js";
import { playNow, fetchItemDetails, getCachedUserTopGenres, getGenresForDot, goToDetailsPage } from "./api.js";
import { applySlideAnimation, applyDotPosterAnimation } from "./animations.js";
import { getVideoQualityText } from "./containerUtils.js";
import { previewPreloadCache } from "./hoverTrailerModal.js";
import { attachMiniPosterHover, openMiniPopoverFor } from "./studioHubsUtils.js";
import { modalState, set, get, resetModalRefs } from './modalState.js';
import {
  createVideoModal,
  destroyVideoModal,
  animatedShow,
  closeVideoModal,
  modalIsVisible,
  preloadVideoPreview,
  updateModalContent,
  positionModalRelativeToItem,
  applyVolumePreference,
  ensureOverlaysClosed,
  getBackdropFromItem,
  calculateMatchPercentage,
  openPreviewModalForItem,
  setModalAnimation,
  getPlayButtonText,
  PREVIEW_MAX_ENTRIES,
  startModalHideTimer,
  getClosingRemaining,
  bindModalEvents,
  hardStopPlayback,
  resetModalInfo,
  resetModalButtons,
  scheduleOpenForItem
} from './hoverTrailerModal.js';


const IS_TOUCH = (typeof window !== 'undefined') && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
const config = getConfig();
const currentLang = config.defaultLanguage || getDefaultLanguage();
if (!config.languageLabels) {
  config.languageLabels = getLanguageLabels(currentLang) || {};
}

if (typeof document !== 'undefined' && (document.hidden || document.visibilityState === 'hidden')) {
  closeVideoModal();
}

function L(key, fallback = '') {
  try { return (getConfig()?.languageLabels?.[key]) ?? fallback; }
  catch { return fallback; }
}
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
function hardResetProgressBarEl() {
  const pb = document.querySelector(".slide-progress-bar");
  if (!pb) return;
  pb.style.transition = "none";
  pb.style.animation  = "none";
  pb.style.width      = "0%";
  void pb.offsetWidth;
  pb.style.transition = "";
  pb.style.animation  = "";
}

function getBackdropFromDot(dot) {
  const img = dot?.querySelector?.('.dot-poster-image');
  if (img?.src) return img.src;
  const slideEl = document.querySelector(`.slide[data-item-id="${dot?.dataset?.itemId}"]`);
  if (slideEl) {
    return slideEl.dataset.background || slideEl.dataset.backdrop || slideEl.dataset.primaryimage || null;
  }
  return null;
}

export function changeSlide(direction) {
  const slides = document.querySelectorAll(".slide");
  if (!slides.length) return;

  clearAllTimers();
  stopSlideTimer();
  const currentIndex = getCurrentIndex();
  const newIndex = (currentIndex + direction + slides.length) % slides.length;
  setCurrentIndex(newIndex);
  displaySlide(newIndex);
  hardResetProgressBarEl();
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
      if (wasActive !== isActive) applyDotPosterAnimation(dot, isActive);
    }
  });

  if (config.dotPosterMode) centerActiveDot({ smooth: true, force: true });
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
      modalState.isMouseInItem = true;
      clearTimeout(modalState.modalHideTimeout);
      modalState.modalHoverState = true;
      if (dot.abortController) dot.abortController.abort();
      dot.abortController = new AbortController();
      const { signal } = dot.abortController;
      const itemId = dot.dataset.itemId;
      if (!itemId) return;
      scheduleOpenForItem(dot, itemId, signal, async () => {
      if (!modalState.isMouseInItem && !isMouseInModal) return;
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
        if (modalState.videoModal) modalState.videoModal.style.display = 'none';
      }
    }
  });
});
      dot.addEventListener("mouseleave", () => {
      modalState.isMouseInItem = false;

      if (dot.abortController) {
      dot.abortController.abort();
      dot.abortController = null;
    }

      if (modalState._hoverOpenTimer) {
      clearTimeout(modalState._hoverOpenTimer);
      modalState._hoverOpenTimer = null;
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

async function openModalForDot(dot, itemId, signal) {
  const cfg = getConfig();
  if (!cfg || cfg.previewModal === false) return
  if (modalState.videoModal) {
    hardStopPlayback();
    resetModalInfo(modalState.videoModal);
    resetModalButtons();
    if (modalState._modalContext !== 'dot') {
      destroyVideoModal();
    } else {
      modalState.videoModal.style.display = 'none';
    }
  }

  const item = await fetchItemDetails(itemId, { signal });
  if (signal?.aborted) return;
  if (!modalState.videoModal || !document.body.contains(modalState.videoModal)) {
    const modalElements = createVideoModal({ showButtons: true, context: 'dot' });
    if (!modalElements) return;
    modalState.videoModal = modalElements.modal;
    modalState.modalVideo = modalElements.video;
    modalState.modalTitle = modalElements.title;
    modalState.modalMeta = modalElements.meta;
    modalState.modalMatchInfo = modalElements.matchInfo;
    modalState.modalGenres = modalElements.genres;
    modalState.modalPlayButton = modalElements.playButton;
    modalState.modalFavoriteButton = modalElements.favoriteButton;
    modalState.modalEpisodeLine = modalElements.episodeLine;
    modalState.modalMatchButton = modalElements.matchButton;
    bindModalEvents(modalState.videoModal);
  }

  const domUrl = getBackdropFromDot(dot);
  const itemUrl = getBackdropFromItem(item);
  modalState.videoModal.setBackdrop(domUrl || itemUrl || null);

  modalState.videoModal.dataset.itemId = itemId;
  positionModalRelativeToDot(modalState.videoModal, dot);
  if (modalState.videoModal.style.display !== 'block') {
    animatedShow(modalState.videoModal);
  } else {
    modalState.videoModal.style.display = 'block';
  }
  applyVolumePreference();

  const videoUrl = await preloadVideoPreview(itemId);
  if (signal?.aborted) return;
  await updateModalContent(item, videoUrl);
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

export function positionModalRelativeToDot(modal, dot) {
  const dotRect = dot.getBoundingClientRect();
  const modalWidth = 400;
  const modalHeight = 330;
  const windowPadding = 20;
  const edgeThreshold = 100;
  const verticalOffset = -10;

  let left = dotRect.left + window.scrollX + (dotRect.width - modalWidth) / 2;
  let top = dotRect.top + window.scrollY - modalHeight + verticalOffset;

  if (dotRect.right > window.innerWidth - edgeThreshold) {
    left = window.innerWidth - modalWidth - windowPadding;
  } else if (dotRect.left < edgeThreshold) {
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
