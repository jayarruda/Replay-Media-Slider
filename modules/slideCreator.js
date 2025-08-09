import { getYoutubeEmbedUrl, getProviderUrl, isValidUrl, createTrailerIframe, debounce, getHighResImageUrls, prefetchImages, getHighestQualityBackdropIndex } from "./utils.js";
import { updateFavoriteStatus, updatePlayedStatus, fetchItemDetails } from "./api.js";
import { getConfig } from "./config.js";
import { getLanguageLabels, getDefaultLanguage } from "../language/index.js";
import { createSlidesContainer, createGradientOverlay, createHorizontalGradientOverlay, createLogoContainer, createStatusContainer, createActorSlider, createInfoContainer, createDirectorContainer, createRatingContainer, createLanguageContainer, createMetaContainer, createMainContentContainer, createPlotContainer, createTitleContainer } from "./containerUtils.js";
import { createButtons, createProviderContainer } from './buttons.js';

const config = getConfig();
const settingsBackgroundSlides = [];

async function createSlide(item) {
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) return;

  let parentId = item.Id;

  if ((item.Type === "Episode" || item.Type === "Season") && item.SeriesId) {
    console.log(`Bölüm algılandı: ${item.Name}, dizi bilgileri alınıyor: ${item.SeriesId}`);
    try {
      const parentItem = await fetchItemDetails(item.SeriesId);
      parentId = parentItem.Id;

      item = {
  ...parentItem,
  Id: item.Id,
  Type: item.Type,
  SeriesId: item.SeriesId,
  MediaStreams: item.MediaStreams,
  People: item.People || parentItem.People,
  UserData: item.UserData,
  RunTimeTicks: item.RunTimeTicks,
  RemoteTrailers: item.RemoteTrailers,
  ProviderIds: item.ProviderIds,
  ParentIndexNumber: item.ParentIndexNumber,
  IndexNumber: item.IndexNumber,
  Name: item.Name
};
    } catch (err) {
      console.error("Dizi bilgileri alınamadı:", err);
    }
  }

  const slidesContainer = createSlidesContainer(indexPage);
  const itemId = item.Id;

  const {
    Overview,
    Type: itemType,
    People,
    UserData,
    MediaStreams,
    Name: title,
    RunTimeTicks,
    OriginalTitle,
    Taglines,
    Genres,
    ChildCount,
    ProductionYear,
    ProductionLocations,
    CommunityRating,
    CriticRating,
    OfficialRating,
    RemoteTrailers,
    ProviderIds
  } = item;

  let highestQualityBackdropIndex;
  if (config.manualBackdropSelection || config.indexZeroSelection) {
    highestQualityBackdropIndex = "0";
  } else {
    highestQualityBackdropIndex = await getHighestQualityBackdropIndex(parentId);
  }

  function storeBackdropUrl(id, url) {
    const storedUrls = JSON.parse(localStorage.getItem("backdropUrls")) || [];
    if (!storedUrls.includes(url)) {
      storedUrls.push(url);
      localStorage.setItem("backdropUrls", JSON.stringify(storedUrls));
    }
  }

  const autoBackdropUrl = `/Items/${parentId}/Images/Backdrop/${highestQualityBackdropIndex}`;
  const landscapeUrl = `/Items/${parentId}/Images/Thumb/0`;
  const primaryUrl = `/Items/${parentId}/Images/Primary`;
  let logoUrl = `/Items/${parentId}/Images/Logo`;
  const bannerUrl = `/Items/${parentId}/Images/Banner`;
  const artUrl = `/Items/${parentId}/Images/Art`;
  const discUrl = `/Items/${parentId}/Images/Disc`;

  let logoExists = true;
  try {
    const logoResponse = await fetch(logoUrl, { method: "HEAD" });
    logoExists = logoResponse.ok;
  } catch {
    logoExists = false;
  }

  storeBackdropUrl(parentId, autoBackdropUrl);

  const manualBackdropUrl = {
    backdropUrl: `/Items/${parentId}/Images/Backdrop/0`,
    landscapeUrl,
    primaryUrl,
    logoUrl: logoExists ? logoUrl : `/Items/${parentId}/Images/Backdrop/0`,
    bannerUrl,
    artUrl,
    discUrl,
    none: ""
  }[config.backdropImageType];

  addSlideToSettingsBackground(parentId, autoBackdropUrl);

  const slide = document.createElement("div");
  slide.className = "slide";
  slide.style.position = "absolute";
  slide.style.display = "none";
  slide.dataset.detailUrl = `/web/#/details?id=${itemId}`;
  slide.dataset.itemId = itemId;
  slide.dataset.played = (UserData?.PlaybackPositionTicks > 0) ? "true" : "false";
  slide.setAttribute('data-media-streams', JSON.stringify(MediaStreams || []));
  slide.dataset.played =
  (typeof UserData?.PlaybackPositionTicks === "number" && UserData.PlaybackPositionTicks > 0)
    ? "true"
    : "false";

if (typeof UserData?.PlaybackPositionTicks === "number") {
  slide.dataset.playbackpositionticks = UserData.PlaybackPositionTicks;
}
if (typeof RunTimeTicks === "number") {
  slide.dataset.runtimeticks = RunTimeTicks;
}

  const selectedOverlayUrl = {
    backdropUrl: autoBackdropUrl,
    landscapeUrl,
    primaryUrl,
    logoUrl: logoExists ? logoUrl : autoBackdropUrl,
    bannerUrl,
    artUrl,
    discUrl,
    none: ""
  }[config.gradientOverlayImageType];

  slide.dataset.background = selectedOverlayUrl;
  slide.dataset.backdropUrl = autoBackdropUrl;
  slide.dataset.landscapeUrl = landscapeUrl;
  slide.dataset.primaryUrl = primaryUrl;
  slide.dataset.logoUrl = logoExists ? logoUrl : autoBackdropUrl;
  slide.dataset.bannerUrl = bannerUrl;
  slide.dataset.artUrl = artUrl;
  slide.dataset.discUrl = discUrl;

  const { backdropUrl, placeholderUrl } = await getHighResImageUrls({
  ...item,
  Id: parentId
}, highestQualityBackdropIndex);
  if (slidesContainer.children.length === 0) {
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'image';
    preloadLink.href = backdropUrl;
    document.head.appendChild(preloadLink);
  } else {
    prefetchImages([backdropUrl]);
  }

  const backdropImg = document.createElement('img');
  backdropImg.className = 'backdrop';
  backdropImg.sizes = '100vw';
  backdropImg.alt = 'Backdrop';
  backdropImg.loading = 'lazy';
  backdropImg.style.opacity = '0';
  backdropImg.src = placeholderUrl;

  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const finalBackdrop = config.manualBackdropSelection ? manualBackdropUrl : backdropUrl;
        backdropImg.src = finalBackdrop;
        backdropImg.onload = () => {
          backdropImg.style.transition = 'opacity 0.5s ease';
          backdropImg.style.opacity = '1';
        };
        observer.unobserve(backdropImg);
      }
    });
  });
  io.observe(backdropImg);

  backdropImg.addEventListener('click', () => {
    window.location.href = slide.dataset.detailUrl;
  });

  slide.appendChild(backdropImg);

  const gradientOverlay = createGradientOverlay(selectedOverlayUrl);
  const horizontalGradientOverlay = createHorizontalGradientOverlay();
  slide.append(backdropImg, gradientOverlay, horizontalGradientOverlay);
  slidesContainer.appendChild(slide);

  createTrailerIframe({ config, RemoteTrailers, slide, backdropImg, itemId });

  const logoContainer = createLogoContainer();
  const order = config.showDiscOnly
    ? ["disk"]
    : config.showTitleOnly
      ? ["originalTitle"]
      : config.showLogoOrTitle
        ? config.displayOrder.split(",").map(item => item.trim())
        : [];

  function createLogoElement(fallback) {
    const logoImg = document.createElement("img");
    logoImg.className = "logo";
    logoImg.src = logoUrl;
    logoImg.alt = "";
    logoImg.loading = "lazy";
    Object.assign(logoImg.style, {
      width: "100%", maxWidth: "90%", height: "100%", maxHeight: "40%", objectFit: "contain", aspectRatio: "1", display: "block"
    });
    logoImg.onerror = fallback;
    return logoImg;
  }

  function createDiskElement(fallback) {
    const discImg = document.createElement("img");
    discImg.className = "disk";
    discImg.src = discUrl;
    discImg.alt = "";
    discImg.loading = "lazy";
    Object.assign(discImg.style, {
      maxWidth: "75%", maxHeight: "75%", width: "auto", objectFit: "contain", borderRadius: "50%", display: "block"
    });
    discImg.onerror = fallback;
    return discImg;
  }

  function createTitleElement() {
    const titleDiv = document.createElement("div");
    titleDiv.className = "no-logo-container";
    titleDiv.textContent = OriginalTitle;
    Object.assign(titleDiv.style, {
      display: "flex", alignItems: "center", justifyContent: "center"
    });
    return titleDiv;
  }

  function tryDisplayElement(index) {
    if (index >= order.length) return;
    const type = order[index];
    if (type === "logo") {
      const element = createLogoElement(() => {
        logoContainer.innerHTML = "";
        tryDisplayElement(index + 1);
      });
      logoContainer.appendChild(element);
    } else if (type === "disk") {
      const element = createDiskElement(() => {
        logoContainer.innerHTML = "";
        tryDisplayElement(index + 1);
      });
      logoContainer.appendChild(element);
    } else if (type === "originalTitle") {
      const element = createTitleElement();
      logoContainer.appendChild(element);
    } else {
      tryDisplayElement(index + 1);
    }
  }

  tryDisplayElement(0);

  const buttonContainer = createButtons(slide, config, UserData, itemId, RemoteTrailers, updatePlayedStatus, updateFavoriteStatus, openTrailerModal, item);
  document.body.appendChild(buttonContainer);

  const plotContainer = createPlotContainer(config, Overview, UserData, RunTimeTicks);
  const titleContainer = createTitleContainer({
  config,
  Taglines,
  title,
  OriginalTitle,
  Type: itemType,
  ParentIndexNumber: item.ParentIndexNumber,
  IndexNumber: item.IndexNumber
});

  const statusContainer = createStatusContainer(itemType, config, UserData, ChildCount, RunTimeTicks, MediaStreams);
  const actorSlider = await createActorSlider(People, config, item);
  const infoContainer = createInfoContainer({ config, Genres, ProductionYear, ProductionLocations });
  const directorContainer = await createDirectorContainer({ config, People, item });
  const { container: ratingContainer, ratingExists } = await createRatingContainer({
  config,
  CommunityRating,
  CriticRating,
  OfficialRating,
  UserData,
  item
});
  const providerContainer = createProviderContainer({ config, ProviderIds, RemoteTrailers, itemId, slide });
  const languageContainer = createLanguageContainer({ config, MediaStreams, itemType });

  const metaContainer = createMetaContainer();
  if (statusContainer) metaContainer.appendChild(statusContainer);
  if (ratingExists) metaContainer.appendChild(ratingContainer);
  if (languageContainer) metaContainer.appendChild(languageContainer);

  const mainContentContainer = createMainContentContainer();
  mainContentContainer.append(logoContainer, titleContainer, plotContainer, providerContainer);

  slide.append(metaContainer, mainContentContainer, buttonContainer, actorSlider, infoContainer, directorContainer);
  slidesContainer.appendChild(slide);

  console.log(`Item ${itemId} slide eklendi.`);
  if (slidesContainer.children.length === 1) {
    import("./navigation.js").then(mod => mod.displaySlide(0));
  }
}


function addSlideToSettingsBackground(itemId, backdropUrl) {
  const settingsSlider = document.getElementById("settingsBackgroundSlider");
  if (!settingsSlider) return;
  const existingSlide = settingsSlider.querySelector(`[data-item-id="${itemId}"]`);
  if (existingSlide) return;
  const slide = document.createElement("div");
  slide.className = "slide";
  slide.dataset.itemId = itemId;
  slide.style.backgroundImage = `url('${backdropUrl}')`;
  const img = new Image();
  img.src = backdropUrl;
  img.onerror = () => {
    if (slide.parentNode) {
      slide.parentNode.removeChild(slide);
    }
  };
  settingsSlider.appendChild(slide);
  if (settingsSlider.children.length === 1) {
    slide.classList.add("active");
  }
}

function openTrailerModal(trailerUrl, trailerName, itemName = '', itemType = '', isFavorite = false, itemId = null, updateFavoriteCallback = null, CommunityRating = null, CriticRating = null, OfficialRating = null) {
  const embedUrl = getYoutubeEmbedUrl(trailerUrl);
  const overlay = document.createElement("div");
  overlay.className = "trailer-modal-overlay";
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 0.3s ease-in-out";

  const modal = document.createElement("div");
  modal.className = "trailer-modal";
  modal.style.maxWidth = "90vw";
  modal.style.maxHeight = "90vh";
  modal.style.width = "800px";

  const modalHeader = document.createElement("div");
  modalHeader.className = "trailer-modal-header";

  const titleElement = document.createElement("h3");
  const itemDisplayName = itemName ? itemName : 'Bilinmeyen İçerik';
  titleElement.textContent = `${itemDisplayName} - ${config.languageLabels.fragman}`;

  const closeBtn = document.createElement("button");
  closeBtn.className = "trailer-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cursor = "pointer";

  modalHeader.append(titleElement, closeBtn);
  const videoContainer = document.createElement("div");
  videoContainer.className = "trailer-video-container";
  videoContainer.style.paddingBottom = "56.25%";

  const loadingSpinner = document.createElement("div");
  loadingSpinner.className = "trailer-loading";
  videoContainer.appendChild(loadingSpinner);

  const iframe = document.createElement("iframe");
  iframe.src = embedUrl + "?autoplay=1&rel=0&fs=1&playsinline=1&modestbranding=1";
  iframe.title = trailerName;
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
  iframe.allowFullscreen = true;
  iframe.setAttribute("allowfullscreen", "");
  iframe.style.position = "absolute";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";

  iframe.onload = () => {
    loadingSpinner.style.display = "none";
  };

  videoContainer.appendChild(iframe);

  const modalFooter = document.createElement("div");
  modalFooter.className = "trailer-modal-footer";
  modalFooter.style.display = "flex";
  modalFooter.style.justifyContent = "space-between";
  modalFooter.style.alignItems = "center";
  modalFooter.style.width = "100%";
  modalFooter.style.padding = "10px 20px";
  modalFooter.style.boxSizing = "border-box";

  const infoContainer = document.createElement("div");
  infoContainer.style.display = "flex";
  infoContainer.style.gap = "8px";

  const itemTitleElement = document.createElement("div");
  const contentType = itemType === 'Movie' ? config.languageLabels.film :
                    itemType === 'Series' ? config.languageLabels.dizi :
                    itemType === 'Episode' ? config.languageLabels.dizi :
                    "İçerik: ";
  itemTitleElement.textContent = `${contentType}: ${itemDisplayName}`;
  itemTitleElement.style.fontWeight = "bold";
  infoContainer.appendChild(itemTitleElement);

  const ratingContainer = document.createElement("div");
  ratingContainer.style.display = "flex";
  ratingContainer.style.gap = "15px";
  ratingContainer.style.alignItems = "center";

  if (CommunityRating) {
    let ratingValue = Array.isArray(CommunityRating)
      ? Math.round((CommunityRating.reduce((a, b) => a + b, 0) / CommunityRating.length) * 10) / 10
      : Math.round(CommunityRating * 10) / 10;

    const ratingPercentage = ratingValue * 9.5;

    const communityRatingElement = document.createElement("div");
    communityRatingElement.style.display = "flex";
    communityRatingElement.style.alignItems = "center";
    communityRatingElement.style.gap = "5px";

    const starContainer = document.createElement("span");
    starContainer.className = "star-rating";
    starContainer.style.position = "relative";
    starContainer.style.display = "inline-block";
    starContainer.style.fontSize = "1em";
    starContainer.style.color = "#ccc";

    const emptyStar = document.createElement("i");
    emptyStar.className = "fa-regular fa-star";

    const filledStarWrapper = document.createElement("span");
    filledStarWrapper.className = "star-filled";
    filledStarWrapper.style.position = "absolute";
    filledStarWrapper.style.bottom = "0";
    filledStarWrapper.style.left = "0";
    filledStarWrapper.style.width = "auto";
    filledStarWrapper.style.color = "gold";
    filledStarWrapper.style.overflow = "hidden";
    filledStarWrapper.style.clipPath = `inset(${100 - ratingPercentage}% 0 0 0)`;

    const filledStar = document.createElement("i");
    filledStar.className = "fa-solid fa-star";
    filledStar.style.display = "block";

    filledStarWrapper.appendChild(filledStar);
    starContainer.appendChild(emptyStar);
    starContainer.appendChild(filledStarWrapper);

    const ratingText = document.createElement("span");
    ratingText.textContent = ratingValue;

    communityRatingElement.appendChild(starContainer);
    communityRatingElement.appendChild(ratingText);
    ratingContainer.appendChild(communityRatingElement);
  }

  if (CriticRating) {
    const criticRatingElement = document.createElement("div");
    criticRatingElement.style.display = "flex";
    criticRatingElement.style.alignItems = "center";
    criticRatingElement.style.gap = "5px";

    const tomatoIcon = document.createElement("i");
    tomatoIcon.className = "fa-duotone fa-tomato";
    tomatoIcon.style.setProperty("--fa-primary-color", "#01902e");
    tomatoIcon.style.setProperty("--fa-secondary-color", "#f93208");
    tomatoIcon.style.setProperty("--fa-secondary-opacity", "1");

    const ratingValue = document.createElement("span");
    ratingValue.textContent = `${CriticRating}%`;

    criticRatingElement.appendChild(tomatoIcon);
    criticRatingElement.appendChild(ratingValue);
    ratingContainer.appendChild(criticRatingElement);
}

  if (OfficialRating) {
    const officialRatingElement = document.createElement("div");
    officialRatingElement.className = "official-rating";
    officialRatingElement.textContent = OfficialRating;
    officialRatingElement.style.padding = "2px 5px";
    officialRatingElement.style.borderRadius = "3px";
    officialRatingElement.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    officialRatingElement.style.fontSize = "0.9em";
    ratingContainer.appendChild(officialRatingElement);
  }

  if (itemId && updateFavoriteCallback) {
    const favoriteContainer = document.createElement("div");
    favoriteContainer.style.cursor = "pointer";

    const initiallyFav = Boolean(isFavorite);
    const favoriteIcon = document.createElement("i");
    favoriteIcon.className = initiallyFav
      ? "fa-solid fa-heart"
      : "fa-regular fa-heart";
    favoriteIcon.style.color = initiallyFav ? "#FFC107" : "#fff";

    const favoriteText = document.createElement("span");
    favoriteText.textContent = initiallyFav
      ? config.languageLabels.favorilendi
      : config.languageLabels.favori;

    favoriteContainer.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!itemId || !updateFavoriteCallback) return;

      const newFavoriteStatus = !favoriteIcon.classList.contains("fa-solid");
      try {
        await updateFavoriteCallback(itemId, newFavoriteStatus);
        favoriteIcon.className = newFavoriteStatus
          ? "fa-solid fa-heart"
          : "fa-regular fa-heart";
        favoriteIcon.style.color = newFavoriteStatus ? "#FFC107" : "#fff";
        favoriteText.textContent = newFavoriteStatus
          ? config.languageLabels.favorilendi
          : config.languageLabels.favori;
        favoriteIcon.style.transform = "scale(1.2)";
        setTimeout(() => (favoriteIcon.style.transform = ""), 200);
      } catch (err) {
        console.error("Favori durumu güncellenirken hata:", err);
      }
    });

    favoriteContainer.appendChild(favoriteIcon);
    favoriteContainer.appendChild(favoriteText);
    infoContainer.appendChild(favoriteContainer);
  }

  modalFooter.appendChild(infoContainer);
  modalFooter.appendChild(ratingContainer);

  modal.append(modalHeader, videoContainer, modalFooter);
  overlay.appendChild(modal);

  if (!document.getElementById('trailer-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'trailer-modal-styles';
    style.textContent = `
      .trailer-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 50px;
        height: 50px;
        border: 5px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: spin 1s ease-in-out infinite;
        z-index: 10;
      }
      @keyframes spin {
        to { transform: translate(-50%, -50%) rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  const closeModal = () => {
    overlay.style.opacity = "0";
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      document.removeEventListener("keydown", escListener);
    }, 300);
  };

  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  const escListener = (e) => {
    if (e.key === "Escape" || e.keyCode === 27) {
      closeModal();
    }
  };

  document.addEventListener("keydown", escListener);
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 10);

  return {
    close: closeModal,
    getIframe: () => iframe
  };
}

export { createSlide, openTrailerModal };
