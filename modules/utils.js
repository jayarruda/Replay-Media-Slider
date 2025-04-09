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
