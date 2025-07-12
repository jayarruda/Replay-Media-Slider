import { getConfig } from "./modules/config.js";
import { getCurrentIndex, setCurrentIndex } from "./modules/sliderState.js";
import { startSlideTimer, stopSlideTimer } from "./modules/timer.js";
import { ensureProgressBarExists } from "./modules/progressBar.js";
import { createSlide } from "./modules/slideCreator.js";
import { changeSlide, createDotNavigation } from "./modules/navigation.js";
import { attachMouseEvents } from "./modules/events.js";
import { fetchItemDetails } from "./modules/api.js";
import { forceHomeSectionsTop, forceSkinHeaderPointerEvents } from './modules/positionOverrides.js';
import { setupPauseScreen } from "./modules/pauseModul.js";


let cleanupPauseOverlay = null;

function setupPauseScreenIfNeeded() {
    if (cleanupPauseOverlay) {
        cleanupPauseOverlay();
    }
    cleanupPauseOverlay = setupPauseScreen();
}

const config = getConfig();
const shuffleArray = array => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

forceSkinHeaderPointerEvents();
forceHomeSectionsTop();

function fullSliderReset() {
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
  if (cleanupPauseOverlay) {
        cleanupPauseOverlay();
        cleanupPauseOverlay = null;
    }

  setCurrentIndex(0);
  stopSlideTimer();
  cleanupSlider();

  window.mySlider = {};
  window.cachedListContent = "";
  console.log("Slider tamamen resetlendi.");
}

function loadExternalCSS(path) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = path;
  document.head.appendChild(link);
}

const cssPath =
  config.cssVariant === 'fullslider'
    ? "./slider/src/fullslider.css"
    : config.cssVariant === 'normalslider'
      ? "./slider/src/normalslider.css"
      : "./slider/src/slider.css";

loadExternalCSS(cssPath);

let isOnHomePage = true;

export async function slidesInit() {
  forceSkinHeaderPointerEvents();
  forceHomeSectionsTop();
  if (window.sliderResetInProgress) return;
  window.sliderResetInProgress = true;
  fullSliderReset();
  const rawCred = sessionStorage.getItem("json-credentials")
                || localStorage.getItem("json-credentials");
  const apiKey  = sessionStorage.getItem("api-key")
                || localStorage.getItem("api-key");

  if (!rawCred || !apiKey) {
    console.error("Kullanıcı bilgisi veya API anahtarı bulunamadı.");
    window.sliderResetInProgress = false;
    return;
  }
  let userId = null, accessToken = null;
  try {
    const parsed = JSON.parse(rawCred);
    userId      = parsed.Servers[0].UserId;
    accessToken = parsed.Servers[0].AccessToken;
  } catch (err) {
    console.error("Credential JSON hatası:", err);
  }

  if (!userId || !accessToken) {
    console.error("Geçerli kullanıcı bilgisi veya token bulunamadı.");
    window.sliderResetInProgress = false;
    return;
  }
  const savedLimit = parseInt(localStorage.getItem("limit") || "20", 10);
  window.myUserId   = userId;
  window.myListUrl  = `/web/slider/list/list_${userId}.txt`;
  console.log("Liste URL'si:", window.myListUrl);
  let items = [];
  try {
    let listItems = null;
    if (config.useManualList && config.manualListIds) {
      listItems = config.manualListIds.split(",").map(id => id.trim()).filter(Boolean);
      console.log("Manuel liste kullanılıyor:", listItems);
    } else if (config.useListFile) {
      const res = await fetch(window.myListUrl);
      if (res.ok) {
        const text = await res.text();
        window.cachedListContent = text;
        if (text.length >= 10) {
          listItems = text.split("\n").map(l => l.trim()).filter(Boolean);
        } else {
          console.warn("list.txt çok küçük, fallback API devrede.");
        }
      } else {
        console.warn("list.txt alınamadı, fallback API devrede.");
      }
    }

    if (Array.isArray(listItems) && listItems.length) {
      const details = await Promise.all(listItems.map(id => fetchItemDetails(id)));
      items = details.filter(x => x);
    } else {
      console.log("API fallback kullanılıyor.");
      const queryString = config.customQueryString;
      const shouldShuffle = !config.sortingKeywords.some(k => queryString.includes(k));
      const res = await fetch(
        `/Users/${userId}/Items?${queryString}`,
        { headers: { Authorization:
          `MediaBrowser Client="Jellyfin Web", Device="Web", DeviceId="Web", Version="1.0", Token="${accessToken}"`
        }}
      );
      const data = await res.json();
      const all = data.Items || [];
      let pool = shouldShuffle
        ? shuffleArray(all).slice(0, savedLimit)
        : all.slice(0, savedLimit);
      const detailed = await Promise.all(pool.map(i => fetchItemDetails(i.Id)));
      items = detailed.filter(x => x);
    }
  } catch (err) {
    console.error("Slide verisi hazırlanırken hata:", err);
  }
  if (!items.length) {
    console.warn("Hiçbir slayt verisi elde edilemedi.");
    window.sliderResetInProgress = false;
    return;
  }
  console.groupCollapsed("Slide Oluşturma");
  for (const item of items) {
    console.log("Slider API Bilgisi:", item);
    await createSlide(item);
  }
  console.groupEnd();
  const idxPage = document.querySelector("#indexPage:not(.hide)");
  if (idxPage && !idxPage.querySelector("#slides-container")) {
    const c = document.createElement("div");
    c.id = "slides-container";
    idxPage.appendChild(c);
  }
  initializeSlider();
}


function initializeSlider() {
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) {
    window.sliderResetInProgress = false;
    return;
  }

  ensureProgressBarExists();

  const slides = indexPage.querySelectorAll(".slide");
  const slidesContainer = indexPage.querySelector("#slides-container");
  let focusedSlide = null;
  let keyboardActive = false;

  startSlideTimer();
  attachMouseEvents();

  slides.forEach(slide => {
    slide.addEventListener("focus", () => {
      focusedSlide = slide;
      slidesContainer.classList.remove("disable-interaction");
    }, true);
    slide.addEventListener("blur", () => {
      if (focusedSlide === slide) focusedSlide = null;
    }, true);
  });

  indexPage.addEventListener("keydown", (e) => {
    if (keyboardActive) {
      if (e.keyCode === 37) changeSlide(-1);
      else if (e.keyCode === 39) changeSlide(1);
      else if (e.keyCode === 13 && focusedSlide)
        window.location.href = focusedSlide.dataset.detailUrl;
    }
  });

  indexPage.addEventListener("focusin", (e) => {
    if (e.target.closest("#slides-container")) {
      keyboardActive = true;
      slidesContainer.classList.remove("disable-interaction");
    }
  });

  indexPage.addEventListener("focusout", (e) => {
    if (!e.target.closest("#slides-container")) {
      keyboardActive = false;
      slidesContainer.classList.add("disable-interaction");
    }
  });

  createDotNavigation();
  window.sliderResetInProgress = false;
}

function setupNavigationObserver() {
  let previousUrl = window.location.href;
  let isOnHomePage = window.location.pathname === '/' || document.querySelector("#indexPage:not(.hide)");

  const checkPageChange = () => {
    const currentUrl = window.location.href;
    const nowOnHomePage = window.location.pathname === '/' || document.querySelector("#indexPage:not(.hide)");

    if (currentUrl !== previousUrl || isOnHomePage !== nowOnHomePage) {
      previousUrl = currentUrl;
      isOnHomePage = nowOnHomePage;

      if (isOnHomePage) {
        console.log("Ana sayfaya dönüldü, slider tamamen resetleniyor.");
        fullSliderReset();

        setTimeout(() => {
          if (!document.querySelector("#slides-container")) {
            const slidesContainer = document.createElement("div");
            slidesContainer.id = "slides-container";
            document.querySelector("#indexPage:not(.hide)").appendChild(slidesContainer);
          }
          slidesInit();
        }, 100);
      } else {
        console.log("Ana sayfadan ayrıldı, slider temizleniyor.");
        fullSliderReset();
      }
    }
  };

  const observerInterval = setInterval(checkPageChange, 300);

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function() {
    originalPushState.apply(this, arguments);
    checkPageChange();
  };

  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    checkPageChange();
  };

  window.addEventListener('popstate', checkPageChange);

  return () => clearInterval(observerInterval);
}

function initializeSliderOnHome() {
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (indexPage) {

    fullSliderReset();

    if (!indexPage.querySelector("#slides-container")) {
      const slidesContainer = document.createElement("div");
      slidesContainer.id = "slides-container";
      indexPage.appendChild(slidesContainer);
    }

    ensureProgressBarExists();
    slidesInit();
  }
}


function waitForDomAndIndexPage() {
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if ((document.readyState === "complete" || document.readyState === "interactive") && indexPage) {
    forceSkinHeaderPointerEvents();
    forceHomeSectionsTop();
    initializeSliderOnHome();
    setupNavigationObserver();
  }
}

function cleanupSlider() {
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
    console.log("Global slider instance temizlendi.");
  }

  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (indexPage) {
    const sliderContainer = indexPage.querySelector("#slides-container");
    if (sliderContainer) {
      sliderContainer.remove();
      console.log("Eski slider container kaldırıldı.");
    }
  }
}

const domCheckInterval = setInterval(() => {
    const indexPage = document.querySelector("#indexPage:not(.hide)");
    if ((document.readyState === "complete" || document.readyState === "interactive") && indexPage) {
        initializeSliderOnHome();
        setupNavigationObserver();
        setupPauseScreenIfNeeded();
        setupPauseScreen();
        clearInterval(domCheckInterval);
    }
}, 100);

window.slidesInit = slidesInit;
