/*!
 * G-Grbz © Tüm hakları saklıdır. | All rights reserved.
 *
 * Bu dosya G-Grbz tarafından oluşturulmuştur.
 * İzin alınmadan kopyalanamaz, çoğaltılamaz veya değiştirilemez.
 *
 * This file was created by G-Grbz.
 * It may not be copied, reproduced, or modified without permission.
 */

import { saveApiKey, saveCredentialsToSessionStorage } from "./auth.js";
import { getConfig } from "./modules/config.js";
import { getLanguageLabels, getDefaultLanguage } from './language/index.js';
import {
  getCurrentIndex,
  setCurrentIndex,
  getSlideDuration,
  setAutoSlideTimeout,
  getAutoSlideTimeout,
  setSlideStartTime,
  getSlideStartTime,
  setRemainingTime,
  getRemainingTime,
} from "./modules/sliderState.js";
import { startSlideTimer, stopSlideTimer, pauseSlideTimer, resumeSlideTimer, SLIDE_DURATION } from "./modules/timer.js";
import {
  ensureProgressBarExists,
  resetProgressBar,
  startProgressBarWithDuration,
  pauseProgressBar,
  resumeProgressBar,
} from "./modules/progressBar.js";
import { createSlide } from "./modules/slideCreator.js";
import { changeSlide, updateActiveDot, createDotNavigation, displaySlide } from "./modules/navigation.js";
import { attachMouseEvents, setupVisibilityHandler } from "./modules/events.js";
import { fetchItemDetails } from "./modules/api.js";
import {
  createSlidesContainer,
  createGradientOverlay,
  createHorizontalGradientOverlay,
  createLogoContainer,
  createActorSlider,
  createInfoContainer,
  createDirectorContainer,
  createRatingContainer,
  createLanguageContainer,
  createMetaContainer,
  createMainContentContainer,
  createPlotContainer,
  createTitleContainer
} from "./modules/containerUtils.js";
import { updateSlidePosition } from './modules/positionUtils.js';
import { forceHomeSectionsTop, forceSkinHeaderPointerEvents } from './modules/positionOverrides.js';

const config = getConfig();

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

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

let isOnHomePage = true;

export function slidesInit() {
  forceSkinHeaderPointerEvents();
  forceHomeSectionsTop();
  if (window.sliderResetInProgress) return;
  window.sliderResetInProgress = true;
  fullSliderReset();

  const credentials = sessionStorage.getItem("json-credentials");
  const apiKey = sessionStorage.getItem("api-key");
  let userId = null, accessToken = null;

  if (credentials) {
    try {
      const parsed = JSON.parse(credentials);
      userId = parsed.Servers[0].UserId;
      accessToken = parsed.Servers[0].AccessToken;
    } catch (error) {
      console.error("Credential JSON hatası:", error);
    }
  }

  if (!userId || !apiKey) {
    console.error("Kullanıcı bilgisi veya API anahtarı bulunamadı.");
    window.sliderResetInProgress = false;
    return;
  }

  const savedLimit = localStorage.getItem("limit") || 20;
  window.myUserId = userId;
  const listUrl = `/web/slider/list/list_${userId}.txt`;
  window.myListUrl = listUrl;
  console.log("Liste URL'si:", listUrl);

  (async () => {
    let listItems = null;
    let listContent = "";

    if (config.useManualList && config.manualListIds) {
      listItems = config.manualListIds
        .split(',')
        .map(id => id.trim())
        .filter(id => id);
      console.log("Manuel olarak yapılandırılmış liste kullanılıyor:", listItems);
    } else if (config.useListFile) {
      try {
        const res = await fetch(window.myListUrl);
        if (!res.ok) throw new Error("list.txt dosyası alınamadı");
        listContent = await res.text();
        console.log("list.txt içeriği:", listContent);
        window.cachedListContent = listContent;
        if (listContent.length < 10) {
          console.warn("list.txt dosyası 10 bayttan küçük, API fallback devreye girecek.");
          listItems = null;
        } else {
          listItems = listContent.split("\n")
            .map(line => line.trim())
            .filter(line => line);
        }
      } catch (err) {
        console.warn("list.txt hatası:", err);
        window.cachedListContent = "";
        listItems = null;
      }
    } else {
      console.log("Yapılandırma ayarı etkisiz: list.txt kullanılmayacak.");
    }

    let items = [];

    if (Array.isArray(listItems) && listItems.length > 0) {
      const itemPromises = listItems.map(id => fetchItemDetails(id));
      items = (await Promise.all(itemPromises)).filter(item => item);
    } else {
      console.log("API fallback kullanılıyor.");
      try {
        const queryString = config.customQueryString;
        const sortingKeywords = ["DateCreated", "PremiereDate", "ProductionYear"];
        const shouldShuffle = !config.sortingKeywords.some(keyword => queryString.includes(keyword));
        const res = await fetch(
          `/Users/${userId}/Items?${queryString}`,
          {
            headers: {
              Authorization: `MediaBrowser Client="Jellyfin Web", Device="YourDeviceName", DeviceId="YourDeviceId", Version="YourClientVersion", Token="${accessToken}"`,
            },
          }
        );
        const data = await res.json();
        const slideLimit = savedLimit;

        if (shouldShuffle) {
          const movies = data.Items.filter(item => item.Type === "Movie");
          const series = data.Items.filter(item => item.Type === "Series");
          const boxSets = data.Items.filter(item => item.Type === "BoxSet");
          const limitedMovies = shuffleArray(movies).slice(0, slideLimit);
          const limitedSeries = shuffleArray(series).slice(0, slideLimit);
          const limitedBoxSet = shuffleArray(boxSets).slice(0, slideLimit);

          const fallbackItems = shuffleArray([...limitedMovies, ...limitedSeries, ...limitedBoxSet])
            .slice(0, slideLimit);

          const detailedItems = await Promise.all(
            fallbackItems.map(item => fetchItemDetails(item.Id))
          );
          items = detailedItems.filter(item => item);
        } else {
          const defaultItems = data.Items.slice(0, slideLimit);
          const detailedItems = await Promise.all(
            defaultItems.map(item => fetchItemDetails(item.Id))
          );
          items = detailedItems.filter(item => item);
        }
      } catch (error) {
        console.error("API fallback başarısız:", error);
      }
    }

    if (items.length === 0) {
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
    const indexPage = document.querySelector("#indexPage:not(.hide)");
    if (indexPage && !indexPage.querySelector("#slides-container")) {
      const slidesContainer = document.createElement("div");
      slidesContainer.id = "slides-container";
      indexPage.appendChild(slidesContainer);
    }

    initializeSlider();
  })();
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
    clearInterval(domCheckInterval);
  }
}, 100);

window.slidesInit = slidesInit;
