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

  const topLevelToken = parsed.AccessToken;
  const topLevelSessionId = parsed.SessionId;
  const topLevelUser = parsed.User?.Id;

  if (topLevelToken && topLevelSessionId && topLevelUser) {
    return {
      userId: topLevelUser,
      accessToken: topLevelToken,
      sessionId: topLevelSessionId,
      deviceId: parsed.DeviceId || parsed.ClientDeviceId || "web-client",
      clientName: parsed.Client || "Jellyfin Web Client",
      clientVersion: parsed.Version || "1.0.0"
    };
  }

  const server = (parsed.Servers && parsed.Servers[0]) || {};
  const oldToken = server.AccessToken;
  const oldSessionId = server.Id;
  const oldUser = server.UserId;

  if (oldToken && oldSessionId && oldUser) {
    return {
      userId: oldUser,
      accessToken: oldToken,
      sessionId: oldSessionId,
      deviceId: server.SystemId || "web-client",
      clientName: parsed.Client || "Jellyfin Web Client",
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
      const errorMsg = errorData.message ||
                     (errorData.Title && errorData.Description ?
                      `${errorData.Title}: ${errorData.Description}` :
                      `API isteği başarısız oldu (durum: ${response.status})`);

      throw new Error(errorMsg);
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
    const { userId } = getSessionInfo();

    const item = await fetchItemDetails(itemId);
    if (item.Type === "Series") {
  itemId = await getRandomEpisodeId(itemId);
}

    const { deviceId, sessionId } = getSessionInfo();
    const sessions = await makeApiRequest(`/Sessions?UserId=${userId}`);
    const videoClients = sessions.filter(s =>
      s.Capabilities?.PlayableMediaTypes?.includes('Video')
    );

    let target = videoClients.find(s => s.Id === sessionId) ||
      videoClients.find(s => s.DeviceId === deviceId) ||
      videoClients.find(s => s.NowPlayingItem) ||
      videoClients.sort((a, b) => new Date(b.LastActivityDate) - new Date(a.LastActivityDate))[0];

    if (!target) {
      throw new Error("Video oynatıcı bulunamadı. Lütfen bir TV/telefon uygulaması açın.");
    }

    const userItemData = await makeApiRequest(`/Users/${userId}/Items/${itemId}`);
    const resumeTicks = userItemData?.UserData?.PlaybackPositionTicks || 0;

    let playUrl = `/Sessions/${target.Id}/Playing?playCommand=PlayNow&itemIds=${itemId}`;
    if (resumeTicks > 0) {
      playUrl += `&StartPositionTicks=${resumeTicks}`;
    }

    const res = await fetch(playUrl, {
      method: "POST",
      headers: { Authorization: getAuthHeader() }
    });

    if (!res.ok) {
      throw new Error(`Oynatma komutu başarısız: ${res.statusText}`);
    }

    window.currentPlayingItemId = itemId;
    return true;
  } catch (err) {
    console.error("Oynatma hatası:", err);
    return false;
  }
}

async function getRandomEpisodeId(seriesId) {
  const { userId } = getSessionInfo();
  const response = await makeApiRequest(
    `/Users/${userId}/Items?ParentId=${seriesId}` +
    `&Recursive=true&IncludeItemTypes=Episode&Fields=Id`
  );
  const allEpisodes = Array.isArray(response.Items)
    ? response.Items
    : [];

  if (!allEpisodes.length) {
    throw new Error("Bölüm bulunamadı");
  }
  const randomIndex = Math.floor(Math.random() * allEpisodes.length);
  return allEpisodes[randomIndex].Id;
}


export async function getVideoStreamUrl(
  itemId,
  maxHeight = 480,
  startTimeTicks = 0,
  audioLanguage = null,
  enableH265 = true,
  enableHdr = true
) {
  const { userId } = getSessionInfo();
  try {
    const item = await fetchItemDetails(itemId);
    if (item.Type === "Series") {
      itemId = await getRandomEpisodeId(itemId);
    }

    const mediaSources = await makeApiRequest(`/Items/${itemId}/PlaybackInfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        UserId: userId,
        MaxStreamingBitrate: 2000000,
        StartTimeTicks: startTimeTicks
      })
    });

    if (!mediaSources?.MediaSources?.length) {
      console.error("Medya kaynağı bulunamadı");
      return null;
    }

    const videoSource = mediaSources.MediaSources[0];
    let videoCodec = videoSource.SupportsDirectStream ? "copy" : "h264";
    if (enableH265) {
      const hasHevcStream = videoSource.MediaStreams.some(
        s => s.Type === "Video" && s.Codec && s.Codec.toLowerCase().includes("hevc")
      );
      if (hasHevcStream || !videoSource.SupportsDirectStream) {
        videoCodec = "hevc";
      }
    }

    const audioCodec = videoSource.SupportsDirectStream ? "copy" : "aac";

    let audioStreamIndex = 1;
    if (audioLanguage) {
      const audioStream = videoSource.MediaStreams.find(
        s => s.Type === "Audio" && s.Language === audioLanguage
      );
      if (audioStream) {
        audioStreamIndex = audioStream.Index;
      }
    }

    const hasHdr = videoSource.MediaStreams.some(
      s => s.Type === "Video" && s.VideoRangeType === "HDR"
    );

    let url = `/Videos/${itemId}/stream.${videoSource.Container || "mp4"}?`;
    url += `Static=true&`;
    url += `MediaSourceId=${videoSource.Id}&`;
    url += `DeviceId=${getSessionInfo().deviceId}&`;
    url += `api_key=${getSessionInfo().accessToken}&`;
    url += `VideoCodec=${videoCodec}&`;
    url += `AudioCodec=${audioCodec}&`;
    url += `VideoBitrate=1000000&`;
    url += `AudioBitrate=128000&`;
    url += `MaxHeight=${maxHeight}&`;
    url += `StartTimeTicks=${startTimeTicks}&`;
    url += `AudioStreamIndex=${audioStreamIndex}`;

    if (enableHdr && hasHdr) {
      url += `&EnableHdr=true`;
      url += `&Hdr10=true`;
      const hasDolbyVision = videoSource.MediaStreams.some(
        s => s.Type === "Video" && s.VideoRangeType === "DOVI"
      );
      if (hasDolbyVision) {
        url += `&DolbyVision=true`;
      }
    }

    return url;
  } catch (error) {
    console.error("Stream URL oluşturma hatası:", error);
    return null;
  }
}


export async function getIntroVideoUrl(itemId) {
  try {
    const { userId } = getSessionInfo();
    const response = await makeApiRequest(`/Items/${itemId}/Intros`);
    const intros = response.Items || [];
    if (intros.length > 0) {
      const intro = intros[0];
      const startTimeTicks = 600 * 10_000_000;
      const url = await getVideoStreamUrl(intro.Id, 480, startTimeTicks);
      return url;
    }
    return null;
  } catch (error) {
    console.error("Intro video alınırken hata:", error);
    return null;
  }
}

const videoPreviewCache = new Map();

export async function getCachedVideoPreview(itemId) {
  if (videoPreviewCache.has(itemId)) {
    return videoPreviewCache.get(itemId);
  }

  const url = await getVideoStreamUrl(itemId, 480, 0);
  if (url) {
    videoPreviewCache.set(itemId, url);
    setTimeout(() => videoPreviewCache.delete(itemId), 300000);
  }

  return url;
}

export {
  makeApiRequest,
};
