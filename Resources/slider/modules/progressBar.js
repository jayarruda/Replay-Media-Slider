import { startSlideTimer, stopSlideTimer, pauseSlideTimer, resumeSlideTimer, SLIDE_DURATION } from "./timer.js";
import {
  getCurrentIndex, setCurrentIndex, getSlideDuration, setAutoSlideTimeout, getAutoSlideTimeout,
  setSlideStartTime, getSlideStartTime, setRemainingTime, getRemainingTime
} from "./sliderState.js";
import { attachMouseEvents, setupVisibilityHandler } from "./events.js";
import { getConfig } from './config.js';
import { applyContainerStyles } from "./positionUtils.js";

let progressBarEl = null;
let secondsEl = null;
let pausedProgress = 0;
let secondsTimer = null;
let secondsPausedMs = 0;
let secondsEndAt = 0;

function getSlidesContainer() {
  return document.querySelector("#indexPage:not(.hide) #slides-container");
}

function useSecondsMode() {
  const cfg = getConfig();
  return !!(cfg.showProgressBar && cfg.showProgressAsSeconds);
}

export function ensureProgressBarExists() {
  if (!getConfig().showProgressBar || useSecondsMode()) {
    if (progressBarEl && document.body.contains(progressBarEl)) {
      progressBarEl.remove();
      progressBarEl = null;
    }
    return null;
  }
  if (progressBarEl && !document.body.contains(progressBarEl)) progressBarEl = null;

  if (!progressBarEl) {
    progressBarEl = document.querySelector(".slide-progress-bar");
    if (!progressBarEl) {
      progressBarEl = document.createElement("div");
      progressBarEl.className = "slide-progress-bar";
      applyContainerStyles(progressBarEl, 'progress');
      const sc = getSlidesContainer();
      if (sc) sc.appendChild(progressBarEl);
    }
  }
  return progressBarEl;
}

function ensureSecondsExists() {
  if (!useSecondsMode()) {
    if (secondsEl && document.body.contains(secondsEl)) {
      secondsEl.remove();
      secondsEl = null;
    }
    clearSecondsTimer();
    return null;
  }
  if (secondsEl && !document.body.contains(secondsEl)) secondsEl = null;

  if (!secondsEl) {
    secondsEl = document.querySelector(".slide-progress-seconds");
    if (!secondsEl) {
      secondsEl = document.createElement("div");
      secondsEl.className = "slide-progress-seconds";
      applyContainerStyles(secondsEl, 'progressSeconds');
      const sc = getSlidesContainer();
      if (sc) sc.appendChild(secondsEl);
    }
  }
  return secondsEl;
}

function clearSecondsTimer() {
  if (secondsTimer) {
    clearInterval(secondsTimer);
    secondsTimer = null;
  }
}

export function resetProgressBar() {
  if (useSecondsMode()) {
    const el = ensureSecondsExists();
    if (!el) return;
    clearSecondsTimer();
    const dur = getSlideDuration?.() || SLIDE_DURATION;
    secondsPausedMs = 0;
    secondsEndAt = 0;
    el.textContent = Math.ceil(dur / 1000).toString();
    if (progressBarEl) { progressBarEl.style.width = "0%"; }
    return;
  }

  const bar = ensureProgressBarExists();
  if (!bar) return;
  bar.style.transition = "none";
  bar.style.animation = "none";
  bar.style.width = "0%";
  void bar.offsetWidth;
  pausedProgress = 0;
}

export function startProgressBarWithDuration(duration) {
  if (useSecondsMode()) {
    const el = ensureSecondsExists();
    if (!el) return;
    clearSecondsTimer();
    const now = performance.now();
    secondsEndAt = now + duration;
    secondsPausedMs = 0;
    el.textContent = Math.max(0, Math.ceil(duration / 1000)).toString();
    secondsTimer = setInterval(() => {
      const t = secondsEndAt - performance.now();
      const left = Math.max(0, Math.ceil(t / 1000));
      el.textContent = left.toString();
      if (t <= 0) {
        clearSecondsTimer();
      }
    }, 100);
    return;
  }

  const bar = ensureProgressBarExists();
  if (!bar) return;
  bar.offsetWidth;
  bar.style.transition = `width ${duration}ms linear`;
  bar.style.width = `${getConfig().progressBarWidth}%`;
}

export function pauseProgressBar() {
  if (useSecondsMode()) {
    const el = ensureSecondsExists();
    if (!el) return;
    if (secondsEndAt) {
      secondsPausedMs = Math.max(0, secondsEndAt - performance.now());
    } else {
      secondsPausedMs = 0;
    }
    clearSecondsTimer();
    return;
  }

  const bar = ensureProgressBarExists();
  if (!bar) return;
  const computedWidth = parseFloat(window.getComputedStyle(bar).width);
  const containerWidth = parseFloat(window.getComputedStyle(bar.parentElement).width);
  pausedProgress = (computedWidth / containerWidth) * 100;
  bar.style.transition = "none";
  bar.style.width = `${pausedProgress}%`;
}

export function resumeProgressBar() {
  if (useSecondsMode()) {
    const el = ensureSecondsExists();
    if (!el) return;
    const remaining = secondsPausedMs > 0 ? secondsPausedMs : 0;
    const now = performance.now();
    secondsEndAt = now + remaining;
    clearSecondsTimer();
    secondsTimer = setInterval(() => {
      const t = secondsEndAt - performance.now();
      const left = Math.max(0, Math.ceil(t / 1000));
      el.textContent = left.toString();
      if (t <= 0) clearSecondsTimer();
    }, 100);
    return;
  }

  const bar = ensureProgressBarExists();
  if (!bar) return;
  const remainingTime = (100 - pausedProgress) * (SLIDE_DURATION / 100);
  bar.offsetWidth;
  bar.style.transition = `width ${remainingTime}ms linear`;
  bar.style.width = `${getConfig().progressBarWidth}%`;
}
