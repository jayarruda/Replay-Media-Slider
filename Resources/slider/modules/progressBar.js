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
let __pbInited = false;

function now() { return performance.now(); }

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
    Object.assign(progressBarEl.style, {
      transformOrigin: '0 50%',
      willChange: 'transform',
      width: (getConfig().progressBarWidth || 100) + '%'
    });
    __pbInited = true;
  } else {
    const sc = getSlidesContainer();
    if (sc && progressBarEl.parentElement !== sc) sc.appendChild(progressBarEl);
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
  } else {
    const sc = getSlidesContainer();
    if (sc && secondsEl.parentElement !== sc) sc.appendChild(secondsEl);
   }
   return secondsEl;
 }

function clearSecondsTimer() {
  if (secondsTimer) {
    clearInterval(secondsTimer);
    secondsTimer = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (!useSecondsMode()) return;
  if (document.hidden) {
    pauseProgressBar();
  } else {
    resumeProgressBar();
  }
}, { passive: true });

export function resetProgressBar() {
  const dur = (typeof getSlideDuration === 'function' ? (getSlideDuration() || SLIDE_DURATION) : SLIDE_DURATION);

  if (useSecondsMode()) {
    const el = ensureSecondsExists();
    if (!el) return;
    clearSecondsTimer();
    secondsPausedMs = 0;
    secondsEndAt = 0;
    el.textContent = Math.ceil(dur / 1000).toString();
    if (progressBarEl) { progressBarEl.style.width = "0%"; }
    setSlideStartTime(now());
    setRemainingTime(dur);
    return;
  }

  const bar = ensureProgressBarExists();
  if (!bar) return;
  pausedProgress = 0;
  bar.style.transition = "none";
  bar.style.animation = "none";
  bar.style.transform = "scaleX(0)";
  setSlideStartTime(now());
  setRemainingTime(dur);
  void bar.offsetWidth;
}

export function startProgressBarWithDuration(duration) {
  const dur = Math.max(0, duration ?? (typeof getSlideDuration === 'function' ? (getSlideDuration() || SLIDE_DURATION) : SLIDE_DURATION));

  if (useSecondsMode()) {
    const el = ensureSecondsExists();
    if (!el) return;
    clearSecondsTimer();
    const t0 = now();
    secondsEndAt = t0 + dur;
    secondsPausedMs = 0;
    el.textContent = Math.max(0, Math.ceil(dur / 1000)).toString();
    secondsTimer = setInterval(() => {
      const t = secondsEndAt - now();
      const left = Math.max(0, Math.ceil(t / 1000));
      el.textContent = left.toString();
      if (t <= 0) {
        clearSecondsTimer();
      }
    }, 100);
    setSlideStartTime(t0);
    setRemainingTime(dur);
    return;
  }

  const bar = ensureProgressBarExists();
  if (!bar) return;
  const targetScale = Math.max(0, Math.min(1, (getConfig().progressBarWidth || 100) / 100));
  const t0 = now();
  setSlideStartTime(t0);
  setRemainingTime(dur);
  pausedProgress = 0;

  bar.style.transition = 'none';
  bar.style.transform = 'scaleX(0)';
  requestAnimationFrame(() => {
    bar.style.transition = `transform ${dur}ms linear`;
    bar.style.transform = `scaleX(${targetScale})`;
  });
}

export function pauseProgressBar() {
  const dur = (typeof getSlideDuration === 'function' ? (getSlideDuration() || SLIDE_DURATION) : SLIDE_DURATION);

  if (useSecondsMode()) {
    const el = ensureSecondsExists();
    if (!el) return;
    if (secondsEndAt) {
      secondsPausedMs = Math.max(0, secondsEndAt - now());
    } else {
      secondsPausedMs = 0;
    }
    clearSecondsTimer();
    const t0 = getSlideStartTime?.() || now();
    const elapsed = Math.max(0, Math.min(dur, now() - t0));
    setRemainingTime(dur - elapsed);
    return;
  }

  const bar = ensureProgressBarExists();
  if (!bar) return;

  const t0 = getSlideStartTime?.() || now();
  const elapsed = Math.max(0, Math.min(dur, now() - t0));
  const doneFrac = dur > 0 ? (elapsed / dur) : 0;
  pausedProgress = Math.max(0, Math.min(100, doneFrac * 100));

  const targetScale = Math.max(0, Math.min(1, (getConfig().progressBarWidth || 100) / 100));
  const currentScale = targetScale * (pausedProgress / 100);
  bar.style.transition = 'none';
  bar.style.transform = `scaleX(${currentScale})`;

  setRemainingTime(dur - elapsed);
}

export function resumeProgressBar() {
  const dur = (typeof getSlideDuration === 'function' ? (getSlideDuration() || SLIDE_DURATION) : SLIDE_DURATION);

  if (useSecondsMode()) {
    const el = ensureSecondsExists();
    if (!el) return;
    const remaining = secondsPausedMs > 0 ? secondsPausedMs : 0;
    const t0 = now();
    secondsEndAt = t0 + remaining;
    clearSecondsTimer();
    secondsTimer = setInterval(() => {
      const t = secondsEndAt - now();
      const left = Math.max(0, Math.ceil(t / 1000));
      el.textContent = left.toString();
      if (t <= 0) clearSecondsTimer();
    }, 100);
    setSlideStartTime(t0 - (dur - remaining));
    setRemainingTime(remaining);
    return;
  }

  const bar = ensureProgressBarExists();
  if (!bar) return;

  const prevRemaining = getRemainingTime?.();
  const total = dur;
  let remainingTime = typeof prevRemaining === 'number' && isFinite(prevRemaining)
    ? Math.max(0, Math.min(total, prevRemaining))
    : Math.max(0, (1 - (pausedProgress / 100)) * total);

  const targetScale = Math.max(0, Math.min(1, (getConfig().progressBarWidth || 100) / 100));
  const startScale = Math.max(0, Math.min(1, (1 - (remainingTime / total)) * targetScale));

  bar.style.transition = 'none';
  bar.style.transform = `scaleX(${startScale})`;

  const t0 = now();
  setSlideStartTime(t0 - (total - remainingTime));

  requestAnimationFrame(() => {
    bar.style.transition = `transform ${remainingTime}ms linear`;
    bar.style.transform = `scaleX(${targetScale})`;
  });
}
