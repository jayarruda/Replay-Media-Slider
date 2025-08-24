import { getConfig } from "./config.js";
import { fetchItemDetails, getImageDimensions, getIntroVideoUrl, getVideoStreamUrl, fetchLocalTrailers, pickBestLocalTrailer } from "./api.js";

const config = getConfig();

export function getYoutubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return url;

  const parseYouTubeTime = (t) => {
    if (!t) return 0;
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
    if (!m) return 0;
    const h = parseInt(m[1] || '0', 10);
    const min = parseInt(m[2] || '0', 10);
    const s = parseInt(m[3] || '0', 10);
    return h * 3600 + min * 60 + s;
  };

  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsedUrl.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = parsedUrl.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host.endsWith('youtube.com')) {
      if (parsedUrl.pathname.startsWith('/embed/')) {
        videoId = parsedUrl.pathname.split('/').filter(Boolean)[1] || '';
      } else if (parsedUrl.pathname.startsWith('/shorts/')) {
        videoId = parsedUrl.pathname.split('/').filter(Boolean)[1] || '';
      } else {
        videoId = parsedUrl.searchParams.get('v') || '';
      }
    }

    if (!videoId) return url;

    const startParam = parsedUrl.searchParams.get('start');
    const tParam = parsedUrl.searchParams.get('t');
    const start = startParam ? parseInt(startParam, 10) : parseYouTubeTime(tParam);

    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      modestbranding: '1',
      iv_load_policy: '3',
      enablejsapi: '1',
      playsinline: '1',
      mute: '0',
      controls: '0',
      origin: window.location.origin || ''
    });

    if (start && Number.isFinite(start) && start > 0) {
      params.set('start', String(start));
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  } catch (e) {
    console.error('YouTube URL dönüştürme hatası:', e);
    return url;
  }
}

export function getProviderUrl(provider, id, slug = '') {
  if (!provider || !id) return '#';

  const normalizedProvider = provider.toString().trim().toLowerCase();
  const cleanId = id.toString().trim();
  const cleanSlug = slug.toString().trim();

  switch (normalizedProvider) {
    case 'imdb':
      return `https://www.imdb.com/title/${cleanId}/`;

    case 'tmdb':
      return `https://www.themoviedb.org/movie/${cleanId}`;

    case 'tvdb':
      const pathSegment = cleanSlug ? cleanSlug : cleanId;
      return `https://www.thetvdb.com/movies/${pathSegment}`;

    default:
      return '#';
  }
}

export function debounce(func, wait = 300, immediate = false) {
  let timeout;

  return function(...args) {
    const context = this;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}

export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export function createTrailerIframe({ config, RemoteTrailers, slide, backdropImg, itemId }) {
  if (config?.disableAllPlayback === true) {
    try {
      slide?.classList.remove("video-active", "intro-active", "trailer-active");
      if (backdropImg) backdropImg.style.opacity = "1";
    } catch (_) {}
    return;
  }

  const savedMode = localStorage.getItem('previewPlaybackMode');
  const mode = (savedMode === 'trailer' || savedMode === 'video' || savedMode === 'trailerThenVideo')
    ? savedMode
    : (config.enableTrailerPlayback ? 'trailer' : 'video');

  if (!itemId) return;

  const videoContainer = document.createElement("div");
  videoContainer.className = "intro-video-container";
  Object.assign(videoContainer.style, {
    width: "70%", height: "100%", border: "none", display: "none",
    position: "absolute", top: "0%", right: "0%"
  });

  const videoElement = document.createElement("video");
  videoElement.controls = true;
  videoElement.muted = false;
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
  videoElement.style.transition = "opacity 0.2s ease-in-out";
  videoElement.style.opacity = "0";

  videoContainer.appendChild(videoElement);
  slide.appendChild(videoContainer);

  let ytIframe = null;
  let playingKind = null;
  let isMouseOver = false;
  let latestHoverId = 0;
  let abortController = new AbortController();
  let enterTimeout = null;
  const enableHls = config.enableHls === true;
  const delayRaw = (config && (config.gecikmeSure ?? config.gecikmesure));
  const delay = Number.isFinite(+delayRaw) ? +delayRaw : 500;

  const stopYoutube = (iframe) => {
    try {
      if (!iframe) return;
      iframe.contentWindow?.postMessage(JSON.stringify({
        event: 'command', func: 'stopVideo', args: []
      }), '*');
    } catch (_) {}
  };

  const destroyHlsIfAny = () => {
    if (videoElement.hls) {
      try { videoElement.hls.destroy(); } catch (_) {}
      delete videoElement.hls;
    }
  };

  const hardStopVideo = () => {
    try { videoElement.pause(); } catch (_) {}
    destroyHlsIfAny();
    try {
      videoElement.removeAttribute('src');
      videoElement.load();
    } catch (_) {}
    videoContainer.style.display = "none";
    videoElement.style.opacity = "0";
    slide.classList.remove("video-active", "intro-active");
  };

  const hardStopIframe = () => {
    if (ytIframe) {
      stopYoutube(ytIframe);
      try { ytIframe.src = ""; } catch (_) {}
      ytIframe.style.display = "none";
    }
    slide.classList.remove("trailer-active");
  };

  const fullCleanup = () => {
    hardStopVideo();
    hardStopIframe();
    try { backdropImg.style.opacity = "1"; } catch (_) {}
    playingKind = null;
  };

  async function loadStreamFor(itemIdToPlay, hoverId, startSeconds = 0) {
    const introUrl = await getVideoStreamUrl(
      itemIdToPlay, 1920, 0, null, ["h264"], ["aac"], false, false, enableHls, { signal: abortController.signal }
    );
    if (!isMouseOver || hoverId !== latestHoverId) throw new Error('HoverAbortError');

    if (enableHls && typeof window.Hls !== "undefined" && window.Hls.isSupported() && introUrl && /\.m3u8(\?|$)/.test(introUrl)) {
      const hls = new window.Hls();
      videoElement.hls = hls;
      hls.loadSource(introUrl);
      hls.attachMedia(videoElement);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (!isMouseOver || hoverId !== latestHoverId) { destroyHlsIfAny(); return; }
        videoElement.currentTime = startSeconds;
        videoElement.play().then(() => { videoElement.style.opacity = "1"; }).catch(()=>{});
      });
      hls.on(window.Hls.Events.ERROR, (_e, data) => {
        console.error('HLS ERROR', data);
        if (data.fatal) fullCleanup();
      });
    } else {
      videoElement.src = introUrl;
      videoElement.load();
      const onMeta = () => {
        videoElement.removeEventListener('loadedmetadata', onMeta);
        if (!isMouseOver || hoverId !== latestHoverId) { fullCleanup(); return; }
        videoElement.currentTime = startSeconds;
        videoElement.play().then(() => { videoElement.style.opacity = "1"; }).catch(()=>{});
      };
      videoElement.addEventListener('loadedmetadata', onMeta, { once: true });
    }
  }

  async function tryPlayLocalTrailer(hoverId) {
    const locals = await fetchLocalTrailers(itemId, { signal: abortController.signal });
    if (!isMouseOver || hoverId !== latestHoverId) throw new Error('HoverAbortError');
    const best = pickBestLocalTrailer(locals);
    if (!best?.Id) return false;

    backdropImg.style.opacity = "0";
    hardStopIframe();
    videoContainer.style.display = "block";
    slide.classList.add("video-active", "intro-active");
    playingKind = 'localTrailer';
    await loadStreamFor(best.Id, hoverId, 0);
    return true;
  }

  async function tryPlayRemoteTrailer(hoverId) {
    const trailer = Array.isArray(RemoteTrailers) && RemoteTrailers.length ? RemoteTrailers[0] : null;
    if (!trailer?.Url) return false;

    const url = getYoutubeEmbedUrl(trailer.Url);
    if (!isValidUrl(url)) return false;

    backdropImg.style.opacity = "0";
    hardStopVideo();

    if (!ytIframe) {
      ytIframe = document.createElement("iframe");
      ytIframe.title = trailer.Name || 'Trailer';
      ytIframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      ytIframe.allowFullscreen = true;
      Object.assign(ytIframe.style, {
        width: "70%", height: "90%", border: "none", display: "none",
        position: "absolute", top: "0%", right: "0%"
      });
      slide.appendChild(ytIframe);
    }

    ytIframe.style.display = "block";
    ytIframe.src = url;
    slide.classList.add("trailer-active");
    playingKind = 'remoteTrailer';
    return true;
  }

  async function playMainVideo(hoverId) {
    backdropImg.style.opacity = "0";
    hardStopIframe();
    videoContainer.style.display = "block";
    slide.classList.add("video-active", "intro-active");
    playingKind = 'video';
    await loadStreamFor(itemId, hoverId, 600);
    return true;
  }

  const handleEnter = () => {
    isMouseOver = true;
    latestHoverId++;
    const thisHoverId = latestHoverId;
    abortController.abort();
    abortController = new AbortController();

    if (enterTimeout) { clearTimeout(enterTimeout); enterTimeout = null; }

    enterTimeout = setTimeout(async () => {
      if (!isMouseOver || thisHoverId !== latestHoverId) return;
    try {
      if (mode === 'video') {
        await playMainVideo(thisHoverId);
        return;
      }
      const localOk = await tryPlayLocalTrailer(thisHoverId);
      if (localOk) return;

      const remoteOk = await tryPlayRemoteTrailer(thisHoverId);
      if (remoteOk) return;

      if (mode === 'trailerThenVideo') {
        await playMainVideo(thisHoverId);
      } else {
        fullCleanup();
      }
    } catch (e) {
      if (e.name === 'AbortError' || e.message === 'HoverAbortError') return;
      console.error('Hover/play error:', e);
      fullCleanup();
    }
  }, delay);
  };

  const handleLeave = () => {
    isMouseOver = false;
    latestHoverId++;
    abortController.abort();
    abortController = new AbortController();
    if (enterTimeout) { clearTimeout(enterTimeout); enterTimeout = null; }
    fullCleanup();
  };

  function attachAutoCleanupGuards(slideEl) {
    const cleanups = [];

    const viewport =
      slideEl.closest('.swiper') ||
      slideEl.closest('.splide__track') ||
      slideEl.closest('.embla__viewport') ||
      slideEl.closest('.flickity-viewport') ||
      slideEl.closest('[data-slider-viewport]') || null;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === slideEl) {
            const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
            if (!visible) handleLeave();
          }
        }
      }, { root: viewport || null, threshold: [0, 0.5, 1] });
      io.observe(slideEl);
      cleanups.push(() => io.disconnect());
    }

    const mo = new MutationObserver(() => {
      if (!document.body.contains(slideEl)) {
        try { handleLeave(); } catch (_) {}
        cleanups.forEach(fn => { try { fn(); } catch(_){} });
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    cleanups.push(() => mo.disconnect());

    const onVis = () => { if (document.hidden) handleLeave(); };
    document.addEventListener('visibilitychange', onVis);
    cleanups.push(() => document.removeEventListener('visibilitychange', onVis));
    const onPageHide = () => handleLeave();
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    cleanups.push(() => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    });

    const swiperHost = slideEl.closest('.swiper');
    const swiperInst = swiperHost && swiperHost.swiper;
    if (swiperInst?.on && swiperInst?.off) {
      const onSwiperChange = () => handleLeave();
      swiperInst.on('slideChangeTransitionStart', onSwiperChange);
      swiperInst.on('slideChange', onSwiperChange);
      swiperInst.on('transitionStart', onSwiperChange);
      cleanups.push(() => {
        try { swiperInst.off('slideChangeTransitionStart', onSwiperChange); } catch(_) {}
        try { swiperInst.off('slideChange', onSwiperChange); } catch(_) {}
        try { swiperInst.off('transitionStart', onSwiperChange); } catch(_) {}
      });
    }

    const splideRoot = slideEl.closest('.splide');
    const splideInst = splideRoot && (splideRoot.__splide || window.splide);
    if (splideInst?.on && splideInst?.off) {
      const onMove = () => handleLeave();
      splideInst.on('move', onMove);
      splideInst.on('moved', onMove);
      cleanups.push(() => {
        try { splideInst.off('move', onMove); } catch(_) {}
        try { splideInst.off('moved', onMove); } catch(_) {}
      });
    }

    const flktyRoot = slideEl.closest('.flickity-enabled');
    const flktyInst = flktyRoot && flktyRoot.flickity;
    if (flktyInst?.on && flktyInst?.off) {
      const onChange = () => handleLeave();
      flktyInst.on('change', onChange);
      flktyInst.on('select', onChange);
      cleanups.push(() => {
        try { flktyInst.off('change', onChange); } catch(_) {}
        try { flktyInst.off('select', onChange); } catch(_) {}
      });
    }

    const emblaViewport = slideEl.closest('.embla__viewport');
    const emblaInst = emblaViewport && emblaViewport.__embla;
    if (emblaInst?.on) {
      const onSelect = () => handleLeave();
      const onReInit = () => handleLeave();
      emblaInst.on('select', onSelect);
      emblaInst.on('reInit', onReInit);
      cleanups.push(() => {
        try { emblaInst.off('select', onSelect); } catch(_) {}
        try { emblaInst.off('reInit', onReInit); } catch(_) {}
      });
    }
    return () => cleanups.forEach(fn => { try { fn(); } catch(_){} });
  }
  attachAutoCleanupGuards(slide);
  backdropImg.addEventListener("mouseenter", handleEnter);
  backdropImg.addEventListener("mouseleave", handleLeave);
}


export function prefetchImages(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return;

  window.addEventListener('load', () => {
    urls.forEach(url => {
      if (!url) return;
      if (document.querySelector(`link[rel="prefetch"][href="${url}"]`)) return;

      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }, { once: true });
}


export async function getHighResImageUrls(item, backdropIndex) {
  const itemId = item.Id;
  const imageTag = item.ImageTags?.Primary || '';
  const logoTag = item.ImageTags?.Logo || '';
  const pixelRatio = window.devicePixelRatio || 1;
  const logoHeight = Math.floor(720 * pixelRatio);
  const supportsWebP = document.createElement('canvas').toDataURL('image/webp').includes('webp');
  const formatParam = supportsWebP ? '&format=webp' : '';
  const index = backdropIndex !== undefined ? backdropIndex : '0';
  const backdropMaxWidth = (config.backdropMaxWidth || 1920) * pixelRatio;
  const backdropTag = item.ImageTags?.Backdrop?.[index] || '';
  const backdropUrl = `/Items/${itemId}/Images/Backdrop/${index}?tag=${backdropTag}&quality=100&maxWidth=${Math.floor(backdropMaxWidth)}${formatParam}`;
  const placeholderUrl = `/Items/${itemId}/Images/Primary?tag=${imageTag}&maxHeight=50&blur=15`;
  const logoUrl = `/Items/${itemId}/Images/Logo?tag=${logoTag}&quality=100&maxHeight=${logoHeight}${formatParam}`;

  return {
    backdropUrl,
    placeholderUrl,
    logoUrl
  };
}

export async function getHighestQualityBackdropIndex(itemId) {
  const config = getConfig();

  const minQualityWidth = config.minHighQualityWidth || 1920;
  const minPixelCount = config.minPixelCount || (1920 * 1080);
  const useSizeFilter = config.enableImageSizeFilter ?? false;
  const minImageSizeKB = config.minImageSizeKB || 800;
  const maxImageSizeKB = config.maxImageSizeKB || 1500;

  const itemDetails = await fetchItemDetails(itemId);
  const backdropTags = itemDetails.BackdropImageTags || [];
  const candidateIndexes = backdropTags.map((_, index) => String(index));
  const results = [];

  await Promise.all(candidateIndexes.map(async (index) => {
    const url = `/Items/${itemId}/Images/Backdrop/${index}`;
    try {
      const dimensions = await getImageDimensions(url);
      const sizeInBytes = await getImageSizeInBytes(url);
      const sizeInKB = sizeInBytes / 1024;
      const area = dimensions.width * dimensions.height;

      results.push({
        index,
        ...dimensions,
        area,
        sizeInKB,
        isHighQuality: dimensions.width >= minQualityWidth && area >= minPixelCount
      });
    } catch (error) {
      console.warn(`${index} indeksli arka plan görseli alınamadı:`, error.message);
    }
  }));

  if (results.length === 0) {
    console.warn("Hiçbir arka plan görseli elde edilemedi, varsayılan 0 indeksi kullanılıyor");
    return "0";
  }

  const withinRange = results.filter(img =>
    img.isHighQuality &&
    (!useSizeFilter || (img.sizeInKB >= minImageSizeKB && img.sizeInKB <= maxImageSizeKB))
  );

  let bestImage;
  if (withinRange.length > 0) {
    bestImage = withinRange.reduce((best, current) => current.area > best.area ? current : best);
  } else {
    const candidates = results.filter(img => img.isHighQuality);
    if (useSizeFilter && candidates.length > 0) {
      bestImage = candidates.reduce((closest, current) => {
        const currentDiff = Math.abs(current.sizeInKB - minImageSizeKB);
        const closestDiff = Math.abs(closest.sizeInKB - minImageSizeKB);
        return currentDiff < closestDiff ? current : closest;
      }, candidates[0]);
    } else {
      bestImage = candidates.reduce((best, current) =>
        current.area > best.area ? current : best, candidates[0]
      );
    }
  }

  console.log(
    `${bestImage.index} indeksli görsel seçildi, ` +
    `çözünürlük: ${bestImage.width}x${bestImage.height}, ` +
    `piksel sayısı: ${bestImage.area}, ` +
    `boyut: ${bestImage.sizeInKB.toFixed(1)} KB`
  );

  return bestImage.index;
}

async function getImageSizeInBytes(url) {
  const response = await fetch(url, { method: "HEAD" });
  const size = response.headers.get("Content-Length");
  if (!size) throw new Error("Görsel boyutu alınamadı");
  return parseInt(size, 10);
}
