import { startSlideTimer, stopSlideTimer, pauseSlideTimer, resumeSlideTimer, SLIDE_DURATION } from "./timer.js";
import { getCurrentIndex, setCurrentIndex, getSlideDuration, setAutoSlideTimeout, getAutoSlideTimeout, setSlideStartTime, getSlideStartTime, setRemainingTime, getRemainingTime } from "./sliderState.js";
import { attachMouseEvents, setupVisibilityHandler } from "./events.js";
import { getConfig } from './config.js';
import { applyContainerStyles } from "./positionUtils.js"

let progressBar = null;
let pausedProgress = 0;

export function ensureProgressBarExists() {
  if (!getConfig().showProgressBar) {
    if (progressBar && document.body.contains(progressBar)) {
      progressBar.remove();
      progressBar = null;
    }
    return null;
  }
  if (progressBar && !document.body.contains(progressBar)) {
    progressBar = null;
  }
  if (!progressBar) {
    progressBar = document.querySelector(".slide-progress-bar");
    if (!progressBar) {
      progressBar = document.createElement("div");
      progressBar.className = "slide-progress-bar";
      applyContainerStyles(progressBar, 'progress');
      const slidesContainer = document.querySelector("#indexPage:not(.hide) #slides-container");
      if (slidesContainer) slidesContainer.appendChild(progressBar);
    }
  }
  return progressBar;
}

export function resetProgressBar() {
  const progressBar = ensureProgressBarExists();
  if (!progressBar) return;

  progressBar.style.transition = "none";
  progressBar.style.animation = "none";
  progressBar.style.width = "0%";
  void progressBar.offsetWidth;
  // const clone = progressBar.cloneNode(true);
  // progressBar.replaceWith(clone);
  pausedProgress = 0;
}

export function startProgressBarWithDuration(duration) {
  const progressBar = ensureProgressBarExists();
  if (!progressBar) return;
  progressBar.offsetWidth;
  progressBar.style.transition = `width ${duration}ms linear`;
  progressBar.style.width = `${getConfig().progressBarWidth}%`;
}

export function pauseProgressBar() {
  const progressBar = ensureProgressBarExists();
  if (!progressBar) return;
  const computedWidth = parseFloat(window.getComputedStyle(progressBar).width);
  const containerWidth = parseFloat(window.getComputedStyle(progressBar.parentElement).width);
  pausedProgress = (computedWidth / containerWidth) * 100;
  progressBar.style.transition = "none";
  progressBar.style.width = `${pausedProgress}%`;
}

export function resumeProgressBar() {
  const progressBar = ensureProgressBarExists();
  if (!progressBar) return;
  const remainingTime = (100 - pausedProgress) * (SLIDE_DURATION / 100);
  progressBar.offsetWidth;
  progressBar.style.transition = `width ${remainingTime}ms linear`;
  progressBar.style.width = `${getConfig().progressBarWidth}%`;
}
