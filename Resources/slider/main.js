import { saveCredentials, saveApiKey, getAuthToken } from "./auth.js";
import { getConfig } from "./modules/config.js";
import { getCurrentIndex, setCurrentIndex } from "./modules/sliderState.js";
import { startSlideTimer, stopSlideTimer } from "./modules/timer.js";
import { ensureProgressBarExists, resetProgressBar } from "./modules/progressBar.js";
import { createSlide } from "./modules/slideCreator.js";
import { changeSlide, createDotNavigation} from "./modules/navigation.js";
import { attachMouseEvents } from "./modules/events.js";
import { fetchItemDetails } from "./modules/api.js";
import { forceHomeSectionsTop, forceSkinHeaderPointerEvents } from "./modules/positionOverrides.js";
import { setupPauseScreen } from "./modules/pauseModul.js";
import { updateHeaderUserAvatar, initAvatarSystem } from "./modules/userAvatar.js";
import { initializeQualityBadges, primeQualityFromItems, annotateDomWithQualityHints } from "./modules/qualityBadges.js";
import { initNotifications, forcejfNotifBtnPointerEvents } from "./modules/notifications.js";
import { startUpdatePolling } from "./modules/update.js";
import { ensureStudioHubsMounted } from "./modules/studioHubs.js";
import { updateSlidePosition } from "./modules/positionUtils.js";
import { renderPersonalRecommendations } from "./modules/personalRecommendations.js";
import { setupHoverForAllItems  } from "./modules/hoverTrailerModal.js";
import { teardownAnimations } from "./modules/animations.js";

const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
window.__totalSlidesPlanned = 0;
window.__slidesCreated = 0;
window.__cycleStartAt = 0;
window.__cycleArmTimeout = null;
window.__cycleExpired = window.__cycleExpired || false;

function clearCycleArm() {
  try { clearTimeout(window.__cycleArmTimeout); } catch {}
  window.__cycleArmTimeout = null;
}

function getPerSlideDurationMs() {
  const pb = document.querySelector(".slide-progress-bar");
  if (pb) {
    const raw = getComputedStyle(pb).getPropertyValue("--slide-duration-ms");
    const v = parseInt(raw, 10);
    if (Number.isFinite(v) && v > 0) return v;
    const td = getComputedStyle(pb).transitionDuration;
    if (td && td.endsWith("s")) {
      const sec = parseFloat(td);
      if (sec > 0) return Math.round(sec * 1000);
    }
  }
  const cfg = getConfig?.() || {};
  return Number.isFinite(cfg.sliderDuration) ? cfg.sliderDuration
       : Number.isFinite(cfg.slideDurationMs) ? cfg.slideDurationMs
       : Number.isFinite(cfg.autoSlideIntervalMs) ? cfg.autoSlideIntervalMs
       : 15000;
}

function getCycleDurationMs() {
  const per = getPerSlideDurationMs();
  const total = getPlannedTotalSlides();
  return per * total;
}

function armCycleReset() {
  clearCycleArm();
  const cycleMs = getCycleDurationMs();
  const elapsed = Math.max(0, Date.now() - (window.__cycleStartAt || 0));
  const remain = Math.max(0, cycleMs - elapsed);

  window.__cycleArmTimeout = setTimeout(() => {
    const active = document.querySelector("#indexPage:not(.hide) .slide.active, #homePage:not(.hide) .slide.active");
    const idx = getSlideIndex(active);

    if (isPlannedLastIndex(idx)) {
      scheduleSliderRebuild("cycle-time-hit-on-last");
    } else {
      window.__cycleExpired = true;
    }
  }, remain);
}

function startNewCycleClock() {
  window.__cycleStartAt = Date.now();
  window.__cycleExpired = false;
  armCycleReset();
}

function markSlideCreated() {
  window.__slidesCreated = (window.__slidesCreated || 0) + 1;
  if (window.__totalSlidesPlanned > 0 && window.__slidesCreated >= window.__totalSlidesPlanned) {
    try {
      document.dispatchEvent(new CustomEvent("jms:all-slides-ready"));
    } catch {}
  }
}

function hardProgressReset() {
  ensureProgressBarExists();
  const pb = document.querySelector(".slide-progress-bar");
  if (!pb) return;
  console.debug("[JMS] hardProgressReset()");
  pb.style.transition = "none";
  pb.style.animation = "none";
  pb.style.width = "0%";
  pb.style.opacity = "1";
  void pb.offsetWidth;
  try { resetProgressBar?.(); } catch {}
  const newPb = pb.cloneNode(true);
  pb.replaceWith(newPb);
}

function getPlannedTotalSlides() {
  let n = parseInt(window.__totalSlidesPlanned || "0", 10);
  if (!Number.isFinite(n) || n <= 0) {
    const ls = parseInt(localStorage.getItem("limit") || "0", 10);
    if (Number.isFinite(ls) && ls > 0) n = ls;
  }
  if ((!Number.isFinite(n) || n <= 0) && typeof getConfig === "function") {
    const cfg = getConfig();
    const c = parseInt(cfg?.limit || cfg?.savedLimit || "0", 10);
    if (Number.isFinite(c) && c > 0) n = c;
  }
  return Math.max(1, n);
}

function getPlannedLastIndex() {
  return getPlannedTotalSlides() - 1;
}

function isPlannedLastIndex(idx) {
  return Number.isFinite(idx) && idx === getPlannedLastIndex();
}

async function scheduleSliderRebuild(reason = "cycle-complete") {
  if (window.__rebuildingSlider) return;
  window.__rebuildingSlider = true;
  try {
    clearCycleArm();
    window.__cycleExpired = false;
    try { teardownAnimations(); } catch {}
    try { window.__cleanupActiveWatch?.(); } catch {}
    try { window.cleanupModalObserver?.(); } catch {}
    try { stopSlideTimer?.(); } catch {}
    try { hardProgressReset?.(); } catch {}
    try { fullSliderReset(); } catch {}
    document.querySelectorAll(".dot-navigation-container").forEach(n => n.remove());
    await new Promise(r => setTimeout(r, 30));
    initializeSliderOnHome();
  } finally {
    window.__rebuildingSlider = false;
  }
}

function getSlidesNodeList() {
  const idxPage = document.querySelector("#indexPage:not(.hide), #homePage:not(.hide)");
  return idxPage ? idxPage.querySelectorAll(".slide") : null;
}
function getSlideIndex(el) {
  const slides = getSlidesNodeList();
  return slides ? Array.from(slides).indexOf(el) : -1;
}
function getTotalSlides() {
  const slides = getSlidesNodeList();
  return slides ? slides.length : 0;
}
function isLastIndex(i) {
  const total = getTotalSlides();
  return total > 0 && i === total - 1;
}


function getSlideDurationMs() {
  const pb = document.querySelector(".slide-progress-bar");
  if (pb) {
    const raw = getComputedStyle(pb).getPropertyValue("--slide-duration-ms");
    const v = parseInt(raw, 10);
    if (Number.isFinite(v) && v > 0) return v;
    const td = getComputedStyle(pb).transitionDuration;
    if (td && td.endsWith("s")) {
      const sec = parseFloat(td);
      if (sec > 0) return Math.round(sec * 1000);
    }
  }

  if (config && Number.isFinite(config.autoSlideIntervalMs)) return config.autoSlideIntervalMs;
  if (config && Number.isFinite(config.slideDurationMs)) return config.slideDurationMs;
  return 15000;
}

(async function bootstrapCredentials() {
  try {
    const token = getAuthToken();
    if (!token || localStorage.getItem("json-credentials")) return;

    saveApiKey(token);
    const res = await fetch(`/Sessions?UserId=&api_key=${token}`);
    if (!res.ok) throw new Error("Sessions alınamadı");

    const sessions = await res.json();
    const sess = sessions
      .filter((s) => s.UserId)
      .sort((a, b) => new Date(b.LastActivityDate) - new Date(a.LastActivityDate))[0];

    if (!sess) throw new Error("Oturum bulunamadı");
    const creds = {
      AccessToken: token,
      SessionId: sess.Id,
      User: { Id: sess.UserId },
      DeviceId: sess.DeviceId || "web-client",
      Client: sess.Client || "Jellyfin Web Client",
      Version: sess.Version || "1.0.0",
    };

    saveCredentials(creds);
  } catch (e) {
    console.warn("bootstrapCredentials hatası:", e);
  }
})();

(function applySafePauseShim() {
  try {
    if (window.__safePauseShim) return;
    window.__safePauseShim = true;
    const EP = window.Element && window.Element.prototype;
    if (!EP) return;
    if (!("pause" in EP)) {
      Object.defineProperty(EP, "pause", {
        value: function pause() {},
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
  } catch (err) {
    console.warn("safePauseShim init error:", err);
  }
})();

const config = getConfig();
let cleanupPauseOverlay = null;
let pauseBooted = false;
let navObsBooted = false;
window.sliderResetInProgress = window.sliderResetInProgress || false;

(function preloadPersonalRecsCSS() {
    if (document.getElementById("personalRecsCss")) return;
    const link = document.createElement("link");
    link.id = "personalRecsCss";
    link.rel = "stylesheet";
    link.href = "slider/src/personalRecommendations.css";
    document.head.appendChild(link);
})();

(function injectNotifCriticalCSS() {
  if (document.getElementById("jfNotifCritical")) return;
  const style = document.createElement("style");
  style.id = "jfNotifCritical";
  style.textContent = `
    :root[data-notif-theme=light]{--jf-notif-text:#2d3748;--jf-notif-accent:#e91e63;--jf-notif-border:rgba(45,55,72,.1);--jf-notif-up:#fff}
    :root[data-notif-theme=dark]{--jf-notif-text:#fff;--jf-notif-accent:#e91e63;--jf-notif-border:hsla(0,0%,100%,.1);--jf-notif-up:rgba(0,0,0,.1)}
    #jfNotifBtn{position:relative;overflow:visible}
    .skinHeader .headerRight #jfNotifBtn { order: -9999; }
    #jfNotifBtn[data-has-notifs=true]{color:var(--jf-notif-accent)}
    #jfNotifBtn[data-has-notifs=true]::after{
      content:attr(data-count);position:absolute;right:1px;top:-2px;z-index:2;
      display:inline-flex;align-items:center;justify-content:center;
      width:12px;height:12px;border-radius:50px;font-size:10px;padding:3px;
      background:var(--jf-notif-up);color:var(--jf-notif-accent);backdrop-filter:blur(10px)
    }
    .jf-notif-modal.open{right:0}
    .jf-notif-backdrop{position:absolute;inset:0;opacity:0;transition:opacity .3s}
    .jf-notif-modal.open .jf-notif-backdrop{opacity:1}
    .jf-notif-panel{position:absolute;width:400px;height:100%;overflow:hidden}
  `;
  const head = document.head || document.getElementsByTagName("head")[0];
  head.prepend(style);
})();

(function preloadNotifCSSFast() {
  if (document.getElementById("jfNotifCss")) return;
  const preload = document.createElement("link");
  preload.id = "jfNotifCssPreload";
  preload.rel = "preload";
  preload.as = "style";
  preload.href = "slider/src/notifications.css";
  try { preload.fetchPriority = "high"; } catch {}
  preload.setAttribute("fetchpriority", "high");
  preload.onload = function () {
    const sheet = document.createElement("link");
    sheet.id = "jfNotifCss";
    sheet.rel = "stylesheet";
    sheet.type = "text/css";
    sheet.href = preload.href;
    requestAnimationFrame(() => {
      preload.replaceWith(sheet);
    });
  };
  preload.onerror = function () {
    const fallback = document.createElement("link");
    fallback.id = "jfNotifCss";
    fallback.rel = "stylesheet";
    fallback.type = "text/css";
    fallback.href = preload.href;
    preload.replaceWith(fallback);
  };
  (document.head || document.documentElement).prepend(preload);
})();

(function ensurePauseCss() {
  if (!document.getElementById("jms-pause-css")) {
    const link = document.createElement("link");
    link.id = "jms-pause-css";
    link.rel = "stylesheet";
    link.href = "slider/src/pauseModul.css";
    document.head.appendChild(link);
  }
})();

function startPauseOverlayOnce() {
  if (pauseBooted) return;
  cleanupPauseOverlay = setupPauseScreen();
  pauseBooted = true;
}
function restartPauseOverlay() {
  if (cleanupPauseOverlay) {
    try {
      cleanupPauseOverlay();
    } catch {}
  }
  pauseBooted = false;
  startPauseOverlayOnce();
}

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

function loadExternalCSS(path) {
  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "style";
  preload.href = path;
  try { preload.fetchPriority = "high"; } catch {}
  preload.setAttribute("fetchpriority", "high");
  preload.onload = function () {
    const sheet = document.createElement("link");
    sheet.rel = "stylesheet";
    sheet.href = path;
    requestAnimationFrame(() => preload.replaceWith(sheet));
  };
  preload.onerror = function () {
    const sheet = document.createElement("link");
    sheet.rel = "stylesheet";
    sheet.href = path;
    preload.replaceWith(sheet);
  };
  (document.head || document.documentElement).prepend(preload);
 }

const cssPath =
  config.cssVariant === "fullslider"
    ? "./slider/src/fullslider.css"
    : config.cssVariant === "normalslider"
    ? "./slider/src/normalslider.css"
    : "./slider/src/slider.css";
loadExternalCSS(cssPath);

window.__cssVariant = config.cssVariant === "fullslider" ? "fullslider" : config.cssVariant === "normalslider" ? "normalslider" : "slider";
document.documentElement.dataset.cssVariant = window.__cssVariant;

function setupGlobalModalInit() {
  setupHoverForAllItems();
  idle(() => {
    if (!window.hls) loadHls().catch(() => {});
  });
  const observer = observeDOMChanges();
  return () => observer.disconnect();
}
const cleanupModalObserver = setupGlobalModalInit();
window.cleanupModalObserver = cleanupModalObserver;

forceSkinHeaderPointerEvents();
forceHomeSectionsTop();
forcejfNotifBtnPointerEvents();
updateHeaderUserAvatar();
initNotifications();

document.addEventListener("DOMContentLoaded", () => {
  if (config.enableQualityBadges && !window.__qualityBadgesBooted) {
    window.__qualityBadgesBooted = true;
    try {
      window.cleanupQualityBadges = initializeQualityBadges();
    } catch {}
  }
});

function fullSliderReset() {
  try { teardownAnimations(); } catch {}
  forceSkinHeaderPointerEvents();
  forceHomeSectionsTop();

  if (window.intervalChangeSlide) {
    clearInterval(window.intervalChangeSlide);
    window.intervalChangeSlide = null;
  }
  if (window.sliderTimeout) {
    clearTimeout(window.sliderTimeout);
    window.sliderTimeout = null;
  }
  if (window.autoSlideTimeout) {
    clearTimeout(window.autoSlideTimeout);
    window.autoSlideTimeout = null;
  }

  setCurrentIndex(0);
  stopSlideTimer();
  cleanupSlider();
  clearCycleArm();
  window.__cycleStartAt = 0;
  window.__cycleExpired = false;
  window.mySlider = {};
  window.cachedListContent = "";
}

function extractItemTypesFromQuery(query) {
  const match = query.match(/IncludeItemTypes=([^&]+)/i);
  if (!match) return [];
  return match[1].split(",").map((t) => t.trim());
}
function hasAllTypes(targetTypes, requiredTypes) {
  return requiredTypes.every((t) => targetTypes.includes(t));
}

export async function loadHls() {
  if (window.hls) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `/web/slider/modules/hlsjs/hls.min.js`;
    script.onload = resolve;
    script.onerror = () => reject(new Error("hls yüklenemedi"));
    document.head.appendChild(script);
  });
}

function observeDOMChanges() {
  const observer = new MutationObserver((mutations) => {
    if (document.documentElement.dataset.jmsSoftBlock === "1") return;
    mutations.forEach((mutation) => {
      if (!mutation.addedNodes.length) return;
      const relevantContainers = ["cardImageContainer"];

      const isRelevant = Array.from(mutation.addedNodes).some((node) => {
        if (node.nodeType === 1 && relevantContainers.some((c) => node.classList?.contains(c))) {
          return true;
        }
        return relevantContainers.some((c) => node.querySelector?.(`.${c}`));
      });

      if (isRelevant) {
        setupHoverForAllItems();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-id", "class"],
  });

  return observer;
}

function hydrateSlideMedia(slide) {
  if (!slide) return;
  slide
    .querySelectorAll("img[data-src],img[data-lazy],img[data-original],img[data-image]")
    .forEach((img) => {
      const src =
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-image");
      if (src && !img.src) {
        img.src = src;
        img.removeAttribute("data-src");
        img.removeAttribute("data-lazy");
        img.removeAttribute("data-original");
        img.removeAttribute("data-image");
      }
    });
  const overlay = slide.querySelector(".gradient-overlay");
  let bg =
    slide.getAttribute("data-backdrop") ||
    slide.getAttribute("data-bg") ||
    slide.getAttribute("data-bg-src") ||
    overlay?.getAttribute("data-backdrop") ||
    overlay?.getAttribute("data-bg") ||
    overlay?.getAttribute("data-bg-src");
  if (overlay && bg && !overlay.style.backgroundImage) {
    overlay.style.backgroundImage = `url("${bg}")`;
  }
  slide.querySelectorAll("[data-backdrop],[data-bg],[data-bg-src]").forEach((el) => {
    const u = el.getAttribute("data-backdrop") || el.getAttribute("data-bg") || el.getAttribute("data-bg-src");
    if (u && !el.style.backgroundImage) el.style.backgroundImage = `url("${u}")`;
  });
  slide.style.visibility = "visible";
  slide.removeAttribute("aria-hidden");
  slide.style.opacity = "";
  slide.style.filter = "";
  slide.style.display = "";
  slide.classList.remove("lazyloaded", "lazyload");
  slide.classList.remove("is-loading", "hidden", "hide");
}

function safeRaf(fn) {
  return requestAnimationFrame(() => requestAnimationFrame(fn));
}
function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function upsertSlidesContainerAtTop(indexPage) {
  if (!indexPage) return null;
  let c = indexPage.querySelector("#slides-container");
  if (!c) {
    c = document.createElement("div");
    c.id = "slides-container";
  } else {
    if (c.parentElement) c.parentElement.removeChild(c);
  }

  const deepAnchor = indexPage.querySelector(".homeSectionsContainer");
  let anchorTop = null;
  if (deepAnchor) {
    let cur = deepAnchor;
    while (cur && cur.parentElement && cur.parentElement !== indexPage) {
      cur = cur.parentElement;
    }
    if (cur && cur.parentElement === indexPage) {
      anchorTop = cur;
    }
  }

  if (anchorTop) {
    indexPage.insertBefore(c, anchorTop);
  } else if (indexPage.firstElementChild) {
    indexPage.insertBefore(c, indexPage.firstElementChild);
  } else {
    indexPage.appendChild(c);
  }
  try {
    updateSlidePosition();
  } catch {}
  return c;
}

function isVisible(el) {
  if (!el) return false;
  if (el.classList?.contains("hide")) return false;
  const rect = el.getBoundingClientRect?.();
  return !!rect && rect.width >= 1 && rect.height >= 1;
}

export function waitForAnyVisible(selectors, { timeout = 20000 } = {}) {
  return new Promise((resolve) => {
    const check = () => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && isVisible(el)) {
          cleanup();
          resolve(el);
          return true;
        }
      }
      return false;
    };
    const mo = new MutationObserver(() => {
      check();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    const to = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeout);
    function cleanup() {
      clearTimeout(to);
      mo.disconnect();
    }
    if (check()) return;
  });
}

async function waitForVisibleIndexPage(timeout = 20000) {
  const candidates = ["#indexPage:not(.hide)", "#homePage:not(.hide)", ".homeSectionsContainer"];
  return await waitForAnyVisible(candidates, { timeout });
}

function looksLikeUrl(v) {
  return typeof v === "string" && (v.startsWith("http") || v.startsWith("/") || v.includes("/Items/"));
}

function setBg(el, url) {
  if (!el || !url) return;
  const wrapped = `url("${url}")`;
  el.style.setProperty("--bg-url", wrapped);
  if (!el.style.backgroundImage || !el.style.backgroundImage.includes(url)) {
    el.style.backgroundImage = wrapped;
  }
  if (!el.style.backgroundSize) el.style.backgroundSize = "cover";
  if (!el.style.backgroundPosition) el.style.backgroundPosition = "50% 50%";
}

function hydrateFirstSlide(indexPage) {
  if (!indexPage) return;
  const firstActive = indexPage.querySelector(".slide.active") || indexPage.querySelector(".slide");
  if (!firstActive) return;

  firstActive.style.visibility = "visible";
  firstActive.removeAttribute("aria-hidden");
  firstActive.style.opacity = "";
  firstActive.classList.remove("is-loading", "hidden", "hide", "lazyload", "lazyloaded");

  const imgs = firstActive.querySelectorAll("img, picture img");
  imgs.forEach((img) => {
    const ds = img.getAttribute("data-src");
    if (ds && img.src !== ds) img.src = ds;
    const dss = img.getAttribute("data-srcset");
    if (dss && img.srcset !== dss) img.srcset = dss;
    if (img.loading === "lazy") img.loading = "eager";
    img.removeAttribute("loading");
    img.style.visibility = "visible";
    img.style.opacity = "";
  });

  const sources = firstActive.querySelectorAll("source");
  sources.forEach((s) => {
    const dss = s.getAttribute("data-srcset");
    if (dss && s.srcset !== dss) s.srcset = dss;
  });

  const bgCandidates = [
    firstActive.querySelector(".gradient-overlay"),
    firstActive.querySelector(".horizontal-gradient-overlay"),
    firstActive.querySelector(".slide-backdrop"),
    firstActive.querySelector(".backdrop"),
    firstActive.querySelector(".background"),
    firstActive,
  ].filter(Boolean);

  let urlFromDataset = "";
  const ds = firstActive.dataset || {};
  for (const [k, v] of Object.entries(ds)) {
    if (looksLikeUrl(v)) {
      urlFromDataset = v;
      break;
    }
  }
  const attrKeys = ["data-bg", "data-backdrop", "data-bg-src", "data-image", "data-poster", "data-img", "data-src"];
  let urlFromAttr = "";
  for (const key of attrKeys) {
    const v = firstActive.getAttribute(key);
    if (looksLikeUrl(v)) {
      urlFromAttr = v;
      break;
    }
  }
  const finalUrl = urlFromDataset || urlFromAttr;
  bgCandidates.forEach((el) => setBg(el, finalUrl));
}

function primeProgressBar(indexPage) {
  if (!indexPage) return;
  const pb = indexPage.querySelector(".slide-progress-bar");
  if (!pb) return;
  try {
    resetProgressBar?.();
  } catch {}
  pb.style.transition = "none";
  pb.style.opacity = "0";
  pb.style.width = "0%";
  void pb.offsetWidth;
  pb.style.transition = "";
}

function ensureInitialActivation(indexPage) {
  if (!indexPage) return;
  const slides = indexPage.querySelectorAll(".slide");
  if (!slides.length) return;
  const cur = getCurrentIndex();
  const idx = Number.isFinite(cur) && cur >= 0 ? cur : 0;
  setCurrentIndex(idx);
  slides.forEach((s, i) => s.classList.toggle("active", i === idx));
}

function triggerSlideEnterHooks(indexPage) {
  const active = indexPage.querySelector(".slide.active") || indexPage.querySelector(".slide");
  if (!active) return;
  try {
    if (typeof changeSlide === "function") changeSlide(0);
  } catch {}
  try {
    active.dispatchEvent(new CustomEvent("jms:slide-enter", { bubbles: true }));
  } catch {}
}

function startTimerAndRevealPB(indexPage) {
  if (!indexPage) return;
  const pb = indexPage.querySelector(".slide-progress-bar");
  startSlideTimer();
  safeRaf(() => {
    if (pb) pb.style.opacity = "1";
  });
}

function restartSlideTimerDeterministic() {
  console.debug("[JMS] restartSlideTimerDeterministic()");
  hardProgressReset();
   try {
     if (window.intervalChangeSlide) { clearInterval(window.intervalChangeSlide); window.intervalChangeSlide = null; }
     if (window.sliderTimeout)      { clearTimeout(window.sliderTimeout);       window.sliderTimeout = null; }
     if (window.autoSlideTimeout)   { clearTimeout(window.autoSlideTimeout);    window.autoSlideTimeout = null; }
   } catch {}

  try { stopSlideTimer(); } catch {}
   try { startSlideTimer(); } catch {}
}

function watchActiveSlideChanges() {
  let lastActive = document.querySelector("#indexPage:not(.hide) .slide.active, #homePage:not(.hide) .slide.active");

  const hardResetNextFrame = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hardProgressReset();
        restartSlideTimerDeterministic();
        try { warmUpcomingBackdrops(4); } catch {}
      });
    });
  };

  const handleChange = () => {
    const cur = document.querySelector("#indexPage:not(.hide) .slide.active, #homePage:not(.hide) .slide.active");
    if (!cur || cur === lastActive) return;
    hardResetNextFrame();
    const curIdx = getSlideIndex(cur);
    lastActive = cur;
  };

  const mo = new MutationObserver(handleChange);
  mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  handleChange();
  return () => mo.disconnect();
}

function warmUpcomingBackdrops(count = 3) {
  try {
    const indexPage =
      document.querySelector("#indexPage:not(.hide)") ||
      document.querySelector("#homePage:not(.hide)");
    if (!indexPage) return;

    const slides = [...indexPage.querySelectorAll(".slide")];
    const active = indexPage.querySelector(".slide.active") || slides[0];
    const i = slides.indexOf(active);
    for (let k = 1; k <= count; k++) {
      const s = slides[i + k];
      if (!s) break;
      const candidate =
        s.dataset.background ||
        s.dataset.backdropUrl ||
        s.dataset.landscapeUrl ||
        s.dataset.primaryUrl;
      if (candidate) {
        try {
          window.__backdropWarmQueue?.enqueue(candidate, { shortPreload: true });
        } catch {}
      }
    }
  } catch {}
}

export async function slidesInit() {
  try {
    forceSkinHeaderPointerEvents();
    forceHomeSectionsTop();

    if (window.sliderResetInProgress) return;
    window.sliderResetInProgress = true;
    fullSliderReset();

    const rawCred = sessionStorage.getItem("json-credentials") || localStorage.getItem("json-credentials");
    const apiKey = sessionStorage.getItem("api-key") || localStorage.getItem("api-key");

    function isQuotaErr(e){ return e && (e.name === 'QuotaExceededError' || e.code === 22); }
    function safeLocalGet(key, fallback="[]"){
      try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    }
    function safeLocalRemove(key){
      try { localStorage.removeItem(key); } catch {}
    }
    function safeLocalSet(key, value){
      try { localStorage.setItem(key, value); return true; }
      catch(e){
        if(!isQuotaErr(e)) return false;
        try { sessionStorage.setItem(key, value); return true; } catch {}
        try { localStorage.removeItem(key); } catch {}
        return false;
      }
    }

    function getShuffleHistory(userId) {
      const key = `slider-shuffle-history-${userId}`;
      try {
        const raw = safeLocalGet(key, "[]");
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }
    function saveShuffleHistory(userId, ids) {
      const key = `slider-shuffle-history-${userId}`;
      const limit = Math.max(10, parseInt(config.shuffleSeedLimit || "100", 10));
      let arr = Array.from(new Set(ids)).slice(-limit);
      if (safeLocalSet(key, JSON.stringify(arr))) return;
      const cuts = [Math.floor(limit*0.75), Math.floor(limit*0.5), 20, 10];
      for (const n of cuts) {
        arr = arr.slice(-n);
        if (safeLocalSet(key, JSON.stringify(arr))) return;
      }
      safeLocalRemove(key);
    }
    function resetShuffleHistory(userId) {
      const key = `slider-shuffle-history-${userId}`;
      safeLocalRemove(key);
    }

    if (!rawCred || !apiKey) {
      console.error("Kullanıcı bilgisi veya API anahtarı bulunamadı.");
      return;
    }

    let userId = null,
      accessToken = null;
    try {
      const parsed = JSON.parse(rawCred);
      if (parsed.Servers && Array.isArray(parsed.Servers) && parsed.Servers[0]) {
        userId = parsed.Servers[0].UserId;
        accessToken = parsed.Servers[0].AccessToken;
      } else if (parsed.AccessToken && parsed.User && parsed.User.Id) {
        userId = parsed.User.Id;
        accessToken = parsed.AccessToken;
      } else {
        throw new Error("Credential JSON yapısı tanınamadı");
      }
    } catch (err) {
      console.error("Credential JSON hatası:", err);
    }

    if (!userId || !accessToken) {
      console.error("Geçerli kullanıcı bilgisi veya token bulunamadı.");
      return;
    }

    const savedLimit = parseInt(localStorage.getItem("limit") || "20", 10);
    window.myUserId = userId;
    window.myListUrl = `/web/slider/list/list_${userId}.txt`;

    let items = [];

    try {
      let listItems = null;

      if (config.useManualList && config.manualListIds) {
        listItems = config.manualListIds.split(",").map((id) => id.trim()).filter(Boolean);
      } else if (config.useListFile) {
        const res = await fetch(window.myListUrl);
        if (res.ok) {
          const text = await res.text();
          window.cachedListContent = text;
          if (text.length >= 10) {
            listItems = text.split("\n").map((l) => l.trim()).filter(Boolean);
          } else {
            console.warn("list.txt çok küçük, fallback API devrede.");
          }
        } else {
          console.warn("list.txt alınamadı, fallback API devrede.");
        }
      }

      if (Array.isArray(listItems) && listItems.length) {
        const details = await Promise.all(listItems.map((id) => fetchItemDetails(id)));
        items = details.filter((x) => x);
      } else {
        const baseQS = (config.customQueryString || '').replace(/^[?&]+/, '');
        const onlyUnwatched = !!config.onlyUnwatchedRandom;
        const hasIsPlayed = /(?:^|[?&])IsPlayed=/i.test(baseQS);
        const queryString = (onlyUnwatched && !hasIsPlayed)
          ? (baseQS ? baseQS + '&IsPlayed=false' : 'IsPlayed=false')
          : baseQS;

        const includeItemTypes = extractItemTypesFromQuery(queryString);
        const shouldBalanceTypes =
          config.balanceItemTypes &&
          (hasAllTypes(includeItemTypes, ["Movie", "Series"]) || hasAllTypes(includeItemTypes, ["Movie", "Series", "BoxSet"]));
        const shouldShuffle = !config.sortingKeywords?.some(
          (k) => queryString.includes(k) || queryString.includes("SortBy=") || queryString.includes("SortOrder=")
        );

        let playingItems = [];
        const playingLimit = (onlyUnwatched ? 0 : parseInt(config.playingLimit || 0, 10));

        if (playingLimit > 0) {
          try {
            const res = await fetch(`/Users/${userId}/Items/Resume?Limit=${playingLimit * 2}`, {
              headers: {
                Authorization: `MediaBrowser Client="Jellyfin Web", Device="Web", DeviceId="Web", Version="1.0", Token="${accessToken}"`,
              },
            });
            const data = await res.json();
            let fetchedItems = data.Items || [];

            if (config.excludeEpisodesFromPlaying) {
              playingItems = fetchedItems.filter((item) => item.Type !== "Episode").slice(0, playingLimit);
            } else {
              playingItems = fetchedItems.slice(0, playingLimit);
            }
          } catch (err) {
            console.error("İzlenen içerikler alınırken hata:", err);
          }
        }

        const maxShufflingLimit = parseInt(config.maxShufflingLimit || "10000", 10);
        const res = await fetch(`/Users/${userId}/Items?${queryString}&Limit=${maxShufflingLimit}`, {
          headers: {
            Authorization: `MediaBrowser Client="Jellyfin Web", Device="Web", DeviceId="Web", Version="1.0", Token="${accessToken}"`,
          },
        });
        const data = await res.json();
        let allItems = data.Items || [];

        if (queryString.includes("IncludeItemTypes=Season") || queryString.includes("IncludeItemTypes=Episode")) {
          const detailedSeasons = await Promise.all(
            allItems.map(async (item) => {
              try {
                const seasonRes = await fetch(`/Users/${userId}/Items/${item.Id}`, {
                  headers: {
                    Authorization: `MediaBrowser Client="Jellyfin Web", Device="Web", DeviceId="Web", Version="1.0", Token="${accessToken}"`,
                  },
                });
                const seasonData = await seasonRes.json();
                if (seasonData.SeriesId) {
                  const seriesRes = await fetch(`/Users/${userId}/Items/${seasonData.SeriesId}`, {
                    headers: {
                      Authorization: `MediaBrowser Client="Jellyfin Web", Device="Web", DeviceId="Web", Version="1.0", Token="${accessToken}"`,
                    },
                  });
                  seasonData.SeriesData = await seriesRes.json();
                }
                return seasonData;
              } catch (error) {
                console.error("Season detay alınırken hata:", error);
                return item;
              }
            })
          );
          allItems = detailedSeasons.filter((item) => item && item.Id);
        }

        let selectedItems = [];
        selectedItems = [...playingItems.slice(0, playingLimit)];
        const remainingSlots = Math.max(0, savedLimit - selectedItems.length);

        if (remainingSlots > 0) {
          if (shouldBalanceTypes) {
            const itemsByType = {};
            allItems.forEach((item) => {
              const type = item.Type;
              if (!itemsByType[type]) itemsByType[type] = [];
              itemsByType[type].push(item);
            });
            const types = Object.keys(itemsByType);
            const itemsPerType = Math.floor(remainingSlots / types.length);
            types.forEach((type) => {
              const itemsOfType = itemsByType[type] || [];
              const shuffled = shouldShuffle ? shuffleArray(itemsOfType) : itemsOfType;
              selectedItems.push(...shuffled.slice(0, itemsPerType));
            });
            const finalRemaining = savedLimit - selectedItems.length;
            if (finalRemaining > 0) {
              const allShuffled = shouldShuffle ? shuffleArray(allItems) : allItems;
              selectedItems.push(...allShuffled.slice(0, finalRemaining));
            }
          } else if (shouldShuffle) {
            const allItemIds = allItems.map((item) => item.Id);
            const alwaysShuffle = config.sortingKeywords?.some((keyword) => (config.keywords || "").toLowerCase().includes(keyword.toLowerCase()));
            if (alwaysShuffle) {
              const shuffled = shuffleArray(allItemIds);
              const selectedItemsFromShuffle = allItems.filter((item) => shuffled.slice(0, remainingSlots).includes(item.Id));
              selectedItems.push(...selectedItemsFromShuffle);
            } else {
              const shuffleSeedLimit = parseInt(config.shuffleSeedLimit || "100", 10);
              let history = getShuffleHistory(userId);
              let unseenIds = allItemIds.filter((id) => !history.includes(id));
              if (unseenIds.length === 0 || history.length >= shuffleSeedLimit) {
                resetShuffleHistory(userId);
                history = [];
                unseenIds = [...allItemIds];
              }
              const shuffled = shuffleArray(unseenIds);
              const newSelectionIds = shuffled.slice(0, remainingSlots);
              const selectedItemsFromShuffle = allItems.filter((item) => newSelectionIds.includes(item.Id));
              const updatedHistory = Array.from(
                new Set([...history, ...newSelectionIds])
              ).slice(-shuffleSeedLimit);
              try { saveShuffleHistory(userId, updatedHistory); } catch {}
              selectedItems.push(...selectedItemsFromShuffle);
            }
          } else {
            selectedItems.push(...allItems.slice(0, remainingSlots));
          }
        }

        if (shouldShuffle) {
          if (selectedItems.length > playingItems.length) {
            const nonPlayingItems = selectedItems.slice(playingItems.length);
            const shuffledNonPlaying = shuffleArray(nonPlayingItems);
            selectedItems = [...selectedItems.slice(0, playingItems.length), ...shuffledNonPlaying];
          }
        }

        const detailed = await Promise.all(selectedItems.map((i) => fetchItemDetails(i.Id)));
        items = detailed.filter((x) => x);
      }
    } catch (err) {
      console.error("Slide verisi hazırlanırken hata:", err);
    }

    try { primeQualityFromItems(items); } catch {}
    if (!items.length) {
    console.warn("Hiçbir slayt verisi elde edilemedi.");
    return;
  }
  window.__totalSlidesPlanned = items.length;
  window.__slidesCreated = 0;

    const first = items[0];
    await createSlide(first);
    try { annotateDomWithQualityHints(document); } catch {}
    markSlideCreated();

    const idxPage = document.querySelector("#indexPage:not(.hide)") || document.querySelector("#homePage:not(.hide)");
    if (idxPage) upsertSlidesContainerAtTop(idxPage);
    try {
      updateSlidePosition();
    } catch {}

    initializeSlider();
    const rest = items.slice(1);
    idle(() => {
      (async () => {
        for (const it of rest) {
          try {
            await createSlide(it);
            try { annotateDomWithQualityHints(document); } catch {}
            markSlideCreated();
          } catch (e) {
            console.warn("Arka plan slayt oluşturma hatası:", e);
          }
        }
        try {
        } catch (e) {
          console.warn("Dot navigation yeniden kurulamadı:", e);
        }
      })();
    });
  } catch (e) {
    console.error("slidesInit hata:", e);
  } finally {
    window.sliderResetInProgress = false;
  }
}

function initializeSlider() {
  try {
    const indexPage =
      document.querySelector("#indexPage:not(.hide)") ||
      document.querySelector("#homePage:not(.hide)") ||
      document.querySelector(".homeSectionsContainer")?.closest("#indexPage, #homePage") ||
      document.querySelector("#indexPage");
    if (!indexPage) return;

    ensureProgressBarExists();
    primeProgressBar(indexPage);
    ensureInitialActivation(indexPage);
    hydrateFirstSlide(indexPage);
    triggerSlideEnterHooks(indexPage);

    try {
      updateSlidePosition();
    } catch {}

    const slides = indexPage.querySelectorAll(".slide");
    const slidesContainer = indexPage.querySelector("#slides-container");
    let focusedSlide = null;
    let keyboardActive = false;

    const pb = indexPage.querySelector(".slide-progress-bar");
    if (pb) {
      pb.style.opacity = "0";
      pb.style.width = "0%";
    }

function queueHardResetNextFrame() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      restartSlideTimerDeterministic();
    });
  });
}

function startWhenAllReady() {
  try {
    const oldDots = document.querySelector(".dot-navigation-container");
    if (oldDots) oldDots.remove();
    createDotNavigation();
  } catch {}

  primeProgressBar(indexPage);
  ensureInitialActivation(indexPage);
  hydrateFirstSlide(indexPage);
  startNewCycleClock();
  safeRaf(() => {
    hardProgressReset();
    startSlideTimer();
    if (pb) pb.style.opacity = "1";
  });

  try { window.__cleanupActiveWatch?.(); } catch {}
  window.__cleanupActiveWatch = watchActiveSlideChanges();

  document.removeEventListener("jms:all-slides-ready", startWhenAllReady);
}


if (window.__totalSlidesPlanned > 0 && window.__slidesCreated >= window.__totalSlidesPlanned) {
  startWhenAllReady();
} else {
  document.addEventListener("jms:all-slides-ready", startWhenAllReady, { once: true });
}
    attachMouseEvents();
    const firstImg = indexPage.querySelector(".slide.active img");
    if (firstImg && !firstImg.complete && firstImg.decode) {
      firstImg.decode().catch(() => {}).finally(() => {});
    }
    slides.forEach((slide) => {
      slide.addEventListener(
        "focus",
        () => {
          focusedSlide = slide;
          slidesContainer?.classList.remove("disable-interaction");
        },
        true
      );
      slide.addEventListener(
        "blur",
        () => {
          if (focusedSlide === slide) focusedSlide = null;
        },
        true
      );
    });

    indexPage.addEventListener("keydown", (e) => {
      if (!keyboardActive) return;
      if (e.keyCode === 37) {
        changeSlide(-1);
        queueHardResetNextFrame();
      } else if (e.keyCode === 39) {
        changeSlide(1);
        queueHardResetNextFrame();
      } else if (e.keyCode === 13 && focusedSlide) window.location.href = focusedSlide.dataset.detailUrl;
    });

    indexPage.addEventListener("focusin", (e) => {
      if (e.target.closest("#slides-container")) {
        keyboardActive = true;
        slidesContainer?.classList.remove("disable-interaction");
      }
    });
    indexPage.addEventListener("focusout", (e) => {
      if (!e.target.closest("#slides-container")) {
        keyboardActive = false;
        slidesContainer?.classList.add("disable-interaction");
      }
    });
    try {
      window.__cleanupActiveWatch?.();
    } catch {}
    window.__cleanupActiveWatch = watchActiveSlideChanges();
    document.addEventListener("jms:per-slide-complete", (ev) => {
  try {
    const active = document.querySelector("#indexPage:not(.hide) .slide.active, #homePage:not(.hide) .slide.active");
    const idx = getSlideIndex(active);

    if (window.__cycleExpired && isPlannedLastIndex(idx)) {
      ev.preventDefault();
      window.__cycleExpired = false;
      scheduleSliderRebuild("cycle-expired-and-last-finished");
    }
  } catch (e) {
    console.warn("per-slide-complete handler hata:", e);
  }
}, true);
} catch (e) {
    console.error("initializeSlider hata:", e);
  } finally {
    window.sliderResetInProgress = false;
  }
}

function setupNavigationObserver() {
  if (navObsBooted) return () => {};
  navObsBooted = true;

  let previousUrl = window.location.href;
  let isOnHomePage = !!document.querySelector("#indexPage:not(.hide)") || window.location.pathname === "/";

  const checkPageChange = async () => {
    const currentUrl = window.location.href;
    const nowOnHomePage = !!document.querySelector("#indexPage:not(.hide)") || window.location.pathname === "/";

    if (currentUrl !== previousUrl || nowOnHomePage !== isOnHomePage) {
      previousUrl = currentUrl;
      isOnHomePage = nowOnHomePage;

      if (isOnHomePage) {
        fullSliderReset();
        const ok = await waitForVisibleIndexPage(12000);
        if (ok) {
          initializeSliderOnHome();
        } else {
          const stop = observeWhenHomeReady(() => {
            initializeSliderOnHome();
            stop();
          }, 20000);
        }
      } else {
        cleanupSlider();
      }
      startPauseOverlayOnce();
        }
    };
  setTimeout(checkPageChange, 0);
  const observerInterval = setInterval(checkPageChange, 300);

  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function () {
    origPush.apply(this, arguments);
    checkPageChange();
  };
  history.replaceState = function () {
    origReplace.apply(this, arguments);
    checkPageChange();
  };
  window.addEventListener("popstate", checkPageChange);
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) checkPageChange();
  });

  return () => clearInterval(observerInterval);
}

function initializeSliderOnHome() {
  const indexPage = document.querySelector("#indexPage:not(.hide)") || document.querySelector("#homePage:not(.hide)");
  if (!indexPage) return;

  fullSliderReset();
  upsertSlidesContainerAtTop(indexPage);
  forceHomeSectionsTop();
  forceSkinHeaderPointerEvents();
  try {
    updateSlidePosition();
  } catch {}
  ensureProgressBarExists();
  const pb = document.querySelector(".slide-progress-bar");
  if (pb) {
    pb.style.opacity = "0";
    pb.style.width = "0%";
  }
  let __recsBooted = false;
  const onAllReady = () => {
    if (__recsBooted) return;
    __recsBooted = true;
    try { renderPersonalRecommendations(); } catch {}
  };
  document.addEventListener("jms:all-slides-ready", onAllReady, { once: true });
  if (window.__totalSlidesPlanned > 0 && window.__slidesCreated >= window.__totalSlidesPlanned) {
    onAllReady();
  }
  setTimeout(() => {
    if (!__recsBooted) onAllReady();
  }, 5000);
  document.addEventListener("jms:slide-enter", () => { onAllReady(); }, { once: true });
  slidesInit();

  if (config.enableStudioHubs) {
    ensureStudioHubsMounted({ eager:true });
  }
}

function cleanupSlider() {
  try { teardownAnimations(); } catch {}
  if (window.mySlider) {
    if (window.mySlider.autoSlideTimeout) {
      clearTimeout(window.mySlider.autoSlideTimeout);
    }
    if (window.mySlider.sliderTimeout) {
      clearTimeout(window.mySlider.sliderTimeout);
    }
    if (window.mySlider.intervalChangeSlide) {
      clearInterval(window.mySlider.intervalChangeSlide);
    }
    window.mySlider = {};
  }

  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (indexPage) {
    const sliderContainer = indexPage.querySelector("#slides-container");
    if (sliderContainer) {
      sliderContainer.remove();
    }
  }
}

function observeWhenHomeReady(cb, maxMs = 20000) {
  const start = Date.now();
  const mo = new MutationObserver(() => {
    const ready =
      document.querySelector("#indexPage:not(.hide)") ||
      document.querySelector("#homePage:not(.hide)") ||
      document.querySelector(".homeSectionsContainer");
    if (ready) {
      cleanup();
      cb();
    } else if (Date.now() - start > maxMs) {
      cleanup();
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  const to = setTimeout(() => {
    cleanup();
  }, maxMs + 1000);
  function cleanup() {
    clearTimeout(to);
    mo.disconnect();
  }
  return cleanup;
}

(async function robustBoot() {
  try {
    idle(() => {
      try {
        startUpdatePolling({
          intervalMs: 60 * 60 * 1000,
          minGapMs: 60 * 60 * 1000,
          dedupScope: "forever",
          remindEveryMs: 12 * 60 * 60 * 1000,
        });
      } catch {}
      idle(() => {
        try {
          initNotifications();
        } catch {}
        if (config.enableQualityBadges && !window.__qualityBadgesBooted) {
          window.__qualityBadgesBooted = true;
          try {
            window.cleanupQualityBadges = initializeQualityBadges();
          } catch {}
        }
      });
    });
    const fastIndex = document.querySelector("#indexPage:not(.hide), #homePage:not(.hide)");
    if (fastIndex) {
      startPauseOverlayOnce();
      initializeSliderOnHome();
    } else {
      const stop = observeWhenHomeReady(() => {
        startPauseOverlayOnce();
        initializeSliderOnHome();
        stop();
      }, 15000);
    }
    setupNavigationObserver();
    idle(() => {
    if (config.enableStudioHubs) ensureStudioHubsMounted();
 });
  } catch (e) {
    console.warn("robustBoot (fast) hata:", e);
  }
})();

window.addEventListener(
  "resize",
  debounce(() => {
    try {
      updateSlidePosition();
    } catch {}
  }, 150)
);
window.addEventListener("pageshow", () => {
  try {
    updateSlidePosition();
  } catch {}
});

window.addEventListener("unhandledrejection", (event) => {
  if (event?.reason?.message && event.reason.message.includes("quality badge")) {
    console.warn("Kalite badge hatası:", event.reason);
    event.preventDefault();
  }
});

window.slidesInit = slidesInit;
const cleanupAvatarSystem = initAvatarSystem();
window.cleanupAvatarSystem = cleanupAvatarSystem;
