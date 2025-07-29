import { stopSlideTimer, startSlideTimer } from "./timer.js";
import { SLIDE_DURATION } from "./timer.js";
import { getConfig } from './config.js';
import { resetProgressBar } from "./progressBar.js";
import { getCurrentIndex, setCurrentIndex, setRemainingTime } from "./sliderState.js";
import { applyContainerStyles } from "./positionUtils.js"
import { playNow, getVideoStreamUrl, fetchItemDetails, updateFavoriteStatus, getCachedUserTopGenres, getGenresForDot } from "./api.js";
import { applySlideAnimation, applyDotPosterAnimation} from "./animations.js";

const config = getConfig();
const preloadMap = new Map();
const videoPreloadCache = new Map();
const MAX_CACHE_SIZE = 20;

let activePreloadController = null;

let videoModal, modalVideo, modalTitle, modalMeta, modalMatchInfo, modalGenres, modalPlayButton, modalFavoriteButton;
let modalHoverState = false;
let modalHideTimeout;
let modalEventListeners = [];
let dotHideTimeout;
let isMouseInModal = false;

function clearVideoPreloadCache() {
  if (videoPreloadCache.size > MAX_CACHE_SIZE) {
    const keys = Array.from(videoPreloadCache.keys()).slice(0, 5);
    keys.forEach(key => {
      const videoUrl = videoPreloadCache.get(key);
      if (videoUrl && videoUrl.includes('.m3u8')) {
        const hls = videoUrl._hls;
        if (hls) hls.destroy();
      }
      videoPreloadCache.delete(key);
    });
  }
}

function getOptimalPreloadQuality() {
  if (!navigator.connection) return 360;
  const { effectiveType, saveData } = navigator.connection;
  if (saveData || effectiveType.includes('2g')) {
    return 240;
  } else if (effectiveType.includes('3g')) {
    return 480;
  } else if (effectiveType.includes('4g')) {
    return 720;
  }
  return 1080;
}

async function preloadVideoForDot(itemId) {
  if (activePreloadController) {
    activePreloadController.abort();
  }

  const controller = new AbortController();
  activePreloadController = controller;

  try {
    const quality = getOptimalPreloadQuality();
    const videoUrl = await getVideoStreamUrl(itemId, quality, 0, {
      signal: controller.signal
    });
    videoPreloadCache.set(itemId, videoUrl);
    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        lowLatencyMode: true,
        abrEwmaDefaultEstimate: 500000,
        startLevel: -1,
        maxLoadingDelay: 2000,
        maxStarvationDelay: 2000
      });

      hls.loadSource(videoUrl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hls.startLevel = 0;
        hls.nextLevel = 0;
        hls.loading = false;
        hls.stopLoad();
        hls.destroy();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          hls.destroy();
        }
      });
    }

    return videoUrl;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(`Öğe için video ön yüklemesi başarısız oldu${itemId}:`, error);
    }
    return null;
  }
}

export async function preloadVideosForDots(dotElements) {
  if (!dotElements || !Array.isArray(dotElements)) {
    return;
  }

  if (!navigator.onLine) return;
  const dotItemIds = dotElements
    .filter(dot => dot && dot.dataset && dot.dataset.itemId)
    .map(dot => dot.dataset.itemId);

  if (dotItemIds.length === 0) return;
  const currentIndex = getCurrentIndex();
  const priorityIds = [];
  for (let i = 0; i < 3; i++) {
    const idx = (currentIndex + i) % dotElements.length;
    if (dotElements[idx]?.dataset?.itemId) {
      priorityIds.push(dotElements[idx].dataset.itemId);
    }
  }

  await Promise.all(priorityIds.map(id => {
    return preloadVideoForDot(id).catch(e => {
      if (e.name !== 'AbortError') console.error(`Öncelikli önyükleme başarısız oldu ${id}:`, e);
      return null;
    });
  }));

  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      dotItemIds.forEach(async itemId => {
        if (!priorityIds.includes(itemId)) {
          await preloadVideoForDot(itemId).catch(() => {});
        }
      });
    }, { timeout: 2000 });
  } else {
    setTimeout(() => {
      dotItemIds.forEach(async itemId => {
        if (!priorityIds.includes(itemId)) {
          await preloadVideoForDot(itemId).catch(() => {});
        }
      });
    }, 1000);
  }
}

if (navigator.connection) {
  navigator.connection.addEventListener('change', () => {
    const { effectiveType, downlink, saveData } = navigator.connection;
    if (effectiveType.includes('2g') || saveData || downlink < 1) {
      clearVideoPreloadCache();
    }
    if (effectiveType.includes('4g') && downlink > 2) {
      const dots = document.querySelectorAll('.dot');
      const currentIndex = getCurrentIndex();
      const activeDot = dots[currentIndex];
      if (activeDot) {
        preloadVideoForDot(activeDot.dataset.itemId).catch(() => {});
      }
    }
  });
}

setInterval(clearVideoPreloadCache, 2 * 60 * 1000);


function setupDotHoverEvents(dot) {
  let hoverTimeout;
  let videoLoadTimeout;

  dot.addEventListener("mouseenter", async () => {
    clearTimeout(hoverTimeout);
    clearTimeout(videoLoadTimeout);

    if (dot.abortController) {
      dot.abortController.abort();
    }
    dot.abortController = new AbortController();
    if (videoModal && videoModal.dataset.itemId === dot.dataset.itemId) {
      return;
    }
    if (!videoModal) {
      const modalElements = createVideoModal();
      videoModal = modalElements.modal;
      modalVideo = modalElements.video;
      modalTitle = modalElements.title;
      modalMeta = modalElements.meta;
      modalMatchInfo = modalElements.matchInfo;
      modalGenres = modalElements.genres;
      modalPlayButton = modalElements.playButton;
      modalFavoriteButton = modalElements.favoriteButton;
      videoModal.addEventListener('mouseenter', () => {
        isMouseInModal = true;
        clearTimeout(modalHideTimeout);
      });
      videoModal.addEventListener('mouseleave', () => {
        isMouseInModal = false;
        startModalHideTimer(videoModal);
      });
    }

    videoModal.style.display = 'block';
    videoModal.style.opacity = '0';

    const itemId = dot.dataset.itemId;
    if (!itemId) return;

    hoverTimeout = setTimeout(async () => {
      try {
        const signal = dot.abortController.signal;
        let videoUrl = videoPreloadCache.get(itemId);
        if (!videoUrl) {
          videoUrl = await getVideoStreamUrl(itemId, 240, 0, { signal });
          videoPreloadCache.set(itemId, videoUrl);
        }
        positionModalRelativeToDot(videoModal, dot);
        videoModal.initHlsPlayer(videoUrl);
        videoModal.style.opacity = '1';
        videoModal.style.transform = 'translateY(0)';
        videoLoadTimeout = setTimeout(async () => {
          try {
            const hdUrl = await getVideoStreamUrl(itemId, 720, 0, { signal });
            if (videoModal.dataset.itemId === itemId) {
              videoModal.initHlsPlayer(hdUrl);
            }
          } catch (hdError) {
            console.error('HD video yüklemesi başarısız oldu, SD oynatılacak:', hdError);
          }
        }, 1000);

        const item = await fetchItemDetails(itemId, { signal });
        updateModalContent(item, videoUrl);

      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Nokta navigsasyon hover hatası:", error);
          videoModal.style.display = 'none';
        }
      }
    }, (videoModal ? 1000 : 500));
  });

  dot.addEventListener("mouseleave", (e) => {
    clearTimeout(hoverTimeout);
    clearTimeout(videoLoadTimeout);

    if (isMouseInModal || (e.relatedTarget && videoModal && videoModal.contains(e.relatedTarget))) {
      return;
    }

    if (dot.abortController) {
      dot.abortController.abort();
      dot.abortController = null;
    }

    if (videoModal) {
      videoModal.style.opacity = '0';
      setTimeout(() => {
        if (videoModal && videoModal.style.opacity === '0' && !isMouseInModal) {
          videoModal.style.display = 'none';
          if (modalVideo) {
            modalVideo.pause();
            modalVideo.src = '';
          }
        }
      }, 300);
    }
  });
}

function cleanupModalEvents() {
  modalEventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  modalEventListeners = [];
}

function addModalEventListener(element, event, handler) {
  element.addEventListener(event, handler);
  modalEventListeners.push({ element, event, handler });
}

function closeVideoModal() {
    if (!videoModal || videoModal.style.display === "none") return;

    modalHoverState = false;
    clearTimeout(modalHideTimeout);
    if (modalVideo && modalVideo._hls) {
        modalVideo._hls.destroy();
        delete modalVideo._hls;
    }

    videoModal.style.opacity = '0';
    videoModal.style.transform = 'translateY(20px)';

    setTimeout(() => {
        if (videoModal) {
            videoModal.style.display = 'none';
            if (modalVideo) {
                modalVideo.pause();
                modalVideo.src = '';
            }
        }
    }, 300);
}

function handleVisibilityChange() {
  if (document.hidden || document.visibilityState === 'hidden') {
    closeVideoModal();
  }
}

function handleWindowBlur() {
  closeVideoModal();
}

function destroyVideoModal() {
  if (videoModal) {
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

        const playButton = document.createElement("button");
        playButton.className = "dot-play-button";
        playButton.textContent = config.languageLabels.izle;

        const matchBadge = document.createElement("div");
        matchBadge.className = "dot-match-div";
        matchBadge.textContent = `...% ${config.languageLabels.uygun}`;

        dot.append(playButton, matchBadge);
        dot.classList.toggle("active", index === currentIndex);

        if (config.dotPosterMode && config.enableDotPosterAnimations) {
            applyDotPosterAnimation(dot, index === currentIndex);
        }

        dot.addEventListener("click", () => {
            if (index !== getCurrentIndex()) {
                changeSlide(index - getCurrentIndex());
            }
        });

      dot.addEventListener("mouseenter", async () => {
      if (dot.abortController) {
      dot.abortController.abort();
    }
    dot.abortController = new AbortController();
    if (videoModal) {
    videoModal.style.display = 'none';
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.src = '';
    }
  }

  modalHoverState = true;
  clearTimeout(modalHideTimeout);

  const itemId = dot.dataset.itemId;
  if (!itemId) return;

  try {
    if (!videoModal) {
      const modalElements = createVideoModal();
      videoModal = modalElements.modal;
      modalVideo = modalElements.video;
      modalTitle = modalElements.title;
      modalMeta = modalElements.meta;
      modalMatchInfo = modalElements.matchInfo;
      modalGenres = modalElements.genres;
      modalPlayButton = modalElements.playButton;
      modalFavoriteButton = modalElements.favoriteButton;
    }

    videoModal.dataset.itemId = itemId;
    positionModalRelativeToDot(videoModal, dot);
    videoModal.style.display = 'block';
    videoModal.style.opacity = '0';
    videoModal.style.transform = 'translateY(20px)';

    const signal = dot.abortController.signal;
    const videoUrl = videoPreloadCache.get(itemId) ||
                    await getVideoStreamUrl(itemId, 360, 0, { signal });

    const [item] = await Promise.all([
      fetchItemDetails(itemId, { signal }),
      Promise.resolve()
    ]);
    updateModalContent(item, videoUrl);
    setTimeout(() => {
      videoModal.style.opacity = '1';
      videoModal.style.transform = 'translateY(10px)';
    }, 10);

    const isFavorite = item.UserData?.IsFavorite || false;
    const isPlayed = item.UserData?.Played || false;
    const positionTicks = Number(item.UserData?.PlaybackPositionTicks || 0);
    const runtimeTicks = Number(item.RunTimeTicks || 0);
    const hasPartialPlayback = positionTicks > 0 && positionTicks < runtimeTicks;

    const playButton = dot.querySelector('.dot-play-button');
    if (playButton) {
      playButton.textContent = (isPlayed || hasPartialPlayback)
        ? config.languageLabels.devamet
        : config.languageLabels.izle;
    }

    const matchPercentage = await calculateMatchPercentage(item.UserData, item);
    const matchBadge = dot.querySelector('.dot-match-div');
    if (matchBadge) {
      matchBadge.textContent = `${matchPercentage}% ${config.languageLabels.uygun}`;
    }

    dot.dataset.favorite = isFavorite.toString();
    dot.dataset.played = isPlayed.toString();

  } catch (error) {
    if (error.name !== 'AbortError') {
      if (videoModal) {
        videoModal.style.display = 'none';
        if (modalVideo) {
          modalVideo.pause();
          modalVideo.src = '';
        }
      }
    }
  }
});

  dot.addEventListener("mouseleave", () => {
  modalHoverState = false;

  if (dot.abortController) {
    dot.abortController.abort();
    dot.abortController = null;
  }

  dotHideTimeout = setTimeout(() => {
    if (videoModal && !modalHoverState) {
      startModalHideTimer(videoModal);
    }
  }, 300);
});

    return dot;
    }).filter(Boolean);

    setTimeout(() => {
      const createdDots = Array.from(scrollWrapper.querySelectorAll('.poster-dot'));
      if (createdDots.length > 0) {
        preloadVideosForDots(createdDots).catch(console.error);
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
                playButton.textContent = (isPlayed || hasPartialPlayback)
                    ? config.languageLabels.devamet
                    : config.languageLabels.izle;
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

  const handleTouchStart = (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    e.stopImmediatePropagation?.();
  };

  const handleTouchMove = (e) => {
    const deltaX = Math.abs(e.changedTouches[0].screenX - touchStartX);
    const deltaY = Math.abs(e.changedTouches[0].screenY - touchStartY);

    if (deltaX > deltaY) {
      e.preventDefault();
    }

    e.stopImmediatePropagation?.();
  };

  const handleTouchEnd = (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const deltaX = touchEndX - touchStartX;

    if (Math.abs(deltaX) > 50) {
      changeSlide(deltaX > 0 ? -1 : 1);
    }

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

function createVideoModal() {
  if (typeof config !== 'undefined' && config.previewModal !== false) {
  destroyVideoModal();

  const modal = document.createElement('div');
  modal.className = 'video-preview-modal';
  modal.style.cssText = `
    position: absolute;
    width: 400px;
    height: 320px;
    background: rgb(30, 30, 40, .5);
    border-radius: 8px;
    box-shadow: rgba(0, 0, 0, 0.5) 0px 10px 25px;
    z-index: 1000;
    display: none;
    overflow: hidden;
    transform: translateY(10px);
    transition: opacity 0.3s, transform 0.3s;
    font-family: "Netflix Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
    pointer-events: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  `;

  const videoContainer = document.createElement('div');
  videoContainer.className = 'video-container';
  videoContainer.style.cssText = `
    width: 100%;
    height: 225px;
    padding: 8px;
    box-sizing: border-box;
    background: rgba(30,30,40,0.7);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const video = document.createElement('video');
  video.className = 'preview-video';
  video.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #000;
    border-radius: 4px;
    box-shadow: 0 0 10px rgba(0,0,0,0.4);
    transition: opacity 0.8s ease;
  `;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('x-webkit-airplay', 'allow');
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.addEventListener('error', function(e) {
    const src = video.currentSrc || video.src;
    if (!src) return;
  });

  video.addEventListener('stalled', function() {
    console.warn('Video veri akışında kesinti, yeniden deneniyor...');
    video.load();
  });

  video.addEventListener('waiting', function() {
  });

  video.addEventListener('playing', function() {
    video.style.opacity = '1';
  });

  const infoContainer = document.createElement('div');
  infoContainer.className = 'preview-info';
  infoContainer.style.cssText = `
    padding: 10px;
    background: linear-gradient(0deg, rgb(30, 30, 40) 30%, transparent);
    position: absolute;
    bottom: -5px;
    left: 0px;
    right: 0px;
    z-index: 1;
    display: flex;
    gap: 8px;
    flex-flow: wrap;
    place-content: center space-between;
    align-items: center;
  `;

  const matchInfo = document.createElement('div');
  matchInfo.className = 'preview-match';
  matchInfo.style.cssText = `
    color: #FFC107;
    font-weight: bold;
    font-size: 14px;
    border-radius: 4px;
  `;

  const title = document.createElement('div');
  title.className = 'preview-title';
  title.style.cssText = `
    color: #FFC107;
    font-weight: bold;
    font-size: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const meta = document.createElement('div');
  meta.className = 'preview-meta';
  meta.style.cssText = `
    color: #a3a3a3;
    font-size: 14px;
    display: flex;
    gap: 8px;
    width: 100%;
  `;

  const genres = document.createElement('div');
  genres.className = 'preview-genres';
  genres.style.cssText = `
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
    width: 100%;
  `;

  infoContainer.append(matchInfo, title, meta, genres);

  const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'preview-buttons';
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 10px;
      position: absolute;
      bottom: 25px;
      right: 0px;
      z-index: 2;
      opacity: 1;
      transform: scale(0.9);
    `;

    const volumeButton = document.createElement('button');
    volumeButton.className = 'preview-volume-button';
    volumeButton.style.cssText = `
      background: rgba(42, 42, 42, 0.6);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    volumeButton.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';

    volumeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.muted) {
        video.muted = false;
        volumeButton.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      } else {
        video.muted = true;
        volumeButton.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      }
    });

    video.addEventListener('volumechange', () => {
      if (video.muted) {
        volumeButton.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
      } else {
        volumeButton.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      }
    });

  const playButton = document.createElement('button');
  playButton.className = 'preview-play-button';
  playButton.style.cssText = `
    background: white;
    color: black;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-weight: bold;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: 0.2s;
    min-width: 80px;
    transform: scale(1);
    opacity: 1;
    justify-content: center;
  `;

  const favoriteButton = document.createElement('button');
  favoriteButton.className = 'preview-favorite-button';
  favoriteButton.style.cssText = `
    background: rgba(42, 42, 42, 0.6);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  const infoButton = document.createElement('button');
  infoButton.className = 'preview-info-button';
  infoButton.style.cssText = `
    background: rgba(42, 42, 42, 0.6);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  infoButton.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';

  buttonsContainer.append(volumeButton, playButton, favoriteButton, infoButton);

  videoContainer.appendChild(video);
  modal.appendChild(videoContainer);
  modal.appendChild(buttonsContainer);
  modal.appendChild(infoContainer);
  modal.initHlsPlayer = function(url) {
    if (video._hls) {
      video._hls.destroy();
      delete video._hls;
    }

    video.pause();
    video.src = '';
    video.load();
    video.style.opacity = '0';
    video.style.transition = 'opacity 0.3s ease-in-out';

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
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      hls.startLoad(startAt);
      video.play().catch(e => console.log('Oynatma hatası:', e));
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
        setTimeout(() => startVideoPlayback(url), 250);
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
      video.play().catch(e => console.log('Oynatma hatası:', e));
    }, { once: true });
  }
};

  modal.cleanupHls = function() {
    if (video && video._hls) {
      video._hls.destroy();
      delete video._hls;
    }
  };

  playButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const itemId = modal.dataset.itemId;
    if (!itemId) {
      alert("Oynatma başarısız: itemId bulunamadı");
      return;
    }
    try {
      await playNow(itemId);
    } catch (error) {
      console.error("Oynatma hatası:", error);
      alert("Oynatma başarısız: " + error.message);
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
        window.location.href = `#/details?id=${itemId}`;
      }
    }
  });

  [playButton, favoriteButton, infoButton].forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.opacity = '0.9';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.opacity = '1';
    });
  });

  modal.addEventListener('mouseenter', () => {
    modalHoverState = true;
    clearTimeout(modalHideTimeout);
  });

  modal.addEventListener('mouseleave', () => {
    modalHoverState = false;
    modalHideTimeout = setTimeout(closeVideoModal, 150);
  });

  modal.addEventListener('click', () => {
    if (modalVideo) {
      modalVideo.muted = false;
      modalVideo.volume = 1.0;
    }
  });

  document.body.appendChild(modal);
  videoModal = modal;
  modalVideo = video;

  return {
    modal,
    video,
    title,
    meta,
    genres,
    matchInfo,
    playButton,
    favoriteButton,
    infoButton,
    volumeButton
    };
  }
}

function positionModalRelativeToDot(modal, dot) {
  const dotRect = dot.getBoundingClientRect();
  const modalWidth = 400;
  const modalHeight = 320;
  const windowPadding = 20;
  const edgeThreshold = 100;
  const verticalOffset = -20;

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

function startModalHideTimer(modal) {
  if (modalHoverState || isMouseInModal) return;

  modal.style.opacity = '0';
  modal.style.transform = 'translateY(20px)';

  modal.hideTimeout = setTimeout(() => {
    if (!modalHoverState && !isMouseInModal && modal.style.opacity === '0') {
      modal.style.display = 'none';
      const video = modal.querySelector('video');
      if (video) {
        video.pause();
        video.src = '';
        if (video._hls) {
          video._hls.destroy();
          delete video._hls;
        }
      }
    }
  }, 300);
}

export async function calculateMatchPercentage(userData = {}, item = {}) {
  let score = 50;

  if (typeof userData.PlayedPercentage === 'number') {
    if (userData.PlayedPercentage > 90) score += 10;
    else if (userData.PlayedPercentage > 50) score += 5;
    else if (userData.PlayedPercentage > 20) score += 2;
  }

  if (typeof item.CommunityRating === 'number') {
    if (item.CommunityRating >= 8.5) score += 20;
    else if (item.CommunityRating >= 7.5) score += 14;
    else if (item.CommunityRating >= 6.5) score += 8;
  }

  const userTopGenres = await getCachedUserTopGenres(5);
  const itemGenres = item.Genres || [];
  const genreMatches = itemGenres.filter(itemGenre =>
    userTopGenres.includes(itemGenre)
  );

  if (genreMatches.length > 0) {
    if (genreMatches.length === 1) score += 2;
    else if (genreMatches.length === 2) score += 4;
    else if (genreMatches.length >= 3) score += 6;
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
  const config = getConfig();

  if (modalVideo && modalVideo._hls) {
    modalVideo._hls.destroy();
    delete modalVideo._hls;
  }

  const positionTicks = Number(item.UserData?.PlaybackPositionTicks || 0);
  const runtimeTicks = Number(item.RunTimeTicks || 0);
  const hasPartialPlayback = positionTicks > 0 && positionTicks < runtimeTicks;
  const isPlayed = item.UserData?.Played || false;
  const isFavorite = item.UserData?.IsFavorite || false;

  modalTitle.textContent = item.Name || '';
  modalMeta.textContent = [
    item.ProductionYear,
    item.CommunityRating ? parseFloat(item.CommunityRating).toFixed(1) : null,
    runtimeTicks ? `${Math.floor(runtimeTicks / 600000000)} ${config.languageLabels.dk}` : null
  ].filter(Boolean).join(' • ');

  const matchPercentage = await calculateMatchPercentage(item.UserData, item);
  modalMatchInfo.textContent = `${matchPercentage}% ${config.languageLabels.uygun}`;

  modalGenres.innerHTML = '';
  if (item.Genres && item.Genres.length > 0) {
    item.Genres.slice(0, 3).forEach(genre => {
      const genreBadge = document.createElement('span');
      genreBadge.className = 'genre-badge';
      genreBadge.textContent = genre.trim();
      modalGenres.appendChild(genreBadge);
    });
  }

  modalPlayButton.innerHTML = `<i class="fa-solid fa-play"></i> ${(isPlayed || hasPartialPlayback) ? config.languageLabels.devamet : config.languageLabels.izle}`;
  modalFavoriteButton.classList.toggle('favorited', isFavorite);
  modalFavoriteButton.innerHTML = isFavorite
    ? '<i class="fa-solid fa-check"></i>'
    : '<i class="fa-solid fa-plus"></i>';

  if (videoUrl) {
    videoModal.initHlsPlayer(videoUrl);
  }
}

window.addEventListener("beforeunload", () => {
  clearVideoPreloadCache();
  destroyVideoModal();
});

setInterval(clearVideoPreloadCache, 5 * 60 * 1000);
