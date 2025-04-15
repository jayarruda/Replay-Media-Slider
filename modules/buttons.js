import { getConfig } from "./config.js";
const config = getConfig();
export function createButtons(slide, config, UserData, itemId, RemoteTrailers, updatePlayedStatus, updateFavoriteStatus, openTrailerModal) {
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';

  const buttonGradientOverlay = document.createElement('div');
  buttonGradientOverlay.className = 'button-gradient-overlay';

  if (config.showPlayedButton) {
    const isPlayed = UserData && UserData.Played;
    const playedBtn = document.createElement("button");
    playedBtn.className = "played-btn";
    playedBtn.title = config.languageLabels.playedinfo;

    const playedBgType = config.playedBackgroundImageType || "backdropUrl";
    let playedBgImage = "";
    if (playedBgType !== "none") {
      playedBgImage = slide.dataset[playedBgType];
    }

    const playedBtnContainer = document.createElement("div");
    playedBtnContainer.className = "btn-container";
    playedBtnContainer.style.position = "relative";
    playedBtnContainer.style.display = "inline-block";

    if (playedBgImage) {
      playedBtn.style.backgroundImage = `url(${playedBgImage})`;
      playedBtn.style.backgroundRepeat = "no-repeat";
      playedBtn.style.backgroundSize = "cover";
      playedBtn.style.backgroundPosition = "center";
    }

    playedBtn.innerHTML = isPlayed
      ? '<i class="fa-solid fa-check fa-xl" style="color: #FFC107;"></i>'
      : '<i class="fa-light fa-check fa-xl"></i>';
    if (isPlayed) playedBtn.classList.add("played");
    playedBtn.style.transition = "all 1s ease-in-out";

    playedBtnContainer.appendChild(playedBtn);
    playedBtnContainer.appendChild(buttonGradientOverlay.cloneNode(true));

    playedBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (playedBtn.classList.contains("played")) {
        playedBtn.classList.remove("played");
        playedBtn.innerHTML = `
          <span class="icon-wrapper">
            <i class="fa-light fa-check fa-xl"></i>
          </span>
          <span class="btn-text"></span>
        `;
        updatePlayedStatus(itemId, false);
      } else {
        playedBtn.classList.add("played");
        playedBtn.innerHTML = `
          <span class="icon-wrapper">
            <i class="fa-solid fa-check fa-xl" style="color: #FFC107;"></i>
          </span>
          <span class="btn-text">${config.languageLabels.izlendi}</span>
        `;
        updatePlayedStatus(itemId, true);
      }
    });
    buttonContainer.appendChild(playedBtnContainer);
  }

  if (config.showFavoriteButton) {
    const isFavorited = UserData && UserData.IsFavorite;
    const favoriteBtn = document.createElement("button");
    favoriteBtn.className = "favorite-btn";
    const favoriBgType = config.favoriBackgroundImageType || "backdropUrl";
    let favoriBgImage = "";
    if (favoriBgType !== "none") {
      favoriBgImage = slide.dataset[favoriBgType];
    }

    const favoriteBtnContainer = document.createElement("div");
    favoriteBtnContainer.className = "btn-container";
    favoriteBtnContainer.style.position = "relative";
    favoriteBtnContainer.style.display = "inline-block";

    if (favoriBgImage) {
      favoriteBtn.style.backgroundImage = `url(${favoriBgImage})`;
      favoriteBtn.style.backgroundRepeat = "no-repeat";
      favoriteBtn.style.backgroundSize = "cover";
      favoriteBtn.style.backgroundPosition = "center";
    }

    favoriteBtn.innerHTML = isFavorited
      ? '<i class="fa-solid fa-heart fa-xl" style="color: #FFC107;"></i>'
      : '<i class="fa-light fa-heart fa-xl"></i>';
    if (isFavorited) favoriteBtn.classList.add("favorited");
    favoriteBtn.style.transition = "all 1s ease-in-out";

    favoriteBtnContainer.appendChild(favoriteBtn);
    favoriteBtnContainer.appendChild(buttonGradientOverlay.cloneNode(true));

    favoriteBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (favoriteBtn.classList.contains("favorited")) {
        favoriteBtn.classList.remove("favorited");
        favoriteBtn.innerHTML = `
          <span class="icon-wrapper">
            <i class="fa-light fa-heart fa-xl"></i>
          </span>
          <span class="btn-text"></span>
        `;
        updateFavoriteStatus(itemId, false);
      } else {
        favoriteBtn.classList.add("favorited");
        favoriteBtn.innerHTML = `
          <span class="icon-wrapper">
            <i class="fa-solid fa-heart fa-xl" style="color: #FFC107;"></i>
          </span>
          <span class="btn-text">${config.languageLabels.favorilendi}</span>
        `;
        updateFavoriteStatus(itemId, true);
      }
    });
    buttonContainer.appendChild(favoriteBtnContainer);
  }

  if (config.showWatchButton) {
    const watchBtn = document.createElement("button");
    watchBtn.className = "watch-btn";
    const watchBgType = config.watchBackgroundImageType || "backdropUrl";
    let watchBgImage = "";
    if (watchBgType !== "none") {
      watchBgImage = slide.dataset[watchBgType];
    }

    const watchBtnContainer = document.createElement("div");
    watchBtnContainer.className = "btn-container";
    watchBtnContainer.style.position = "relative";
    watchBtnContainer.style.display = "inline-block";

    if (watchBgImage) {
      watchBtn.style.backgroundImage = `url(${watchBgImage})`;
      watchBtn.style.backgroundRepeat = "no-repeat";
      watchBtn.style.backgroundSize = "cover";
      watchBtn.style.backgroundPosition = "center";
    }

    watchBtn.innerHTML = `
      <span class="icon-wrapper">
        <i class="fa-regular fa-circle-play fa-xl icon" style="margin-right: 8px;"></i>
      </span>
      <span class="btn-text">${config.languageLabels.izle}</span>
    `;
    watchBtn.style.transition = "all 1s ease-in-out";

    watchBtnContainer.appendChild(watchBtn);
    watchBtnContainer.appendChild(buttonGradientOverlay.cloneNode(true));

    watchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = slide.dataset.detailUrl;
    });
    buttonContainer.appendChild(watchBtnContainer);
  }

  if (config.showTrailerButton && RemoteTrailers && RemoteTrailers.length > 0) {
    const trailer = RemoteTrailers[0];
    const trailerBtn = document.createElement("button");
    trailerBtn.className = "trailer-btn";
    const trailerBgType = config.trailerBackgroundImageType || "backdropUrl";
    let trailerBgImage = "";
    if (trailerBgType !== "none") {
      trailerBgImage = slide.dataset[trailerBgType];
    }

    const trailerBtnContainer = document.createElement("div");
    trailerBtnContainer.className = "btn-container";
    trailerBtnContainer.style.position = "relative";
    trailerBtnContainer.style.display = "inline-block";

    if (trailerBgImage) {
      trailerBtn.style.backgroundImage = `url(${trailerBgImage})`;
      trailerBtn.style.backgroundRepeat = "no-repeat";
      trailerBtn.style.backgroundSize = "cover";
      trailerBtn.style.backgroundPosition = "center";
    }

    trailerBtn.innerHTML = `
      <span class="icon-wrapper">
        <i class="fa-solid fa-film fa-xl icon"></i>
      </span>
      <span class="btn-text">${config.languageLabels.fragman}</span>
    `;
    trailerBtn.style.transition = "all 1s ease-in-out";

    trailerBtnContainer.appendChild(trailerBtn);
    trailerBtnContainer.appendChild(buttonGradientOverlay.cloneNode(true));

    trailerBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openTrailerModal(trailer.Url, trailer.Name);
    });
    buttonContainer.appendChild(trailerBtnContainer);
  }

  return buttonContainer;
}
