import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';
export function getConfig() {
  const defaultLanguage = getDefaultLanguage();
  const DEFAULT_QUERY = 'IncludeItemTypes=Movie,Series&Recursive=true&hasOverview=true&imageTypes=Logo,Backdrop&sortBy=DateCreated&sortOrder=Descending';

  return {
    customQueryString: (() => {
      const raw = localStorage.getItem('customQueryString');
      return raw && raw.trim().length > 0 ? raw : DEFAULT_QUERY;
    })(),
    sortingKeywords: (() => {
      const raw = localStorage.getItem('sortingKeywords');
      try {
        return raw ? JSON.parse(raw) : ["DateCreated","PremiereDate","ProductionYear","Random"];
      } catch {
        return raw ? raw.split(',').map(k => k.trim()) : ["DateCreated","PremiereDate","ProductionYear","Random"];
      }
    })(),
    showLanguageInfo: localStorage.getItem('showLanguageInfo') !== 'false',
    showRatingInfo: localStorage.getItem('showRatingInfo') !== 'false',
    showProviderInfo: localStorage.getItem('showProviderInfo') !== 'false',
    showDotNavigation: localStorage.getItem('showDotNavigation') !== 'false',
    showSettingsLink: localStorage.getItem("showSettingsLink") !== "false",
    showMusicIcon: localStorage.getItem("showMusicIcon") !== "false",
    showLogoOrTitle: localStorage.getItem('showLogoOrTitle') !== 'false',
    showTitleOnly: localStorage.getItem('showTitleOnly') !== 'false',
    showDiscOnly: localStorage.getItem('showDiscOnly') !== 'false',
    displayOrder: localStorage.getItem('displayOrder') || 'logo,disk,originalTitle',
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
    showActorImg: localStorage.getItem('showActorImg') !== 'false',
    showActorRole: localStorage.getItem('showActorRole') !== 'false',
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
    showTrailerIcon: localStorage.getItem('showTrailerIcon') !== 'false',
    showWatchButton: localStorage.getItem('showWatchButton') !== 'false',
    manualBackdropSelection: localStorage.getItem('manualBackdropSelection') === 'true',
    showFavoriteButton: localStorage.getItem('showFavoriteButton') !== 'false',
    showPlayedButton: localStorage.getItem('showPlayedButton') !== 'false',
    showCast: localStorage.getItem('showCast') !== 'false',
    detailUrl: localStorage.getItem('detailUrl') !== 'false',
    hideOriginalTitleIfSame: localStorage.getItem('hideOriginalTitleIfSame') === 'true',
    gradientOverlayImageType: localStorage.getItem('gradientOverlayImageType') || 'backdropUrl',
    backdropImageType: localStorage.getItem('backdropImageType') || 'backdropUrl',
    enableTrailerPlayback: localStorage.getItem('enableTrailerPlayback') !== 'false',
    dotBackgroundImageType: localStorage.getItem('dotBackgroundImageType') || 'none',
    trailerBackgroundImageType: localStorage.getItem('trailerBackgroundImageType') || 'trailerBgImage',
    watchBackgroundImageType: localStorage.getItem('watchBackgroundImageType') || 'watchBgImage',
    favoriBackgroundImageType: localStorage.getItem('favoriBackgroundImageType') || 'favoriBgImage',
    playedBackgroundImageType: localStorage.getItem('playedBackgroundImageType') || 'playedBgImage',
    manualListIds: localStorage.getItem('manualListIds') || '',
    useManualList: localStorage.getItem('useManualList') === 'true',
    useListFile: localStorage.getItem('useListFile') === 'true',
    useRandomContent: localStorage.getItem('useRandomContent') !== 'false',
    listLimit: 20,
    historySize: 20,
    updateInterval: 300000,
    progressBarWidth: parseInt(localStorage.getItem('progressBarWidth'), 10) || 100,
    defaultLanguage,
    languageLabels: getLanguageLabels(defaultLanguage),
    sliderDuration: parseInt(localStorage.getItem('sliderDuration'), 10) || 15000,
    artistLimit: parseInt(localStorage.getItem('artistLimit'), 10) || 10,
    gecikmeSure: parseInt(localStorage.getItem('gecikmeSure'), 10) || 500,
    limit: parseInt(localStorage.getItem('limit'), 10) || 20,
    muziklimit: parseInt(localStorage.getItem('muziklimit'), 10) || 30,
    albumlimit: parseInt(localStorage.getItem('albumlimit'), 10) || 20,
    sarkilimit: parseInt(localStorage.getItem('sarkilimit'), 10) || 200,
    gruplimit: parseInt(localStorage.getItem('gruplimit'), 10) || 100,
    id3limit: parseInt(localStorage.getItem('id3limit'), 10) || 5,
    historylimit: parseInt(localStorage.getItem('historylimit'), 10) || 10,
    playerTheme: localStorage.getItem('playerTheme') || 'dark',
    playerStyle: localStorage.getItem('playerStyle') || 'player',
    dateLocale: localStorage.getItem('dateLocale') || 'tr-TR',
    maxExcludeIdsForUri: parseInt(localStorage.getItem('maxExcludeIdsForUri'), 10) || 100,
    nextTrack: parseInt(localStorage.getItem('nextTrack'), 10) || 30,
    notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false',
    useAlbumArtAsBackground: localStorage.getItem('useAlbumArtAsBackground') === 'true',
    albumArtBackgroundBlur: (() => {
      const v = localStorage.getItem('albumArtBackgroundBlur');
      return v !== null ? parseInt(v, 10) : 10;
    })(),
    albumArtBackgroundOpacity: (() => {
      const v = localStorage.getItem('albumArtBackgroundOpacity');
      return v !== null ? parseFloat(v) : 0.5;
    })(),
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
        "cem yılmaz",
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
    cssVariant: localStorage.getItem('cssVariant') || 'normalslider'
  };
}
