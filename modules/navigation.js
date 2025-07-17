import { stopSlideTimer, startSlideTimer } from "./timer.js";
import { SLIDE_DURATION } from "./timer.js";
import { getConfig } from './config.js';
import { ensureProgressBarExists, resetProgressBar, startProgressBarWithDuration, pauseProgressBar, resumeProgressBar } from "./progressBar.js";
import { getCurrentIndex, setCurrentIndex, getSlideDuration, setAutoSlideTimeout, getAutoSlideTimeout, setSlideStartTime, getSlideStartTime, setRemainingTime, getRemainingTime } from "./sliderState.js";
import { applyContainerStyles } from "./positionUtils.js"
import { playNow } from "./api.js";
import { styleElement, animationStyles, existingStyle, applySlideAnimation, applyDotPosterAnimation} from "./animations.js";

const config = getConfig();

let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50;
let dotNavigationInitialized = false;

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

  dots.forEach((dot, index) => {
    const wasActive = dot.classList.contains("active");
    const isActive = index === currentIndex;

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


let centerCalledOnce = false;

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

    slides.forEach((slide, index) => {
  const itemId = slide.dataset.itemId;
  if (!itemId) {
    console.warn(`Dot oluşturulamadı: slide ${index} için itemId eksik`);
    return;
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

  if (
    config.showPlaybackProgress &&
    !isNaN(positionTicks) &&
    !isNaN(runtimeTicks) &&
    positionTicks > 0 &&
    positionTicks < runtimeTicks
  ) {
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

  dot.appendChild(playButton);
  dot.classList.toggle("active", index === currentIndex);
if (config.dotPosterMode && config.enableDotPosterAnimations) {
    applyDotPosterAnimation(dot, index === currentIndex);
}

dot.addEventListener("click", () => {
    if (index !== getCurrentIndex()) {
        changeSlide(index - getCurrentIndex());
    }
});

if (config.dotPosterMode && config.enableDotPosterAnimations) {
    dot.addEventListener("mouseenter", () => {
        if (!dot.classList.contains("active")) {
            dot.style.transform = "scale(1.05)";
            dot.style.zIndex = "5";
        }
    });

    dot.addEventListener("mouseleave", () => {
        if (!dot.classList.contains("active")) {
            dot.style.transform = "";
            dot.style.zIndex = "";
        }
    });
}

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
      directorContainer.style.transition = "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease";
      directorContainer.style.transform = "scale(0.95)";
      directorContainer.style.opacity = "0";
      directorContainer.style.display = "none";

      setTimeout(() => {
        directorContainer.style.display = "flex";
        setTimeout(() => {
          directorContainer.style.transform = "scale(1)";
          directorContainer.style.opacity = "1";
        }, 50);
        setTimeout(() => {
          directorContainer.style.opacity = "0";
        }, config.aktifSure);
      }, config.girisSure);
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

  slidesContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
  slidesContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  slidesContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
}

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}

function handleTouchMove(e) {
  if (Math.abs(e.changedTouches[0].screenX - touchStartX) >
      Math.abs(e.changedTouches[0].screenY - touchStartY)) {
    e.preventDefault();
  }
}

function handleTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipeGesture();
}

function handleSwipeGesture() {
  const deltaX = touchEndX - touchStartX;

  if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
    if (deltaX > 0) {
      changeSlide(-1);
    } else {
      changeSlide(1);
    }
  }
}
