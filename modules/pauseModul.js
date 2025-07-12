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
        `;
        document.body.appendChild(overlay);

        if (!document.getElementById('jms-pause-css')) {
            const link = document.createElement('link');
            link.id = 'jms-pause-css';
            link.rel = 'stylesheet';
            link.href = 'slider/src/pauseModul.css';
            document.head.appendChild(link);
        }
    }

    const overlayEl = document.getElementById('jms-pause-overlay');
    const titleEl = document.getElementById('jms-overlay-title');
    const metaEl = document.getElementById('jms-overlay-metadata');
    const plotEl = document.getElementById('jms-overlay-plot');
    const backdropEl = document.querySelector('.pause-right-backdrop');
    const logoEl = document.getElementById('jms-overlay-logo');

    overlayEl.addEventListener('click', e => {
    if (overlayVisible && activeVideo && (e.target === overlayEl || overlayEl.contains(e.target))) {
        activeVideo.play();
        hideOverlay();
    }
});

    function showOverlay() {
        overlayEl.classList.add('visible');
        overlayVisible = true;
    }

    function hideOverlay() {
        overlayEl.classList.remove('visible');
        overlayVisible = false;
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
        titleEl.innerHTML = `
            <h1 class="pause-series-title">${data.Name || data.OriginalTitle || ''}</h1>
            <h2 class="pause-episode-title">${labels.sezon} ${ep.ParentIndexNumber} • ${labels.bolum} ${ep.IndexNumber} ${ep.Name ? '– ' + ep.Name : ''}</h2>
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
        const ok = await checkExists(url);
        backdropEl.style.backgroundImage = ok ? `url('${url}')` : 'none';
        backdropEl.style.opacity = ok ? '0.7' : '0';
    }

    async function setLogo(data) {
        if (!currentMediaId) return;
        const imagePref = config.pauseOverlay?.imagePreference || 'auto';
        const logoUrl = `/Items/${currentMediaId}/Images/Logo`;
        const discUrl = `/Items/${currentMediaId}/Images/Disc`;

        const logoExists = await checkExists(logoUrl);
        const discExists = await checkExists(discUrl);

        let shown = false;

        if (imagePref === 'logo' && logoExists) {
            logoEl.innerHTML = `<img class="pause-logo" src="${logoUrl}" alt=""/>`;
            shown = true;
        } else if (imagePref === 'disc' && discExists) {
            logoEl.innerHTML = `<img class="pause-disk" src="${discUrl}" alt=""/>`;
            shown = true;
        } else if (imagePref === 'title') {
            logoEl.innerHTML = `<div class="pause-text-logo">${data.Name || data.OriginalTitle}</div>`;
            shown = true;
        }

        if (!shown && imagePref === 'auto') {
            logoEl.innerHTML = logoExists
                ? `<img class="pause-logo" src="${logoUrl}" alt=""/>`
                : discExists
                    ? `<img class="pause-disk" src="${discUrl}" alt=""/>`
                    : `<div class="pause-text-logo">${data.Name || data.OriginalTitle}</div>`;
        }
    }

    async function checkExists(url) {
        try { const res = await fetch(url, { method: 'HEAD' }); return res.ok; } catch { return false; }
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
            '.detailPagePrimaryContainer[data-id]'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el?.dataset.id) return el.dataset.id;
        }
        return null;
    }

    function bindVideo(video) {
        if (removeHandlers) removeHandlers();
        activeVideo = video;
        const onPause = async () => {
            if (video.ended) return;
            const id = getCurrentMediaId(true);
            if (!id) return;
            currentMediaId = id;
            const info = await fetchItemDetails(id);
            if (info.Type === 'Episode' && info.SeriesId) {
                currentMediaId = info.SeriesId;
                const series = await fetchItemDetails(info.SeriesId);
                await refreshData({ ...series, _episodeData: info });
            } else {
                await refreshData(info);
            }
            showOverlay();
        };
        const onPlay = () => hideOverlay();
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
                    const id = getCurrentMediaId(true);
                    if (id) {
                        currentMediaId = id;
                        const info = await fetchItemDetails(id);
                        if (info.Type === 'Episode' && info.SeriesId) {
                            currentMediaId = info.SeriesId;
                            const series = await fetchItemDetails(info.SeriesId);
                            await refreshData({ ...series, _episodeData: info });
                        } else {
                            await refreshData(info);
                        }
                        showOverlay();
                    }
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
    // Only hide if the video is no longer on the page when we come back
    if (document.visibilityState === 'visible' && !isVideoVisible()) {
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
