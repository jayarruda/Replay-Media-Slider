import { stopSlideTimer, startSlideTimer } from "./timer.js";
import { SLIDE_DURATION } from "./timer.js";
import { getConfig } from './config.js';
import { ensureProgressBarExists, resetProgressBar, startProgressBarWithDuration, pauseProgressBar, resumeProgressBar } from "./progressBar.js";
import { getCurrentIndex, setCurrentIndex, getSlideDuration, setAutoSlideTimeout, getAutoSlideTimeout, setSlideStartTime, getSlideStartTime, setRemainingTime, getRemainingTime } from "./sliderState.js";
import { applyContainerStyles } from "./positionUtils.js"

const config = getConfig();

let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50;

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
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentIndex);
  });
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
      const dot = document.createElement("div");
      dot.className = "dot poster-dot";
      dot.dataset.index = index;

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

      dot.classList.toggle("active", index === currentIndex);

      dot.addEventListener("click", () => {
        if (index !== getCurrentIndex()) {
          changeSlide(index - getCurrentIndex());
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

    if (dotType !== "none") {
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

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function centerActiveDot() {
  const scrollWrapper = document.querySelector(".dot-scroll-wrapper");
  const activeDot = scrollWrapper?.querySelector(".poster-dot.active");
  if (!scrollWrapper || !activeDot) return;

  const wrapperRect = scrollWrapper.getBoundingClientRect();
  const dotRect = activeDot.getBoundingClientRect();

  const isFullyVisible =
    dotRect.left >= wrapperRect.left &&
    dotRect.right <= wrapperRect.right;

  const dotCenter = dotRect.left + dotRect.width / 2;
  const isCentered =
    dotCenter > wrapperRect.left + wrapperRect.width * 0.4 &&
    dotCenter < wrapperRect.right - wrapperRect.width * 0.4;

  if (isFullyVisible && isCentered) return;

  const scrollAmount = activeDot.offsetLeft - (scrollWrapper.clientWidth / 1) + (activeDot.offsetWidth / 2);
  const currentScroll = scrollWrapper.scrollLeft;

  if (Math.abs(currentScroll - scrollAmount) > 10) {
    scrollWrapper.scrollTo({ left: scrollAmount, behavior: "smooth" });
  }
}


export function displaySlide(index) {
  console.log(`Slayt gösteriliyor: ${index}`);
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) return;

  const slides = indexPage.querySelectorAll(".slide");
  const currentSlide = slides[index];

  slides.forEach(slide => {
    slide.style.opacity = "0";
    slide.classList.remove("active");
    setTimeout(() => {
      if (!slide.classList.contains("active")) {
        slide.style.display = "none";
      }
    }, 300);
  });

  currentSlide.style.display = "block";
  setTimeout(() => {
    currentSlide.style.opacity = "1";
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
  createDotNavigation();
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
