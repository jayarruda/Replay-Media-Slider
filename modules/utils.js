import { getConfig } from "./config.js";
import { fetchItemDetails, getImageDimensions } from "./api.js";

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

export function prefetchImages(urls) {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
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

