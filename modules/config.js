import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';
export function getConfig() {
  const defaultLanguage = getDefaultLanguage();
  return {
    customQueryString: localStorage.getItem('customQueryString') || 'IncludeItemTypes=Movie,Series&Recursive=true&hasOverview=true&imageTypes=Logo,Backdrop',
    showLanguageInfo: localStorage.getItem('showLanguageInfo') !== 'false',
    showRatingInfo: localStorage.getItem('showRatingInfo') !== 'false',
    showProviderInfo: localStorage.getItem('showProviderInfo') !== 'false',
    showDotNavigation: localStorage.getItem('showDotNavigation') !== 'false',
    showSettingsLink: localStorage.getItem("showSettingsLink") !== "false",
    showLogoOrTitle: localStorage.getItem('showLogoOrTitle') !== 'false',
    showTitleOnly: localStorage.getItem('showTitleOnly') !== 'false',
    showCommunityRating: localStorage.getItem('showCommunityRating') !== 'false',
    showCriticRating: localStorage.getItem('showCriticRating') !== 'false',
    showOfficialRating: localStorage.getItem('showOfficialRating') !== 'false',
    showStatusInfo: localStorage.getItem('showStatusInfo') !== 'false',
    showTypeInfo: localStorage.getItem('showTypeInfo') !== 'false',
    showWatchedInfo: localStorage.getItem('showWatchedInfo') !== 'false',
    showRuntimeInfo: localStorage.getItem('showRuntimeInfo') !== 'false',
    showQualityInfo: localStorage.getItem('showQualityInfo') !== 'false',
    showProgressBar: localStorage.getItem('showProgressBar') !== 'false',
    showQualityDetail: localStorage.getItem('showQualityDetail') !== 'false',
    showActorInfo: localStorage.getItem('showActorInfo') !== 'false',
    showDescriptions: localStorage.getItem('showDescriptions') !== 'false',
    showPlotInfo: localStorage.getItem('showPlotInfo') !== 'false',
    showbPlotInfo: localStorage.getItem('showbPlotInfo') !== 'false',
    showSloganInfo: localStorage.getItem('showSloganInfo') !== 'false',
    showTitleInfo: localStorage.getItem('showTitleInfo') !== 'false',
    showOriginalTitleInfo: localStorage.getItem('showOriginalTitleInfo') !== 'false',
    showDirectorWriter: localStorage.getItem("showDirectorWriter") !== "false",
    showDirector: localStorage.getItem("showDirector") !== "false",
    showWriter: localStorage.getItem("showWriter") !== "false",
    showInfo: localStorage.getItem("showInfo") !== "false",
    showGenresInfo: localStorage.getItem("showGenresInfo") !== "false",
    showYearInfo: localStorage.getItem("showYearInfo") !== "false",
    showCountryInfo: localStorage.getItem("showCountryInfo") !== "false",
    showTrailerButton: localStorage.getItem('showTrailerButton') !== 'false',
    showWatchButton: localStorage.getItem('showWatchButton') !== 'false',
    manualBackdropSelection: localStorage.getItem('manualBackdropSelection') === 'true',
    showFavoriteButton: localStorage.getItem('showFavoriteButton') !== 'false',
    hideOriginalTitleIfSame: localStorage.getItem('hideOriginalTitleIfSame') === 'true',
    gradientOverlayImageType: localStorage.getItem('gradientOverlayImageType') || 'backdropUrl',
    backdropImageType: localStorage.getItem('backdropImageType') || 'backdropUrl',
    enableTrailerPlayback: localStorage.getItem('enableTrailerPlayback') !== 'false',
    dotBackgroundImageType: localStorage.getItem('dotBackgroundImageType') || 'none',
    trailerBackgroundImageType: localStorage.getItem('trailerBackgroundImageType') || 'trailerBgImage',
    watchBackgroundImageType: localStorage.getItem('watchBackgroundImageType') || 'watchBgImage',
    favoriBackgroundImageType: localStorage.getItem('favoriBackgroundImageType') || 'watchBgImage',
    useListFile: localStorage.getItem('useListFile') !== 'false',
    listcustomQueryString: "IncludeItemTypes=Movie,Series&Recursive=true&hasOverview=true&imageTypes=Logo,Backdrop",
    listLimit: 20,
    historySize: 20,
    updateInterval: 300000,
    progressBarWidth: localStorage.getItem('progressBarWidth') || "100%",
    defaultLanguage,
    languageLabels: getLanguageLabels(defaultLanguage),
    sliderDuration: parseInt(localStorage.getItem('sliderDuration'), 10) || 15000,
    limit: parseInt(localStorage.getItem('limit'), 10) || 20,
    allowedWriters: (() => {
      const defaultWriters = [
        "quentin tarantino",
        "nuri bilge ceylan",
        "zeki demirkubuz",
        "yavuz turgul",
        "stephen king",
        "martin scorsese",
        "j.r.r. tolkien",
        "andrew kevin walker",
        "christopher nolan",
        "thomas harris"
      ];
      let storedWriters = [];
      try {
        const stored = localStorage.getItem('allowedWriters');
        storedWriters = stored ? JSON.parse(stored) : [];
      } catch (e) {
        storedWriters = [];
      }
      return [...new Set([...defaultWriters, ...storedWriters])];
    })(),
    minHighQualityWidth: parseInt(localStorage.getItem('minHighQualityWidth'), 10) || 1920,
  };
}
