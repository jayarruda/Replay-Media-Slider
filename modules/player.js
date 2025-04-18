/*!
 * G-Grbz © Tüm hakları saklıdır. | All rights reserved.
 *(BETA)
 * Bu dosya G-Grbz tarafından oluşturulmuştur.
 * İzin alınmadan kopyalanamaz, çoğaltılamaz veya değiştirilemez.
 * Harici bir eklenti olarak kullanılması için önceden izin alınmalıdır.
 * (BETA)
 * This file was created by G-Grbz.
 * It may not be copied, reproduced, or modified without permission.
 * Prior authorization is required to use this file as an external plugin.
 */

import { getConfig } from "./config.js";

const config = getConfig();

export const musicPlayerState = {
  audio: new Audio(),
  playlist: [],
  currentIndex: 0,
  isPlayerVisible: false,
  modernPlayer: null,
  albumArtEl: null,
  volumeBtn: null,
  modernTitleEl: null,
  modernArtistEl: null,
  playPauseBtn: null,
  progressContainer: null,
  progressBar: null,
  progress: null,
  currentTimeEl: null,
  durationEl: null,
  volumeSlider: null,
  playlistModal: null,
  playlistItemsContainer: null,
  lyricsContainer: null,
  lyricsBtn: null,
  lyricsActive: false,
  currentLyrics: [],
  lyricsCache: {},
  metaContainer: null,
  mediaSession: null,
  currentArtwork: []
};

function getAuthToken() {
  return (
    sessionStorage.getItem("api-key") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    new URLSearchParams(window.location.search).get("api_key") ||
    (window.ApiClient && window.ApiClient._authToken)
  );
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function initMediaSession() {
  if ('mediaSession' in navigator) {
    musicPlayerState.mediaSession = navigator.mediaSession;
    musicPlayerState.mediaSession.setActionHandler('play', togglePlayPause);
    musicPlayerState.mediaSession.setActionHandler('pause', togglePlayPause);
    musicPlayerState.mediaSession.setActionHandler('previoustrack', playPrevious);
    musicPlayerState.mediaSession.setActionHandler('nexttrack', playNext);
    musicPlayerState.mediaSession.setActionHandler('seekbackward', () => {
      musicPlayerState.audio.currentTime = Math.max(0, musicPlayerState.audio.currentTime - 10);
    });
    musicPlayerState.mediaSession.setActionHandler('seekforward', () => {
      musicPlayerState.audio.currentTime = Math.min(
        musicPlayerState.audio.duration,
        musicPlayerState.audio.currentTime + 10
      );
    });
    musicPlayerState.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime) {
        musicPlayerState.audio.currentTime = details.seekTime;
      }
    });
  }
}

function updateMediaMetadata(track) {
  if (!musicPlayerState.mediaSession) return;

  musicPlayerState.mediaSession.metadata = new MediaMetadata({
    title: track?.Name || config.languageLabels.unknownTrack,
    artist: track?.Artists?.join(", ") || config.languageLabels.unknownArtist,
    album: track?.Album || '',
    artwork: musicPlayerState.currentArtwork
  });
}

export async function refreshPlaylist() {
  try {
    musicPlayerState.modernTitleEl.textContent = config.languageLabels.loading;
    musicPlayerState.modernArtistEl.textContent = "";

    const token = getAuthToken();
    if (!token) throw new Error(config.languageLabels.noApiToken);

    const response = await fetch(
      `/Items?IncludeItemTypes=Audio&Recursive=true&Limit=${config.muziklimit}&SortBy=Random`,
      { headers: { "X-Emby-Token": token } }
    );

    if (!response.ok) throw new Error(config.languageLabels.unauthorizedRequest);

    const data = await response.json();
    musicPlayerState.playlist = shuffleArray(data.Items || []);

    if (musicPlayerState.playlist.length > 0) {
      musicPlayerState.isPlayerVisible = true;
      musicPlayerState.modernPlayer.classList.add("visible");
      updateModernTrackInfo(musicPlayerState.playlist[0]);
      playTrack(0);
    } else {
      musicPlayerState.modernTitleEl.textContent = config.languageLabels.noMusicFound;
      musicPlayerState.modernArtistEl.textContent = config.languageLabels.tryRefreshing;
    }
  } catch (err) {
    console.error(config.languageLabels.refreshError, err);
    musicPlayerState.modernTitleEl.textContent = config.languageLabels.errorOccurred;
    musicPlayerState.modernArtistEl.textContent = err.message.includes("abort") ? config.languageLabels.requestTimeout : config.languageLabels.tryRefreshing;
    musicPlayerState.isPlayerVisible = true;
    musicPlayerState.modernPlayer.classList.add("visible");
  }
}

export function togglePlayerVisibility() {
  musicPlayerState.isPlayerVisible = !musicPlayerState.isPlayerVisible;
  musicPlayerState.modernPlayer.classList.toggle("visible", musicPlayerState.isPlayerVisible);
}

export function createModernPlayerUI() {
  const player = document.createElement("div");
  player.id = "modern-music-player";

  const albumArt = document.createElement("div");
  albumArt.id = "player-album-art";

  const trackInfo = document.createElement("div");
  trackInfo.className = "player-track-info";

  const title = document.createElement("div");
  title.id = "player-track-title";
  title.textContent = config.languageLabels.noSongSelected;

  const artist = document.createElement("div");
  artist.id = "player-track-artist";
  artist.textContent = config.languageLabels.artistUnknown;

  trackInfo.appendChild(title);
  trackInfo.appendChild(artist);

  const controls = document.createElement("div");
  controls.className = "player-controls";

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "player-btn";
  refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
  refreshBtn.title = config.languageLabels.refreshPlaylist;
  refreshBtn.onclick = refreshPlaylist;
  controls.appendChild(refreshBtn);

  const playlistBtn = document.createElement("button");
  playlistBtn.className = "player-btn";
  playlistBtn.innerHTML = '<i class="fas fa-list"></i>';
  playlistBtn.title = config.languageLabels.playlist;
  playlistBtn.onclick = togglePlaylistModal;
  controls.appendChild(playlistBtn);

  const prevBtn = document.createElement("button");
  prevBtn.className = "player-btn";
  prevBtn.innerHTML = '<i class="fas fa-step-backward"></i>';
  prevBtn.title = config.languageLabels.previousTrack;
  prevBtn.onclick = playPrevious;
  controls.appendChild(prevBtn);

  const playPauseBtn = document.createElement("button");
  playPauseBtn.className = "player-btn main";
  playPauseBtn.id = "play-pause-btn";
  playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
  playPauseBtn.title = config.languageLabels.playPause;
  playPauseBtn.onclick = togglePlayPause;
  controls.appendChild(playPauseBtn);

  const nextBtn = document.createElement("button");
  nextBtn.className = "player-btn";
  nextBtn.innerHTML = '<i class="fas fa-step-forward"></i>';
  nextBtn.title = config.languageLabels.nextTrack;
  nextBtn.onclick = playNext;
  controls.appendChild(nextBtn);

  const lyricsBtn = document.createElement("button");
  lyricsBtn.className = "player-btn";
  lyricsBtn.innerHTML = '<i class="fas fa-align-left"></i>';
  lyricsBtn.title = config.languageLabels.lyrics;
  lyricsBtn.onclick = toggleLyrics;
  controls.appendChild(lyricsBtn);

  const volumeBtn = document.createElement("button");
  volumeBtn.className = "player-btn";
  volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
  volumeBtn.title = config.languageLabels.volume;
  volumeBtn.addEventListener("click", toggleMute);
  controls.appendChild(volumeBtn);

  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.className = "player-volume-slider";
  volumeSlider.min = "0";
  volumeSlider.max = "1";
  volumeSlider.step = "0.01";
  volumeSlider.value = "0.7";
  volumeSlider.title = config.languageLabels.volumeLevel;
  controls.appendChild(volumeSlider);

  const closeBtn = document.createElement("button");
  closeBtn.className = "player-btn";
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.title = config.languageLabels.close;
  closeBtn.onclick = togglePlayerVisibility;
  controls.appendChild(closeBtn);

  const progressContainer = document.createElement("div");
  progressContainer.className = "player-progress-container";

  const progressBar = document.createElement("div");
  progressBar.className = "player-progress-bar";

  const progress = document.createElement("div");
  progress.className = "player-progress";

  const timeContainer = document.createElement("div");
  timeContainer.className = "player-time-container";

  const currentTimeEl = document.createElement("span");
  currentTimeEl.className = "player-current-time";
  currentTimeEl.textContent = "0:00";

  const durationEl = document.createElement("span");
  durationEl.className = "player-duration";
  durationEl.textContent = "0:00";

  progressBar.appendChild(progress);
  timeContainer.appendChild(currentTimeEl);
  timeContainer.appendChild(durationEl);
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(timeContainer);

  progressBar.addEventListener("click", (e) => {
    if (!musicPlayerState.audio.duration) return;
    const pct = e.offsetX / progressBar.offsetWidth;
    musicPlayerState.audio.currentTime = pct * musicPlayerState.audio.duration;
  });

  const barContainer = progressBar.parentElement;
  let isDragging = false;

  function seekToEvent(e) {
    const rect = barContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(x / rect.width, 1));
    if (musicPlayerState.audio.duration) {
      musicPlayerState.audio.currentTime = pct * musicPlayerState.audio.duration;
    }
  }

  barContainer.addEventListener("mousedown", (e) => {
    isDragging = true;
    seekToEvent(e);
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    seekToEvent(e);
  });
  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
  });

  barContainer.addEventListener("touchstart", (e) => {
    isDragging = true;
    seekToEvent(e.touches[0]);
    e.preventDefault();
  }, { passive: false });
  document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    seekToEvent(e.touches[0]);
  });
  document.addEventListener("touchend", () => {
    isDragging = false;
  });

  const lyricsContainer = document.createElement("div");
  lyricsContainer.id = "player-lyrics-container";
  lyricsContainer.className = "lyrics-hidden";
  player.appendChild(lyricsContainer);
  player.appendChild(albumArt);
  player.appendChild(trackInfo);
  player.appendChild(lyricsContainer);
  player.appendChild(progressContainer);
  player.appendChild(controls);
  document.body.appendChild(player);

  createPlaylistModal();

  volumeSlider.addEventListener("input", (e) => {
    const volume = e.target.value;
    musicPlayerState.audio.volume = volume;

    if (volume > 0) {
      volumeSlider.dataset.lastVolume = volume;
      musicPlayerState.volumeBtn.innerHTML = volume < 0.5 ?
        '<i class="fas fa-volume-down"></i>' :
        '<i class="fas fa-volume-up"></i>';
    }
  });

  musicPlayerState.audio.volume = volumeSlider.value;
  musicPlayerState.volumeBtn = volumeBtn;

  musicPlayerState.modernPlayer = player;
  musicPlayerState.albumArtEl = albumArt;
  musicPlayerState.modernTitleEl = title;
  musicPlayerState.modernArtistEl = artist;
  musicPlayerState.progressBar = progressBar;
  musicPlayerState.progress = progress;
  musicPlayerState.playPauseBtn = playPauseBtn;
  musicPlayerState.progressContainer = progressContainer;
  musicPlayerState.currentTimeEl = currentTimeEl;
  musicPlayerState.durationEl = durationEl;
  musicPlayerState.volumeSlider = volumeSlider;
  musicPlayerState.lyricsContainer = lyricsContainer;
  musicPlayerState.lyricsBtn = lyricsBtn;

  return {
    player,
    albumArt,
    title,
    artist,
    progressBar,
    progress,
    playPauseBtn,
    progressContainer,
    currentTimeEl,
    durationEl,
    volumeSlider,
    lyricsContainer,
    lyricsBtn
  };
}

function createPlaylistModal() {
    const modal = document.createElement("div");
    modal.id = "playlist-modal";

    const container = document.createElement("div");
    container.className = "playlist-container";

    const header = document.createElement("div");
    header.className = "playlist-header";

    const title = document.createElement("h3");
    title.className = "playlist-title";
    title.textContent = config.languageLabels.playlist;

    const searchContainer = document.createElement("div");
    searchContainer.className = "playlist-search-container";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = config.languageLabels.searchTracks;
    searchInput.className = "playlist-search-input";

    searchInput.addEventListener("input", (e) => {
        filterPlaylistItems(e.target.value.toLowerCase());
    });

    searchContainer.appendChild(searchInput);
    container.appendChild(searchContainer);

    const closeBtn = document.createElement("button");
    closeBtn.className = "playlist-close";
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = togglePlaylistModal;

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "playlist-items";

    header.appendChild(title);
    header.appendChild(closeBtn);
    container.appendChild(header);
    container.appendChild(itemsContainer);
    modal.appendChild(container);
    document.body.appendChild(modal);

    musicPlayerState.playlistModal = modal;
    musicPlayerState.playlistItemsContainer = itemsContainer;
    musicPlayerState.playlistSearchInput = searchInput;
}

function filterPlaylistItems(searchTerm) {
    const items = musicPlayerState.playlistItemsContainer.querySelectorAll(".playlist-item");

    items.forEach(item => {
        const title = item.querySelector(".playlist-item-title").textContent.toLowerCase();
        const artist = item.querySelector(".playlist-item-artist").textContent.toLowerCase();

        if (title.includes(searchTerm) || artist.includes(searchTerm)) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}

async function getEmbeddedLyrics(trackId) {
  try {
    if (musicPlayerState.lyricsCache[trackId]) {
      return musicPlayerState.lyricsCache[trackId];
    }

    const token = getAuthToken();
    const response = await fetch(`${window.location.origin}/Audio/${trackId}/stream.mp3?Static=true`, {
      headers: { "X-Emby-Token": token }
    });

    if (!response.ok) throw new Error("Müzik dosyası alınamadı");

    const arrayBuffer = await response.arrayBuffer();
    const lyrics = await parseID3Tags(arrayBuffer);

    if (lyrics) {
      musicPlayerState.lyricsCache[trackId] = lyrics;
      return lyrics;
    }
    return null;
  } catch (err) {
    console.error("Gömülü sözler okunamadı:", err);
    return null;
  }
}

async function parseID3Tags(arrayBuffer) {
  try {
    if (!window.jsmediatags) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsmediatags@3.9.7/dist/jsmediatags.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    return new Promise((resolve) => {
      window.jsmediatags.read(new Blob([arrayBuffer]), {
        onSuccess: function(tag) {
  console.log("Taglar:", tag.tags);

  const usltLyrics = tag.tags.USLT?.data?.lyrics;
  const customLyrics = tag.tags.lyrics?.lyrics;
  const lyricsText = usltLyrics || customLyrics || null;

  resolve(lyricsText);
}
      });
    });
  } catch (err) {
    console.error("ID3 kütüphanesi yüklenirken hata:", err);
    return null;
  }
}

async function fetchLyrics() {
    const currentTrack = musicPlayerState.playlist[musicPlayerState.currentIndex];
    if (!currentTrack) return;

    musicPlayerState.lyricsContainer.innerHTML = `<div class='lyrics-loading'>${config.languageLabels.loadingLyrics}</div>`;
    musicPlayerState.currentLyrics = [];

    try {
        const token = getAuthToken();
        const localResponse = await fetch(`${window.location.origin}/Items/${currentTrack.Id}/Lyrics`, {
            headers: { "X-Emby-Token": token }
        });

        if (localResponse.ok) {
            const data = await localResponse.json();
            if (data.Lyrics && data.Lyrics.length > 0) {
                displayLyrics(data.Lyrics);
                musicPlayerState.lyricsCache[currentTrack.Id] = data.Lyrics;
                return;
            }
        }

        const embeddedLyrics = await getEmbeddedLyrics(currentTrack.Id);
        if (embeddedLyrics) {
            displayLyrics(embeddedLyrics);
            return;
        }

        showNoLyricsMessage();
    } catch (err) {
        console.error("Şarkı sözleri yüklenirken hata:", err);
        showLyricsError(err.message);
    }
}

function displayLyrics(lyricsData) {
  try {
    musicPlayerState.currentLyrics = [];
    musicPlayerState.lyricsContainer.innerHTML = "";

    if (typeof lyricsData === 'string' && lyricsData.match(/\[\d{2}:\d{2}\.\d{2}\]/)) {
      const lines = lyricsData.split('\n');
      const lyricsWithTime = [];

      lines.forEach(line => {
        const timeMatches = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/g);
        if (timeMatches) {
          const text = line.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, '').trim();

          if (text) {
            timeMatches.forEach(timeTag => {
              const timeMatch = timeTag.match(/\[(\d{2}):(\d{2})\.(\d{2})\]/);
              if (timeMatch) {
                const minutes = parseInt(timeMatch[1]);
                const seconds = parseInt(timeMatch[2]);
                const time = minutes * 60 + seconds;

                const lineContainer = document.createElement("div");
                lineContainer.className = "lyrics-line-container";

                const timeDisplay = document.createElement("span");
                timeDisplay.className = "lyrics-time";
                timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                const textDisplay = document.createElement("div");
                textDisplay.className = "lyrics-text";
                textDisplay.innerHTML = text.split('').map(char =>
                  `<span class="lyrics-char">${char}</span>`
                ).join('');

                lineContainer.appendChild(timeDisplay);
                lineContainer.appendChild(textDisplay);
                musicPlayerState.lyricsContainer.appendChild(lineContainer);
                lyricsWithTime.push({
                  time,
                  element: textDisplay,
                  chars: Array.from(textDisplay.querySelectorAll('.lyrics-char'))
                });
              }
            });
          }
        } else if (line.trim()) {
          const lineContainer = document.createElement("div");
          lineContainer.className = "lyrics-line-container";

          const textDisplay = document.createElement("div");
          textDisplay.className = "lyrics-text";
          textDisplay.textContent = line.trim();

          lineContainer.appendChild(textDisplay);
          musicPlayerState.lyricsContainer.appendChild(lineContainer);
        }
      });

      musicPlayerState.currentLyrics = lyricsWithTime.sort((a, b) => a.time - b.time);
    } else {
      const div = document.createElement("div");
      div.className = "lyrics-plain";
      div.textContent = lyricsData;
      musicPlayerState.lyricsContainer.appendChild(div);
    }
  } catch (err) {
    console.error("Sözler gösterilirken hata:", err);
    showLyricsError("Sözler işlenirken hata oluştu");
  }
}

function toggleLyrics() {
  musicPlayerState.lyricsActive = !musicPlayerState.lyricsActive;

  if (musicPlayerState.lyricsActive) {
    musicPlayerState.lyricsContainer.classList.remove("lyrics-hidden");
    musicPlayerState.lyricsContainer.classList.add("lyrics-visible");
    musicPlayerState.lyricsBtn.innerHTML = '<i class="fas fa-align-left" style="color:#e91e63"></i>';
    fetchLyrics();
  } else {
    musicPlayerState.lyricsContainer.classList.remove("lyrics-visible");
    musicPlayerState.lyricsContainer.classList.add("lyrics-hidden");
    musicPlayerState.lyricsBtn.innerHTML = '<i class="fas fa-align-left"></i>';
  }
}

function showNoLyricsMessage() {
    musicPlayerState.lyricsContainer.innerHTML = `<div class='lyrics-not-found'>${config.languageLabels.noLyricsFound}</div>`;
  }

function showLyricsError(message) {
    musicPlayerState.lyricsContainer.innerHTML = `<div class='lyrics-error'>${config.languageLabels.lyricsError}: ${message}</div>`;
  }

function toggleMute() {
  const { audio, volumeSlider, volumeBtn } = musicPlayerState;

  if (audio.volume > 0) {
    audio.volume = 0;
    volumeSlider.value = 0;
    volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
  } else {
    const newVolume = volumeSlider.dataset.lastVolume || 0.7;
    audio.volume = newVolume;
    volumeSlider.value = newVolume;
    volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
  }
}

function togglePlaylistModal(e) {
  const modal = musicPlayerState.playlistModal;
  if (modal.style.display === "flex") {
    modal.style.display = "none";
  } else {
    updatePlaylistModal();
    modal.style.display = "flex";

    if (e) {
      const x = e.clientX;
      const y = e.clientY;
      const modalWidth = 300;
      const modalHeight = 400;
      const left = Math.min(x, window.innerWidth - modalWidth - 20);
      const top = Math.min(y, window.innerHeight - modalHeight - 20);
      modal.style.left = `${left}px`;
      modal.style.top = `${top}px`;
    } else {
      modal.style.left = "";
      modal.style.top = "";
    }
  }
}

function updatePlaylistModal() {
  const itemsContainer = musicPlayerState.playlistItemsContainer;
  itemsContainer.innerHTML = "";

  musicPlayerState.playlist.forEach((track, index) => {
    const item = document.createElement("div");
    item.className = `playlist-item ${index === musicPlayerState.currentIndex ? "active" : ""}`;
    item.onclick = () => playTrack(index);

    const img = document.createElement("div");
    img.className = "playlist-item-img";
    const imageTag = track.AlbumPrimaryImageTag || track.PrimaryImageTag;
    if (imageTag) {
      const imageId = track.AlbumId || track.Id;
      img.style.backgroundImage = `url('${window.location.origin}/Items/${imageId}/Images/Primary?fillHeight=100&fillWidth=100&quality=80&tag=${imageTag}')`;
    }

    const info = document.createElement("div");
    info.className = "playlist-item-info";

    const title = document.createElement("div");
    title.className = "playlist-item-title";
    title.textContent = `${index+1}. ${track.Name || config.languageLabels.unknownTrack}`

    const artist = document.createElement("div");
    artist.className = "playlist-item-artist";
    artist.textContent = track.Artists?.join(", ") || config.languageLabels.unknownArtist;

    info.appendChild(title);
    info.appendChild(artist);
    item.appendChild(img);
    item.appendChild(info);
    itemsContainer.appendChild(item);
  });
}

export function playPrevious() {
  musicPlayerState.currentIndex = (musicPlayerState.currentIndex - 1 + musicPlayerState.playlist.length) % musicPlayerState.playlist.length;
  playTrack(musicPlayerState.currentIndex);
}

export function playNext() {
  musicPlayerState.currentIndex = (musicPlayerState.currentIndex + 1) % musicPlayerState.playlist.length;
  playTrack(musicPlayerState.currentIndex);
}

async function updateModernTrackInfo(track) {
    musicPlayerState.modernTitleEl.textContent = track?.Name || config.languageLabels.unknownTrack;
    musicPlayerState.modernArtistEl.textContent = track?.Artists?.join(", ") || config.languageLabels.unknownArtist;
    musicPlayerState.currentArtwork = [];

    let metaContainer = musicPlayerState.metaContainer;
    if (!metaContainer) {
        metaContainer = document.createElement("div");
        metaContainer.className = "player-track-meta";
        musicPlayerState.modernArtistEl.after(metaContainer);
        musicPlayerState.metaContainer = metaContainer;
    }

    metaContainer.innerHTML = '';
    if (track?.Album) {
        const albumSpan = document.createElement("span");
        albumSpan.title = config.languageLabels.album;
        albumSpan.innerHTML = `<i class="fas fa-compact-disc"></i> ${track.Album}`;
        metaContainer.appendChild(albumSpan);
    }
    if (track?.IndexNumber) {
        const trackSpan = document.createElement("span");
        trackSpan.title = config.languageLabels.trackNumber;
        trackSpan.innerHTML = `<i class="fas fa-list-ol"></i> ${track.IndexNumber}`;
        metaContainer.appendChild(trackSpan);
    }
    if (track?.ProductionYear) {
        const yearSpan = document.createElement("span");
        yearSpan.title = config.languageLabels.year;
        yearSpan.innerHTML = `<i class="fas fa-calendar-alt"></i> ${track.ProductionYear}`;
        metaContainer.appendChild(yearSpan);
    }
    try {
        const token = getAuthToken();
        const response = await fetch(`${window.location.origin}/Audio/${track.Id}/stream.mp3?Static=true`, {
            headers: { "X-Emby-Token": token }
        });

        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const tags = await new Promise((resolve) => {
                window.jsmediatags.read(new Blob([arrayBuffer]), {
                    onSuccess: resolve,
                    onError: (error) => resolve(null)
                });
            });

            if (tags?.tags?.genre) {
                const genreSpan = document.createElement("span");
                genreSpan.title = config.languageLabels.genres;
                genreSpan.innerHTML = `<i class="fas fa-music"></i> ${tags.tags.genre}`;
                metaContainer.appendChild(genreSpan);
            }
        }
    } catch (err) {
        console.error("ID3 tag okuma hatası:", err);
    }

    try {
        const embeddedImage = await getEmbeddedImage(track.Id);
        if (embeddedImage) {
            musicPlayerState.albumArtEl.style.backgroundImage = `url('${embeddedImage}')`;
            musicPlayerState.currentArtwork.push({
              src: embeddedImage,
              sizes: '300x300',
              type: 'image/jpeg'
            });
            updateMediaMetadata(track);
            return;
        }
    } catch (err) {
        console.error("Gömülü resim okunurken hata:", err);
    }

    const imageTag = track.AlbumPrimaryImageTag || track.PrimaryImageTag;
    if (imageTag) {
        const imageId = track.AlbumId || track.Id;
        const imageUrl = `${window.location.origin}/Items/${imageId}/Images/Primary?fillHeight=300&fillWidth=300&quality=90&tag=${imageTag}`;
        musicPlayerState.albumArtEl.style.backgroundImage = `url('${imageUrl}')`;
        musicPlayerState.currentArtwork = [{
          src: imageUrl,
          sizes: '300x300',
          type: 'image/jpeg'
        }];
    } else {
        musicPlayerState.albumArtEl.style.backgroundImage = "url('default-album-art.png')";
        musicPlayerState.currentArtwork = [];
    }
    updateMediaMetadata(track);
}

async function getEmbeddedImage(trackId) {
  try {
    const token = getAuthToken();
    const response = await fetch(`${window.location.origin}/Audio/${trackId}/stream.mp3?Static=true`, {
      headers: { "X-Emby-Token": token }
    });

    if (!response.ok) throw new Error("Müzik dosyası alınamadı");

    const arrayBuffer = await response.arrayBuffer();
    return await extractImageFromID3Tags(arrayBuffer);
  } catch (err) {
    console.error("Gömülü resim okunamadı:", err);
    return null;
  }
}

async function extractImageFromID3Tags(arrayBuffer) {
  try {
    if (!window.jsmediatags) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsmediatags@3.9.7/dist/jsmediatags.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    return new Promise((resolve) => {
      window.jsmediatags.read(new Blob([arrayBuffer]), {
        onSuccess: function(tag) {
          const picture = tag.tags.picture;
          if (picture && picture.data && picture.data.length > 0) {
            const base64String = arrayBufferToBase64(picture.data);
            const imageUrl = `data:${picture.format};base64,${base64String}`;
            resolve(imageUrl);
          } else {
            resolve(null);
          }
        },
        onError: function(error) {
          console.error("ID3 resmi okunurken hata:", error);
          resolve(null);
        }
      });
    });
  } catch (err) {
    console.error("ID3 kütüphanesi yüklenirken hata:", err);
    return null;
  }
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function setupAudioListeners() {
  musicPlayerState.audio.addEventListener("timeupdate", updateProgress);
  musicPlayerState.audio.addEventListener("ended", handleSongEnd);
  musicPlayerState.audio.addEventListener("loadedmetadata", updateDuration);
  musicPlayerState.audio.addEventListener("timeupdate", highlightCurrentLyric);
}

function highlightCurrentLyric() {
  if (!musicPlayerState.lyricsActive || musicPlayerState.currentLyrics.length === 0) return;

  const currentTime = musicPlayerState.audio.currentTime;
  let currentLine = null;
  let activeCharIndex = -1;
  let nextLineTime = Infinity;

  document.querySelectorAll(".lyrics-char.active").forEach(el => {
    el.classList.remove("active");
  });

  for (let i = 0; i < musicPlayerState.currentLyrics.length; i++) {
    const line = musicPlayerState.currentLyrics[i];

    if (line.time <= currentTime) {
      currentLine = line;

      if (i < musicPlayerState.currentLyrics.length - 1) {
        nextLineTime = musicPlayerState.currentLyrics[i + 1].time;
      } else {
        nextLineTime = musicPlayerState.audio.duration;
      }
    } else {
      break;
    }
  }

  if (currentLine) {
    const lineProgress = (currentTime - currentLine.time) / (nextLineTime - currentLine.time);
    activeCharIndex = Math.min(currentLine.chars.length - 1, Math.floor(lineProgress * currentLine.chars.length));
    currentLine.chars.forEach((charEl, index) => {
      if (index <= activeCharIndex) {
        charEl.classList.add("active");
      }
    });

    currentLine.element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function updateProgress() {
  const { audio, progress, currentTimeEl } = musicPlayerState;
  if (!audio.duration) return;

  const percent = (audio.currentTime / audio.duration) * 100;
  progress.style.width = `${percent}%`;

  const minutes = Math.floor(audio.currentTime / 60);
  const seconds = Math.floor(audio.currentTime % 60);
  currentTimeEl.textContent = `${Math.min(minutes, 99)}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function updateDuration() {
  const { audio, durationEl } = musicPlayerState;
  const minutes = Math.floor(audio.duration / 60);
  const seconds = Math.floor(audio.duration % 60);
  durationEl.textContent = `${Math.min(minutes, 99)}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function handleSongEnd() {
  playNext();
}

function playTrack(index) {
  if (index < 0 || index >= musicPlayerState.playlist.length) return;

  const track = musicPlayerState.playlist[index];
  musicPlayerState.currentIndex = index;

  updateModernTrackInfo(track);
  updatePlaylistModal();

  const audioUrl = `${window.location.origin}/Audio/${track.Id}/stream.mp3?Static=true`;
  musicPlayerState.audio.src = audioUrl;
  musicPlayerState.audio.removeEventListener('canplay', handleCanPlay);
  musicPlayerState.audio.removeEventListener('error', handlePlayError);
  musicPlayerState.audio.removeEventListener("timeupdate", updateProgress);
  musicPlayerState.audio.removeEventListener("ended", handleSongEnd);
  musicPlayerState.audio.removeEventListener("loadedmetadata", updateDuration);
  musicPlayerState.audio.removeEventListener("timeupdate", highlightCurrentLyric);
  musicPlayerState.audio.addEventListener('canplay', handleCanPlay);
  musicPlayerState.audio.addEventListener('error', handlePlayError);
  setupAudioListeners();

  if (musicPlayerState.mediaSession) {
    musicPlayerState.mediaSession.playbackState = 'none';
  }

  musicPlayerState.audio.load();

  function handleCanPlay() {
    musicPlayerState.audio.play()
      .then(() => {
        musicPlayerState.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if (musicPlayerState.mediaSession) {
          musicPlayerState.mediaSession.playbackState = 'playing';
        }
      })
      .catch(err => {
        console.error("Oynatma hatası:", err);
        setTimeout(playNext, 2000);
      });

    musicPlayerState.audio.removeEventListener('canplay', handleCanPlay);
    musicPlayerState.audio.removeEventListener('error', handlePlayError);
  }

  function handlePlayError() {
    console.error("Parça yüklenemedi:", audioUrl);
    setTimeout(playNext, 2000);
    musicPlayerState.audio.removeEventListener('canplay', handleCanPlay);
    musicPlayerState.audio.removeEventListener('error', handlePlayError);
  }

  if (musicPlayerState.lyricsActive) {
    fetchLyrics();
  }
}

export function togglePlayPause() {
  if (musicPlayerState.audio.paused) {
    musicPlayerState.audio.play()
      .then(() => {
        musicPlayerState.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if (musicPlayerState.mediaSession) {
          musicPlayerState.mediaSession.playbackState = 'playing';
        }
      });
  } else {
    musicPlayerState.audio.pause();
    musicPlayerState.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    if (musicPlayerState.mediaSession) {
      musicPlayerState.mediaSession.playbackState = 'paused';
    }
  }
}

export async function initPlayer() {
  const playerElements = createModernPlayerUI();
  initMediaSession();
  await refreshPlaylist();
  return playerElements;
}

export function createPlayButton() {
  const button = document.createElement("button");
  button.className = "music-button";
  button.innerHTML = '<i class="fas fa-music"></i>';
  button.addEventListener("click", () => {
    if (!musicPlayerState.playlist.length) {
      initPlayer();
    } else {
      togglePlayerVisibility();
    }
  });

  return button;
}
