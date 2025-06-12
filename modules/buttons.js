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
        if (!isTouchDevice()) {
            buttonContainer.classList.remove('hidden');
            buttonContainer.classList.add('visible');
        }
    });

    mainContainer.addEventListener('mouseleave', () => {
        if (!isTouchDevice()) {
            buttonContainer.classList.remove('visible');
            buttonContainer.classList.add('hidden');
        }
    });

    let touchTimer;
    let isOpen = false;

    mainButton.addEventListener('click', (e) => {
        if (!isTouchDevice()) return;

        e.preventDefault();
        e.stopPropagation();

        if (isOpen) {
            buttonContainer.classList.remove('visible');
            buttonContainer.classList.add('hidden');
        } else {
            buttonContainer.classList.remove('hidden');
            buttonContainer.classList.add('visible');
        }
        isOpen = !isOpen;
    });

    document.addEventListener('click', (e) => {
        if (!isTouchDevice() || !isOpen) return;

        if (!mainContainer.contains(e.target)) {
            buttonContainer.classList.remove('visible');
            buttonContainer.classList.add('hidden');
            isOpen = false;
        }
    });

    function isTouchDevice() {
        return (('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0) ||
               (navigator.msMaxTouchPoints > 0));
    }

    const createButtonWithBackground = (buttonType, iconHtml, text, clickHandler, initialClass = '') => {
    const bgType = config[`${buttonType}BackgroundImageType`] || "backdropUrl";
    let bgImage = "";
    if (bgType !== "none") {
        bgImage = slide.dataset[bgType];
    }

    const btnContainer = document.createElement("div");
    btnContainer.className = "btn-container";
    if (!bgImage) btnContainer.classList.add("no-bg-image");

    if (bgImage) {
        const bgLayer = document.createElement("div");
        bgLayer.className = "button-bg-layer";
        bgLayer.style.backgroundImage = `url(${bgImage})`;
        bgLayer.style.opacity = config.buttonBackgroundOpacity || 0.3;
        bgLayer.style.filter = `blur(${config.buttonBackgroundBlur}px)`;
        btnContainer.appendChild(bgLayer);
    }

    const contentDiv = document.createElement("div");
    contentDiv.className = "btn-content";

    const btn = document.createElement("button");
    btn.className = `${buttonType}-btn ${initialClass}`;
    btn.innerHTML = `
        <span class="icon-wrapper">
            ${iconHtml}
        </span>
    `;

    const textSpan = document.createElement("span");
    textSpan.className = "btn-text";
    textSpan.textContent = text;

    contentDiv.appendChild(btn);
    contentDiv.appendChild(textSpan);
    btnContainer.appendChild(contentDiv);
    if (bgImage) {
        btnContainer.appendChild(buttonGradientOverlay.cloneNode(true));
    }

    if (clickHandler) {
    btnContainer.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        clickHandler(event, btn);
    });
}

    return btnContainer;
};

    if (config.showPlayedButton) {
    const isPlayed = UserData && UserData.Played;
    const playedBtnContainer = createButtonWithBackground(
        "played",
        isPlayed ? '<i class="fa-solid fa-check fa-xl" style="color: #FFC107;"></i>' : '<i class="fa-light fa-check fa-xl"></i>',
        isPlayed ? config.languageLabels.izlendi : config.languageLabels.izlenmedi,
        (event, buttonElement) => {
            const iconWrapper = buttonElement.querySelector('.icon-wrapper');
            const textSpan = buttonElement.nextElementSibling;

            if (buttonElement.classList.contains("played")) {
                buttonElement.classList.remove("played");
                iconWrapper.innerHTML = '<i class="fa-light fa-check fa-xl"></i>';
                textSpan.textContent = config.languageLabels.izlenmedi;
                updatePlayedStatus(itemId, false);
            } else {
                buttonElement.classList.add("played");
                iconWrapper.innerHTML = '<i class="fa-solid fa-check fa-xl" style="color: #FFC107;"></i>';
                textSpan.textContent = config.languageLabels.izlendi;
                updatePlayedStatus(itemId, true);
            }
        },
        isPlayed ? "played" : ""
    );
    buttonContainer.appendChild(playedBtnContainer);
}

if (config.showFavoriteButton) {
    const isFavorited = UserData && UserData.IsFavorite;
    const favoriteBtnContainer = createButtonWithBackground(
        "favorite",
        isFavorited ? '<i class="fa-solid fa-heart fa-xl" style="color: #FFC107;"></i>' : '<i class="fa-light fa-heart fa-xl"></i>',
        isFavorited ? config.languageLabels.favorilendi : config.languageLabels.favori,
        (event, buttonElement) => {
            const iconWrapper = buttonElement.querySelector('.icon-wrapper');
            const textSpan = buttonElement.nextElementSibling;

            if (buttonElement.classList.contains("favorited")) {
                buttonElement.classList.remove("favorited");
                iconWrapper.innerHTML = '<i class="fa-light fa-heart fa-xl"></i>';
                textSpan.textContent = config.languageLabels.favori;
                updateFavoriteStatus(itemId, false);
            } else {
                buttonElement.classList.add("favorited");
                iconWrapper.innerHTML = '<i class="fa-solid fa-heart fa-xl" style="color: #FFC107;"></i>';
                textSpan.textContent = config.languageLabels.favorilendi;
                updateFavoriteStatus(itemId, true);
            }
        },
        isFavorited ? "favorited" : ""
    );
    buttonContainer.appendChild(favoriteBtnContainer);
}

    if (config.showWatchButton) {
        const watchBtnContainer = createButtonWithBackground(
            "watch",
            '<i class="fa-regular fa-circle-play fa-xl icon"></i>',
            config.languageLabels.izle,
            async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    await castToBestAvailableDevice(itemId);
                } catch (error) {
                    console.error("Cast işlemi başarısız:", error);
                    window.location.href = slide.dataset.detailUrl;
                }
            }
        );
        buttonContainer.appendChild(watchBtnContainer);
    }

    if (config.showTrailerButton && RemoteTrailers && RemoteTrailers.length > 0) {
        const trailer = RemoteTrailers[0];
        const trailerBtnContainer = createButtonWithBackground(
            "trailer",
            '<i class="fa-solid fa-film fa-xl icon"></i>',
            config.languageLabels.fragman,
            (event) => {
                event.preventDefault();
                event.stopPropagation();
                openTrailerModal(trailer.Url, trailer.Name);
            }
        );
        buttonContainer.appendChild(trailerBtnContainer);
    }

    mainButtonContainer.appendChild(mainButton);
    const mainOverlay = buttonGradientOverlay.cloneNode(true);
    mainOverlay.classList.add("exclude-overlay");
    mainButtonContainer.appendChild(mainOverlay);
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
