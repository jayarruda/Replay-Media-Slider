import { getSessionInfo, makeApiRequest, getAuthHeader } from "./api.js";
import { getConfig } from "./config.js";
import { updateFavoriteStatus } from "./api.js";

const config = getConfig();

export async function loadAvailableDevices(itemId, dropdown) {
  dropdown.innerHTML = `<div class="loading-text">${config.languageLabels.castyukleniyor}</div>`;

  try {
    const { userId } = getSessionInfo();
    const sessions = await makeApiRequest(`/Sessions?userId=${userId}`);
    const videoDevices = sessions.filter(s =>
      s.Capabilities?.PlayableMediaTypes?.includes('Video') ||
      ['android', 'ios', 'iphone', 'ipad'].some(term =>
        s.Client?.toLowerCase().includes(term))
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

    const nowPlayingDevice = sortedDevices.find(device => device.NowPlayingItem);
    if (nowPlayingDevice) {
      const nowPlayingItem = nowPlayingDevice.NowPlayingItem;
      const nowPlayingItemId = nowPlayingItem.Id;
      const imageTag = nowPlayingItem.ImageTags?.Primary || '';
      const backdropTag = nowPlayingItem.ImageTags?.Backdrop?.[0] || '';

      const posterUrl = `/Items/${nowPlayingItemId}/Images/Primary?tag=${imageTag}&maxHeight=80`;
      const backdropUrl = `/Items/${nowPlayingItemId}/Images/Backdrop/${backdropTag}?tag=${backdropTag}&maxWidth=800`;

      const topBanner = document.createElement('div');
      topBanner.className = 'now-playing-banner';
      topBanner.style.backgroundImage = `url('${backdropUrl}')`;

      topBanner.innerHTML = `
        <div class="overlay"></div>
        <img class="now-playing-poster" src="${posterUrl}" alt="Poster">
        <div class="now-playing-details">
          <div class="now-playing-title">🎬 ${nowPlayingItem.Name}</div>
          <div class="now-playing-device">${nowPlayingDevice.DeviceName || config.languageLabels.castcihaz}</div>
        </div>
      `;

      topBanner.addEventListener('click', () => showNowPlayingModal(nowPlayingItem, nowPlayingDevice));
      dropdown.appendChild(topBanner);

      const divider = document.createElement('hr');
      divider.className = 'cast-divider';
      dropdown.appendChild(divider);
    }

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
  const client = clientType?.toLowerCase() || '';
  const icons = {
    'android': `<i class="fa-brands fa-android" style="color: #a4c639;"></i>`,
    'ios': `<i class="fa-brands fa-apple" style="color: #ffffff;"></i>`,
    'iphone': `<i class="fa-brands fa-apple" style="color: #ffffff;"></i>`,
    'ipad': `<i class="fa-brands fa-apple" style="color: #ffffff;"></i>`,
    'smarttv': `<i class="fa-solid fa-tv" style="color: #ffffff;"></i>`,
    'chromecast': `<i class="fa-solid fa-chromecast" style="color: #ffffff;"></i>`,
    'dlna': `<i class="fa-solid fa-network-wired" style="color: #ffffff;"></i>`,
    'kodi': `<i class="fa-solid fa-tv" style="color: #ffffff;"></i>`,
    'roku': `<i class="fa-solid fa-tv" style="color: #ffffff;"></i>`
  };

  for (const [key, icon] of Object.entries(icons)) {
    if (client.includes(key)) {
      return icon;
    }
  }

  return `<i class="fa-solid fa-display" style="color: #ffffff;"></i>`;
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

async function showNowPlayingModal(nowPlayingItem, device) {
  try {
    const { userId } = getSessionInfo();
    const sessions = await makeApiRequest(`/Sessions?userId=${userId}`);
    const activeDevices = sessions.filter(s =>
      (s.Capabilities?.PlayableMediaTypes?.includes('Video') ||
       ['android', 'ios', 'iphone', 'ipad'].some(term =>
         s.Client?.toLowerCase().includes(term))) &&
      s.NowPlayingItem
    );

    if (activeDevices.length === 0) {
      showNotification(config.languageLabels.castbulunamadi, 'error');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'castmodal';

    let modalContent = `
      <div class="castmodal-container">
        <div class="overlay"></div>
        <div class="castmodal-content">
    `;

    for (const [index, device] of activeDevices.entries()) {
      const item = device.NowPlayingItem;
      const itemId = item.Id;

      const response = await fetch(`/Items/${itemId}`, {
        headers: { "Authorization": getAuthHeader() }
      });
      const itemDetails = await response.json();

      const posterUrl = `/Items/${itemId}/Images/Primary?tag=${itemDetails.ImageTags?.Primary || ''}&maxHeight=300`;
      const backdropUrl = `/Items/${itemId}/Images/Backdrop/0?maxWidth=1280`;
      const playedTicks = device.PlayState?.PositionTicks || 0;
      const durationTicks = itemDetails.RunTimeTicks || 0;
      const played = formatTime(playedTicks);
      const duration = formatTime(durationTicks);

      const user = device.UserName || config.languageLabels.belirsizkullanici;
      const client = device.Client || config.languageLabels.belirsizistemci;
      const deviceName = device.DeviceName || config.languageLabels.belirsizcihaz;
      const isPaused = device.PlayState?.IsPaused;

      const genres = itemDetails.Genres?.join(", ") || config.languageLabels.etiketok;
      const imdbRating = itemDetails.CommunityRating ?
        `${itemDetails.CommunityRating.toFixed(1)} / 10` : config.languageLabels.derecelendirmeyok;

      const isFavorite = itemDetails.UserData?.IsFavorite;
      const audioLanguages = itemDetails.MediaStreams?.filter(s => s.Type === 'Audio').map(s => s.Language)?.join(', ') || config.languageLabels.sesdiliyok;
      const subtitleLanguages = itemDetails.MediaStreams?.filter(s => s.Type === 'Subtitle').map(s => s.Language)?.join(', ') || config.languageLabels.altyaziyok;

      modalContent += `
        <div class="castmodal-slide" data-backdrop="${backdropUrl}">
          <img class="castmodal-poster" src="${posterUrl}" alt="Poster">
          <div class="castmodal-info">
            <h2>${item.Name}</h2>
            <p><strong>${config.languageLabels.kullanici  || "Kullanıcı"}:</strong> ${user}</p>
            <p><strong>${config.languageLabels.cihaz || "Cihaz"}:</strong> ${deviceName}</p>
            <p><strong>${config.languageLabels.istemci || "İstemci"}:</strong> ${client}</p>
            <p><strong>${config.languageLabels.sure || "Süre"}:</strong> ${played} / ${duration}</p>
            <p><strong>IMDB:</strong> ${imdbRating}</p>
            <p><strong>${config.languageLabels.etiketler || "Etiket(ler)"}:</strong> ${genres}</p>
            <p><strong>${config.languageLabels.ses || "Ses Bilgisi"}:</strong> ${audioLanguages}</p>
            <p><strong>${config.languageLabels.altyazi || "Altyazı Bilgisi"}:</strong> ${subtitleLanguages}</p>
            <div class="castmodal-buttons">
              <button class="castcontrol-button" data-session-id="${device.Id}" data-is-paused="${isPaused}">
                ${isPaused
              ? '▶️ ' + (config.languageLabels.devamet || "Devam Ettir")
              : '⏸️ ' + (config.languageLabels.duraklat || "Duraklat")
              }
              </button>
              <button class="castcontrol-button" data-item-id="${itemId}" data-is-favorite="${isFavorite}">
                ${isFavorite
                ? '💔 ' + (config.languageLabels.removeFromFavorites || "Favoriden Kaldır")
                : '❤️ ' + (config.languageLabels.addToFavorites || "Favoriye Ekle")
                }
              </button>
            </div>
          </div>
        </div>
      `;
    }

    modalContent += `
        </div>
        <button class="castmodal-close">×</button>
        <div class="castmodal-dots">
          ${activeDevices.map((_, index) =>
            `<span class="castmodal-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`
          ).join('')}
        </div>
      </div>
    `;

    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
    const firstBackdrop = modal.querySelector('.castmodal-slide')?.dataset.backdrop;
    if (firstBackdrop) {
  const container = modal.querySelector('.castmodal-container');
  container.style.opacity = 0;
  setTimeout(() => {
    container.style.backgroundImage = `url('${firstBackdrop}')`;
    container.style.opacity = 1;
  }, 50);
}

    modal.querySelector('.castmodal-close').addEventListener('click', () => modal.remove());
    modal.querySelectorAll('[data-session-id]').forEach(button => {
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    const sessionId = e.currentTarget.dataset.sessionId;
    const isPaused = e.currentTarget.dataset.isPaused === 'true';
    await togglePlayback(sessionId, isPaused);
  });
});
    modal.querySelectorAll('[data-item-id]').forEach(button => {
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    const itemId = e.currentTarget.dataset.itemId;
    const isFavorite = e.currentTarget.dataset.isFavorite === 'true';
    await toggleFavorite(itemId, !isFavorite);
  });
});

    const content = modal.querySelector('.castmodal-content');
    const dots = modal.querySelectorAll('.castmodal-dot');
    const container = modal.querySelector('.castmodal-container');

    content.addEventListener('scroll', () => {
      const scrollPosition = content.scrollLeft;
      const slideWidth = content.clientWidth;
      const activeIndex = Math.round(scrollPosition / slideWidth);
      const activeSlide = content.querySelector(`.castmodal-slide:nth-child(${activeIndex + 1})`);
      if (activeSlide) {
        container.style.backgroundImage = `url('${activeSlide.dataset.backdrop}')`;
      }

      dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === activeIndex);
      });
    });

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index);
        content.scrollTo({
          left: index * content.clientWidth,
          behavior: 'smooth'
        });
      });
    });

  } catch (err) {
    console.error("Modal hatası:", err);
    showNotification(`${config.languageLabels.icerikhata}: ${err.message}`, 'error');
  }
}

function formatTime(ticks) {
  if (!ticks || ticks <= 0) return '0:00';

  const totalSeconds = Math.floor(ticks / 10_000_000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function togglePlayback(sessionId, currentlyPaused) {
  const command = currentlyPaused ? 'Unpause' : 'Pause';

  try {
    const response = await fetch(`/Sessions/${sessionId}/Playing/${command}`, {
      method: 'POST',
      headers: { 'Authorization': getAuthHeader() }
    });

    if (!response.ok) {
      throw new Error(`${command} ${config.languageLabels.islembasarisiz}: ${response.statusText}`);
    }

    const buttons = document.querySelectorAll(`[data-session-id="${sessionId}"]`);
    buttons.forEach(button => {
      button.dataset.isPaused = !currentlyPaused;
      button.innerHTML = !currentlyPaused
        ? '▶️ ' + (config.languageLabels.devamet || "Devam Ettir")
        : '⏸️ ' + (config.languageLabels.duraklat || "Duraklat");
    });

    showNotification(
      command === 'Pause'
        ? config.languageLabels.duraklatildi
        : config.languageLabels.devamettirildi,
      'success'
    );
  } catch (err) {
    showNotification(`${config.languageLabels.islemhatasi}: ${err.message}`, 'error');
  }
}

async function toggleFavorite(itemId, makeFavorite) {
  try {
    await updateFavoriteStatus(itemId, makeFavorite);
    const buttons = document.querySelectorAll(`[data-item-id="${itemId}"]`);
    buttons.forEach(button => {
      button.dataset.isFavorite = makeFavorite;
      button.innerHTML = makeFavorite
        ? '💔 ' + (config.languageLabels.removeFromFavorites || "Favoriden Kaldır")
        : '❤️ ' + (config.languageLabels.addToFavorites || "Favoriye Ekle");
    });

    showNotification(
      makeFavorite
        ? config.languageLabels.favorieklemesuccess
        : config.languageLabels.favoricikarmasuccess,
      'success'
    );
  } catch (err) {
    console.error("Favori işlem hatası:", err);
    showNotification(`${config.languageLabels.favorihata}: ${err.message}`, 'error');
  }
}
