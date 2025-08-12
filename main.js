import { saveCredentials, saveApiKey, getAuthToken } from "./auth.js";

(async function bootstrapCredentials() {
  try {
    const token = getAuthToken();
    if (!token || localStorage.getItem("json-credentials")) return;

    saveApiKey(token);
    const res = await fetch(`/Sessions?UserId=&api_key=${token}`);
    if (!res.ok) throw new Error("Sessions alınamadı");

    const sessions = await res.json();
    const sess = sessions
      .filter(s => s.UserId)
      .sort((a, b) => new Date(b.LastActivityDate) - new Date(a.LastActivityDate))[0];

    if (!sess) throw new Error("Oturum bulunamadı");
    const creds = {
      AccessToken: token,
      SessionId: sess.Id,
      User: { Id: sess.UserId },
      DeviceId: sess.DeviceId || "web-client",
      Client: sess.Client || "Jellyfin Web Client",
      Version: sess.Version || "1.0.0"
    };

    saveCredentials(creds);
  } catch (e) {
    console.warn("bootstrapCredentials hatası:", e);
  }
})();

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
import { updateHeaderUserAvatar, initAvatarSystem } from "./modules/userAvatar.js";
import { initializeQualityBadges } from './modules/qualityBadges.js';
import { setupHoverForAllItems } from "./modules/navigation.js";
import { initNotifications, forcejfNotifBtnPointerEvents } from "./modules/notifications.js";

const config = getConfig();

let cleanupPauseOverlay = null;

(function preloadNotifCSS() {
  if (document.getElementById("jfNotifCss")) return;

  const link = document.createElement("link");
  link.id = "jfNotifCss";
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = "slider/src/notifications.css";
  const head = document.head || document.getElementsByTagName("head")[0];
  const firstChild = head.firstElementChild;
  if (firstChild) head.insertBefore(link, firstChild);
  else head.appendChild(link);
})();

function setupGlobalModalInit() {
    setupHoverForAllItems();
    loadHls();
    if (config.enableQualityBadges) {
        initializeQualityBadges();
    }
    const observer = observeDOMChanges();
    return () => observer.disconnect();
}

const cleanupModalObserver = setupGlobalModalInit();
window.cleanupModalObserver = cleanupModalObserver;

function setupPauseScreenIfNeeded() {
    if (cleanupPauseOverlay) {
        cleanupPauseOverlay();
    }
    cleanupPauseOverlay = setupPauseScreen();
}


const shuffleArray = array => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

forceSkinHeaderPointerEvents();
forceHomeSectionsTop();
forcejfNotifBtnPointerEvents();
updateHeaderUserAvatar();
initNotifications();

document.addEventListener('DOMContentLoaded', () => {
    if (config.enableQualityBadges) {
        const cleanupQualityBadges = initializeQualityBadges();
        window.cleanupQualityBadges = cleanupQualityBadges;
    }
});

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
}

function loadExternalCSS(path) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = path;
    document.head.appendChild(link);
}

const cssPath = config.cssVariant === 'fullslider'
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

    const rawCred = sessionStorage.getItem("json-credentials") || localStorage.getItem("json-credentials");
    const apiKey = sessionStorage.getItem("api-key") || localStorage.getItem("api-key");

    function getShuffleHistory(userId) {
        try {
            return JSON.parse(localStorage.getItem(`slider-shuffle-history-${userId}`) || "[]");
        } catch {
            return [];
        }
    }

    function saveShuffleHistory(userId, ids) {
        localStorage.setItem(`slider-shuffle-history-${userId}`, JSON.stringify(ids));
    }

    function resetShuffleHistory(userId) {
        localStorage.removeItem(`slider-shuffle-history-${userId}`);
    }

    if (!rawCred || !apiKey) {
        console.error("Kullanıcı bilgisi veya API anahtarı bulunamadı.");
        window.sliderResetInProgress = false;
        return;
    }

    let userId = null, accessToken = null;
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
        window.sliderResetInProgress = false;
        return;
    }

    const savedLimit = parseInt(localStorage.getItem("limit") || "20", 10);
    window.myUserId = userId;
    window.myListUrl = `/web/slider/list/list_${userId}.txt`;

    let items = [];

    try {
        let listItems = null;

        if (config.useManualList && config.manualListIds) {
            listItems = config.manualListIds.split(",").map(id => id.trim()).filter(Boolean);
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

            const includeItemTypes = extractItemTypesFromQuery(queryString);
            const shouldBalanceTypes = config.balanceItemTypes && (
            hasAllTypes(includeItemTypes, ["Movie", "Series"]) ||
            hasAllTypes(includeItemTypes, ["Movie", "Series", "BoxSet"])
            );
            const shouldShuffle = !config.sortingKeywords?.some(k =>
                queryString.includes(k) ||
                queryString.includes("SortBy=") ||
                queryString.includes("SortOrder=")
            );

            let playingItems = [];
            const playingLimit = parseInt(config.playingLimit || 0, 10);

            if (playingLimit > 0) {
                try {
                    const res = await fetch(
                        `/Users/${userId}/Items/Resume?Limit=${playingLimit * 2}`,
                        {
                            headers: {
                                Authorization: `MediaBrowser Client="Jellyfin Web", Device="Web", DeviceId="Web", Version="1.0", Token="${accessToken}"`
                            }
                        }
                    );
                    const data = await res.json();
                    let fetchedItems = data.Items || [];

                    if (config.excludeEpisodesFromPlaying) {
                        playingItems = fetchedItems.filter(item => item.Type !== 'Episode').slice(0, playingLimit);
                    } else {
                        playingItems = fetchedItems.slice(0, playingLimit);
                    }

                    console.log("Playing Items:", playingItems.map(item => ({
                        id: item.Id,
                        name: item.Name,
                        type: item.Type
                    })));
                } catch (err) {
                    console.error("İzlenen içerikler alınırken hata:", err);
                }
            }

            const maxShufflingLimit = parseInt(config.maxShufflingLimit || "10000", 10);
            const res = await fetch(
                `/Users/${userId}/Items?${queryString}&Limit=${maxShufflingLimit}`,
                { headers: { Authorization: `MediaBrowser Client="Jellyfin Web", Device="Web", DeviceId="Web", Version="1.0", Token="${accessToken}"` }}
            );
            const data = await res.json();
            let allItems = data.Items || [];

            if (queryString.includes("IncludeItemTypes=Season") || queryString.includes("IncludeItemTypes=Episode")) {
                console.log("Season/Episode modu aktif");
                const detailedSeasons = await Promise.all(allItems.map(async (item) => {
                    try {
                        const seasonRes = await fetch(`/Users/${userId}/Items/${item.Id}`, {
                            headers: {
                                Authorization: `MediaBrowser Client="Jellyfin Web", Device="Web", DeviceId="Web", Version="1.0", Token="${accessToken}"`
                            }
                        });
                        const seasonData = await seasonRes.json();
                        if (seasonData.SeriesId) {
                            const seriesRes = await fetch(`/Users/${userId}/Items/${seasonData.SeriesId}`, {
                                headers: {
                                    Authorization: `MediaBrowser Client="Jellyfin Web", Device="Web", DeviceId="Web", Version="1.0", Token="${accessToken}"`
                                }
                            });
                            seasonData.SeriesData = await seriesRes.json();
                        }

                        return seasonData;
                    } catch (error) {
                        console.error("Season detay alınırken hata:", error);
                        return item;
                    }
                }));

                allItems = detailedSeasons.filter(item => item && item.Id);
            }

            let selectedItems = [];
            selectedItems = [...playingItems.slice(0, playingLimit)];
            const remainingSlots = Math.max(0, savedLimit - selectedItems.length);

            if (remainingSlots > 0) {
                if (shouldBalanceTypes) {
                    const itemsByType = {};
                    allItems.forEach(item => {
                        const type = item.Type;
                        if (!itemsByType[type]) itemsByType[type] = [];
                        itemsByType[type].push(item);
                    });

                    const types = Object.keys(itemsByType);
                    const itemsPerType = Math.floor(remainingSlots / types.length);

                    types.forEach(type => {
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
                    const allItemIds = allItems.map(item => item.Id);
                    const alwaysShuffle = config.sortingKeywords?.some(keyword =>
                        (config.keywords || "").toLowerCase().includes(keyword.toLowerCase())
                    );

                    if (alwaysShuffle) {
                        console.log("Sorting keyword algılandı, shuffle geçmişi dikkate alınmayacak.");
                        const shuffled = shuffleArray(allItemIds);
                        const selectedItemsFromShuffle = allItems.filter(item =>
                            shuffled.slice(0, remainingSlots).includes(item.Id)
                        );
                        selectedItems.push(...selectedItemsFromShuffle);
                    } else {
                        const shuffleSeedLimit = parseInt(config.shuffleSeedLimit || "100", 10);
                        let history = getShuffleHistory(userId);
                        let unseenIds = allItemIds.filter(id => !history.includes(id));

                        if (unseenIds.length === 0 || history.length >= shuffleSeedLimit) {
                            console.log("Shuffle limiti doldu, geçmiş sıfırlanıyor.");
                            resetShuffleHistory(userId);
                            history = [];
                            unseenIds = [...allItemIds];
                        }

                        const shuffled = shuffleArray(unseenIds);
                        const newSelectionIds = shuffled.slice(0, remainingSlots);
                        const selectedItemsFromShuffle = allItems.filter(item => newSelectionIds.includes(item.Id));

                        const updatedHistory = [...history, ...newSelectionIds].slice(0, shuffleSeedLimit);
                        saveShuffleHistory(userId, updatedHistory);

                        console.log("Shuffle geçmişi:", updatedHistory.length, "/", shuffleSeedLimit);

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
                    selectedItems = [
                        ...selectedItems.slice(0, playingItems.length),
                        ...shuffledNonPlaying
                    ];
                }
            }

            const detailed = await Promise.all(selectedItems.map(i => fetchItemDetails(i.Id)));
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

document.addEventListener('DOMContentLoaded', () => {
    const cleanupQualityBadges = initializeQualityBadges();
    window.cleanupQualityBadges = cleanupQualityBadges;
});

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason.message.includes('quality badge')) {
        console.warn('Kalite badge hatası:', event.reason);
        event.preventDefault();
    }
});


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
    }

    const indexPage = document.querySelector("#indexPage:not(.hide)");
    if (indexPage) {
        const sliderContainer = indexPage.querySelector("#slides-container");
        if (sliderContainer) {
            sliderContainer.remove();
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

function extractItemTypesFromQuery(query) {
    const match = query.match(/IncludeItemTypes=([^&]+)/i);
    if (!match) return [];
    return match[1].split(',').map(t => t.trim());
}

function hasAllTypes(targetTypes, requiredTypes) {
    return requiredTypes.every(t => targetTypes.includes(t));
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
    mutations.forEach((mutation) => {
      if (!mutation.addedNodes.length) return;
      const relevantContainers = [
        'cardImageContainer',
      ];

      const isRelevant = Array.from(mutation.addedNodes).some(node => {
        if (node.nodeType === 1 && relevantContainers.some(c =>
          node.classList?.contains(c))) {
          return true;
        }
        return relevantContainers.some(c => node.querySelector?.(`.${c}`));
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
    attributeFilter: ['data-id', 'class']
  });

  return observer;
}


function initializeModalForAllItems() {
  const indexPage = document.querySelector('#indexPage:not(.hide)');
  if (!indexPage) return;
  if (document.querySelector('#slides-container')) return;
  setupHoverForAllItems();
  const observer = observeDOMChanges();
  return () => observer.disconnect();
}

async function preloadForVisibleItems() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const itemId = entry.target.dataset.itemId;
        if (itemId) {
          preloadVideoForDot(itemId).catch(() => {});
        }
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-item-id]').forEach(item => {
    observer.observe(item);
  });
}

window.slidesInit = slidesInit;
const cleanupAvatarSystem = initAvatarSystem();
window.cleanupAvatarSystem = cleanupAvatarSystem;
