/**
 * The use of this file without proper attribution to the original author (G-grbz - https://github.com/G-grbz)
 * and without obtaining permission is considered unethical and is not permitted.
 */

import { getSessionInfo, fetchItemDetails, makeApiRequest } from "./api.js";
import { getConfig } from "./config.js";
import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';

const config = getConfig();
const currentLang = config.defaultLanguage || getDefaultLanguage();
const labels = getLanguageLabels(currentLang) || {};
const imageBlobCache = new Map();

export function setupPauseScreen() {
    const config = getConfig();
    const overlayConfig = config.pauseOverlay || { enabled: true };
    if (!overlayConfig.enabled) return () => {};

    let activeVideo = null;
    let currentMediaId = null;
    let removeHandlers = null;
    let overlayVisible = false;
    let lastIdCheck = 0;
    let wasPaused = false;
    let pauseTimeout = null;

    if (!document.getElementById('jms-pause-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'jms-pause-overlay';
        overlay.innerHTML = `
    <div class="pause-overlay-content">
        <div class="pause-left">
            <div id="jms-overlay-title" class="pause-title"></div>
            <div id="jms-overlay-metadata" class="pause-metadata"></div>
            <div id="jms-overlay-plot" class="pause-plot"></div>
    <div id="jms-overlay-recos" class="pause-recos">
        <div class="pause-recos-header" id="jms-recos-header"></div>
        <div class="pause-recos-row" id="jms-recos-row"></div>
    </div>
        </div>
    <div class="pause-right">
            <div class="pause-right-backdrop"></div>
            <div id="jms-overlay-logo" class="pause-logo-container"></div>
        </div>
    </div>
    <div class="pause-status-bottom-right" id="pause-status-bottom-right" style="display:none;">
        <span><i class="fa-jelly fa-regular fa-pause"></i> ${labels.paused || 'Duraklatıldı'}</span>
    </div>
`;
        document.body.appendChild(overlay);

        if (!document.getElementById('jms-pause-css')) {
            const link = document.createElement('link');
            link.id = 'jms-pause-css';
            link.rel = 'stylesheet';
            link.href = 'slider/src/pauseModul.css';
            document.head.appendChild(link);
        }
        if (!document.getElementById('jms-pause-extra-css')) {
            const style = document.createElement('style');
            style.id = 'jms-pause-extra-css';
            document.head.appendChild(style);
        }
    }

    const overlayEl = document.getElementById('jms-pause-overlay');
    const titleEl = document.getElementById('jms-overlay-title');
    const metaEl = document.getElementById('jms-overlay-metadata');
    const plotEl = document.getElementById('jms-overlay-plot');
    const backdropEl = document.querySelector('.pause-right-backdrop');
    const logoEl = document.getElementById('jms-overlay-logo');
    const recosHeaderEl = document.getElementById('jms-recos-header');
    const pausedLabel = document.getElementById('pause-status-bottom-right');

    overlayEl.addEventListener('click', e => {
        if (overlayVisible && activeVideo && (e.target === overlayEl || overlayEl.contains(e.target))) {
            activeVideo.play();
            hideOverlay();
        }
    });

    function renderIconOrEmoji(iconValue) {
      if (!iconValue) return '';
      if (iconValue.startsWith('fa-') || iconValue.includes('fa ')) {
        return `<i class="${iconValue}"></i>`;
      }
      return iconValue;
    }

    function setRecosHeader(isEpisodeContext) {
      if (!recosHeaderEl) return;
      if (isEpisodeContext) {
        const icon = renderIconOrEmoji(labels.unwatchedIcon || '📺');
        const text = labels.unwatchedEpisodes || 'İzlemediğiniz Bölümler';
        recosHeaderEl.innerHTML = `${icon} ${text}`;
      } else {
        const icon = renderIconOrEmoji(labels.recosIcon || '👍');
        const text = labels.youMayAlsoLike || 'Bunları da beğenebilirsiniz';
       recosHeaderEl.innerHTML = `${icon} ${text}`;
      }
    }

    function showOverlay() {
    overlayEl.classList.add('visible');
    overlayVisible = true;
    if(pausedLabel) {
        pausedLabel.style.display = 'flex';
        pausedLabel.style.opacity = '0';
        setTimeout(() => {
            pausedLabel.style.opacity = '0.92';
        }, 10);
    }

    const content = overlayEl.querySelector('.pause-overlay-content');
    if (content) {
        content.style.transform = 'translateY(10px)';
        content.style.opacity = '0';
        setTimeout(() => {
            content.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.4s ease';
            content.style.transform = 'translateY(0)';
            content.style.opacity = '1';
        }, 10);
    }
}

function hideOverlay() {
    const content = overlayEl.querySelector('.pause-overlay-content');
    if (content) {
        content.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.3s ease';
        content.style.transform = 'translateY(10px)';
        content.style.opacity = '0';
    }

    if(pausedLabel) {
        pausedLabel.style.opacity = '0';
        setTimeout(() => {
            pausedLabel.style.display = 'none';
        }, 300);
    }

    setTimeout(() => {
        overlayEl.classList.remove('visible');
        overlayVisible = false;
        if (content) {
            content.style.transition = '';
            content.style.transform = '';
            content.style.opacity = '';
        }
    }, 300);

    if (pauseTimeout) {
        clearTimeout(pauseTimeout);
        pauseTimeout = null;
    }
}

    function resetContent() {
        if (config.pauseOverlay.showBackdrop) {
            backdropEl.style.backgroundImage = 'none';
            backdropEl.style.opacity = '0';
        }
        if (config.pauseOverlay.showLogo) {
            logoEl.innerHTML = '';
        }
        titleEl.innerHTML = '';
        metaEl.innerHTML = '';
        plotEl.textContent = '';
        const recos = document.getElementById('jms-overlay-recos');
        const recosRow = document.getElementById('jms-recos-row');
        if (recos) recos.classList.remove('visible');
        if (recosRow) recosRow.innerHTML = '';
    }

    function convertTicks(ticks) {
        if (!ticks || isNaN(ticks)) return labels.sonucyok;
        const totalSeconds = ticks / 10000000;
        return formatTime(totalSeconds);
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return labels.sonucyok;
        const t = Math.floor(sec);
        const m = Math.floor(t / 60);
        const h = Math.floor(m / 60);
        const rm = m % 60;
        const rs = t % 60;
        return h > 0
            ? `${h}${labels.sa} ${rm}${labels.dk} ${rs}${labels.sn}`
            : `${rm}${labels.dk} ${rs}${labels.sn}`;
    }

    function genRow(label, value) {
        if (!value) return '';
        return `<div class="info-row"><span>${label}</span><span>${value}</span></div>`;
    }

    async function refreshData(data) {
        resetContent();
        const ep = data._episodeData || null;
        if (config.pauseOverlay.showBackdrop) {
        await setBackdrop(data);
        } else {
            backdropEl.style.backgroundImage = 'none';
            backdropEl.style.opacity = '0';
        }
        if (config.pauseOverlay.showLogo) {
        await setLogo(data);
        } else {
            logoEl.innerHTML = '';
        }
        if (ep) {
    const seriesTitle = data.Name || data.OriginalTitle || '';
    const line = formatSeasonEpisodeLine(ep);

    titleEl.innerHTML = `
        <h1 class="pause-series-title">${seriesTitle}</h1>
        <h2 class="pause-episode-title">${line}</h2>
    `;
} else {
    titleEl.innerHTML = `<h1 class="pause-movie-title">${data.Name || data.OriginalTitle || ''}</h1>`;
}
        if (config.pauseOverlay.showMetadata) {
            const rows = [
                genRow('📅 ' + labels.showYearInfo, data.ProductionYear),
                genRow('⭐ ' + labels.showCommunityRating, data.CommunityRating ? Math.round(data.CommunityRating) + '/10' : ''),
                genRow('👨‍⚖️ ' + labels.showCriticRating, data.CriticRating ? Math.round(data.CriticRating) + '%' : ''),
                genRow('👥 ' + labels.voteCount, data.VoteCount),
                genRow('🔞 ' + labels.showOfficialRating, data.OfficialRating || labels.derecelendirmeyok),
                genRow('🎭 ' + labels.showGenresInfo, data.Genres?.slice(0,3).join(', ') || labels.noGenresFound),
                genRow('⏱️ ' + labels.showRuntimeInfo, convertTicks(ep?.RunTimeTicks || data.RunTimeTicks)),
                genRow('▶ ' + labels.currentTime, formatTime(activeVideo?.currentTime || 0)),
                genRow('⏳ ' + labels.remainingTime, formatTime((activeVideo?.duration || 0) - (activeVideo?.currentTime || 0)))
            ];
            metaEl.innerHTML = rows.join('');
        } else {
            metaEl.innerHTML = '';
        }
        if (config.pauseOverlay.showPlot) {
            plotEl.textContent = ep?.Overview || data.Overview || labels.konu + labels.noData;
        } else {
            plotEl.textContent = '';
        }
        setRecosHeader(Boolean(ep));
        try {
        let recs = [];
        if (ep) {
            recs = await fetchUnplayedEpisodesInSameSeason(ep, { limit: 5 });
        } else {
            recs = await fetchSimilarUnplayed(data, { limit: 5 });
        }
        renderRecommendations(recs);
        } catch (e) {
        console.warn('duraklatma ekranı tavsiye hatası:', e);
        setRecosHeader(Boolean(ep));
        renderRecommendations([]);
        }
    }

async function setBackdrop(item) {
   const tags = item?.BackdropImageTags || [];
   if (tags.length > 0) {
     const { accessToken } = getSessionInfo();
     const url = `/Items/${item.Id}/Images/Backdrop/0?tag=${encodeURIComponent(tags[0])}&api_key=${encodeURIComponent(accessToken || '')}`;
     backdropEl.style.backgroundImage = `url('${url}')`;
     backdropEl.style.opacity = '0.7';
   } else {
     backdropEl.style.backgroundImage = 'none';
     backdropEl.style.opacity = '0';
   }
 }

 async function setLogo(item) {
   if (!item) return;
   const imagePref = config.pauseOverlay?.imagePreference || 'auto';
   const hasLogoTag = item?.ImageTags?.Logo || item?.SeriesLogoImageTag || null;
   const hasDiscTag  = item?.ImageTags?.Disc || null;
   const { accessToken } = getSessionInfo();
    const logoUrl = hasLogoTag
   ? `/Items/${item.Id}/Images/Logo?tag=${encodeURIComponent(hasLogoTag)}&api_key=${encodeURIComponent(accessToken || '')}`
   : null;
    const discUrl = hasDiscTag
   ? `/Items/${item.Id}/Images/Disc?tag=${encodeURIComponent(hasDiscTag)}&api_key=${encodeURIComponent(accessToken || '')}`
   : null;

   const sequence = (() => {
     switch (imagePref) {
       case 'logo': return ['logo'];
       case 'disc': return ['disc'];
       case 'title': return ['title'];
       case 'logo-title': return ['logo', 'title'];
       case 'disc-logo-title': return ['disc', 'logo', 'title'];
       case 'disc-title': return ['disc', 'title'];
       case 'auto': default: return ['logo', 'disc', 'title'];
     }
   })();

   logoEl.innerHTML = '';
   for (const pref of sequence) {
     if (pref === 'logo' && logoUrl) {
       logoEl.innerHTML = `<div class="pause-logo-container"><img class="pause-logo" src="${logoUrl}" alt=""/></div>`;
       return;
     }
     if (pref === 'disc' && discUrl) {
       logoEl.innerHTML = `<div class="pause-disk-container"><img class="pause-disk" src="${discUrl}" alt=""/></div>`;
       return;
     }
     if (pref === 'title') {
       logoEl.innerHTML = `<div class="pause-text-logo">${item.Name || item.OriginalTitle || ''}</div>`;
       return;
     }
   }
   logoEl.innerHTML = `<div class="pause-text-logo">${item.Name || item.OriginalTitle || ''}</div>`;
 }

    function getPlayingItemIdFromVideo(video) {
  if (!video) return null;
  const src =
    video.currentSrc ||
    (video.querySelector && video.querySelector('source')?.src) ||
    video.src ||
    '';

  if (!src) return null;
  const m =
    src.match(/\/Videos\/([^/]+)\//) ||
    src.match(/[?&]ItemId=([^&]+)/) ||
    src.match(/\/Items\/([^/]+)\//);

  return m ? m[1] : null;
}


    async function resolveNowPlayingEpisode() {
    try {
        const session = await getSessionInfo();
        const np = session?.NowPlayingItem;
        if (!np) return null;
        if (np.Type === 'Episode') {
            const ep = await fetchItemDetails(np.Id);
            return ep;
        }
        return null;
    } catch {
        return null;
    }
}

    async function resolveNowPlaying() {
    try {
        const session = await getSessionInfo();
        const np = session?.NowPlayingItem;
        if (!np) return null;
        if (np.Type === 'Episode') {
            const ep = await fetchItemDetails(np.Id);
            const seriesId = np.SeriesId || ep.SeriesId;
            return { seriesId, episode: ep };
        }
        return {
            seriesId: np.SeriesId || np.Id,
            episode: null
        };
    } catch {
        return null;
    }
}


    function getCurrentMediaId(force = false) {
    const now = Date.now();
    if (!force && now - lastIdCheck < 500) return currentMediaId;
    lastIdCheck = now;

    const selectors = [
        '[data-id].btnUserRating',
        '[data-id].itemRatingButton',
        'button[data-id][data-isfavorite]',
        '.nowPlayingInfo[data-id]',
        '.detailPagePrimaryContainer[data-id]',
        '[data-itemid]',
        '.libraryPage[data-id]',
        '.itemBackdrop[data-id]'
    ];

    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el?.dataset.id) return el.dataset.id;
        if (el?.dataset.itemid) return el.dataset.itemid;
    }
    try {
        const u = new URL(location.href);
        const qid = u.searchParams.get('id');
        if (qid) return qid;
    } catch {}

    return null;
}


    function bindVideo(video) {
        if (removeHandlers) removeHandlers();
        if (video.closest('.video-preview-modal, .intro-video-container')) {
            return;
        }
        activeVideo = video;
        const onPause = async () => {
  if (video.ended) return;
  if (pauseTimeout) clearTimeout(pauseTimeout);

  pauseTimeout = setTimeout(async () => {
    if (!video.paused || video.ended) return;
    let ep = await resolveNowPlayingEpisode();
    if (!ep) {
      const nowId = document.querySelector('.nowPlayingInfo[data-id]')?.dataset?.id;
      if (nowId) {
        try {
          const maybeEp = await fetchItemDetails(nowId);
          if (maybeEp?.Type === 'Episode') ep = maybeEp;
        } catch {}
      }
    }

    if (!ep) {
      const vidItemId = getPlayingItemIdFromVideo(activeVideo);
      if (vidItemId) {
        try {
          const info = await fetchItemDetails(vidItemId);
          if (info?.Type === 'Episode') ep = info;
        } catch {}
      }
    }

    let seriesId = null;
    if (ep?.SeriesId) {
      seriesId = ep.SeriesId;
    } else {
      const rawId =
        document.querySelector('.nowPlayingInfo[data-id]')?.dataset?.id ||
        getCurrentMediaId(true);

      if (rawId) {
        const info = await fetchItemDetails(rawId);
        if (info.Type === 'Episode' && info.SeriesId) {
          seriesId = info.SeriesId;
          ep = ep || info;
        } else if (info.Type === 'Season' && info.SeriesId) {
          seriesId = info.SeriesId;
        } else {
          seriesId = info.SeriesId || info.Id;
        }
      }
    }

    if (!seriesId) return;

    currentMediaId = seriesId;
    const series = await fetchItemDetails(seriesId);
    await refreshData({ ...series, _episodeData: ep || null });
    showOverlay();
    if (!ep) {
      let tries = 3;
      while (tries-- > 0) {
        await new Promise(r => setTimeout(r, 200));
        const lateEp = await resolveNowPlayingEpisode();
        if (lateEp?.SeriesId === seriesId) {
          await refreshData({ ...series, _episodeData: lateEp });
          break;
        }
      }
    }
  }, 1000);
};

        const onPlay = () => {
            hideOverlay();
            if (pauseTimeout) clearTimeout(pauseTimeout);
        };
        video.addEventListener('pause', onPause);
        video.addEventListener('play', onPlay);
        removeHandlers = () => {
            video.removeEventListener('pause', onPause);
            video.removeEventListener('play', onPlay);
        };
    }

    const mo = new MutationObserver(muts => {
        muts.forEach(m => m.addedNodes.forEach(n => {
            if (n.nodeType === 1 && n.tagName === 'VIDEO') {
                bindVideo(n);
            }
        }));
        muts.forEach(m => m.removedNodes.forEach(n => {
            if (n === activeVideo) {
                if (removeHandlers) removeHandlers();
                activeVideo = null;
                hideOverlay();
            }
        }));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const initVid = document.querySelector('video');
    if (initVid) bindVideo(initVid);
    function startOverlayLogic() {
        async function loop() {
            const onValidPage = isVideoVisible();
            if (!onValidPage && overlayVisible) {
                hideOverlay();
            }
            if (!activeVideo) {
                const candidate = document.querySelector('video');
                if (candidate) bindVideo(candidate);
                else if (overlayVisible) hideOverlay();
            }
            if (activeVideo && onValidPage) {
                const isPaused = activeVideo.paused && !activeVideo.ended;
                if (isPaused && !wasPaused) {
                }
                if (!isPaused && wasPaused) hideOverlay();
                wasPaused = isPaused;
            }
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    }
    window.addEventListener('popstate', hideOverlay);
    window.addEventListener('hashchange', hideOverlay);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !isVideoVisible()) {
            hideOverlay();
        }
    });
    document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayVisible) {
        e.preventDefault();
        hideOverlay();
    }
});
    startOverlayLogic();
    return () => {
        if (removeHandlers) removeHandlers();
        mo.disconnect();
        hideOverlay();
        activeVideo = null;
        currentMediaId = null;
        wasPaused = false;
        if (pauseTimeout) clearTimeout(pauseTimeout);
        pauseTimeout = null;
    };
}
function isVideoVisible() {
    const vid = document.querySelector('video');
    if (!vid) return false;
    return vid.offsetParent !== null &&
           !vid.hidden &&
           vid.style.display !== 'none' &&
           vid.style.visibility !== 'hidden' &&
           vid.getBoundingClientRect().width > 0;
}

function convertDurationFromSeconds(sec) {
    const t = Math.floor(sec || 0);
    const m = Math.floor(t / 60), h = Math.floor(m / 60), rm = m % 60, rs = t % 60;
    return h > 0 ? `${h}${labels.sa} ${rm}${labels.dk} ${rs}${labels.sn}` : `${rm}${labels.dk} ${rs}${labels.sn}`;
}

function formatSeasonEpisodeLine(ep) {
    const sWord = labels.season || 'Season';
    const eWord = labels.episode || 'Episode';
    const sNum = ep?.ParentIndexNumber;
    const eNum = ep?.IndexNumber;
    const eTitle = ep?.Name ? ` – ${ep.Name}` : '';
    const numberFirst = new Set(['tur']);

    let left = '', right = '';
    if (numberFirst.has(currentLang)) {
        if (sNum != null) left = `${sNum}. ${sWord}`;
        if (eNum != null) right = `${eNum}. ${eWord}`;
    } else {
        if (sNum != null) left = `${sWord} ${sNum}`;
        if (eNum != null) right = `${eWord} ${eNum}`;
    }

    const mid = left && right ? ' • ' : '';
    return `${left}${mid}${right}${eTitle}`.trim();
}

function formatEpisodeLineShort(ep) {
  const eNum = ep?.IndexNumber;
  const titlePart = ep?.Name ? ` - ${ep.Name}` : '';
  const lang = String(currentLang || '').toLowerCase();
  const fallbackWords = {
    tur: 'bölüm',
    eng: 'Episode',
    en:  'Episode',
    fra: 'Épisode',
    fr:  'Épisode',
    deu: 'Folge',
    de:  'Folge',
    rus: 'серия',
    ru:  'серия'
  };
  const rawWord =
    (labels && typeof labels.episode === 'string' && labels.episode.trim()) ||
    fallbackWords[lang] ||
    'Episode';

  const numberFirstOverride =
    typeof labels?.numberFirstEpisode === 'boolean' ? labels.numberFirstEpisode : null;

  const numberFirst =
    numberFirstOverride !== null
      ? numberFirstOverride
      : (lang === 'tur' || lang === 'ru' || lang === 'rus');

  if (eNum == null) {
    return `${rawWord}${titlePart}`.trim();
  }

  if (lang === 'tur') {
    const w = rawWord.toLocaleLowerCase('tr');
    return `${eNum}.${w}${titlePart}`;
  }

  if (lang === 'ru' || lang === 'rus') {
    const w = rawWord.toLocaleLowerCase('ru');
    return `${eNum} ${w}${titlePart}`;
  }

  return `${rawWord} ${eNum}${titlePart}`;
}


function getApiClientSafe() {
  return (window.ApiClient && typeof window.ApiClient.serverAddress === 'function') ? window.ApiClient : null;
}
function getApiBase() {
  const api = getApiClientSafe();
  return api ? api.serverAddress() : (getConfig()?.serverAddress || '');
}
function getUserIdSafe() {
  const api = getApiClientSafe();
  return (api && typeof api.getCurrentUserId === 'function' && api.getCurrentUserId()) || getConfig()?.userId || null;
}

function buildImgUrl(item, kind='Primary', w=300, h=169) {
  if (!item?.Id) return '';
  const tag =
    (item.ImageTags && (item.ImageTags[kind] || item.ImageTags['Primary'])) ||
    item.PrimaryImageTag || item.SeriesPrimaryImageTag || '';
  const base = getApiBase();
  const q = new URLSearchParams({
    fillWidth: String(w),
    fillHeight: String(h),
    quality: '90',
    tag
  });
  return `${base}/Items/${item.Id}/Images/${kind}?${q.toString()}`;
}

function buildBackdropUrl(item, w = 360, h = 202) {
  const base = getApiBase();
  if (!item) return '';

  const directTag =
    (Array.isArray(item.BackdropImageTags) && item.BackdropImageTags[0]) ||
    (Array.isArray(item.ParentBackdropImageTags) && item.ParentBackdropImageTags[0]) ||
    null;
  if (directTag) {
    const q = new URLSearchParams({
      fillWidth: String(w),
      fillHeight: String(h),
      quality: '90',
      tag: directTag
    });
    return `${base}/Items/${item.Id}/Images/Backdrop?${q.toString()}`;
  }

  if (item.ParentId) {
    const q = new URLSearchParams({
      fillWidth: String(w),
      fillHeight: String(h),
      quality: '90'
    });
    if (Array.isArray(item.ParentBackdropImageTags) && item.ParentBackdropImageTags[0]) {
      q.set('tag', item.ParentBackdropImageTags[0]);
    }
    return `${base}/Items/${item.ParentId}/Images/Backdrop?${q.toString()}`;
  }

  const seriesId = item.SeriesId || null;
  const seriesBackdropTag =
    item.SeriesBackdropImageTag ||
    (Array.isArray(item.SeriesBackdropImageTags) && item.SeriesBackdropImageTags[0]) ||
    null;

  if (seriesId) {
    const q = new URLSearchParams({
      fillWidth: String(w),
      fillHeight: String(h),
      quality: '90'
    });
    if (seriesBackdropTag) q.set('tag', seriesBackdropTag);
    return `${base}/Items/${seriesId}/Images/Backdrop?${q.toString()}`;
  }
  return buildImgUrl(item, 'Primary', w, h);
}

function goToItem(item) {
  if (!item?.Id) return;
  const type = item.Type;
  if (type === 'Episode') {
    location.href = `#!/details?id=${encodeURIComponent(item.Id)}`;
  } else if (type === 'Season') {
    location.href = `#!/details?id=${encodeURIComponent(item.Id)}`;
  } else {
    location.href = `#!/details?id=${encodeURIComponent(item.Id)}`;
  }
}
async function fetchUnplayedEpisodesInSameSeason(currentEp, { limit = 5 } = {}) {
  if (!currentEp?.SeasonId) return [];
  const { userId } = getSessionInfo();
  const qs = new URLSearchParams({
    ParentId: currentEp.SeasonId,
    IncludeItemTypes: 'Episode',
    Recursive: 'false',
    UserId: userId || '',
    Filters: 'IsUnplayed',
    Limit: String(limit + 1),
    Fields: [
      'UserData',
      'PrimaryImageAspectRatio',
      'RunTimeTicks',
      'ProductionYear',
      'SeriesId',
      'ParentId',
      'ImageTags',
      'PrimaryImageTag',
      'BackdropImageTags',
      'ParentBackdropImageTags',
      'SeriesBackdropImageTag',
      'SeriesPrimaryImageTag'
    ].join(',')
    , SortBy: 'IndexNumber',
    SortOrder: 'Ascending'
  });
  const data = await makeApiRequest(`/Items?${qs.toString()}`);
  const items = data?.Items || [];
  return items.filter(i => i.Id !== currentEp.Id).slice(0, limit);
}

async function fetchSimilarUnplayed(item, { limit = 5 } = {}) {
  if (!item?.Id) return [];
  const { userId } = getSessionInfo();
  const qs = new URLSearchParams({
    UserId: userId || '',
    Limit: String(limit * 3),
    EnableUserData: 'true',
    Fields: [
      'UserData',
      'PrimaryImageAspectRatio',
      'RunTimeTicks',
      'ProductionYear',
      'Genres',
      'SeriesId',
      'ParentId',
      'ImageTags',
      'PrimaryImageTag',
      'BackdropImageTags',
      'ParentBackdropImageTags',
      'SeriesBackdropImageTag',
      'SeriesPrimaryImageTag'
    ].join(',')
  });
  const items = await makeApiRequest(`/Items/${encodeURIComponent(item.Id)}/Similar?${qs.toString()}`);
  const list = Array.isArray(items) ? items : (items?.Items || []);
  const unplayed = list.filter(x => {
    const ud = x?.UserData || {};
    if (typeof ud.Played === 'boolean') return !ud.Played;
    if (typeof ud.PlayCount === 'number') return ud.PlayCount === 0;
    return true;
  });
  return unplayed.slice(0, limit);
}

function renderRecommendations(items) {
  const recos = document.getElementById('jms-overlay-recos');
  const row = document.getElementById('jms-recos-row');
  if (!recos || !row) return;
  row.innerHTML = '';
  if (!items?.length) {
    recos.classList.remove('visible');
    return;
  }
  items.forEach(it => {
     const card = document.createElement('button');
     card.className = 'pause-reco-card';
     card.type = 'button';
     const img = buildBackdropUrl(it, 360, 202);
     const primaryFallback = buildImgUrl(it, 'Primary', 360, 202);
     const titleText = (it.Type === 'Episode')
     ? formatEpisodeLineShort(it)
     : (it.Name || it.OriginalTitle || '');
     card.innerHTML = `
      <div class="pause-reco-thumb-wrap">
        ${img
          ? `<img class="pause-reco-thumb" loading="lazy" src="${img}" alt="" onerror="this.onerror=null; this.src='${primaryFallback}'">`
          : `<div class="pause-reco-thumb"></div>`}
      </div>
       <div class="pause-reco-title">${titleText}</div>
     `;
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      goToItem(it);
    });
    row.appendChild(card);
  });
  recos.classList.add('visible');
}

window.addEventListener('beforeunload', () => {
  for (const v of imageBlobCache.values()) { if (v) URL.revokeObjectURL(v); }
  imageBlobCache.clear();
});
