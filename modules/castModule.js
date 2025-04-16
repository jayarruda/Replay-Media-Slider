import { getSessionInfo, makeApiRequest, getAuthHeader } from "./api.js";
import { getConfig } from "./config.js";

const config = getConfig();

export const createDeviceSelector = async (itemId) => {
  if (config.showCast) {
    const castContainer = document.createElement("div");
    castContainer.className = "cast-container";

    const deviceSelectorContainer = document.createElement("div");
    deviceSelectorContainer.className = "device-selector-top-container";

    const deviceIcon = document.createElement("div");
    deviceIcon.className = "device-selector-top-icon";
    deviceIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#ffffff">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/>
      </svg>
    `;
    deviceIcon.title = config.languageLabels.castoynat;

    const deviceDropdown = document.createElement("div");
    deviceDropdown.className = "device-selector-top-dropdown hide";

    deviceIcon.addEventListener('click', async (e) => {
      e.stopPropagation();

      if (deviceDropdown.classList.contains('hide')) {
        await loadAvailableDevices(itemId, deviceDropdown);
        deviceDropdown.classList.remove('hide');
        deviceDropdown.classList.add('show');

        setTimeout(() => {
          const closeHandler = (e) => {
            if (!castContainer.contains(e.target)) {
              deviceDropdown.classList.remove('show');
              deviceDropdown.classList.add('hide');
              document.removeEventListener('click', closeHandler);
            }
          };
          document.addEventListener('click', closeHandler);
        }, 0);
      } else {
        deviceDropdown.classList.add('hide');
      }
    });

    deviceSelectorContainer.appendChild(deviceIcon);
    deviceSelectorContainer.appendChild(deviceDropdown);

    castContainer.appendChild(deviceSelectorContainer);
    return castContainer;
  }
};

async function loadAvailableDevices(itemId, dropdown) {
  dropdown.innerHTML = `<div class="loading-text">${config.languageLabels.castyukleniyor}</div>`;

  try {
    const { userId } = getSessionInfo();
    const sessions = await makeApiRequest(`/Sessions?userId=${userId}`);

    const videoDevices = sessions.filter(s =>
      s.Capabilities?.PlayableMediaTypes?.includes('Video')
    );

    if (videoDevices.length === 0) {
      dropdown.innerHTML = `<div class="no-devices">${config.languageLabels.castbulunamadi}</div>`;
      return;
    }

    const uniqueDevices = new Map();

    videoDevices.forEach(device => {
      const key = `${device.DeviceId || device.DeviceName}-${device.Client}`;
      if (!uniqueDevices.has(key)) {
        uniqueDevices.set(key, device);
      }
    });

    const sortedDevices = Array.from(uniqueDevices.values()).sort((a, b) => {
      const aActive = !!a.NowPlayingItem;
      const bActive = !!b.NowPlayingItem;
      return Number(bActive) - Number(aActive);
    });

    dropdown.innerHTML = '';

    sortedDevices.forEach(device => {
      const deviceElement = document.createElement('div');
      deviceElement.className = 'device-item';
      deviceElement.innerHTML = `
        <div class="device-icon-container">
          ${getDeviceIcon(device.Client)}
        </div>
        <div class="device-info">
          <div class="device-name">${device.DeviceName || config.languageLabels.castcihaz}</div>
          <div class="device-client">${device.Client || config.languageLabels.castistemci}</div>
          ${device.NowPlayingItem ? `<div class="now-playing">🎬 ${config.languageLabels.castoynatiliyor}</div>` : ''}
        </div>
      `;

      deviceElement.addEventListener('click', async (e) => {
        e.stopPropagation();
        const success = await startPlayback(itemId, device.Id);
        if (success) {
          dropdown.classList.add('hide');
        }
      });

      dropdown.appendChild(deviceElement);
    });
  } catch (error) {
    console.error('Cihazlar yüklenirken hata:', error);
    dropdown.innerHTML = `<div class="error-message">${config.languageLabels.casthata}: ${error.message}</div>`;
  }
}

function getDeviceIcon(clientType) {
  const icons = {
    'Android': `<i class="fa-brands fa-android" style="color: #a4c639;"></i>`,
    'iOS': `<i class="fa-brands fa-apple" style="color: #ffffff;"></i>`,
    'SmartTV': `<i class="fa-solid fa-tv" style="color: #ffffff;"></i>`,
    'Chromecast': `<i class="fa-solid fa-chromecast" style="color: #ffffff;"></i>`
  };

  return icons[clientType] || `<i class="fa-solid fa-display" style="color: #ffffff;"></i>`;
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

export { loadAvailableDevices, getDeviceIcon, startPlayback, showNotification };
