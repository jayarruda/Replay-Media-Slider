import { getConfig } from "./config.js";

const config = getConfig();

export function getYoutubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return url;

  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);

    if (parsedUrl.hostname.replace('www.', '').includes('youtube.com')) {
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`;
      }
    }

    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.split('/').filter(Boolean)[0] || '';
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`;
      }
    }
  } catch (e) {
    console.error('YouTube URL dönüştürme hatası:', e);
  }
  return url;
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

export function createTrailerIframe({ config, RemoteTrailers, slide, backdropImg }) {
  if (!config.enableTrailerPlayback || !RemoteTrailers?.length) return;

  const trailer = RemoteTrailers[0];
  const trailerUrl = getYoutubeEmbedUrl(trailer.Url);
  if (!isValidUrl(trailerUrl)) return;

  const trailerIframe = document.createElement("iframe");
  trailerIframe.title = trailer.Name;
  trailerIframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  trailerIframe.allowFullscreen = true;

  Object.assign(trailerIframe.style, {
    width: "70%",
    height: "90%",
    border: "none",
    display: "none",
    position: "absolute",
    top: "0%",
    right: "0%"
  });

  slide.appendChild(trailerIframe);

  let trailerPlaying = false;
  let enterTimeout = null;

  const handleMouseEnter = debounce(() => {
    backdropImg.style.opacity = "0";
    trailerIframe.style.display = "block";
    trailerIframe.src = trailerUrl;
    slide.classList.add("trailer-active");
    trailerPlaying = true;
  }, 0);

  const handleMouseLeave = () => {
    if (enterTimeout) {
      clearTimeout(enterTimeout);
      enterTimeout = null;
    }
    if (trailerPlaying) {
      trailerIframe.style.display = "none";
      trailerIframe.src = "";
      backdropImg.style.opacity = "1";
      slide.classList.remove("trailer-active");
      trailerPlaying = false;
    }
  };

  backdropImg.addEventListener("mouseenter", () => {
    enterTimeout = setTimeout(handleMouseEnter, config.gecikmeSure || 500);
  });

  backdropImg.addEventListener("mouseleave", handleMouseLeave);

  slide.addEventListener("slideChange", handleMouseLeave);
}

export function getHighResImageUrls(item) {
  const itemId = item.Id;
  const imageTag = item.ImageTags?.Primary || '';
  const backdropTag = item.ImageTags?.Backdrop?.[0] || '';
  const logoTag = item.ImageTags?.Logo || '';
  const pixelRatio = window.devicePixelRatio || 1;
  const logoHeight = Math.floor(720 * pixelRatio);
  const backdropWidth = Math.floor((config.backdropMaxWidth || 1920) * pixelRatio);
  const supportsWebP = document.createElement('canvas').toDataURL('image/webp').includes('webp');
  const formatParam = supportsWebP ? '&format=webp' : '';

  return {
    logoUrl: `/Items/${itemId}/Images/Logo?tag=${logoTag}&quality=100&maxHeight=${logoHeight}${formatParam}`,
    backdropUrl: `/Items/${itemId}/Images/Backdrop/0?tag=${backdropTag}&quality=100&maxWidth=${backdropWidth}${formatParam}`,
    placeholderUrl: `/Items/${itemId}/Images/Primary?tag=${imageTag}&maxHeight=50&blur=10`
  };
}
