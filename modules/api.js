import { getConfig, getServerAddress } from "./config.js";
import { clearCredentials } from "../auth.js";

async function safeFetch(url, opts = {}) {
  const headers = {
    ...(opts.headers || {}),
    Authorization: getAuthHeader()
  };
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) {
    clearCredentials();
    window.location.href = "/login.html";
    throw new Error("Oturum geçersiz, yeniden giriş yapın.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `API hatası: ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (res.status === 204 || !ct.includes("application/json")) return {};
  return res.json();
}

export function getAuthHeader() {
  const { accessToken, clientName, deviceId, clientVersion } = getSessionInfo();
  return `MediaBrowser Client="${clientName}", Device="${navigator.userAgent}", DeviceId="${deviceId}", Version="${clientVersion}", Token="${accessToken}"`;
}

export function getSessionInfo() {
  const raw =
    sessionStorage.getItem("json-credentials") ||
    localStorage.getItem("json-credentials");
  if (!raw) throw new Error("Kimlik bilgisi bulunamadı.");
  const parsed = JSON.parse(raw);

  const topLevelToken     = parsed.AccessToken;
  const topLevelSessionId = parsed.SessionId;
  const topLevelUser      = parsed.User?.Id;

  if (topLevelToken && topLevelSessionId && topLevelUser) {
    return {
      userId:      topLevelUser,
      accessToken: topLevelToken,
      sessionId:   topLevelSessionId,
      deviceId:    parsed.DeviceId   || parsed.ClientDeviceId || "web-client",
      clientName:  parsed.Client   || "Jellyfin Web Client",
      clientVersion: parsed.Version || "1.0.0"
    };
  }

  const server = (parsed.Servers && parsed.Servers[0]) || {};
  const oldToken     = server.AccessToken;
  const oldSessionId = server.Id;
  const oldUser      = server.UserId;

  if (oldToken && oldSessionId && oldUser) {
    return {
      userId:      oldUser,
      accessToken: oldToken,
      sessionId:   oldSessionId,
      deviceId:    server.SystemId || "web-client",
      clientName:  parsed.Client   || "Jellyfin Web Client",
      clientVersion: parsed.Version || "1.0.0"
    };
  }

  throw new Error(
    "Kimlik bilgisi eksik: ne top-level ne de Servers[0] altından gerekli alanlar bulunamadı"
  );
}


async function makeApiRequest(url, options = {}) {
  try {
    options.headers = {
      ...(options.headers || {}),
      "Authorization": getAuthHeader(),
    };

    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
        `API isteği başarısız oldu (durum: ${response.status})`
      );
    }
    const contentType = response.headers.get("content-type") || "";
    if (response.status === 204 || !contentType.includes("application/json")) {
      return {};
    }
    return await response.json();

  } catch (error) {
    console.error(`${url} için API isteği hatası:`, error);
    throw error;
  }
}


export async function fetchItemDetails(itemId) {
  const { userId } = getSessionInfo();
  return safeFetch(`/Users/${userId}/Items/${itemId}`);
}

export async function updateFavoriteStatus(itemId, isFavorite) {
  const { userId } = getSessionInfo();
  return makeApiRequest(`/Users/${userId}/Items/${itemId}/UserData`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ IsFavorite: isFavorite })
  });
}

export async function updatePlayedStatus(itemId, played) {
  const { userId } = getSessionInfo();
  return makeApiRequest(`/Users/${userId}/Items/${itemId}/UserData`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ Played: played })
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


export async function playNow(itemId) {
  try {
    const { deviceId, userId, sessionId } = getSessionInfo();
    const sessions = await makeApiRequest(`/Sessions?UserId=${userId}`);
    const videoClients = sessions.filter(s =>
      s.Capabilities?.PlayableMediaTypes?.includes('Video')
    );
    let target = videoClients.find(s => s.Id === sessionId);
    if (!target) {
      target = videoClients.find(s => s.DeviceId === deviceId);
    }
    if (!target) {
      target = videoClients.find(s => s.NowPlayingItem);
    }
    if (!target && videoClients.length) {
      target = videoClients
        .sort((a, b) => new Date(b.LastActivityDate) - new Date(a.LastActivityDate))
        [0];
    }

    if (!target) {
      throw new Error("Video oynatıcı bulunamadı. Lütfen bir TV/telefon uygulaması açın.");
    }
    const playUrl = `/Sessions/${target.Id}/Playing?playCommand=PlayNow&itemIds=${itemId}`;
    const res = await fetch(playUrl, {
      method: "POST",
      headers: { Authorization: getAuthHeader() }
    });
    if (!res.ok) {
      throw new Error(`Oynatma komutu başarısız: ${res.statusText}`);
    }

    console.log("Oynatma komutu başarıyla gönderildi:", target.Id);
    return true;
  } catch (err) {
    console.error("Şimdi oynat hatası:", err);
    return false;
  }
}

export {
  makeApiRequest,
};
