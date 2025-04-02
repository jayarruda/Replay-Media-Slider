import { getConfig } from "./config.js";

function getSessionInfo() {
  const credentials = sessionStorage.getItem("json-credentials");
  if (!credentials) {
    throw new Error("sessionStorage'da kimlik bilgisi bulunamadı");
  }

  try {
    const parsed = JSON.parse(credentials);
    const server = parsed.Servers[0];
    if (!server) throw new Error("Sunucu yapılandırması bulunamadı");

    return {
      userId: server.UserId,
      accessToken: server.AccessToken,
      deviceId: server.SystemId || "web-client",
      clientName: "Jellyfin Web Client",
      clientVersion: "1.0.0"
    };
  } catch (error) {
    console.error("Kimlik bilgisi ayrıştırma hatası:", error);
    throw error;
  }
}

function getAuthHeader() {
  const { accessToken, clientName, deviceId, clientVersion } = getSessionInfo();
  return `MediaBrowser Client="${clientName}", Device="${navigator.userAgent}", DeviceId="${deviceId}", Version="${clientVersion}", Token="${accessToken}"`;
}

async function makeApiRequest(url, options = {}) {
  try {
    if (!options.headers) {
      options.headers = {};
    }
    options.headers["Authorization"] = getAuthHeader();

    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API isteği başarısız oldu (durum: ${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error(`${url} için API isteği hatası:`, error);
    throw error;
  }
}

export async function fetchItemDetails(itemId) {
  const { userId } = getSessionInfo();
  return makeApiRequest(`${window.location.origin}/Users/${userId}/Items/${itemId}`);
}

export async function updateFavoriteStatus(itemId, isFavorite) {
  const { userId } = getSessionInfo();
  return makeApiRequest(`${window.location.origin}/Users/${userId}/Items/${itemId}/UserData`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ IsFavorite: isFavorite })
  });
}

export async function getImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.setRequestHeader("Authorization", getAuthHeader());

    xhr.onload = function() {
      if (this.status === 200) {
        const blob = this.response;
        const blobUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.naturalWidth,
            height: img.naturalHeight,
            area: img.naturalWidth * img.naturalHeight
          });
        };
        img.onerror = () => reject(new Error("Görsel yüklenemedi"));
        img.src = blobUrl;
      } else {
        reject(new Error(`HTTP ${this.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Ağ hatası"));
    xhr.send();
  });
}

export async function getHighestQualityBackdropIndex(itemId) {
  const config = getConfig();
  const candidateIndexes = ["0", "1", "2", "3"];
  const results = [];
  const minQualityWidth = config.minHighQualityWidth || 1920;
  const minPixelCount = config.minPixelCount || (1920 * 1080);

  await Promise.all(candidateIndexes.map(async (index) => {
    const url = `${window.location.origin}/Items/${itemId}/Images/Backdrop/${index}`;
    try {
      const dimensions = await getImageDimensions(url);
      const area = dimensions.width * dimensions.height;
      results.push({
        index,
        ...dimensions,
        area,
        isHighQuality: dimensions.width >= minQualityWidth && area >= minPixelCount
      });
    } catch (error) {
      console.warn(`${index} indeksli arka plan görseli bulunamadı:`, error.message);
    }
  }));

  if (results.length === 0) {
    console.warn("Hiçbir arka plan görseli elde edilemedi, varsayılan 0 indeksi kullanılıyor");
    return "0";
  }

  const highQuality = results.filter(img => img.isHighQuality);
  let bestImage;
  if (highQuality.length > 0) {
    bestImage = highQuality.reduce((best, current) => current.area > best.area ? current : best);
  } else {
    bestImage = results.reduce((best, current) => current.area > best.area ? current : best, { area: 0 });
  }

  console.log(
    `${bestImage.index} indeksli görsel seçildi, ` +
    `çözünürlük: ${bestImage.width}x${bestImage.height}, ` +
    `piksel sayısı: ${bestImage.area}`
  );
  return bestImage.index;
}
