import { getConfig, getServerAddress } from "./config.js";
import { clearCredentials } from "../auth.js";

const config = getConfig();

const itemCache = new Map();
const dotGenreCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function getCachedItemDetails(itemId) {
  const now = Date.now();

  if (itemCache.has(itemId)) {
    const { data, timestamp } = itemCache.get(itemId);
    if (now - timestamp < CACHE_TTL) {
      return data;
    }
  }

  const data = await fetchItemDetails(itemId);
  itemCache.set(itemId, { data, timestamp: now });
  return data;
}

async function safeFetch(url, opts = {}) {
  const headers = {
    ...(opts.headers || {}),
    Authorization: getAuthHeader()
  };
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) {
    clearCredentials();
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

      const err = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    const contentType = response.headers.get("content-type") || "";
    if (response.status === 204 || !contentType.includes("application/json")) {
      return {};
    }
    return await response.json();

  } catch (error) {
    if (error?.status !== 403 && !String(error.message).includes("403")) {
      console.error(`${url} için API isteği hatası:`, error);
    }
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
  maxHeight = 360,
  startTimeTicks = 0,
  audioLanguage = null,
  preferredVideoCodecs = ["hevc", "h264", "av1"],
  preferredAudioCodecs = ["eac3", "ac3", "opus", "aac"],
  enableHdr = true,
  forceDirectPlay = false,
  enableHls = config.enableHls
) {
  const { userId, deviceId, accessToken } = getSessionInfo();

  const buildQueryParams = (params) =>
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

  const selectPreferredCodec = (streams, type, preferred, allowCopy) => {
    if (enableHls && allowCopy) return "copy";
    const available = streams
      .filter((s) => s.Type === type && s.Codec)
      .map((s) => s.Codec.toLowerCase());

    for (const codec of preferred) {
      if (available.includes(codec.toLowerCase())) {
        return codec;
      }
    }
    return type === "Video" ? "h264" : "aac";
  };

   try {
    let item = await fetchItemDetails(itemId);
    if (item.Type === "Series") {
      itemId = await getRandomEpisodeId(itemId);
      item = await fetchItemDetails(itemId);
    }

    if (item.Type === "Season") {
      const episodes = await makeApiRequest(`/Shows/${item.SeriesId}/Episodes?SeasonId=${itemId}&Fields=Id`);
      if (!episodes?.Items?.length) throw new Error("Bu sezonda hiç bölüm yok!");
      const episode = episodes.Items[Math.floor(Math.random() * episodes.Items.length)];
      itemId = episode.Id;
      item = await fetchItemDetails(itemId);
    }

    if (
  item.Type === "Audio" ||
  item.Type === "MusicVideo" ||
  item.MediaType === "Audio"
) {
  const playbackInfo = await makeApiRequest(`/Items/${itemId}/stream.mp3?Static=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      UserId: userId
    })
  });

      const source = playbackInfo?.MediaSources?.[0];
      if (!source) {
        console.error("Medya kaynağı bulunamadı (müzik)");
        return null;
      }

      const audioStreams = (source.MediaStreams || []).filter(s => s.Type === "Audio");
      let audioCodec = "aac";
      if (audioStreams.length) {
        const foundCodec = audioStreams[0].Codec || null;
        if (foundCodec) audioCodec = foundCodec;
      }

      let audioStreamIndex = 1;
      if (audioLanguage) {
        const audioStream = audioStreams.find(s => s.Language === audioLanguage);
        if (audioStream) audioStreamIndex = audioStream.Index;
      }

      let container = source.Container || "mp3";
      if (enableHls && source.SupportsDirectStream && (source.Container === "ts" || source.SupportsHls)) {
        const hlsParams = {
          MediaSourceId: source.Id,
          DeviceId: deviceId,
          api_key: accessToken,
          AudioCodec: audioCodec,
          AudioStreamIndex: audioStreamIndex,
          StartTimeTicks: startTimeTicks
        };
        return `/Videos/${itemId}/master.m3u8?${buildQueryParams(hlsParams)}`;
      }

      const streamParams = {
        Static: true,
        MediaSourceId: source.Id,
        DeviceId: deviceId,
        api_key: accessToken,
        AudioCodec: audioCodec,
        AudioStreamIndex: audioStreamIndex,
        StartTimeTicks: startTimeTicks
      };
      return `/Videos/${itemId}/stream.${container}?${buildQueryParams(streamParams)}`;
    }

    const playbackInfo = await makeApiRequest(`/Items/${itemId}/PlaybackInfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        UserId: userId,
        MaxStreamingBitrate: 100000000,
        StartTimeTicks: startTimeTicks,
        EnableDirectPlay: forceDirectPlay,
        EnableDirectStream: true,
        EnableTranscoding: true
      })
    });

    const videoSource = playbackInfo?.MediaSources?.[0];
    if (!videoSource) {
      console.error("Medya kaynağı bulunamadı");
      return null;
    }

    const streams = videoSource.MediaStreams || [];
    const allowCopy = videoSource.SupportsDirectStream;

    let videoCodec, audioCodec, container;
    if (enableHls) {
      videoCodec = selectPreferredCodec(streams, "Video", preferredVideoCodecs, allowCopy);
      audioCodec = selectPreferredCodec(streams, "Audio", preferredAudioCodecs, allowCopy);
      container = videoSource.Container || "mp4";
    } else {
      videoCodec = "h264";
      audioCodec = "aac";
      container = "mp4";
    }

    let audioStreamIndex = 1;
    if (audioLanguage) {
      const audioStream = streams.find(
        (s) => s.Type === "Audio" && s.Language === audioLanguage
      );
      if (audioStream) {
        audioStreamIndex = audioStream.Index;
      }
    }

    const hasHdr = streams.some((s) => s.Type === "Video" && s.VideoRangeType === "HDR");
    const hasDovi = streams.some((s) => s.Type === "Video" && s.VideoRangeType === "DOVI");

    if (enableHls) {
      const hlsParams = {
        MediaSourceId: videoSource.Id,
        DeviceId: deviceId,
        api_key: accessToken,
        VideoCodec: "h264",
        AudioCodec: "aac",
        VideoBitrate: 1000000,
        AudioBitrate: 128000,
        MaxHeight: maxHeight,
        StartTimeTicks: startTimeTicks
      };

      if (audioLanguage) {
        const langStream = streams.find(
          (s) => s.Type === "Audio" && s.Language === audioLanguage
        );
        if (langStream) {
          hlsParams.AudioStreamIndex = langStream.Index;
        }
      }

      return `/Videos/${itemId}/master.m3u8?${buildQueryParams(hlsParams)}`;
    }

    const streamParams = {
      Static: true,
      MediaSourceId: videoSource.Id,
      DeviceId: deviceId,
      api_key: accessToken,
      VideoCodec: videoCodec,
      AudioCodec: audioCodec,
      VideoBitrate: 1000000,
      AudioBitrate: 128000,
      MaxHeight: maxHeight,
      StartTimeTicks: startTimeTicks,
      AudioStreamIndex: audioStreamIndex
    };

    if (enableHdr && hasHdr) {
      streamParams.EnableHdr = true;
      streamParams.Hdr10 = true;
      if (hasDovi) streamParams.DolbyVision = true;
    }

    return `/Videos/${itemId}/stream.${container}?${buildQueryParams(streamParams)}`;

  } catch (error) {
    console.error("Stream URL oluşturma hatası:", error);
    return null;
  }
}


function getAudioStreamIndex(videoSource, audioLanguage) {
  const audioStream = videoSource.MediaStreams.find(
    s => s.Type === "Audio" && s.Language === audioLanguage
  );
  return audioStream ? audioStream.Index : 1;
}

export async function getIntroVideoUrl(itemId) {
  try {
    const { userId } = getSessionInfo();
    const response = await makeApiRequest(`/Items/${itemId}/Intros`);
    const intros = response.Items || [];
    if (intros.length > 0) {
      const intro = intros[0];
      const startTimeTicks = 600 * 10_000_000;
      const url = await getVideoStreamUrl(intro.Id, 360, startTimeTicks);
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

  const url = await getVideoStreamUrl(itemId, 360, 0);
  if (url) {
    videoPreviewCache.set(itemId, url);
    setTimeout(() => videoPreviewCache.delete(itemId), 300000);
  }

  return url;
}

export {
  makeApiRequest,
};

export async function getUserTopGenres(limit = 5, itemType = null) {
  const cacheKey = "userTopGenres_v2";
  const cacheTTL = 24 * 60 * 60 * 1000;
  const currentUserId = getCachedUserId();

  const cachedRaw = localStorage.getItem(cacheKey);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw);
      if (cached.userId === currentUserId &&
          Date.now() - cached.timestamp < cacheTTL) {
        return cached.genres.slice(0, limit);
      }
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  try {
    const { userId } = getSessionInfo();
    const recentlyPlayed = await makeApiRequest(
      `/Users/${userId}/Items/Resume?Limit=50&MediaTypes=Video`
    );

    const items = recentlyPlayed.Items || [];
    if (items.length === 0) {
      return ['Action', 'Drama', 'Comedy', 'Sci-Fi', 'Adventure'].slice(0, limit);
    }

    const dotItems = Array.from(document.querySelectorAll('.poster-dot'))
      .map(dot => dot.dataset.itemId)
      .filter(Boolean);

    const prioritizedItems = items.sort((a, b) => {
      const aInDots = dotItems.includes(a.Id) ? 1 : 0;
      const bInDots = dotItems.includes(b.Id) ? 1 : 0;
      return bInDots - aInDots;
    }).slice(0, 30);

    const genreCounts = {};
    for (const item of prioritizedItems) {
      const genres = await getGenresForDot(item.Id);
      genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }

    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    const result = sortedGenres.length > 0
      ? sortedGenres.slice(0, limit)
      : ['Action', 'Drama', 'Comedy', 'Sci-Fi', 'Adventure'].slice(0, limit);

    localStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      genres: result,
      userId: currentUserId
    }));

    return result;
  } catch (error) {
    console.error("❌ getUserTopGenres hatası:", error);
    return ['Action', 'Drama', 'Comedy', 'Sci-Fi', 'Adventure'].slice(0, limit);
  }
}

function extractGenresFromItems(items) {
  const genreCounts = {};

  items.forEach(item => {
    let genres = [];
    if (item.GenreItems && Array.isArray(item.GenreItems)) {
      genres = item.GenreItems.map(g => g.Name);
    }
    else if (Array.isArray(item.Genres) && item.Genres.every(g => typeof g === 'string')) {
      genres = item.Genres;
    }
    else if (Array.isArray(item.Genres) && item.Genres[0]?.Name) {
      genres = item.Genres.map(g => g.Name);
    }
    else if (item.Tags && Array.isArray(item.Tags)) {
      genres = item.Tags.filter(tag =>
        ['action','drama','comedy','sci-fi','adventure']
          .includes(tag.toLowerCase())
      );
    }

    if (genres.length > 0) {
      genres.forEach(genre => {
        if (genre) {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
    } else {
      console.warn(`ℹ️ Tür bilgisi okunamadı → ID: ${item.Id} | Ad: ${item.Name || 'İsimsiz'}`);
    }
  });

  return Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);
}



function getCachedUserId() {
  try {
    return getSessionInfo().userId;
  } catch {
    return null;
  }
}

function checkAndClearCacheOnUserChange(cacheKey, currentUserId) {
  const cachedRaw = localStorage.getItem(cacheKey);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw);
      if (cached.userId && cached.userId !== currentUserId) {
        console.log("👤 Kullanıcı değişti, cache temizleniyor:", cacheKey);
        localStorage.removeItem(cacheKey);
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }
}

export async function getCachedUserTopGenres(limit = 50, itemType = null) {
  const cacheKey = "userTopGenresCache";
  const cacheTTL = 1000 * 60 * 60 * 24;
  const currentUserId = getCachedUserId();

  checkAndClearCacheOnUserChange(cacheKey, currentUserId);

  try {
    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const now = Date.now();

      if (cached.timestamp && now - cached.timestamp < cacheTTL) {
        return cached.genres.slice(0, limit);
      }
    }

    const genres = await getUserTopGenres(limit, itemType);
    const cacheData = {
      timestamp: Date.now(),
      genres,
      userId: currentUserId
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    return genres;

  } catch (error) {
    console.error("Tür bilgisi cache alınırken hata:", error);
    return getUserTopGenres(limit, itemType);
  }
}


export async function getGenresForDot(itemId) {
  const cached = dotGenreCache.get(itemId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.genres;
  }

  try {
    const details = await fetchItemDetails(itemId);
    const genres = extractGenresFromItem(details);

    dotGenreCache.set(itemId, {
      timestamp: Date.now(),
      genres
    });

    return genres;
  } catch (error) {
    console.error(`Item ${itemId} tür bilgisi alınırken hata:`, error);
    return [];
  }
}

function extractGenresFromItem(item) {
  if (!item) return [];

  if (item.GenreItems && Array.isArray(item.GenreItems)) {
    return item.GenreItems.map(g => g.Name);
  }
  else if (Array.isArray(item.Genres) && item.Genres.every(g => typeof g === 'string')) {
    return item.Genres;
  }
  else if (Array.isArray(item.Genres) && item.Genres[0]?.Name) {
    return item.Genres.map(g => g.Name);
  }
  else if (item.Tags && Array.isArray(item.Tags)) {
    return item.Tags.filter(tag =>
      ['action','drama','comedy','sci-fi','adventure']
        .includes(tag.toLowerCase())
    );
  }

  return [];
}
