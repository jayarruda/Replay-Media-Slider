import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';
const labels = getLanguageLabels(getDefaultLanguage());
const getEl = id => document.getElementById(id);
const languageCheckbox = getEl('languageInfoCheckbox');
const showLogoOrTitleCheckbox = getEl("showLogoOrTitleCheckbox");
const showTitleOnlyCheckbox = getEl("showTitleOnlyCheckbox");
const showDiscOnlyCheckbox = getEl("showDiscOnlyCheckbox");
const ratingCheckbox = getEl('ratingInfoCheckbox');
const progressCheckbox = getEl('progressBarCheckbox');
const providerCheckbox = getEl("providerCheckbox");
const dotNavigationCheckbox = getEl("dotNavigationCheckbox");
const showSettingsLinkCheckbox = getEl("showSettingsLinkCheckbox");
const settingsLinkContainer = getEl("settingsLinkContainer");
const showStatusInfoCheckbox = getEl("showStatusInfoCheckbox");
const statusSubOptions = getEl("statusSubOptions");
const qualitDetailSubOptions = getEl("qualitDetailSubOptions");
const ratingSubOptions = getEl("ratingSubOptions");
const descriptionsCheckbox = getEl("showDescriptionsCheckbox");
const descriptionsSubOptions = getEl("descriptionsSubOptions");
const sliderDurationInput = getEl("sliderDurationInput");
const artistLimitInput = getEl("artistLimitInput");
const showActorInfoCheckbox = getEl("showActorInfoCheckbox");
const showTitleOnlyLabel = getEl("showTitleOnlyLabel");
const showDiscOnlyLabel = getEl("showDiscOnlyLabel");
const showPlotOnlyLabel = getEl("showPlotOnlyLabel");
const hideOriginalTitleIfSameCheckbox = getEl("hideOriginalTitleIfSameCheckbox");
const gradientOverlayImageTypeSelect = getEl("gradientOverlayImageTypeSelect");
const backdropImageTypeSelect = getEl("backdropImageTypeSelect");
const dotBackgroundImageTypeSelect = getEl("dotBackgroundImageTypeSelect");
const trailerBackgroundImageTypeSelect = getEl("trailerBackgroundImageTypeSelect");
const watchBackgroundImageTypeSelect = getEl("watchBackgroundImageTypeSelect");
const favoriBackgroundImageTypeSelect = getEl("favoriBackgroundImageTypeSelect");
const defaultLanguageSelect = getEl('defaultLanguageSelect');
const limitInput = getEl("limitInput");
const plotInfoCheckbox = getEl("showPlotInfoCheckbox");
const minHighQualityWidthInput = getEl("minHighQualityWidthInput");
const manualBackdropSelectionCheckbox = getEl("manualBackdropSelectionCheckbox");
const enableTrailerPlaybackCheckbox = getEl("enableTrailerPlaybackCheckbox");
const showDirectorWriterCheckbox = getEl("showDirectorWriterCheckbox");
const directorWriterSubOptions = getEl("directorWriterSubOptions");
const showDirectorCheckbox = getEl("showDirectorCheckbox");
const showWriterCheckbox = getEl("showWriterCheckbox");
const showInfoCheckbox = getEl("showInfoCheckbox");
const infoSubOptions = getEl("infoSubOptions");
const showGenresInfoCheckbox = getEl("showGenresInfoCheckbox");
const showYearInfoCheckbox = getEl("showYearInfoCheckbox");
const showCountryInfoCheckbox = getEl("showCountryInfoCheckbox");
const showTrailerButtonCheckbox = getEl("showTrailerButtonCheckbox");
const showWatchButtonCheckbox = getEl("showWatchButtonCheckbox");
const customQueryStringInput = getEl('customQueryStringInput');
const showFavoriteButtonCheckbox = getEl("showFavoriteButtonCheckbox");
const useListFileCheckbox = getEl('useListFileCheckbox');
const useManualListCheckbox = getEl('useManualListCheckbox');
const manualListIdsInput = getEl('manualListIdsInput');
const manualListIdsContainer = getEl('manualListIdsContainer');
const progressBarWidthInput = getEl("progressBarWidthInput");
const sortingKeywordsInput = getEl('sortingKeywordsInput');
const themeRadios = document.querySelectorAll('input[name="theme"]');
const allowedWritersInput = getEl('allowedWritersInput');
const progressBarWidth = localStorage.getItem("progressBarWidth") || "100%";
progressBarWidthInput.value = parseInt(progressBarWidth);
const cssVariantSelect = getEl('cssVariantSelect');

const savedTheme = localStorage.getItem('theme') || 'light';
document.querySelector(`input[name="theme"][value="${savedTheme}"]`).checked = true;
document.body.className = savedTheme + '-theme';
themeRadios.forEach(radio => {
  radio.addEventListener('change', function () {
    const selectedTheme = this.value;
    document.body.className = selectedTheme + '-theme';
    localStorage.setItem('theme', selectedTheme);
  });
});

function updateGroup(parentCheckbox, container) {
  container.style.display = "block";
  const subCheckboxes = container.querySelectorAll('input[type="checkbox"]');
  if (parentCheckbox.checked) {
    subCheckboxes.forEach(cb => (cb.disabled = false));
  } else {
    subCheckboxes.forEach(cb => {
      cb.disabled = true;
      cb.checked = false;
    });
  }
}

function initSettingsBackgroundSlider() {
  const settingsSlider = getEl('settingsBackgroundSlider');
  if (!settingsSlider) return;

  settingsSlider.innerHTML = '';
  settingsSlider.style.backgroundImage = '';
  settingsSlider.style.zIndex = '0';

  const validBackdropUrls = (JSON.parse(localStorage.getItem('backdropUrls')) || [])
    .filter(url => url && typeof url === 'string' && url.trim() && !url.endsWith('/null'));

  if (!validBackdropUrls.length) {
    settingsSlider.style.backgroundImage = 'linear-gradient(to right, #434343 0%, black 100%)';
    return;
  }

  const shuffleArray = array => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const shuffledUrls = validBackdropUrls.length > 1 ? shuffleArray(validBackdropUrls) : validBackdropUrls;
  shuffledUrls.forEach(url => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.setAttribute('data-bg', url);
    slide.addEventListener('error', function () {
      this.style.display = 'none';
    });
    if (Math.random() > 0.2) slide.classList.add('micro-move');
    settingsSlider.appendChild(slide);
  });

  const loadSlideImage = slide => {
    if (!slide.style.backgroundImage) {
      const url = slide.getAttribute('data-bg');
      slide.style.backgroundImage = `url('${url}')`;
    }
  };

  const slides = settingsSlider.querySelectorAll('.slide');
  if (slides.length) {
    let currentIndex = 0, previousIndex = -1, previousPreviousIndex = -1;
    loadSlideImage(slides[0]);
    slides[0].offsetHeight;
    slides[0].classList.add('active');

    const fadeDuration = 1000;
    const changeSlide = () => {
      slides[currentIndex].classList.remove('active');
      let nextIndex, attempts = 0, maxAttempts = slides.length * 3;
      do {
        nextIndex = Math.floor(Math.random() * slides.length);
        attempts++;
        if (attempts > maxAttempts) {
          nextIndex = (currentIndex + 1) % slides.length;
          break;
        }
      } while (
        (nextIndex === currentIndex && slides.length > 1) ||
        (nextIndex === previousIndex && slides.length > 2) ||
        (nextIndex === previousPreviousIndex && slides.length > 3)
      );
      previousPreviousIndex = previousIndex;
      previousIndex = currentIndex;
      currentIndex = nextIndex;

      loadSlideImage(slides[currentIndex]);
      slides[currentIndex].classList.add('active');
      loadSlideImage(slides[(currentIndex + 1) % slides.length]);
      let delay = parseInt(sliderDurationInput.value) || 8000;
      slideTimer = setTimeout(changeSlide, delay);
    };

    let delay = parseInt(sliderDurationInput.value) || 8000;
    let slideTimer = setTimeout(changeSlide, delay - fadeDuration);
    window.addEventListener('beforeunload', () => clearTimeout(slideTimer));
  }
}

function updateTitleOnlyVisibility() {
  if (showLogoOrTitleCheckbox.checked) {
    showTitleOnlyLabel.style.display = "none";
    showTitleOnlyCheckbox.disabled = true;
    showTitleOnlyCheckbox.checked = false;
    showDiscOnlyLabel.style.display = "none";
    showDiscOnlyCheckbox.disabled = true;
    showDiscOnlyCheckbox.checked = false;
  } else {
    showTitleOnlyLabel.style.display = "block";
    showTitleOnlyCheckbox.disabled = false;
    showDiscOnlyLabel.style.display = "block";
    showDiscOnlyCheckbox.disabled = false;

    if (showTitleOnlyCheckbox.checked) {
      showDiscOnlyCheckbox.checked = false;
    }
    if (showDiscOnlyCheckbox.checked) {
      showTitleOnlyCheckbox.checked = false;
    }
  }
}

function setupBackButton() {
  const backButton = document.createElement('button');
  backButton.id = 'backButton';
  backButton.className = 'back-button';
  backButton.innerHTML = '<i class="fas fa-arrow-left"></i> ' + (labels.backButton || '');

  const footer = document.querySelector('.settings-footer');
  if (footer) {
    footer.insertBefore(backButton, footer.firstChild);
  }

  backButton.addEventListener('click', handleBackAction);

  document.addEventListener('backbutton', handleBackAction, false);
}

function handleBackAction() {
  const modal = document.getElementById('settingsSavedModal');
  if (modal && modal.style.display === 'flex') {
    modal.style.display = 'none';
    return;
  }

  if (window.Jellyfin && window.Jellyfin.App) {
    window.Jellyfin.App.back();
  }
  else if (window.NativeShell && window.NativeShell.goBack) {
    window.NativeShell.goBack();
  }
  else {
    window.history.back();
  }
}
function addBackButtonStyles() {
  const style = document.createElement('style');
  document.head.appendChild(style);
}


function updatePlotOnlyVisibility() {
  const showbPlotInfoCheckbox = getEl("showbPlotInfoCheckbox");
  if (plotInfoCheckbox.checked) {
    showPlotOnlyLabel.style.display = "block";
    showbPlotInfoCheckbox.disabled = false;
  } else {
    showPlotOnlyLabel.style.display = "none";
    showbPlotInfoCheckbox.disabled = true;
    showbPlotInfoCheckbox.checked = false;
  }
}

function updateQualityDetailOnlyVisibility() {
  const showQualityInfoCheckbox = getEl("showQualityInfoCheckbox");
  const showQualityDetailCheckbox = getEl("showQualityDetailCheckbox");
  if (showQualityInfoCheckbox.checked) {
    qualitDetailSubOptions.style.display = "block";
    showQualityDetailCheckbox.disabled = false;
  } else {
    qualitDetailSubOptions.style.display = "none";
    showQualityDetailCheckbox.disabled = true;
    showQualityDetailCheckbox.checked = false;
  }
}

function updateProviderSettingsVisibility() {
  showSettingsLinkCheckbox.disabled = false;
  settingsLinkContainer.style.display = "block";
}

cssVariantSelect.addEventListener('change', function() {
    localStorage.setItem('cssVariant', this.value);
  });


manualBackdropSelectionCheckbox.addEventListener("change", () => {
  backdropImageTypeSelect.disabled = !manualBackdropSelectionCheckbox.checked;
  minHighQualityWidthInput.disabled = manualBackdropSelectionCheckbox.checked;
});
progressCheckbox.addEventListener("change", () => {
  progressBarWidthInput.disabled = !progressCheckbox.checked;
});
dotNavigationCheckbox.addEventListener("change", () => {
  dotBackgroundImageTypeSelect.disabled = !dotNavigationCheckbox.checked;
});
showTrailerButtonCheckbox.addEventListener("change", () => {
  trailerBackgroundImageTypeSelect.disabled = !showTrailerButtonCheckbox.checked;
});
showWatchButtonCheckbox.addEventListener("change", () => {
  watchBackgroundImageTypeSelect.disabled = !showWatchButtonCheckbox.checked;
});
showFavoriteButtonCheckbox.addEventListener("change", () => {
  favoriBackgroundImageTypeSelect.disabled = !showFavoriteButtonCheckbox.checked;
});
useListFileCheckbox.addEventListener("change", () => {
  const disableState = useListFileCheckbox.checked || useManualListCheckbox.checked;
  limitInput.disabled = disableState;
  customQueryStringInput.disabled = disableState;
  sortingKeywordsInput.disabled = disableState;
  manualListIdsContainer.style.display = useManualListCheckbox.checked ? "block" : "none";
});
useManualListCheckbox.addEventListener("change", () => {
  manualListIdsContainer.style.display = useManualListCheckbox.checked ? "block" : "none";
  limitInput.disabled = useManualListCheckbox.checked;
  sortingKeywordsInput.disabled = useManualListCheckbox.checked;
  customQueryStringInput.disabled = useManualListCheckbox.checked;
  useListFileCheckbox.disabled = useManualListCheckbox.checked;
  if (useManualListCheckbox.checked) {
    useListFileCheckbox.checked = false;
  } else {
    useListFileCheckbox.disabled = false;
  }
});

showTitleOnlyCheckbox.addEventListener('change', function() {
  if (this.checked) {
    showDiscOnlyCheckbox.checked = false;
  }
  updateTitleOnlyVisibility();
});

showDiscOnlyCheckbox.addEventListener('change', function() {
  if (this.checked) {
    showTitleOnlyCheckbox.checked = false;
  }
  updateTitleOnlyVisibility();
});

document.addEventListener("DOMContentLoaded", function () {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.querySelector(`input[name="theme"][value="${savedTheme}"]`).checked = true;
  document.body.className = savedTheme + '-theme';

  languageCheckbox.checked = localStorage.getItem("showLanguageInfo") !== "false";
  showLogoOrTitleCheckbox.checked = localStorage.getItem("showLogoOrTitle") !== "false";
  showTitleOnlyCheckbox.checked = localStorage.getItem("showTitleOnly") !== "false";
  showDiscOnlyCheckbox.checked = localStorage.getItem("showDiscOnly") !== "false";
  ratingCheckbox.checked = localStorage.getItem("showRatingInfo") !== "false";
  progressCheckbox.checked = localStorage.getItem("showProgressBar") !== "false";
  providerCheckbox.checked = localStorage.getItem("showProviderInfo") !== "false";
  dotNavigationCheckbox.checked = localStorage.getItem("showDotNavigation") !== "false";
  showSettingsLinkCheckbox.checked = localStorage.getItem("showSettingsLink") !== "false";
  showStatusInfoCheckbox.checked = localStorage.getItem("showStatusInfo") !== "false";
  showActorInfoCheckbox.checked = localStorage.getItem("showActorInfo") !== "false";
  descriptionsCheckbox.checked = localStorage.getItem("showDescriptions") !== "false";
  hideOriginalTitleIfSameCheckbox.checked = localStorage.getItem("hideOriginalTitleIfSame") !== "false";
  manualBackdropSelectionCheckbox.checked = localStorage.getItem("manualBackdropSelection") === "true";
  plotInfoCheckbox.checked = localStorage.getItem("showPlotInfo") !== "false";
  gradientOverlayImageTypeSelect.value = localStorage.getItem('gradientOverlayImageType') || 'backdropUrl';
  backdropImageTypeSelect.value = localStorage.getItem('backdropImageType') || 'backdropUrl';
  getEl("showbPlotInfoCheckbox").checked = localStorage.getItem('showbPlotInfo') !== "false";
  dotBackgroundImageTypeSelect.value = localStorage.getItem('dotBackgroundImageType') || 'none';
  trailerBackgroundImageTypeSelect.value = localStorage.getItem('trailerBackgroundImageType') || 'none';
  watchBackgroundImageTypeSelect.value = localStorage.getItem('watchBackgroundImageType') || 'none';
  favoriBackgroundImageTypeSelect.value = localStorage.getItem('favoriBackgroundImageType') || 'none';
  defaultLanguageSelect.value = localStorage.getItem('defaultLanguage') || 'tur';
  minHighQualityWidthInput.value = localStorage.getItem("minHighQualityWidth") || 1920;
  enableTrailerPlaybackCheckbox.checked = localStorage.getItem("enableTrailerPlayback") !== "false";
  showTrailerButtonCheckbox.checked = localStorage.getItem("showTrailerButton") !== "false";
  showWatchButtonCheckbox.checked = localStorage.getItem("showWatchButton") !== "false";
  showFavoriteButtonCheckbox.checked = localStorage.getItem("showFavoriteButton") !== "false";
  useListFileCheckbox.checked = localStorage.getItem("useListFile") !== "false";
  customQueryStringInput.disabled = useListFileCheckbox.checked;
  limitInput.disabled = useListFileCheckbox.checked;
  progressBarWidthInput.disabled = !progressCheckbox.checked;
  dotBackgroundImageTypeSelect.disabled = !dotNavigationCheckbox.checked;
  trailerBackgroundImageTypeSelect.disabled = !showTrailerButtonCheckbox.checked;
  watchBackgroundImageTypeSelect.disabled = !showWatchButtonCheckbox.checked;
  favoriBackgroundImageTypeSelect.disabled = !showFavoriteButtonCheckbox.checked;
  customQueryStringInput.value = localStorage.getItem('customQueryString') || 'IncludeItemTypes=Movie,Series&Recursive=true&hasOverview=true&imageTypes=Logo,Backdrop';
  sortingKeywordsInput.value = localStorage.getItem('sortingKeywords') || "DateCreated, PremiereDate, ProductionYear, Random";
  initSettingsBackgroundSlider();
  addBackButtonStyles();
  setupBackButton();
  cssVariantSelect.value = localStorage.getItem('cssVariant') || 'kompak';

  getEl('resetToDefaults').addEventListener('click', function() {
  if (confirm(labels.resetConfirm)) {
    const keysToRemove = [
      'theme', 'showLanguageInfo', 'showRatingInfo', 'showProgressBar', 'showProviderInfo',
      'showDotNavigation', 'showSettingsLink', 'showLogoOrTitle', 'showTitleOnly',
      'showDiscOnly', 'showCommunityRating', 'showCriticRating', 'showOfficialRating',
      'showStatusInfo', 'showTypeInfo', 'showWatchedInfo', 'showRuntimeInfo',
      'showQualityInfo', 'showQualityDetail', 'showActorInfo', 'showDescriptions',
      'showPlotInfo', 'showbPlotInfo', 'showSloganInfo', 'showTitleInfo',
      'showOriginalTitleInfo', 'customQueryString', 'showDirectorWriter',
      'showDirector', 'showWriter', 'useListFile', 'sortingKeywords', 'showInfo',
      'showGenresInfo', 'showYearInfo', 'showCountryInfo', 'sliderDuration',
      'artistLimit', 'showTrailerButton', 'showWatchButton', 'showFavoriteButton',
      'hideOriginalTitleIfSame', 'manualBackdropSelection', 'gradientOverlayImageType',
      'backdropImageType', 'dotBackgroundImageType', 'trailerBackgroundImageType',
      'watchBackgroundImageType', 'favoriBackgroundImageType', 'enableTrailerPlayback',
      'defaultLanguage', 'limit', 'minHighQualityWidth', 'progressBarWidth',
      'allowedWriters', 'useManualList', 'manualListIds', 'backdropUrls'
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));
    let messageDiv = document.getElementById('reset-message');
    if (!messageDiv) {
      messageDiv = document.createElement('div');
      messageDiv.id = 'reset-message';
      document.body.appendChild(messageDiv);
    }

    messageDiv.textContent = labels.resetSuccess || 'Tüm ayarlar sıfırlandı. Sayfa yenileniyor...';
    messageDiv.style.display = 'block';

    setTimeout(() => {
      location.reload();
    }, 2000);
  }
});


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
  allowedWritersInput.value = [...new Set([...defaultWriters, ...storedWriters])].join(', ');

  ["showCommunityRatingCheckbox", "showCriticRatingCheckbox", "showOfficialRatingCheckbox",
   "showTypeInfoCheckbox", "showWatchedInfoCheckbox", "showRuntimeInfoCheckbox",
   "showQualityInfoCheckbox", "showQualityDetailCheckbox", "showSloganInfoCheckbox",
   "showTitleInfoCheckbox", "showOriginalTitleInfoCheckbox"].forEach(id => {
    getEl(id).checked = localStorage.getItem(id.replace("Checkbox", "")) !== "false";
  });
  showDirectorWriterCheckbox.checked = localStorage.getItem("showDirectorWriter") !== "false";
  showDirectorCheckbox.checked = localStorage.getItem("showDirector") !== "false";
  showWriterCheckbox.checked = localStorage.getItem("showWriter") !== "false";
  showInfoCheckbox.checked = localStorage.getItem("showInfo") !== "false";
  showGenresInfoCheckbox.checked = localStorage.getItem("showGenresInfo") !== "false";
  showYearInfoCheckbox.checked = localStorage.getItem("showYearInfo") !== "false";
  showCountryInfoCheckbox.checked = localStorage.getItem("showCountryInfo") !== "false";
  sliderDurationInput.value = localStorage.getItem("sliderDuration") || 15000;
  artistLimitInput.value = localStorage.getItem("artistLimit") || 3;
  limitInput.value = localStorage.getItem("limit") || 10;

  updateGroup(showStatusInfoCheckbox, statusSubOptions);
  updateGroup(ratingCheckbox, ratingSubOptions);
  updateGroup(descriptionsCheckbox, descriptionsSubOptions);
  updateGroup(showDirectorWriterCheckbox, directorWriterSubOptions);
  updateGroup(showInfoCheckbox, infoSubOptions);
  updateGroup(languageCheckbox, defaultLanguageSelect);
  updateTitleOnlyVisibility();
  updatePlotOnlyVisibility();
  updateProviderSettingsVisibility();
  updateQualityDetailOnlyVisibility();

  showStatusInfoCheckbox.addEventListener("change", () => updateGroup(showStatusInfoCheckbox, statusSubOptions));
  ratingCheckbox.addEventListener("change", () => updateGroup(ratingCheckbox, ratingSubOptions));
  descriptionsCheckbox.addEventListener("change", () => updateGroup(descriptionsCheckbox, descriptionsSubOptions));
  showDirectorWriterCheckbox.addEventListener("change", () => updateGroup(showDirectorWriterCheckbox, directorWriterSubOptions));
  showInfoCheckbox.addEventListener("change", () => updateGroup(showInfoCheckbox, infoSubOptions));
  showLogoOrTitleCheckbox.addEventListener("change", updateTitleOnlyVisibility);
  plotInfoCheckbox.addEventListener("change", updatePlotOnlyVisibility);
  getEl("showQualityInfoCheckbox").addEventListener("change", updateQualityDetailOnlyVisibility);
  languageCheckbox.addEventListener("change", () => updateGroup(languageCheckbox, defaultLanguageSelect));

  useManualListCheckbox.checked = localStorage.getItem('useManualList') === 'true';
  manualListIdsInput.value = localStorage.getItem('manualListIds') || '';
  manualListIdsContainer.style.display = useManualListCheckbox.checked ? "block" : "none";

  getEl('saveSettings').addEventListener("click", function () {
    const allowedWritersList = allowedWritersInput.value
      .split(',')
      .map(name => name.trim().toLowerCase())
      .filter(name => name);
    localStorage.setItem("allowedWriters", JSON.stringify(allowedWritersList));


    const settingsToSave = {
      theme: document.querySelector('input[name="theme"]:checked').value,
      showLanguageInfo: languageCheckbox.checked,
      showRatingInfo: ratingCheckbox.checked,
      showProgressBar: progressCheckbox.checked,
      showProviderInfo: providerCheckbox.checked,
      showDotNavigation: dotNavigationCheckbox.checked,
      showSettingsLink: showSettingsLinkCheckbox.checked,
      showLogoOrTitle: showLogoOrTitleCheckbox.checked,
      showTitleOnly: showTitleOnlyCheckbox.checked,
      showDiscOnly: showDiscOnlyCheckbox.checked,
      showCommunityRating: getEl("showCommunityRatingCheckbox").checked,
      showCriticRating: getEl("showCriticRatingCheckbox").checked,
      showOfficialRating: getEl("showOfficialRatingCheckbox").checked,
      showStatusInfo: showStatusInfoCheckbox.checked,
      showTypeInfo: getEl("showTypeInfoCheckbox").checked,
      showWatchedInfo: getEl("showWatchedInfoCheckbox").checked,
      showRuntimeInfo: getEl("showRuntimeInfoCheckbox").checked,
      showQualityInfo: getEl("showQualityInfoCheckbox").checked,
      showQualityDetail: getEl("showQualityDetailCheckbox").checked,
      showActorInfo: showActorInfoCheckbox.checked,
      showDescriptions: descriptionsCheckbox.checked,
      showPlotInfo: plotInfoCheckbox.checked,
      showbPlotInfo: getEl('showbPlotInfoCheckbox').checked,
      showSloganInfo: getEl("showSloganInfoCheckbox").checked,
      showTitleInfo: getEl("showTitleInfoCheckbox").checked,
      showOriginalTitleInfo: getEl("showOriginalTitleInfoCheckbox").checked,
      customQueryString: customQueryStringInput.value,
      showDirectorWriter: showDirectorWriterCheckbox.checked,
      showDirector: showDirectorCheckbox.checked,
      showWriter: showWriterCheckbox.checked,
      useListFile: useListFileCheckbox.checked,
      sortingKeywords: sortingKeywordsInput.value,
      showInfo: showInfoCheckbox.checked,
      showGenresInfo: showGenresInfoCheckbox.checked,
      showYearInfo: showYearInfoCheckbox.checked,
      showCountryInfo: showCountryInfoCheckbox.checked,
      sliderDuration: sliderDurationInput.value,
      artistLimit: artistLimitInput.value,
      showTrailerButton: showTrailerButtonCheckbox.checked,
      showWatchButton: showWatchButtonCheckbox.checked,
      showFavoriteButton: showFavoriteButtonCheckbox.checked,
      hideOriginalTitleIfSame: hideOriginalTitleIfSameCheckbox.checked,
      manualBackdropSelection: manualBackdropSelectionCheckbox.checked,
      gradientOverlayImageType: gradientOverlayImageTypeSelect.value,
      backdropImageType: backdropImageTypeSelect.value,
      dotBackgroundImageType: dotBackgroundImageTypeSelect.value,
      trailerBackgroundImageType: trailerBackgroundImageTypeSelect.value,
      watchBackgroundImageType: watchBackgroundImageTypeSelect.value,
      favoriBackgroundImageType: favoriBackgroundImageTypeSelect.value,
      enableTrailerPlayback: enableTrailerPlaybackCheckbox.checked,
      defaultLanguage: defaultLanguageSelect.value,
      limit: limitInput.value,
      minHighQualityWidth: minHighQualityWidthInput.value,
      progressBarWidth: progressBarWidthInput.value + "%"
    };


    Object.entries(settingsToSave).forEach(([key, value]) => {
      localStorage.setItem(key, value.toString());
    });
    localStorage.setItem("useManualList", useManualListCheckbox.checked ? "true" : "false");
    localStorage.setItem("manualListIds", manualListIdsInput.value);

    const modal = getEl("settingsSavedModal");
    let autoCloseTimer;
    function showModal() {
      modal.style.display = "flex";
      setTimeout(() => modal.classList.add("show"), 1);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
      autoCloseTimer = setTimeout(hideModal, 2000);
    }
    function hideModal() {
      modal.classList.remove("show");
      setTimeout(() => (modal.style.display = "none"), 300);
    }
    showModal();
    getEl("closeModalBtn").addEventListener("click", function () {
      clearTimeout(autoCloseTimer);
      hideModal();
    });
  });
});
