import { getConfig } from "./config.js";
import { getSessionInfo, makeApiRequest, getAuthHeader } from "./api.js";

const config = getConfig();

export function createButtons(slide, config, UserData, itemId, RemoteTrailers, updatePlayedStatus, updateFavoriteStatus, openTrailerModal) {
    const mainContainer = document.createElement('div');
    mainContainer.className = 'main-button-container';

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container hidden';

    const buttonGradientOverlay = document.createElement('div');
    buttonGradientOverlay.className = 'button-gradient-overlay';

    const mainButton = document.createElement('button');
    mainButton.className = 'main-btn';
    mainButton.innerHTML = `
        <span class="icon-wrapper">
            <i class="fa-solid fa-ellipsis fa-xl"></i>
        </span>
    `;

    const mainButtonContainer = document.createElement('div');
    mainButtonContainer.className = 'btn-container main-btn-container';
    mainButtonContainer.style.position = "relative";
    mainButtonContainer.style.display = "inline-block";

    mainContainer.addEventListener('mouseenter', () => {
        buttonContainer.classList.remove('hidden');
        buttonContainer.classList.add('visible');
    });

    mainContainer.addEventListener('mouseleave', () => {
        buttonContainer.classList.remove('visible');
        buttonContainer.classList.add('hidden');
    });

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
                <i class="fa-regular fa-circle-play fa-xl icon"></i>
            </span>
            <span class="btn-text">${config.languageLabels.izle}</span>
        `;
        watchBtn.style.transition = "all 1s ease-in-out";

        watchBtnContainer.appendChild(watchBtn);
        watchBtnContainer.appendChild(buttonGradientOverlay.cloneNode(true));
        watchBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await castToBestAvailableDevice(itemId);
            } catch (error) {
                console.error("Cast işlemi başarısız:", error);
                window.location.href = slide.dataset.detailUrl;
            }
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

    mainButtonContainer.appendChild(mainButton);
    mainButtonContainer.appendChild(buttonGradientOverlay.cloneNode(true));
    mainContainer.appendChild(mainButtonContainer);
    mainContainer.appendChild(buttonContainer);

    return mainContainer;
}

async function castToBestAvailableDevice(itemId) {
  try {
    const { userId } = getSessionInfo();
    const sessions = await makeApiRequest(`/Sessions?userId=${userId}`);

    const videoDevices = sessions.filter(s =>
      s.Capabilities?.PlayableMediaTypes?.includes('Video')
    );

    if (videoDevices.length === 0) {
      showNotification(config.languageLabels.castbulunamadi, 'error');
      return;
    }

    const activeDevice = videoDevices.find(d => d.NowPlayingItem) || videoDevices[0];
    const success = await startPlayback(itemId, activeDevice.Id);
    if (!success) {
      showNotification(config.languageLabels.casthata, 'error');
    }
  } catch (error) {
    console.error('Cihazlar yüklenirken hata:', error);
    dropdown.innerHTML = `<div class="error-message">${config.languageLabels.casthata}: ${error.message}</div>`;
  }
}

async function startPlayback(itemId, sessionId) {
  try {
    const playUrl = `/Sessions/${sessionId}/Playing?playCommand=PlayNow&itemIds=${itemId}`;

    const response = await fetch(playUrl, {
      method: "POST",
      headers: {
        "Authorization": getAuthHeader()
      }
    });

   if (!response.ok) {
      throw new Error(`${config.languageLabels.castoynatmahata}: ${response.statusText}`);
    }

    showNotification(config.languageLabels.castbasarili, 'success');
    return true;
  } catch (error) {
    console.error("Oynatma hatası:", error);
    showNotification(`${config.languageLabels.castoynatmahata}: ${error.message}`, 'error');
    return false;
  }
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `playback-notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 3000);
}

function hideNotification() {
  const notification = document.querySelector('.playback-notification');
  if (notification) {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }
}
