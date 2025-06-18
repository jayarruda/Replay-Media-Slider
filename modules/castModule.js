import { getSessionInfo, makeApiRequest, getAuthHeader } from "./api.js";
import { getConfig } from "./config.js";

const config = getConfig();

export async function loadAvailableDevices(itemId, dropdown) {
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

export function getDeviceIcon(clientType) {
  const icons = {
    'Android': `<i class="fa-brands fa-android" style="color: #a4c639;"></i>`,
    'iOS': `<i class="fa-brands fa-apple" style="color: #ffffff;"></i>`,
    'SmartTV': `<i class="fa-solid fa-tv" style="color: #ffffff;"></i>`,
    'Chromecast': `<i class="fa-solid fa-chromecast" style="color: #ffffff;"></i>`
  };

  return icons[clientType] || `<i class="fa-solid fa-display" style="color: #ffffff;"></i>`;
}

export async function startPlayback(itemId, sessionId) {
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

export function showNotification(message, type) {
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

export function hideNotification() {
  const notification = document.querySelector('.playback-notification');
  if (notification) {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }
}
