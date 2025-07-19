import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';

export function getConfig() {
  const defaultLanguage = getDefaultLanguage();
  return {
    customQueryString: localStorage.getItem('customQueryString') || 'IncludeItemTypes=Movie,Series&Recursive=true&hasOverview=true&imageTypes=Logo,Backdrop&sortBy=DateCreated&sortOrder=Descending',
    sortingKeywords: (() => {
      const raw = localStorage.getItem('sortingKeywords');
      try {
        return raw ? JSON.parse(raw) : ["DateCreated","PremiereDate","ProductionYear","Random"];
      } catch {
        return raw ? raw.split(',').map(k => k.trim()) : ["DateCreated","PremiereDate","ProductionYear","Random"];
      }
    })(),
    showLanguageInfo: localStorage.getItem('showLanguageInfo') !== 'false',
    balanceItemTypes: localStorage.getItem('balanceItemTypes') !== 'false',
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
    showActorAll: localStorage.getItem('showActorAll') === 'true',
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
    indexZeroSelection: localStorage.getItem('indexZeroSelection') !== 'false',
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
    favoriteBackgroundImageType: localStorage.getItem('favoriteBackgroundImageType') || 'favoriBgImage',
    playedBackgroundImageType: localStorage.getItem('playedBackgroundImageType') || 'playedBgImage',
    manualListIds: localStorage.getItem('manualListIds') || '',
    useManualList: localStorage.getItem('useManualList') === 'true',
    useListFile: localStorage.getItem('useListFile') === 'true',
    useRandomContent: localStorage.getItem('useRandomContent') !== 'false',
    fullscreenMode: localStorage.getItem('fullscreenMode') === 'true' ? true : false,
    listLimit: 20,
    historySize: 20,
    updateInterval: 300000,
    nextTracksSource: localStorage.getItem('nextTracksSource') || 'playlist',
    defaultLanguage,
    languageLabels: getLanguageLabels(defaultLanguage),
    sliderDuration: parseInt(localStorage.getItem('sliderDuration'), 10) || 15000,
    artistLimit: parseInt(localStorage.getItem('artistLimit'), 10) || 10,
    gecikmeSure: parseInt(localStorage.getItem('gecikmeSure'), 10) || 500,
    limit: parseInt(localStorage.getItem('limit'), 10) || 20,
    maxShufflingLimit: parseInt(localStorage.getItem('maxShufflingLimit'), 10) || 10000,
    excludeEpisodesFromPlaying: localStorage.getItem('excludeEpisodesFromPlaying') !== 'false',
    showPlaybackProgress: localStorage.getItem('showPlaybackProgress') !== 'false',
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
    nextTrack: parseInt(localStorage.getItem('nextTrack'), 10) || 100,
    topTrack: parseInt(localStorage.getItem('topTrack'), 10) || 30,
    aktifSure: parseInt(localStorage.getItem('aktifSure'), 10) || 5000,
    girisSure: parseInt(localStorage.getItem('girisSure'), 10) || 1000,
    homeSectionsTop: parseInt(localStorage.getItem('homeSectionsTop'), 10) || 0,
    dotPosterMode: localStorage.getItem('dotPosterMode') === 'true',
    shuffleSeedLimit: parseInt(localStorage.getItem('shuffleSeedLimit'), 10) || 1000,

    slideTop: parseInt(localStorage.getItem('slideTop'), 10) || 0,
    slideLeft: parseInt(localStorage.getItem('slideLeft'), 10) || 0,
    slideWidth: parseInt(localStorage.getItem('slideWidth'), 10) || 0,
    slideHeight: parseInt(localStorage.getItem('slideHeight'), 10) || 0,

    logoContainerTop: parseInt(localStorage.getItem('logoContainerTop'), 10) || 0,
    logoContainerLeft: parseInt(localStorage.getItem('logoContainerLeft'), 10) || 0,
    logoContainerWidth: parseInt(localStorage.getItem('logoContainerWidth'), 10) || 0,
    logoContainerHeight: parseInt(localStorage.getItem('logoContainerHeight'), 10) || 0,
    logoContainerDisplay: localStorage.getItem('logoContainerDisplay') || '',
    logoContainerFlexDirection: localStorage.getItem('logoContainerFlexDirection') || '',
    logoContainerJustifyContent: localStorage.getItem('logoContainerJustifyContent') || '',
    logoContainerAlignItems: localStorage.getItem('logoContainerAlignItems') || '',
    logoContainerFlexWrap: localStorage.getItem('logoContainerFlexWrap') || '',

    buttonContainerTop: parseInt(localStorage.getItem('buttonContainerTop'), 10) || 0,
    buttonContainerLeft: parseInt(localStorage.getItem('buttonContainerLeft'), 10) || 0,
    buttonContainerWidth: parseInt(localStorage.getItem('buttonContainerWidth'), 10) || 0,
    buttonContainerHeight: parseInt(localStorage.getItem('buttonContainerHeight'), 10) || 0,
    buttonContainerDisplay: localStorage.getItem('buttonContainerDisplay') || '',
    buttonContainerFlexDirection: localStorage.getItem('buttonContainerFlexDirection') || '',
    buttonContainerJustifyContent: localStorage.getItem('buttonContainerJustifyContent') || '',
    buttonContainerAlignItems: localStorage.getItem('buttonContainerAlignItems') || '',
    buttonContainerFlexWrap: localStorage.getItem('buttonContainerFlexWrap') || '',

    metaContainerTop: parseInt(localStorage.getItem('metaContainerTop'), 10) || 0,
    metaContainerLeft: parseInt(localStorage.getItem('metaContainerLeft'), 10) || 0,
    metaContainerWidth: parseInt(localStorage.getItem('metaContainerWidth'), 10) || 0,
    metaContainerHeight: parseInt(localStorage.getItem('metaContainerHeight'), 10) || 0,
    metaContainerDisplay: localStorage.getItem('metaContainerDisplay') || '',
    metaContainerFlexDirection: localStorage.getItem('metaContainerFlexDirection') || '',
    metaContainerJustifyContent: localStorage.getItem('metaContainerJustifyContent') || '',
    metaContainerAlignItems: localStorage.getItem('metaContainerAlignItems') || '',
    metaContainerFlexWrap: localStorage.getItem('metaContainerFlexWrap') || '',

    plotContainerTop: parseInt(localStorage.getItem('plotContainerTop'), 10) || 0,
    plotContainerLeft: parseInt(localStorage.getItem('plotContainerLeft'), 10) || 0,
    plotContainerWidth: parseInt(localStorage.getItem('plotContainerWidth'), 10) || 0,
    plotContainerHeight: parseInt(localStorage.getItem('plotContainerHeight'), 10) || 0,
    plotContainerDisplay: localStorage.getItem('plotContainerDisplay') || '',
    plotContainerFlexDirection: localStorage.getItem('plotContainerFlexDirection') || '',
    plotContainerJustifyContent: localStorage.getItem('plotContainerJustifyContent') || '',
    plotContainerAlignItems: localStorage.getItem('plotContainerAlignItems') || '',
    plotContainerFlexWrap: localStorage.getItem('plotContainerFlexWrap') || '',

    titleContainerTop: parseInt(localStorage.getItem('titleContainerTop'), 10) || 0,
    titleContainerLeft: parseInt(localStorage.getItem('titleContainerLeft'), 10) || 0,
    titleContainerWidth: parseInt(localStorage.getItem('titleContainerWidth'), 10) || 0,
    titleContainerHeight: parseInt(localStorage.getItem('titleContainerHeight'), 10) || 0,
    titleContainerDisplay: localStorage.getItem('titleContainerDisplay') || '',
    titleContainerFlexDirection: localStorage.getItem('titleContainerFlexDirection') || '',
    titleContainerJustifyContent: localStorage.getItem('titleContainerJustifyContent') || '',
    titleContainerAlignItems: localStorage.getItem('titleContainerAlignItems') || '',
    titleContainerFlexWrap: localStorage.getItem('titleContainerFlexWrap') || '',

    directorContainerTop: parseInt(localStorage.getItem('directorContainerTop'), 10) || 0,
    directorContainerLeft: parseInt(localStorage.getItem('directorContainerLeft'), 10) || 0,
    directorContainerWidth: parseInt(localStorage.getItem('directorContainerWidth'), 10) || 0,
    directorContainerHeight: parseInt(localStorage.getItem('directorContainerHeight'), 10) || 0,
    directorContainerDisplay: localStorage.getItem('directorContainerDisplay') || '',
    directorContainerFlexDirection: localStorage.getItem('directorContainerFlexDirection') || '',
    directorContainerJustifyContent: localStorage.getItem('directorContainerJustifyContent') || '',
    directorContainerAlignItems: localStorage.getItem('directorContainerAlignItems') || '',
    directorContainerFlexWrap: localStorage.getItem('directorContainerFlexWrap') || '',

    infoContainerTop: parseInt(localStorage.getItem('infoContainerTop'), 10) || 0,
    infoContainerLeft: parseInt(localStorage.getItem('infoContainerLeft'), 10) || 0,
    infoContainerWidth: parseInt(localStorage.getItem('infoContainerWidth'), 10) || 0,
    infoContainerHeight: parseInt(localStorage.getItem('infoContainerHeight'), 10) || 0,
    infoContainerDisplay: localStorage.getItem('infoContainerDisplay') || '',
    infoContainerFlexDirection: localStorage.getItem('infoContainerFlexDirection') || '',
    infoContainerJustifyContent: localStorage.getItem('infoContainerJustifyContent') || '',
    infoContainerAlignItems: localStorage.getItem('infoContainerAlignItems') || '',
    infoContainerFlexWrap: localStorage.getItem('infoContainerFlexWrap') || '',

    mainContainerTop: parseInt(localStorage.getItem('mainContainerTop'), 10) || 0,
    mainContainerLeft: parseInt(localStorage.getItem('mainContainerLeft'), 10) || 0,
    mainContainerWidth: parseInt(localStorage.getItem('mainContainerWidth'), 10) || 0,
    mainContainerHeight: parseInt(localStorage.getItem('mainContainerHeight'), 10) || 0,
    mainContainerDisplay: localStorage.getItem('mainContainerDisplay') || '',
    mainContainerFlexDirection: localStorage.getItem('mainContainerFlexDirection') || '',
    mainContainerJustifyContent: localStorage.getItem('mainContainerJustifyContent') || '',
    mainContainerAlignItems: localStorage.getItem('mainContainerAlignItems') || '',
    mainContainerFlexWrap: localStorage.getItem('mainContainerFlexWrap') || '',

    sliderContainerTop: parseInt(localStorage.getItem('sliderContainerTop'), 10) || 0,
    sliderContainerLeft: parseInt(localStorage.getItem('sliderContainerLeft'), 10) || 0,
    sliderContainerWidth: parseInt(localStorage.getItem('sliderContainerWidth'), 10) || 0,
    sliderContainerHeight: parseInt(localStorage.getItem('sliderContainerHeight'), 10) || 0,
    sliderContainerDisplay: localStorage.getItem('sliderContainerDisplay') || '',
    sliderContainerFlexDirection: localStorage.getItem('sliderContainerFlexDirection') || '',
    sliderContainerJustifyContent: localStorage.getItem('sliderContainerJustifyContent') || '',
    sliderContainerAlignItems: localStorage.getItem('sliderContainerAlignItems') || '',
    sliderContainerFlexWrap: localStorage.getItem('sliderContainerFlexWrap') || '',

    existingDotContainerTop: parseInt(localStorage.getItem('existingDotContainerTop'), 10) || 0,
    existingDotContainerLeft: parseInt(localStorage.getItem('existingDotContainerLeft'), 10) || 0,
    existingDotContainerWidth: parseInt(localStorage.getItem('existingDotContainerWidth'), 10) || 0,
    existingDotContainerHeight: parseInt(localStorage.getItem('existingDotContainerHeight'), 10) || 0,
    existingDotContainerDisplay: localStorage.getItem('existingDotContainerDisplay') || '',
    existingDotContainerFlexDirection: localStorage.getItem('existingDotContainerFlexDirection') || '',
    existingDotContainerJustifyContent: localStorage.getItem('existingDotContainerJustifyContent') || '',
    existingDotContainerAlignItems: localStorage.getItem('existingDotContainerAlignItems') || '',
    dotContainerFlexWrap: localStorage.getItem('existingDotContainerFlexWrap') || '',

    progressBarTop: parseInt(localStorage.getItem('progressBarTop'), 10) || 0,
    progressBarLeft: parseInt(localStorage.getItem('progressBarLeft'), 10) || 0,
    progressBarWidth: parseInt(localStorage.getItem('progressBarWidth'), 10) || 100,
    progressBarHeight: parseInt(localStorage.getItem('progressBarHeight'), 10) || 0,

    providerContainerTop: parseInt(localStorage.getItem('providerContainerTop'), 10) || 0,
    providerContainerLeft: parseInt(localStorage.getItem('providerContainerLeft'), 10) || 0,
    providerContainerWidth: parseInt(localStorage.getItem('providerContainerWidth'), 10) || 0,
    providerContainerHeight: parseInt(localStorage.getItem('providerContainerHeight'), 10) || 0,
    providerContainerDisplay: localStorage.getItem('providerContainerDisplay') || '',
    providerContainerFlexDirection: localStorage.getItem('providerContainerFlexDirection') || '',
    providerContainerJustifyContent: localStorage.getItem('providerContainerJustifyContent') || '',
    providerContainerAlignItems: localStorage.getItem('providerContainerAlignItems') || '',
    providerContainerFlexWrap: localStorage.getItem('providerContainerFlexWrap') || '',

    providericonsContainerTop: parseInt(localStorage.getItem('providericonsContainerTop'), 10) || 0,
    providericonsContainerLeft: parseInt(localStorage.getItem('providericonsContainerLeft'), 10) || 0,
    providericonsContainerWidth: parseInt(localStorage.getItem('providericonsContainerWidth'), 10) || 0,
    providericonsContainerHeight: parseInt(localStorage.getItem('providericonsContainerHeight'), 10) || 0,
    providericonsContainerDisplay: localStorage.getItem('providericonsContainerDisplay') || '',
    providericonsContainerFlexDirection: localStorage.getItem('providericonsContainerFlexDirection') || '',
    providericonsContainerJustifyContent: localStorage.getItem('providericonsContainerJustifyContent') || '',
    providericonsContainerAlignItems: localStorage.getItem('providericonsContainerAlignItems') || '',
    providericonsContainerFlexWrap: localStorage.getItem('providericonsContainerFlexWrap') || '',

    statusContainerTop: parseInt(localStorage.getItem('statusContainerTop'), 10) || 0,
    statusContainerLeft: parseInt(localStorage.getItem('statusContainerLeft'), 10) || 0,
    statusContainerWidth: parseInt(localStorage.getItem('statusContainerWidth'), 10) || 0,
    statusContainerHeight: parseInt(localStorage.getItem('statusContainerHeight'), 10) || 0,
    statusContainerDisplay: localStorage.getItem('statusContainerDisplay') || '',
    statusContainerFlexDirection: localStorage.getItem('statusContainerFlexDirection') || '',
    statusContainerJustifyContent: localStorage.getItem('statusContainerJustifyContent') || '',
    statusContainerAlignItems: localStorage.getItem('statusContainerAlignItems') || '',
    statusContainerFlexWrap: localStorage.getItem('statusContainerFlexWrap') || '',

    ratingContainerTop: parseInt(localStorage.getItem('ratingContainerTop'), 10) || 0,
    ratingContainerLeft: parseInt(localStorage.getItem('ratingContainerLeft'), 10) || 0,
    ratingContainerWidth: parseInt(localStorage.getItem('ratingContainerWidth'), 10) || 0,
    ratingContainerHeight: parseInt(localStorage.getItem('ratingContainerHeight'), 10) || 0,
    ratingContainerDisplay: localStorage.getItem('ratingContainerDisplay') || '',
    ratingContainerFlexDirection: localStorage.getItem('ratingContainerFlexDirection') || '',
    ratingContainerJustifyContent: localStorage.getItem('ratingContainerJustifyContent') || '',
    ratingContainerAlignItems: localStorage.getItem('ratingContainerAlignItems') || '',
    ratingContainerFlexWrap: localStorage.getItem('ratingContainerFlexWrap') || '',

    pauseOverlay: {
    enabled: localStorage.getItem('pauseOverlay') === 'true',
    imagePreference: localStorage.getItem('pauseOverlayImagePreference') || 'auto',
    showPlot: localStorage.getItem('pauseOverlayShowPlot') !== 'false',
    showMetadata: localStorage.getItem('pauseOverlayShowMetadata') !== 'false',
    showLogo: localStorage.getItem('pauseOverlayShowLogo') !== 'false',
    showBackdrop: localStorage.getItem('pauseOverlayShowBackdrop') !== 'false',
},

    slideTransitionType: localStorage.getItem('slideTransitionType') || 'flip',
    dotPosterTransitionType: localStorage.getItem('dotPosterTransitionType') || 'scale',
    enableSlideAnimations: localStorage.getItem('enableSlideAnimations') !== 'false',
    enableDotPosterAnimations: localStorage.getItem('enableDotPosterAnimations') !== 'false',
    slideAnimationDuration: parseInt(localStorage.getItem('slideAnimationDuration'), 10) || 800,
    dotPosterAnimationDuration: parseInt(localStorage.getItem('dotPosterAnimationDuration'), 10) || 500,

    notificationsEnabled: localStorage.getItem('notificationsEnabled') !== 'false',
    useAlbumArtAsBackground: localStorage.getItem('useAlbumArtAsBackground') === 'true',
    buttonBackgroundBlur: (() => {
      const v = localStorage.getItem('buttonBackgroundBlur');
      return v !== null ? parseInt(v, 10) : 5;
    })(),
    buttonBackgroundOpacity: (() => {
    const v = localStorage.getItem('buttonBackgroundOpacity');
    return v !== null ? parseFloat(v) : 0.5;
})(),
    albumArtBackgroundBlur: (() => {
      const v = localStorage.getItem('albumArtBackgroundBlur');
      return v !== null ? parseInt(v, 10) : 5;
    })(),
    albumArtBackgroundOpacity: (() => {
      const v = localStorage.getItem('albumArtBackgroundOpacity');
      return v !== null ? parseFloat(v) : 0.5;
    })(),
    dotBackgroundBlur: (() => {
      const v = localStorage.getItem('dotBackgroundBlur');
      return v !== null ? parseInt(v, 10) : 5;
    })(),
    dotBackgroundOpacity: (() => {
    const v = localStorage.getItem('dotBackgroundOpacity');
    return v !== null ? parseFloat(v) : 0.5;
})(),
      playingLimit: (() => {
      const v = localStorage.getItem('playingLimit');
      return v !== null ? parseInt(v, 10) : 0;
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
    minHighQualityWidth: parseInt(localStorage.getItem("minHighQualityWidth"), 10) || 1920,
    backdropMaxWidth: parseInt(localStorage.getItem("backdropMaxWidth"), 10) || 1920,
    minPixelCount: parseInt(localStorage.getItem("minPixelCount"), 10) || (1920 * 1080),
    cssVariant: localStorage.getItem('cssVariant') || 'normalslider',
    enableImageSizeFilter: localStorage.getItem("enableImageSizeFilter") === "true",
    minImageSizeKB: parseInt(localStorage.getItem("minImageSizeKB"), 10) || 800,
    maxImageSizeKB: parseInt(localStorage.getItem("maxImageSizeKB"), 10) || 1500,
  };
}

export function getServerAddress() {
  return (
    window.serverConfig?.address ||
    sessionStorage.getItem('serverAddress') ||
    ''
  );
}
