import { stopSlideTimer, startSlideTimer } from "./timer.js";
import { SLIDE_DURATION } from "./timer.js";
import { getConfig } from './config.js';
import { resetProgressBar } from "./progressBar.js";
import { getCurrentIndex, setCurrentIndex, setRemainingTime } from "./sliderState.js";
import { applyContainerStyles } from "./positionUtils.js"
import { playNow, getVideoStreamUrl, fetchItemDetails, updateFavoriteStatus, getCachedUserTopGenres, getGenresForDot } from "./api.js";
import { applySlideAnimation, applyDotPosterAnimation} from "./animations.js";

const config = getConfig();

const previewPreloadCache = new Map();
let videoModal, modalVideo, modalTitle, modalMeta, modalMatchInfo, modalGenres, modalPlayButton, modalFavoriteButton;
let modalHoverState = false;
let isMouseInItem = false;
let isMouseInModal = false;
let modalHideTimeout = null;

export async function preloadVideoPreview(itemId) {
  if (previewPreloadCache.has(itemId)) return previewPreloadCache.get(itemId);
  try {
    const url = await getVideoStreamUrl(itemId);
    previewPreloadCache.set(itemId, url);
    return url;
  } catch (e) {
    console.warn("Preload fail:", itemId, e);
    return null;
  }
}

function shouldHideModal() {
  return !isMouseInItem && !isMouseInModal;
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
    let videoUrl = await preloadVideoPreview(itemId);

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

function createVideoModal({ showButtons = true } = {}) {
  if (!document.getElementById('video-modal-modern-style')) {
    const style = document.createElement('style');
    style.id = 'video-modal-modern-style';
    style.textContent = `
      .video-preview-modal {
        position: absolute;
        width: 400px;
        max-width: 96vw;
        height: 340px;
        background: rgba(24, 27, 38, 0.97);
        border-radius: 20px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.38), 0 1.5px 4px rgba(0,0,0,.09);
        z-index: 1000;
        display: none;
        overflow: hidden;
        transform: translateY(10px);
        transition: opacity 0.24s cubic-bezier(.41,.4,.36,1.01), transform 0.24s cubic-bezier(.41,.4,.36,1.01);
        font-family: "Inter", "Netflix Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
        pointer-events: auto;
        border: 1.5px solid rgba(255, 255, 255, 0.10);
        backdrop-filter: blur(18px) saturate(160%);
        user-select: none;
      }
      .video-preview-modal .video-container {
        width: 100%;
        height: 200px;
        padding: 10px;
        box-sizing: border-box;
        background: linear-gradient(160deg, rgba(33,36,54,.97) 65%, rgba(52,56,80,0.19));
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
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
        bottom: 0px;
        left: 0px;
        right: 0px;
        z-index: 2;
        background: linear-gradient(0deg, rgba(24,27,38, 0.94) 60%, transparent 100%);
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-rows: repeat(3, auto);
        gap: 4px 16px;
        align-items: end;
      }
      .video-preview-modal .preview-match {
        grid-column: 1;
        color: #E91E63;
        font-weight: bold;
        font-size: 14px;
        border-radius: 6px;
        background: rgba(80, 56, 3, .08);
        padding: 2px 10px;
        margin-bottom: 4px;
        letter-spacing: 0.02em;
        position: absolute;
        right: 5px;
      }
      .video-preview-modal .preview-title {
        grid-column: 1/3;
        color: #fff;
        font-weight: 700;
        font-size: 1.24rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        margin: 0 0 2px 0;
        padding: 0;
        text-shadow: 0 2px 8px rgba(0,0,0,.42);
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
      }
      .video-preview-modal .preview-genres {
        grid-column: 1/3;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 2px;
        font-size: 12.7px;
        color: #a8aac7;
      }
      .video-preview-modal .preview-buttons {
        display: flex;
        gap: 14px;
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
        color: #181828;
        border-radius: 9px;
        padding: 8px 18px 8px 16px;
        font-weight: 600;
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
      }
      .video-preview-modal .preview-play-button:hover {
        background: linear-gradient(92deg, #f5f4f9 64%, #fff 100%);
        box-shadow: 0 4px 16px 0 rgba(21,12,50,.11);
        transform: scale(1.05);
      }
      .video-preview-modal .preview-favorite-button,
      .video-preview-modal .preview-info-button,
      .video-preview-modal .preview-volume-button {
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
      .video-preview-modal .preview-favorite-button:hover,
      .video-preview-modal .preview-info-button:hover,
      .video-preview-modal .preview-volume-button:hover {
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
        .video-preview-modal .preview-buttons { top: 6px; right: 7px;}
      }
    `;
    document.head.appendChild(style);
  }

  if (typeof config !== 'undefined' && config.previewModal !== false) {
    destroyVideoModal();

    const modal = document.createElement('div');
    modal.className = 'video-preview-modal';
    modal.style.display = 'none';

    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    const video = document.createElement('video');
    video.className = 'preview-video';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x-webkit-airplay', 'allow');
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    video.addEventListener('error', () => {
      const src = video.currentSrc || video.src;
      if (!src) return;
    });
    video.addEventListener('stalled', () => video.load());
    video.addEventListener('playing', () => video.style.opacity = '1');

    const infoContainer = document.createElement('div');
    infoContainer.className = 'preview-info';
    const matchInfo = document.createElement('div');
    matchInfo.className = 'preview-match';
    const title = document.createElement('div');
    title.className = 'preview-title';
    const meta = document.createElement('div');
    meta.className = 'preview-meta';
    const genres = document.createElement('div');
    genres.className = 'preview-genres';
    infoContainer.append(matchInfo, title, meta, genres);
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'preview-buttons';
    const volumeButton = document.createElement('button');
    volumeButton.className = 'preview-volume-button';
    volumeButton.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    volumeButton.addEventListener('click', e => {
      e.stopPropagation();
      video.muted = !video.muted;
    });
    video.addEventListener('volumechange', () => {
      volumeButton.innerHTML = video.muted
        ? '<i class="fa-solid fa-volume-xmark"></i>'
        : '<i class="fa-solid fa-volume-high"></i>';
    });

    const playButton = document.createElement('button');
    playButton.className = 'preview-play-button';
    playButton.innerHTML = '<i class="fa-solid fa-play"></i> Oynat';
    const favoriteButton = document.createElement('button');
    favoriteButton.className = 'preview-favorite-button';
    favoriteButton.innerHTML = '<i class="fa-solid fa-plus"></i>';
    const infoButton = document.createElement('button');
    infoButton.className = 'preview-info-button';
    infoButton.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';

    buttonsContainer.append(playButton, favoriteButton, infoButton, volumeButton);

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
      button.addEventListener('mouseenter', () => button.style.transform = 'scale(1.11)');
      button.addEventListener('mouseleave', () => button.style.transform = '');
    });

    modal.addEventListener('mouseenter', () => { modalHoverState = true; clearTimeout(modalHideTimeout); });
    modal.addEventListener('mouseleave', () => { modalHoverState = false; modalHideTimeout = setTimeout(closeVideoModal, 150); });
    modal.addEventListener('click', () => {
  if (modalVideo) {
    modalVideo.muted = !modalVideo.muted;
    modalVideo.volume = modalVideo.muted ? 0 : 1.0;
  }
});

    videoContainer.appendChild(video);
    modal.appendChild(videoContainer);
    if (showButtons) modal.appendChild(buttonsContainer);
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

     if (showButtons) {
    modal.appendChild(buttonsContainer);
  }

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
  };

    document.body.appendChild(modal);
    videoModal = modal;
    modalVideo = video;
    if (typeof bindModalEvents === "function") bindModalEvents(modal);

    return { modal, video, title, meta, genres, matchInfo, playButton, favoriteButton, infoButton, volumeButton };
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

function startModalHideTimer() {
  clearTimeout(modalHideTimeout);
  modalHideTimeout = setTimeout(() => {
    if (shouldHideModal() && videoModal) {
      videoModal.style.opacity = '0';
      setTimeout(() => {
        if (shouldHideModal() && videoModal) {
          videoModal.style.display = 'none';
          if (modalVideo) {
            modalVideo.pause();
            modalVideo.src = '';
            if (modalVideo._hls) {
              modalVideo._hls.destroy();
              delete modalVideo._hls;
            }
          }
        }
      }, 180);
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

  modalPlayButton.innerHTML = `<i class="fa-solid fa-play"></i> ${getPlayButtonText({
  isPlayed,
  hasPartialPlayback,
  labels: config.languageLabels
})}`;
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

let itemHoverAbortController = null;

export function setupHoverForAllItems() {
  if (typeof config !== 'undefined' && config.allPreviewModal !== false) {
  const items = document.querySelectorAll('.cardImageContainer');
  items.forEach(item => {
    let hoverTimeout;

    item.addEventListener('mouseenter', async () => {
      isMouseInItem = true;
      clearTimeout(hoverTimeout);
      clearTimeout(modalHideTimeout);

      if (itemHoverAbortController) itemHoverAbortController.abort();
      itemHoverAbortController = new AbortController();
      const { signal } = itemHoverAbortController;

      const itemId =
        item.dataset.itemId ||
        item.dataset.id ||
        (item.closest('[data-id]') && item.closest('[data-id]').dataset.id);
      if (!itemId) return;

      hoverTimeout = setTimeout(async () => {
        if (!isMouseInItem && !isMouseInModal) return;
        try {
          const itemDetails = await fetchItemDetails(itemId, { signal });
          if (signal.aborted) return;

          const videoTypes = ['Movie', 'Episode', 'Series', 'Season'];
          if (!videoTypes.includes(itemDetails.Type)) {
          closeVideoModal();
          return;
        }
          if (!videoModal || !document.body.contains(videoModal)) {
            const modalElements = createVideoModal({ showButtons: true });
            videoModal = modalElements.modal;
            modalVideo = modalElements.video;
            modalTitle = modalElements.title;
            modalMeta = modalElements.meta;
            modalMatchInfo = modalElements.matchInfo;
            modalGenres = modalElements.genres;
            modalPlayButton = modalElements.playButton;
            modalFavoriteButton = modalElements.favoriteButton;
            bindModalEvents(videoModal);
          }
          if (!isMouseInItem && !isMouseInModal) return;

          videoModal.dataset.itemId = itemId;
          positionModalRelativeToItem(videoModal, item);
          videoModal.style.display = 'block';
          videoModal.style.opacity = '0';

          let videoUrl = await preloadVideoPreview(itemId);
          updateModalContent(itemDetails, videoUrl);

          setTimeout(() => {
            videoModal.style.opacity = '1';
            videoModal.style.transform = 'translateY(0)';
          }, 10);
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Öğe hover hatası:', error);
            if (videoModal) videoModal.style.display = 'none';
          }
        }
      }, 250);
    });

    item.addEventListener('mouseleave', (e) => {
      isMouseInItem = false;
      clearTimeout(hoverTimeout);
      if (itemHoverAbortController) itemHoverAbortController.abort();
      if (e.relatedTarget && videoModal && videoModal.contains(e.relatedTarget)) return;
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
    animationDuration: 360,
    openAnimation: 'cubic-bezier(.33,1.3,.7,1)',
    openTransform: 'scale(1)',
    openOpacity: '1',
    closedTransform: 'scale(0)',
    closedOpacity: '0',
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

function getPlayButtonText({ isPlayed, hasPartialPlayback, labels }) {
  if (isPlayed && !hasPartialPlayback) return labels.izlendi;
  if (hasPartialPlayback) return labels.devamet;
  return labels.izle;
}
