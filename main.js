import { saveApiKey, saveCredentialsToSessionStorage } from "./auth.js";
import { cleanupSlider } from "./modules/sliderCleanup.js";
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
import { debounce } from "./modules/utils.js";

const config = getConfig();

function loadExternalCSS(path) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = path;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`CSS yüklenemedi: ${path}`));
    document.head.appendChild(link);
  });
}

function clearCookies() {
  document.cookie.split(";").forEach((cookie) => {
    const [name] = cookie.split("=");
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.grbzhome.com;`;
  });
}

function ensureSlidesContainer(indexPage) {
  let slidesContainer = indexPage.querySelector("#slides-container");
  if (!slidesContainer) {
    slidesContainer = document.createElement("div");
    slidesContainer.id = "slides-container";
    indexPage.insertAdjacentElement("afterbegin", slidesContainer);
  }
  return slidesContainer;
}

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

async function slidesInit() {
  if (window.sliderResetInProgress) return;
  window.sliderResetInProgress = true;

  try {
    const config = getConfig();
    let cssPath = config.cssVariant === 'fullslider'
      ? "./slider/src/fullslider.css"
      : "./slider/src/slider.css";

    console.log("CSS dosyası yüklenmeye başlıyor:", cssPath);
    await loadExternalCSS(cssPath);
    console.log("CSS başarıyla yüklendi:", cssPath);

    setCurrentIndex(0);
    clearCookies();
    cleanupSlider();
    window.mySlider = {};

    if (window.intervalChangeSlide) {
      clearInterval(window.intervalChangeSlide);
      window.intervalChangeSlide = null;
    }
    if (window.sliderTimeout) {
      clearTimeout(window.sliderTimeout);
      window.sliderTimeout = null;
    }

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
      console.error("Kullanıcı bilgileri veya API key bulunamadı.");
      return;
    }

    const savedLimit = localStorage.getItem("limit") || 20;
    window.myUserId = userId;
    const listUrl = `${window.location.origin}/web/slider/list/list_${userId}.txt`;
    window.myListUrl = listUrl;
    console.log("List URL:", listUrl);

    let listItems = [];
    let listContent = "";
    if (config.useManualList && config.manualListIds) {
      listItems = config.manualListIds.split(',').map(id => id.trim()).filter(id => id);
      console.log("El ile yapılandırılmış liste kullanılıyor:", listItems);
    } else if (config.useListFile) {
      try {
        const res = await fetch(window.myListUrl);
        if (!res.ok) throw new Error("list.txt getirilemedi");
        listContent = await res.text();
        console.log("list.txt içeriği:", listContent);
        window.cachedListContent = listContent;
        if (listContent.length < 10) {
          console.warn("list.txt dosyası 10 byte'dan küçük, API çağrısı kullanılacak.");
          listItems = [];
        } else {
          listItems = listContent.split("\n").map(line => line.trim()).filter(line => line);
        }
      } catch (err) {
        console.warn("list.txt hatası:", err);
        window.cachedListContent = "";
      }
    } else {
      console.log("Config ayarı pasif: list.txt kullanılmayacak.");
    }

    let items = [];
    if (listItems.length > 0) {
      const itemPromises = listItems.map((id) => fetchItemDetails(id));
      items = (await Promise.all(itemPromises)).filter((item) => item);
    } else {
      try {
        const queryString = config.customQueryString;
        const sortingKeywords = ["DateCreated", "PremiereDate", "ProductionYear"];
        const shouldShuffle = !config.sortingKeywords.some(keyword => queryString.includes(keyword));
        const res = await fetch(
          `${window.location.origin}/Users/${userId}/Items?${queryString}`,
          {
            headers: {
              Authorization: `MediaBrowser Client="Jellyfin Web", Device="YourDeviceName", DeviceId="YourDeviceId", Version="YourClientVersion", Token="${accessToken}"`,
            },
          }
        );
        const data = await res.json();
        const slideLimit = savedLimit;

        if (shouldShuffle) {
          const movies = data.Items.filter((item) => item.Type === "Movie");
          const series = data.Items.filter((item) => item.Type === "Series");
          const boxSets = data.Items.filter((item) => item.Type === "BoxSet");

          const shuffledMovies = shuffleArray(movies);
          const shuffledSeries = shuffleArray(series);
          const shuffledBoxSets = shuffleArray(boxSets);

          const limitedMovies = shuffledMovies.slice(0, slideLimit);
          const limitedSeries = shuffledSeries.slice(0, slideLimit);
          const limitedBoxSet = shuffledBoxSets.slice(0, slideLimit);

          let fallbackItems = [...limitedMovies, ...limitedSeries, ...limitedBoxSet];
          fallbackItems = shuffleArray(fallbackItems).slice(0, slideLimit);
          const detailedItems = await Promise.all(
            fallbackItems.map((item) => fetchItemDetails(item.Id))
          );
          items = detailedItems.filter((item) => item);
        } else {
          const defaultItems = data.Items.slice(0, slideLimit);
          const detailedItems = await Promise.all(
            defaultItems.map((item) => fetchItemDetails(item.Id))
          );
          items = detailedItems.filter((item) => item);
        }
      } catch (error) {
        console.error("Itemlar getirilirken hata oluştu:", error);
      }
    }

    console.groupCollapsed("Slide Oluşturma");
    for (const item of items) {
      await createSlide(item);
    }
    console.groupEnd();

    function setupSliderUI() {
      const hiddenIndexPage = document.querySelector("#indexPage.hide");
      if (hiddenIndexPage) {
        const container = hiddenIndexPage.querySelector("#slides-container");
        if (container) container.remove();
      }
      const indexPage = document.querySelector("#indexPage:not(.hide)");
      if (!indexPage) return;

      const slides = indexPage.querySelectorAll(".slide");
      const slidesContainer = indexPage.querySelector("#slides-container");
      let focusedSlide = null, keyboardActive = false;

      startSlideTimer();
      attachMouseEvents();

      slides.forEach((slide) => {
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
      console.log("Slider UI kurulumu tamamlandı.");
    }

    setupSliderUI();

  } catch (err) {
    console.error("Slider init sırasında hata oluştu:", err);
  } finally {
    window.sliderResetInProgress = false;
  }
}

window.slidesInit = slidesInit;

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    console.log("Page cache'den yüklendi, slider yeniden başlatılıyor...");
    slidesInit();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseSlideTimer();
    pauseProgressBar();
  } else {
    resumeSlideTimer();
    resumeProgressBar();
  }
});
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(slidesInit, 500);
});
