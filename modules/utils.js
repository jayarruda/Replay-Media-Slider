export function getYoutubeEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes("youtube.com") && parsedUrl.searchParams.has("v")) {
      const videoId = parsedUrl.searchParams.get("v");
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (parsedUrl.hostname === "youtu.be") {
      const videoId = parsedUrl.pathname.slice(1);
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
  } catch (e) {
    console.error("URL parse hatası:", e);
  }
  return url;
}

export function getProviderUrl(provider, id, slug) {
  switch (provider) {
    case "Imdb":
      return `https://www.imdb.com/title/${id}/`;
    case "Tmdb":
      return `https://www.themoviedb.org/movie/${id}`;
    case "Tvdb":
      return `https://www.thetvdb.com/movies/${slug}`;
    default:
      return "#";
  }
}
