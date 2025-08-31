import {
  ensureProgressBarExists,
  resetProgressBar,
  startProgressBarWithDuration,
  pauseProgressBar,
  resumeProgressBar,
} from "./progressBar.js";
import { changeSlide, updateActiveDot, createDotNavigation, displaySlide } from "./navigation.js";
import { getCurrentIndex, setCurrentIndex } from "./sliderState.js";
import { getConfig } from "./config.js";

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    pauseSlideTimer();
    pauseProgressBar();
  } else {
    resumeSlideTimer();
    resumeProgressBar();
  }
});

let autoSlideTimeout = null;
let slideStartTime = 0;
let remainingTime = 0;
export const SLIDE_DURATION = getConfig().sliderDuration;

export function startSlideTimer() {
  window.mySlider = window.mySlider || {};

  remainingTime = SLIDE_DURATION;
  slideStartTime = Date.now();
  resetProgressBar();
  startProgressBarWithDuration(remainingTime);

  autoSlideTimeout = setTimeout(() => {
    const slides = document.querySelectorAll(".slide");
    const totalSlides = slides.length;
    const currentIdx = getCurrentIndex();

    if (currentIdx === totalSlides - 1) {
      if (window.myListUrl) {
        fetch(window.myListUrl, { cache: "no-cache" })
          .then((response) => response.text())
          .then((currentContent) => {
            if (window.cachedListContent === null) {
              window.cachedListContent = currentContent;
              changeSlide(1);
              stopSlideTimer();
              startSlideTimer();
            } else if (window.cachedListContent !== currentContent) {
              console.log("list.txt değişti, slider reset işlemi başlatılıyor...");
              window.cachedListContent = currentContent;
              if (!window.sliderResetInProgress) {
                window.slidesInit();
              }
            } else {
              changeSlide(1);
              stopSlideTimer();
              startSlideTimer();
            }
          })
          .catch((err) => {
            console.error("list.txt kontrolü sırasında hata:", err);
            changeSlide(1);
            stopSlideTimer();
            startSlideTimer();
          });
      } else {
        changeSlide(1);
        stopSlideTimer();
        startSlideTimer();
      }
    } else {
      changeSlide(1);
      stopSlideTimer();
      startSlideTimer();
    }
  }, remainingTime);

  window.mySlider.autoSlideTimeout = autoSlideTimeout;
}

export function stopSlideTimer() {
  window.mySlider = window.mySlider || {};

  if (autoSlideTimeout) {
    clearTimeout(autoSlideTimeout);
    autoSlideTimeout = null;
    window.mySlider.autoSlideTimeout = null;
  }
}

export function pauseSlideTimer() {
  window.mySlider = window.mySlider || {};

  if (autoSlideTimeout) {
    clearTimeout(autoSlideTimeout);
    autoSlideTimeout = null;
    const elapsed = Date.now() - slideStartTime;
    remainingTime = Math.max(remainingTime - elapsed, 0);
    window.mySlider.autoSlideTimeout = null;
  }
}

export function resumeSlideTimer() {
  window.mySlider = window.mySlider || {};

  if (!autoSlideTimeout && remainingTime > 0) {
    slideStartTime = Date.now();
    resumeProgressBar();
    autoSlideTimeout = setTimeout(() => {
      changeSlide(1);
      stopSlideTimer();
      startSlideTimer();
    }, remainingTime);
    window.mySlider.autoSlideTimeout = autoSlideTimeout;
  }
}
