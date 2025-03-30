import { getConfig } from "./config.js";

export async function fetchItemDetails(itemId) {
  const credentials = sessionStorage.getItem("json-credentials");
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
  try {
    const response = await fetch(`${window.location.origin}/Users/${userId}/Items/${itemId}`, {
      headers: {
        Authorization: `MediaBrowser Client="Jellyfin Web", Device="YourDeviceName", DeviceId="YourDeviceId", Version="YourClientVersion", Token="${accessToken}"`
      }
    });
    const data = await response.json();
    console.log("Item Details:", data);
    return data;
  } catch (error) {
    console.error(`Item ${itemId} getirilemedi:`, error);
    return null;
  }
}

export function updateFavoriteStatus(itemId, isFavorite) {
  const credentials = sessionStorage.getItem("json-credentials");
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
  fetch(`${window.location.origin}/Users/${userId}/Items/${itemId}/UserData`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `MediaBrowser Client="Jellyfin Web", Device="YourDeviceName", DeviceId="YourDeviceId", Version="YourClientVersion", Token="${accessToken}"`
    },
    body: JSON.stringify({ IsFavorite: isFavorite })
  })
  .then((response) => {
    if (!response.ok) throw new Error("Favori durumu güncellenemedi");
    return response.json();
  })
  .then((data) => console.log("Favori durumu güncellendi:", data))
  .catch((error) => console.error("Favori güncelleme hatası:", error));
}

export async function getHighestQualityBackdropIndex(itemId) {
  const config = getConfig();
  const candidateIndexes = ["0", "1", "2", "3", "4"];
  let bestIndex = null;
  let bestArea = 0;
  let bestWidth = 0;
  let bestHeight = 0;
  let hasHighQuality = false;
  const minQualityWidth = config.minHighQualityWidth;

  for (let index of candidateIndexes) {
    const url = `${window.location.origin}/Items/${itemId}/Images/Backdrop/${index}`;
    try {
      const { width, height } = await getImageDimensions(url);
      const area = width * height;
      console.log(`Index ${index}: Çözünürlük: ${width}x${height} (${area} piksel)`);

      if (width >= minQualityWidth) {
        hasHighQuality = true;
        if (area > bestArea) {
          bestArea = area;
          bestIndex = index;
          bestWidth = width;
          bestHeight = height;
        }
      } else {
        if (!hasHighQuality && area > bestArea) {
          bestArea = area;
          bestIndex = index;
          bestWidth = width;
          bestHeight = height;
        }
      }
    } catch (error) {
      console.error(`Index ${index}: Resim yüklenemedi veya hata oluştu:`, error);
    }
  }

  if (!hasHighQuality) {
    console.log(`Config'de belirtilen minimum genişlik (${minQualityWidth}px) koşulunu sağlayan görsel bulunamadı. ` +
      `En uygun fallback görsel: Index ${bestIndex} - Çözünürlük: ${bestWidth}x${bestHeight} (${bestArea} piksel)`);
  }
  return bestIndex;
}

export async function getImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}
