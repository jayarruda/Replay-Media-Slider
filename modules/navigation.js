import { stopSlideTimer, startSlideTimer } from "./timer.js";
import { SLIDE_DURATION } from "./timer.js";
import { getConfig } from './config.js';
import { ensureProgressBarExists, resetProgressBar, startProgressBarWithDuration, pauseProgressBar, resumeProgressBar } from "./progressBar.js";
import { getCurrentIndex, setCurrentIndex, getSlideDuration, setAutoSlideTimeout, getAutoSlideTimeout, setSlideStartTime, getSlideStartTime, setRemainingTime, getRemainingTime } from "./sliderState.js";
import { applyContainerStyles } from "./positionUtils.js"
import { playNow, getVideoStreamUrl, fetchItemDetails, updateFavoriteStatus } from "./api.js";
import { styleElement, animationStyles, existingStyle, applySlideAnimation, applyDotPosterAnimation} from "./animations.js";

const config = getConfig();

let dotNavigationInitialized = false;
let videoModal, modalVideo, modalTitle, modalMeta, modalMatchInfo, modalGenres, modalPlayButton, modalFavoriteButton;
let modalHoverState = false;
let modalHideTimeout;
let modalEventListeners = [];

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
  closeVideoModal();
  cleanupModalEvents();

  if (videoModal) {
    videoModal.remove();
    videoModal = null;
    modalVideo = null;
  }
}


export function changeSlide(direction) {
  const slides = document.querySelectorAll(".slide");
  if (!slides.length) return;

  stopSlideTimer();
  resetProgressBar();

  const currentIndex = getCurrentIndex();
  const newIndex = (currentIndex + direction + slides.length) % slides.length;
  setCurrentIndex(newIndex);

  console.log("Slayt değişiyor, yeni indeks:", newIndex);
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
  if (!slides.length) return;

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

    slides.forEach(async (slide, index) => {
  const itemId = slide.dataset.itemId;
  if (!itemId) {
    console.warn(`Dot oluşturulamadı: slide ${index} için itemId eksik`);
    return;
  }

  if (slide.dataset.favorite === undefined || slide.dataset.played === undefined) {
    try {
      const item = await fetchItemDetails(itemId);
      const isFavorite = item.UserData?.IsFavorite || false;
      slide.dataset.favorite = isFavorite.toString();
    } catch (e) {
      console.warn(`Favori durumu alınamadı: ${itemId}`, e);
    }
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
      const isPlayed = slide.dataset.played === "true";
      playButton.textContent = isPlayed ? config.languageLabels.devamet : config.languageLabels.izle;

      const item = await fetchItemDetails(itemId);
      const matchPercentage = calculateMatchPercentage(item.UserData, item);

      const matchBadge = document.createElement("div");
      matchBadge.className = "dot-match-div";
      matchBadge.textContent = `${matchPercentage}% ${config.languageLabels.uygun}`;

      playButton.addEventListener("click", async (e) => {
        e.stopPropagation();
        const itemId = e.currentTarget.closest(".poster-dot")?.dataset.itemId;
        if (!itemId) {
          alert("Oynatma başlatılamadı: itemId eksik");
          return;
        }
        try {
          await playNow(itemId);
        } catch (error) {
          console.error("Oynatma hatası:", error);
          alert("Oynatma başlatılamadı: " + error.message);
        }
      });

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
  if (videoModal) {
    clearTimeout(videoModal.hideTimeout);
  }
  modalHoverState = true;

  if (!dot.classList.contains("active")) {
    dot.style.transform = "scale(1.05)";
    dot.style.zIndex = "5";
  }

  const itemId = dot.dataset.itemId;
  if (!itemId) return;

  if (dot.abortController) {
    dot.abortController.abort();
  }
  dot.abortController = new AbortController();

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

    const slide = document.querySelector(`.slide[data-item-id="${itemId}"]`);
    if (slide) {
      const item = await fetchItemDetails(itemId);

      modalTitle.textContent = item.Name || slide.dataset.title || '';

      const year = item.ProductionYear ? ` ${item.ProductionYear}` : '';
      const rating = item.CommunityRating ? ` • ${parseFloat(item.CommunityRating).toFixed(1)}` : '';
      const runtime = item.RunTimeTicks ? ` • ${Math.floor(item.RunTimeTicks / 600000000)} ${config.languageLabels.dk}` : '';

      modalMeta.textContent = `${year}${rating}${runtime}`;
      const match = calculateMatchPercentage(item.UserData, item);
      modalMatchInfo.textContent = `${match}%  ${config.languageLabels.uygun}`;

      modalGenres.innerHTML = '';
      if (item.Genres && item.Genres.length > 0) {
        item.Genres.slice(0, 3).forEach(genre => {
          const genreBadge = document.createElement('span');
          genreBadge.textContent = genre.trim();
          modalGenres.appendChild(genreBadge);
        });
      }

      const isPlayed = slide.dataset.played === "true";
      modalPlayButton.innerHTML = `<i class="fa-solid fa-play"></i> ${isPlayed ? config.languageLabels.devamet : config.languageLabels.izle}`;

      const isFavorite = slide.dataset.favorite === "true";
      modalFavoriteButton.classList.toggle('favorited', isFavorite);
      modalFavoriteButton.innerHTML = isFavorite
        ? '<i class="fa-solid fa-check"></i>'
        : '<i class="fa-solid fa-plus"></i>';
    }

    videoModal.style.display = 'block';
    videoModal.style.opacity = '0';
    videoModal.style.transform = 'translateY(20px)';
    setTimeout(() => {
      videoModal.style.opacity = '1';
      videoModal.style.transform = 'translateY(10px)';
    }, 10);

    const signal = dot.abortController?.signal;
    const videoUrl = await getVideoStreamUrl(itemId, 360, 0, signal ? { signal } : {});
    if (videoUrl && modalVideo) {
      modalVideo.onloadedmetadata = null;
      modalVideo.ontimeupdate = null;
      modalVideo.onseeked = null;

      modalVideo.pause();
      modalVideo.src = '';
      modalVideo.load();
      modalVideo.src = videoUrl;
      modalVideo.currentTime = 0;
      modalVideo.muted = true;
      modalVideo.loop = true;
      modalVideo.style.transition = 'opacity 0.3s ease';

      modalVideo.play().catch(e => {
        if (e.name !== "AbortError") {
          console.error("Video oynatma hatası:", e);
        }
      });

      modalVideo.onloadedmetadata = () => {
        if (!modalVideo) return;

        const actualDuration = modalVideo.duration;
        const segmentStartTime = 5 * 60;
        const segmentDuration = 3;
        const segmentInterval = 5 * 60;
        const totalSegmentCount = Math.floor((actualDuration - segmentStartTime) / segmentInterval);

        if (totalSegmentCount <= 0) return;

        const segmentTimes = Array.from({ length: totalSegmentCount }, (_, i) =>
          segmentStartTime + i * segmentInterval);

        let currentSegment = 0;
        modalVideo.currentTime = segmentTimes[currentSegment];

        const onTimeUpdate = () => {
          if (!modalVideo) return;

          const segmentEnd = segmentTimes[currentSegment] + segmentDuration;

          if (modalVideo.currentTime >= segmentEnd) {
            currentSegment++;

            if (currentSegment >= segmentTimes.length) {
              modalVideo.removeEventListener("timeupdate", onTimeUpdate);
              modalVideo.pause();
              modalVideo.currentTime = 0;
              currentSegment = 0;
              modalVideo.addEventListener("timeupdate", onTimeUpdate);
              modalVideo.play();
              return;
            }

            modalVideo.style.opacity = "0";
            modalVideo.pause();

            const seekToTime = segmentTimes[currentSegment];

            const onSeeked = () => {
              if (!modalVideo) return;
              modalVideo.removeEventListener("seeked", onSeeked);
              modalVideo.style.opacity = "1";
              modalVideo.play().catch(e => console.log("Auto-play prevented:", e));
            };

            modalVideo.addEventListener("seeked", onSeeked);
            modalVideo.currentTime = seekToTime;
          }
        };

        modalVideo.addEventListener("timeupdate", onTimeUpdate);
      };
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error("Hata oluştu:", error);
    }
  }
});

      dot.addEventListener("mouseleave", () => {
  dot.style.transform = "";
  dot.style.zIndex = "";

  if (dot.abortController) {
    dot.abortController.abort();
    dot.abortController = null;
  }

  if (videoModal) {
    clearTimeout(videoModal.hideTimeout);
    videoModal.hideTimeout = setTimeout(() => {
      if (!modalHoverState) {
        videoModal.style.opacity = '0';
        videoModal.style.transform = 'translateY(20px)';

        setTimeout(() => {
          if (!modalHoverState) {
            videoModal.style.display = 'none';
            if (modalVideo) {
              modalVideo.pause();
              modalVideo.src = '';
            }
          }
        }, 300);
      }
    }, 150);
  }
});


      scrollWrapper.appendChild(dot);
    });

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
  console.log(`Slayt gösteriliyor: ${index}`);
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
  destroyVideoModal();

  const config = getConfig();
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
    background: rgba(0,0,0,0.7);
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
  video.autoplay = true;
  video.muted = true;
  video.loop = true;

  const infoContainer = document.createElement('div');
  infoContainer.className = 'preview-info';
  infoContainer.style.cssText = `
    padding: 10px;
    background: linear-gradient(0deg, rgb(24, 24, 24) 30%, transparent);
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
    bottom: 20px;
    right: 0px;
    z-index: 2;
    opacity: 0;
    transform: scale(0.9);
  `;

  const playButton = document.createElement('button');
  playButton.className = 'preview-play-button';
  playButton.style.cssText = `
        background: white;
    color: black;
    border: none;
    border-radius: 4px;
    padding: 8px 15px;
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

  buttonsContainer.append(playButton, favoriteButton, infoButton);

  videoContainer.appendChild(video);
  modal.appendChild(videoContainer);
  modal.appendChild(buttonsContainer);
  modal.appendChild(infoContainer);

  playButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const itemId = modal.dataset.itemId;
    if (!itemId) {
      alert("Oynatma başlatılamadı: itemId eksik");
      return;
    }
    try {
      await playNow(itemId);
    } catch (error) {
      console.error("Oynatma hatası:", error);
      alert("Oynatma başlatılamadı: " + error.message);
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
      console.error("Favori durumu güncellenirken hata:", error);
    }
  });

  infoButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const itemId = modal.dataset.itemId;
  if (!itemId) return;

  if (window.showItemDetailsPage) {
    window.showItemDetailsPage(itemId);
  }
  else {
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

  addModalEventListener(document, 'visibilitychange', handleVisibilityChange);
  addModalEventListener(window, 'blur', handleWindowBlur);
  addModalEventListener(window, 'beforeunload', destroyVideoModal);
  addModalEventListener(window, 'pagehide', destroyVideoModal);

  modal.addEventListener('mouseenter', () => {
    modalHoverState = true;
    clearTimeout(modalHideTimeout);
    buttonsContainer.style.opacity = '1';
  });

  modal.addEventListener('mouseleave', () => {
    modalHoverState = false;
    buttonsContainer.style.opacity = '0';
    modalHideTimeout = setTimeout(closeVideoModal, 150);
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
    infoButton
  };
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
  if (modalHoverState) return;

  modal.style.opacity = '0';
  modal.style.transform = 'translateY(20px)';

  modal.hideTimeout = setTimeout(() => {
    if (!modalHoverState && modal.style.opacity === '0') {
      modal.style.display = 'none';
      const video = modal.querySelector('video');
      if (video) {
        video.pause();
        video.src = '';
      }
    }
  }, 300);
}


function showModalWithAnimation(modal) {
  modalHoverState = false;
  clearTimeout(modal.hideTimeout);

  modal.style.display = 'block';
  modal.style.opacity = '0';
  modal.style.transform = 'translateY(20px)';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modal.style.transform = 'translateY(10px)';
    });
  });
}

function calculateMatchPercentage(userData = {}, item = {}) {
  let score = 50;
  const scoreLog = [`Başlangıç puanı: ${score}`];

  if (typeof userData.PlayedPercentage === 'number') {
    if (userData.PlayedPercentage > 90) {
      score += 10;
    } else if (userData.PlayedPercentage > 50) {
      score += 5;
    } else if (userData.PlayedPercentage > 20) {
      score += 2;
    }
  }

  if (typeof item.CommunityRating === 'number') {
    if (item.CommunityRating >= 8.5) {
      score += 10;
    } else if (item.CommunityRating >= 7.5) {
      score += 7;
    } else if (item.CommunityRating >= 6.5) {
      score += 4;
    }
  }

  const currentYear = new Date().getFullYear();
  if (item.ProductionYear && currentYear - item.ProductionYear <= 5) {
    score += 4;
  }

  const preferredGenres = [
    "Action",
    "Drama",
    "Science Fiction",
    "Comedy"
  ].map(genre => config.languageLabels.turler[genre] || genre);

  const itemGenres = item.Genres || [];

  const genreMatches = itemGenres.filter(genre => {
    if (preferredGenres.includes(genre)) {
      return true;
    }

    const turkishGenre = Object.keys(config.languageLabels.turler).find(
      key => config.languageLabels.turler[key] === genre
    );

    return turkishGenre && preferredGenres.includes(turkishGenre);
  }).length;

  if (genreMatches > 0) {
    const matchedGenres = itemGenres.filter(genre =>
      preferredGenres.includes(genre) ||
      Object.keys(config.languageLabels.turler).some(
        key => config.languageLabels.turler[key] === genre && preferredGenres.includes(key)
      )
    );

    if (genreMatches === 1) {
      score += 15;
      scoreLog.push(`1 tür eşleşmesi (${matchedGenres.join(', ')}): +2 (Yeni toplam: ${score})`);
    } else if (genreMatches === 2) {
      score +=25;
      scoreLog.push(`2 tür eşleşmesi (${matchedGenres.join(', ')}): +4 (Yeni toplam: ${score})`);
    } else if (genreMatches >= 3) {
      score += 35;
    }
  }

  const familyFriendlyRatings = ["G", "PG", "TV-G", "TV-PG"];
  if (familyFriendlyRatings.includes(item.OfficialRating)) {
    score += 3;
  }

  if (userData.Played) {
    score -= 5;
  }

  const finalScore = Math.max(0, Math.min(Math.round(score), 100));
  return finalScore;
}

function hideVideoModalIfVisible() {
  if (!videoModal || videoModal.style.display === "none") return;

  modalHoverState = false;

  videoModal.style.opacity = '0';
  videoModal.style.transform = 'translateY(20px)';

  setTimeout(() => {
    if (!modalHoverState) {
      videoModal.style.display = 'none';
      if (modalVideo) {
        modalVideo.pause();
        modalVideo.src = '';
      }
    }
  }, 300);
}

window.addEventListener("blur", closeVideoModal);
document.addEventListener("visibilitychange", handleVisibilityChange);

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', destroyVideoModal);
  window.addEventListener('pagehide', destroyVideoModal);
}
