/**
 * The use of this file without proper attribution to the original author (G-grbz - https://github.com/G-grbz)
 * and without obtaining permission is considered unethical and is not permitted.
 */

import { getSessionInfo, fetchItemDetails } from "./api.js";
import { getConfig } from "./config.js";
import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';

const config = getConfig();
const currentLang = config.defaultLanguage || getDefaultLanguage();
const labels = getLanguageLabels(currentLang) || {};

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
            style.innerHTML = `
                #jms-pause-overlay {
                    opacity: 0;
                    transition: opacity 0.45s cubic-bezier(0.3,0.5,0.3,1);
                    pointer-events: none;
                }
                #jms-pause-overlay.visible {
                    opacity: 1;
                    pointer-events: auto;
                }
            `;
            document.head.appendChild(style);
        }
    }

    const overlayEl = document.getElementById('jms-pause-overlay');
    const titleEl = document.getElementById('jms-overlay-title');
    const metaEl = document.getElementById('jms-overlay-metadata');
    const plotEl = document.getElementById('jms-overlay-plot');
    const backdropEl = document.querySelector('.pause-right-backdrop');
    const logoEl = document.getElementById('jms-overlay-logo');
    const pausedLabel = document.getElementById('pause-status-bottom-right');

    overlayEl.addEventListener('click', e => {
        if (overlayVisible && activeVideo && (e.target === overlayEl || overlayEl.contains(e.target))) {
            activeVideo.play();
            hideOverlay();
        }
    });

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
        console.log('pause overlay data:', { data, ep: data._episodeData });
        resetContent();
        const ep = data._episodeData || null;
        if (config.pauseOverlay.showBackdrop) {
            await setBackdrop();
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
    }

    async function setBackdrop() {
        if (!currentMediaId) return;
        const url = `/Items/${currentMediaId}/Images/Backdrop/0`;
        try {
            const ok = await checkExists(url);
            backdropEl.style.backgroundImage = ok ? `url('${url}')` : 'none';
            backdropEl.style.opacity = ok ? '0.7' : '0';
        } catch (e) {
            backdropEl.style.backgroundImage = 'none';
            backdropEl.style.opacity = '0';
        }
    }

    async function setLogo(data) {
        if (!currentMediaId || !data) return;
        const imagePref = config.pauseOverlay?.imagePreference || 'auto';
        const logoUrl = `/Items/${currentMediaId}/Images/Logo`;
        const discUrl = `/Items/${currentMediaId}/Images/Disc`;

        async function tryImage(url) {
            try {
                return await checkExists(url);
            } catch { return false; }
        }

        let sequence = [];
        switch (imagePref) {
            case 'logo': sequence = ['logo']; break;
            case 'disc': sequence = ['disc']; break;
            case 'title': sequence = ['title']; break;
            case 'logo-title': sequence = ['logo', 'title']; break;
            case 'disc-logo-title': sequence = ['disc', 'logo', 'title']; break;
            case 'disc-title': sequence = ['disc', 'title']; break;
            case 'auto': sequence = ['logo', 'disc', 'title']; break;
            default: sequence = ['logo', 'disc', 'title']; break;
        }
        for (const pref of sequence) {
            if (pref === 'logo' && await tryImage(logoUrl)) {
                logoEl.innerHTML = `<div class="pause-logo-container"><img class="pause-logo" src="${logoUrl}" alt="" onerror="this.parentElement.innerHTML=''"/></div>`;
                return;
            }
            if (pref === 'disc' && await tryImage(discUrl)) {
                logoEl.innerHTML = `<div class="pause-disk-container"><img class="pause-disk" src="${discUrl}" alt="" onerror="this.parentElement.innerHTML=''"/></div>`;
                return;
            }
            if (pref === 'title') {
                logoEl.innerHTML = `<div class="pause-text-logo">${data.Name || data.OriginalTitle || ''}</div>`;
                return;
            }
        }
        logoEl.innerHTML = `<div class="pause-text-logo">${data.Name || data.OriginalTitle || ''}</div>`;
    }

    async function checkExists(url) {
        if (!url) return false;
        if (window.__imageCache === undefined) {
            window.__imageCache = {};
        }
        if (window.__imageCache[url] !== undefined) {
            return window.__imageCache[url];
        }
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                cache: 'no-store',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const exists = response.ok;
            window.__imageCache[url] = exists;
            return exists;
        } catch (e) {
            window.__imageCache[url] = false;
            return false;
        }
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
