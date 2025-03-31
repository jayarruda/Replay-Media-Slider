const languageCheckbox = document.getElementById('languageInfoCheckbox');
const showLogoOrTitleCheckbox = document.getElementById("showLogoOrTitleCheckbox");
const showTitleOnlyCheckbox = document.getElementById("showTitleOnlyCheckbox");
const ratingCheckbox = document.getElementById('ratingInfoCheckbox');
const progressCheckbox = document.getElementById('progressBarCheckbox');
const providerCheckbox = document.getElementById("providerCheckbox");
const dotNavigationCheckbox = document.getElementById("dotNavigationCheckbox");
const showSettingsLinkCheckbox = document.getElementById("showSettingsLinkCheckbox");
const settingsLinkContainer = document.getElementById("settingsLinkContainer");
const showStatusInfoCheckbox = document.getElementById("showStatusInfoCheckbox");
const statusSubOptions = document.getElementById("statusSubOptions");
const qualitDetailSubOptions = document.getElementById("qualitDetailSubOptions");
const ratingSubOptions = document.getElementById("ratingSubOptions");
const descriptionsCheckbox = document.getElementById("showDescriptionsCheckbox");
const descriptionsSubOptions = document.getElementById("descriptionsSubOptions");
const sliderDurationInput = document.getElementById("sliderDurationInput");
const showActorInfoCheckbox = document.getElementById("showActorInfoCheckbox");
const showTitleOnlyLabel = document.getElementById("showTitleOnlyLabel");
const showPlotOnlyLabel = document.getElementById("showPlotOnlyLabel");
const hideOriginalTitleIfSameCheckbox = document.getElementById("hideOriginalTitleIfSameCheckbox");
const gradientOverlayImageTypeSelect = document.getElementById("gradientOverlayImageTypeSelect");
const backdropImageTypeSelect = document.getElementById("backdropImageTypeSelect");
const dotBackgroundImageTypeSelect = document.getElementById("dotBackgroundImageTypeSelect");
const trailerBackgroundImageTypeSelect = document.getElementById("trailerBackgroundImageTypeSelect");
const watchBackgroundImageTypeSelect = document.getElementById("watchBackgroundImageTypeSelect");
const favoriBackgroundImageTypeSelect = document.getElementById("favoriBackgroundImageTypeSelect");
const defaultLanguageSelect = document.getElementById('defaultLanguageSelect');
const limitInput = document.getElementById("limitInput");
const plotInfoCheckbox = document.getElementById("showPlotInfoCheckbox");
const minHighQualityWidthInput = document.getElementById("minHighQualityWidthInput");
const manualBackdropSelectionCheckbox = document.getElementById("manualBackdropSelectionCheckbox");
const enableTrailerPlaybackCheckbox = document.getElementById("enableTrailerPlaybackCheckbox");
const showDirectorWriterCheckbox = document.getElementById("showDirectorWriterCheckbox");
const directorWriterSubOptions = document.getElementById("directorWriterSubOptions");
const showDirectorCheckbox = document.getElementById("showDirectorCheckbox");
const showWriterCheckbox = document.getElementById("showWriterCheckbox");
const showInfoCheckbox = document.getElementById("showInfoCheckbox");
const infoSubOptions = document.getElementById("infoSubOptions");
const showGenresInfoCheckbox = document.getElementById("showGenresInfoCheckbox");
const showYearInfoCheckbox = document.getElementById("showYearInfoCheckbox");
const showCountryInfoCheckbox = document.getElementById("showCountryInfoCheckbox");
const showTrailerButtonCheckbox = document.getElementById("showTrailerButtonCheckbox");
const showWatchButtonCheckbox = document.getElementById("showWatchButtonCheckbox");
const customQueryStringInput = document.getElementById('customQueryStringInput');
const showFavoriteButtonCheckbox = document.getElementById("showFavoriteButtonCheckbox");
const useListFileCheckbox = document.getElementById('useListFileCheckbox');
const useManualListCheckbox = document.getElementById('useManualListCheckbox');
const manualListIdsInput = document.getElementById('manualListIdsInput');
const manualListIdsContainer = document.getElementById('manualListIdsContainer');
const progressBarWidth = localStorage.getItem("progressBarWidth") || "100%";
  progressBarWidthInput.value = parseInt(progressBarWidth);
const sortingKeywordsInput = document.getElementById('sortingKeywordsInput');

manualBackdropSelectionCheckbox.addEventListener("change", function () {
  backdropImageTypeSelect.disabled = !this.checked;
  minHighQualityWidthInput.disabled = this.checked;
});

progressBarCheckbox.addEventListener("change", function () {
  progressBarWidthInput.disabled = !this.checked;
});

dotNavigationCheckbox.addEventListener("change", function () {
  dotBackgroundImageTypeSelect.disabled = !this.checked;
})

showTrailerButtonCheckbox.addEventListener("change", function () {
  trailerBackgroundImageTypeSelect.disabled = !this.checked;
});

showWatchButtonCheckbox.addEventListener("change", function () {
  watchBackgroundImageTypeSelect.disabled = !this.checked;
});

showFavoriteButtonCheckbox.addEventListener("change", function () {
  favoriBackgroundImageTypeSelect.disabled = !this.checked;
});

useListFileCheckbox.addEventListener("change", function () {
  limitInput.disabled = this.checked || useManualListCheckbox.checked;
  customQueryStringInput.disabled = this.checked || useManualListCheckbox.checked;
  sortingKeywordsInput.disabled = this.checked || useManualListCheckbox.checked;
  manualListIdsContainer.style.display = useManualListCheckbox.checked ? "block" : "none";
});

useManualListCheckbox.addEventListener("change", function() {
  manualListIdsContainer.style.display = this.checked ? "block" : "none";
  limitInput.disabled = this.checked;
  sortingKeywordsInput.disabled = this.checked;
  customQueryStringInput.disabled = this.checked;
  useListFileCheckbox.disabled = this.checked;
  if (this.checked) {
    useListFileCheckbox.checked = false;
  } else {
    useListFileCheckbox.disabled = false;
  }
});

function updateGroup(parentCheckbox, container) {
  container.style.display = "block";
  const subCheckboxes = container.querySelectorAll('input[type="checkbox"]');
  if (parentCheckbox.checked) {
    subCheckboxes.forEach(cb => {
      cb.disabled = false;
    });
  } else {
    subCheckboxes.forEach(cb => {
      cb.disabled = true;
      cb.checked = false;
    });
  }
}

function updateTitleOnlyVisibility() {
  if (showLogoOrTitleCheckbox.checked) {
    showTitleOnlyLabel.style.display = "none";
    showTitleOnlyCheckbox.disabled = true;
    showTitleOnlyCheckbox.checked = false;
  } else {
    showTitleOnlyLabel.style.display = "block";
    showTitleOnlyCheckbox.disabled = false;
  }
}

function updatePlotOnlyVisibility() {
  if (showPlotInfoCheckbox.checked) {
    showPlotOnlyLabel.style.display = "block";
    showbPlotInfoCheckbox.disabled = false;
  } else {
    showPlotOnlyLabel.style.display = "none";
    showbPlotInfoCheckbox.disabled = true;
    showbPlotInfoCheckbox.checked = false;
  }
}

function updateQualityDetailOnlyVisibility() {
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

document.addEventListener("DOMContentLoaded", function () {
  languageCheckbox.checked = localStorage.getItem("showLanguageInfo") === "false" ? false : true;
  showLogoOrTitleCheckbox.checked = localStorage.getItem("showLogoOrTitle") === "false" ? false : true;
  showTitleOnlyCheckbox.checked = localStorage.getItem("showTitleOnly") === "false" ? false : true;
  ratingCheckbox.checked = localStorage.getItem("showRatingInfo") === "false" ? false : true;
  progressCheckbox.checked = localStorage.getItem("showProgressBar") === "false" ? false : true;
  providerCheckbox.checked = localStorage.getItem("showProviderInfo") === "false" ? false : true;
  dotNavigationCheckbox.checked = localStorage.getItem("showDotNavigation") === "false" ? false : true;
  showSettingsLinkCheckbox.checked = localStorage.getItem("showSettingsLink") === "false" ? false : true;
  showStatusInfoCheckbox.checked = localStorage.getItem("showStatusInfo") === "false" ? false : true;
  showActorInfoCheckbox.checked = localStorage.getItem("showActorInfo") === "false" ? false : true;
  descriptionsCheckbox.checked = localStorage.getItem("showDescriptions") === "false" ? false : true;
  hideOriginalTitleIfSameCheckbox.checked = localStorage.getItem("hideOriginalTitleIfSame") === "false" ? false : true;
  manualBackdropSelectionCheckbox.checked = localStorage.getItem("manualBackdropSelection") === "false" ? false : false;
  showPlotInfoCheckbox.checked = localStorage.getItem("showPlotInfo") === "false" ? false : true;
  gradientOverlayImageTypeSelect.value = localStorage.getItem('gradientOverlayImageType') || 'backdropUrl';
  backdropImageTypeSelect.value = localStorage.getItem('backdropImageType') || 'backdropUrl';
  showbPlotInfoCheckbox.checked = localStorage.getItem('showbPlotInfo') === "false" ? false : true;
  dotBackgroundImageTypeSelect.value = localStorage.getItem('dotBackgroundImageType') || 'none';
  trailerBackgroundImageTypeSelect.value = localStorage.getItem('trailerBackgroundImageType') || 'none';
  watchBackgroundImageTypeSelect.value = localStorage.getItem('watchBackgroundImageType') || 'none';
  favoriBackgroundImageTypeSelect.value = localStorage.getItem('favoriBackgroundImageType') || 'none';
  defaultLanguageSelect.value = localStorage.getItem('defaultLanguage') || 'tur';
  minHighQualityWidthInput.value = localStorage.getItem("minHighQualityWidth") || 1920;
  enableTrailerPlaybackCheckbox.checked = localStorage.getItem("enableTrailerPlayback") === "false" ? false : true;
  showTrailerButtonCheckbox.checked = localStorage.getItem("showTrailerButton") === "false" ? false : true;
  showWatchButtonCheckbox.checked = localStorage.getItem("showWatchButton") === "false" ? false : true;
  showFavoriteButtonCheckbox.checked = localStorage.getItem("showFavoriteButton") === "false" ? false : true;
  useListFileCheckbox.checked = localStorage.getItem("useListFile") === "false" ? false : true;
  backdropImageTypeSelect.disabled = !manualBackdropSelectionCheckbox.checked;
  minHighQualityWidthInput.disabled = manualBackdropSelectionCheckbox.checked;
  customQueryStringInput.disabled = useListFileCheckbox.checked;
  limitInput.disabled = useListFileCheckbox.checked;
  progressBarWidthInput.disabled = !progressBarCheckbox.checked;
  dotBackgroundImageTypeSelect.disabled = !dotNavigationCheckbox.checked;
  trailerBackgroundImageTypeSelect.disabled = !showTrailerButtonCheckbox.checked;
  watchBackgroundImageTypeSelect.disabled = !showWatchButtonCheckbox.checked;
  favoriBackgroundImageTypeSelect.disabled = !showFavoriteButtonCheckbox.checked;
  customQueryStringInput.value = localStorage.getItem('customQueryString') || 'IncludeItemTypes=Movie,Series&Recursive=true&hasOverview=true&imageTypes=Logo,Backdrop';
  sortingKeywordsInput.value = localStorage.getItem('sortingKeywords') || "DateCreated, PremiereDate, ProductionYear, Random";


  const allowedWritersInput = document.getElementById('allowedWritersInput');
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
  const combined = [...new Set([...defaultWriters, ...storedWriters])];
  allowedWritersInput.value = combined.join(', ');

  document.getElementById("showCommunityRatingCheckbox").checked = localStorage.getItem("showCommunityRating") === "false" ? false : true;
  document.getElementById("showCriticRatingCheckbox").checked = localStorage.getItem("showCriticRating") === "false" ? false : true;
  document.getElementById("showOfficialRatingCheckbox").checked = localStorage.getItem("showOfficialRating") === "false" ? false : true;
  document.getElementById("showTypeInfoCheckbox").checked = localStorage.getItem("showTypeInfo") === "false" ? false : true;
  document.getElementById("showWatchedInfoCheckbox").checked = localStorage.getItem("showWatchedInfo") === "false" ? false : true;
  document.getElementById("showRuntimeInfoCheckbox").checked = localStorage.getItem("showRuntimeInfo") === "false" ? false : true;
  document.getElementById("showQualityInfoCheckbox").checked = localStorage.getItem("showQualityInfo") === "false" ? false : true;
  document.getElementById("showQualityDetailCheckbox").checked = localStorage.getItem("showQualityDetail") === "false" ? false : true;
  document.getElementById("showSloganInfoCheckbox").checked = localStorage.getItem("showSloganInfo") === "false" ? false : true;
  document.getElementById("showTitleInfoCheckbox").checked = localStorage.getItem("showTitleInfo") === "false" ? false : true;
  document.getElementById("showOriginalTitleInfoCheckbox").checked = localStorage.getItem("showOriginalTitleInfo") === "false" ? false : true;
  showDirectorWriterCheckbox.checked = localStorage.getItem("showDirectorWriter") === "false" ? false : true;
  showDirectorCheckbox.checked = localStorage.getItem("showDirector") === "false" ? false : true;
  showWriterCheckbox.checked = localStorage.getItem("showWriter") === "false" ? false : true;
  showInfoCheckbox.checked = localStorage.getItem("showInfo") === "false" ? false : true;
  showGenresInfoCheckbox.checked = localStorage.getItem("showGenresInfo") === "false" ? false : true;
  showYearInfoCheckbox.checked = localStorage.getItem("showYearInfo") === "false" ? false : true;
  showCountryInfoCheckbox.checked = localStorage.getItem("showCountryInfo") === "false" ? false : true;
  sliderDurationInput.value = localStorage.getItem("sliderDuration") || 15000;
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
  showPlotInfoCheckbox.addEventListener("change", updatePlotOnlyVisibility);
  showQualityInfoCheckbox.addEventListener("change", updateQualityDetailOnlyVisibility);
  languageCheckbox.addEventListener("change", () => updateGroup(languageCheckbox, defaultLanguageSelect));
  useManualListCheckbox.checked = localStorage.getItem('useManualList') === 'true';
  manualListIdsInput.value = localStorage.getItem('manualListIds') || '';
  manualListIdsContainer.style.display = useManualListCheckbox.checked ? "block" : "none";

  document.getElementById('saveSettings').addEventListener("click", function () {
    localStorage.setItem("showLanguageInfo", languageCheckbox.checked ? "true" : "false");
    localStorage.setItem("showRatingInfo", ratingCheckbox.checked ? "true" : "false");
    localStorage.setItem("showProgressBar", progressCheckbox.checked ? "true" : "false");
    localStorage.setItem("showProviderInfo", providerCheckbox.checked ? "true" : "false");
    localStorage.setItem("showDotNavigation", dotNavigationCheckbox.checked ? "true" : "false");
    localStorage.setItem("showSettingsLink", showSettingsLinkCheckbox.checked ? "true" : "false");
    localStorage.setItem("showLogoOrTitle", showLogoOrTitleCheckbox.checked ? "true" : "false");
    localStorage.setItem("showTitleOnly", showTitleOnlyCheckbox.checked ? "true" : "false");
    localStorage.setItem("showCommunityRating", document.getElementById("showCommunityRatingCheckbox").checked ? "true" : "false");
    localStorage.setItem("showCriticRating", document.getElementById("showCriticRatingCheckbox").checked ? "true" : "false");
    localStorage.setItem("showOfficialRating", document.getElementById("showOfficialRatingCheckbox").checked ? "true" : "false");
    localStorage.setItem("showStatusInfo", showStatusInfoCheckbox.checked ? "true" : "false");
    localStorage.setItem("showTypeInfo", document.getElementById("showTypeInfoCheckbox").checked ? "true" : "false");
    localStorage.setItem("showWatchedInfo", document.getElementById("showWatchedInfoCheckbox").checked ? "true" : "false");
    localStorage.setItem("showRuntimeInfo", document.getElementById("showRuntimeInfoCheckbox").checked ? "true" : "false");
    localStorage.setItem("showQualityInfo", document.getElementById("showQualityInfoCheckbox").checked ? "true" : "false");
    localStorage.setItem("showQualityDetail", document.getElementById("showQualityDetailCheckbox").checked ? "true" : "false");
    localStorage.setItem("showActorInfo", showActorInfoCheckbox.checked ? "true" : "false");
    localStorage.setItem("showDescriptions", descriptionsCheckbox.checked ? "true" : "false");
    localStorage.setItem("showPlotInfo", showPlotInfoCheckbox.checked ? "true" : "false");
    localStorage.setItem("showbPlotInfo", showbPlotInfoCheckbox.checked ? "true" : "false");
    localStorage.setItem("showSloganInfo", document.getElementById("showSloganInfoCheckbox").checked ? "true" : "false");
    localStorage.setItem("showTitleInfo", document.getElementById("showTitleInfoCheckbox").checked ? "true" : "false");
    localStorage.setItem("showOriginalTitleInfo", document.getElementById("showOriginalTitleInfoCheckbox").checked ? "true" : "false");
    localStorage.setItem("customQueryString", customQueryStringInput.value);
    localStorage.setItem("showDirectorWriter", showDirectorWriterCheckbox.checked ? "true" : "false");
    localStorage.setItem("showDirector", showDirectorCheckbox.checked ? "true" : "false");
    localStorage.setItem("showWriter", showWriterCheckbox.checked ? "true" : "false");
    localStorage.setItem("showLanguageInfo", languageCheckbox.checked ? "true" : "false");
    localStorage.setItem("showRatingInfo", ratingCheckbox.checked ? "true" : "false");
    localStorage.setItem("useListFile", useListFileCheckbox.checked ? "true" : "false");
    localStorage.setItem("sortingKeywords", sortingKeywordsInput.value);

    const allowedWritersList = allowedWritersInput.value
      .split(',')
      .map(name => name.trim().toLowerCase())
      .filter(name => name.length > 0);
    localStorage.setItem("allowedWriters", JSON.stringify(allowedWritersList));



    localStorage.setItem("showInfo", showInfoCheckbox.checked ? "true" : "false");
    localStorage.setItem("showGenresInfo", showGenresInfoCheckbox.checked ? "true" : "false");
    localStorage.setItem("showYearInfo", showYearInfoCheckbox.checked ? "true" : "false");
    localStorage.setItem("showCountryInfo", showCountryInfoCheckbox.checked ? "true" : "false");
    localStorage.setItem("sliderDuration", sliderDurationInput.value);
    localStorage.setItem("showTrailerButton", showTrailerButtonCheckbox.checked ? "true" : "false");
    localStorage.setItem("showWatchButton", showWatchButtonCheckbox.checked ? "true" : "false");
    localStorage.setItem("showFavoriteButton", showFavoriteButtonCheckbox.checked ? "true" : "false");
    localStorage.setItem("hideOriginalTitleIfSame", hideOriginalTitleIfSameCheckbox.checked ? "true" : "false");
    localStorage.setItem("manualBackdropSelection", manualBackdropSelectionCheckbox.checked ? "true" : "false");
    localStorage.setItem("gradientOverlayImageType", gradientOverlayImageTypeSelect.value);
    localStorage.setItem("backdropImageType", backdropImageTypeSelect.value);
    localStorage.setItem("dotBackgroundImageType", dotBackgroundImageTypeSelect.value);
    localStorage.setItem("trailerBackgroundImageType", trailerBackgroundImageTypeSelect.value);
    localStorage.setItem("watchBackgroundImageType", watchBackgroundImageTypeSelect.value);
    localStorage.setItem("favoriBackgroundImageType", favoriBackgroundImageTypeSelect.value);
    localStorage.setItem("enableTrailerPlayback", enableTrailerPlaybackCheckbox.checked ? "true" : "false");
    localStorage.setItem("defaultLanguage", defaultLanguageSelect.value);
    localStorage.setItem("limit", limitInput.value);
    localStorage.setItem("minHighQualityWidth", minHighQualityWidthInput.value);
    localStorage.setItem("progressBarWidth", progressBarWidthInput.value + "%");
    localStorage.setItem("useManualList", useManualListCheckbox.checked ? "true" : "false");
    localStorage.setItem("manualListIds", manualListIdsInput.value);

    const modal = document.getElementById("settingsSavedModal");
let autoCloseTimer;

function showModal() {
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("show"), 1);

  if (autoCloseTimer) clearTimeout(autoCloseTimer);
  autoCloseTimer = setTimeout(hideModal, 5000);
}

function hideModal() {
  modal.classList.remove("show");
  setTimeout(() => (modal.style.display = "none"), 300);
}

showModal();

document.getElementById("closeModalBtn").addEventListener("click", function() {
  clearTimeout(autoCloseTimer);
  hideModal();
});
});
});
