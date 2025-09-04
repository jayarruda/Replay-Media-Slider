import { getConfig } from './config.js';
import { updateSlidePosition } from './positionUtils.js';

function detectCssVariantFromDom() {
  if (window.__cssVariant) return window.__cssVariant;
  const dv = document.documentElement?.dataset?.cssVariant;
  if (dv) return dv;
  const has = (s) => !!document.querySelector(`link[href*="${s}"]`);
  if (has('normalslider.css')) return 'normalslider';
  if (has('fullslider.css'))   return 'fullslider';
  if (has('slider.css'))       return 'slider';
  return 'slider';
}

function isMobileDevice() {
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches;
  const narrow = window.matchMedia?.('(max-width: 768px)')?.matches;
  const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  return Boolean(coarse || narrow || touch);
}

function getDefaultTopByVariant(variant) {
  const mobile = isMobileDevice();

  if (mobile) {
    switch (variant) {
      case 'normalslider': return -20;
      case 'fullslider': return 0;
      case 'slider':
      default: return 0;
    }
  } else {
    switch (variant) {
      case 'normalslider': return -23;
      case 'fullslider': return -12;
      case 'slider':
      default: return 0;
    }
  }
}

function readUserTopFromLocalStorage() {
  const raw = localStorage.getItem('homeSectionsTop');
  if (raw === null || raw === '') return null;

  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return null;

  return n;
}

function applyTopToElements(vh) {
  const elements = [
    ...document.querySelectorAll('.homeSectionsContainer'),
    document.querySelector('#favoritesTab')
  ];
  elements.forEach(el => {
    if (!el) return;
    el.style.setProperty('top', `${vh}vh`, 'important');
  });
}

export function forceHomeSectionsTop() {
  const applyAlways = () => {
    const cfg = (typeof getConfig === 'function') ? getConfig() : {};
    const userTop = readUserTopFromLocalStorage();
    const hasCustomTop = (userTop !== null);
    const variant = cfg.cssVariant || detectCssVariantFromDom();
    const effectiveTop = hasCustomTop ? userTop : getDefaultTopByVariant(variant);
    applyTopToElements(effectiveTop);
    waitForFavoritesTabAndApply(effectiveTop);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAlways);
  } else {
    applyAlways();
  }

  const observer = new MutationObserver(applyAlways);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: false
  });
}

function waitForFavoritesTabAndApply(topValue) {
  let tries = 0;
  function attempt() {
    const el = document.querySelector('#favoritesTab');
    if (el) {
      el.style.setProperty('top', `${topValue}vh`, 'important');
      return;
    }
    if (++tries < 30) setTimeout(attempt, 100);
  }
  attempt();
}

export function forceSkinHeaderPointerEvents() {
  const apply = () => {
    document.querySelectorAll('html .skinHeader').forEach(el => {
      el.style.setProperty('pointer-events', 'all', 'important');
    });

    const playerToggle = document.querySelector('button#jellyfinPlayerToggle');
    if (playerToggle) {
      playerToggle.style.setProperty('display', 'block', 'important');
      playerToggle.style.setProperty('opacity', '1', 'important');
      playerToggle.style.setProperty('pointer-events', 'all', 'important');
      playerToggle.style.setProperty('background', 'none', 'important');
      playerToggle.style.setProperty('text-shadow', 'rgb(255, 255, 255) 0px 0px 2px', 'important');
      playerToggle.style.setProperty('cursor', 'pointer', 'important');
      playerToggle.style.setProperty('border', 'none', 'important');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: false
  });
}
