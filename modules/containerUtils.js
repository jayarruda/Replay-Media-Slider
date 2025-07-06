import { getConfig } from "./config.js";
import { applyContainerStyles } from "./positionUtils.js";

const config = getConfig();

export function createSlidesContainer(indexPage) {
  let slidesContainer = indexPage.querySelector("#slides-container");
  if (!slidesContainer) {
    slidesContainer = document.createElement("div");
    slidesContainer.id = "slides-container";
    applyContainerStyles(slidesContainer);
    indexPage.insertBefore(slidesContainer, indexPage.firstChild);
  }
  return slidesContainer;
}

export function createGradientOverlay(imageUrl = "") {
  const overlay = document.createElement("div");
  overlay.className = "gradient-overlay";
  if (!imageUrl) {
    overlay.style.backgroundImage = "none";
  } else {
    overlay.style.backgroundImage = `url(${imageUrl})`;
    overlay.style.backgroundRepeat = "no-repeat";
    overlay.style.backgroundPosition = "50%";
    overlay.style.backgroundSize = "cover";
    overlay.style.aspectRatio = "1 / 1";
    overlay.style.filter = "brightness(0.8)";
  }
  return overlay;
}

export function createHorizontalGradientOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "horizontal-gradient-overlay";
  return overlay;
}

export function createLogoContainer() {
  const container = document.createElement("div");
  container.className = "logo-container";
  applyContainerStyles(container, 'logo');
  return container;
}

export function createStatusContainer(itemType, config, UserData, ChildCount, RunTimeTicks, MediaStreams) {
  const statusContainer = document.createElement("div");
  statusContainer.className = "status-container";
  applyContainerStyles(statusContainer, 'status');

  if (itemType && config.showTypeInfo) {
    const typeSpan = document.createElement("span");
    typeSpan.className = "type";
    const typeTranslations = {
      Series: { text: config.languageLabels.dizi, icon: '<i class="fas fa-tv"></i>' },
      BoxSet: { text: config.languageLabels.boxset, icon: '<i class="fas fa-film"></i>' },
      Movie: { text: config.languageLabels.film, icon: '<i class="fas fa-film"></i>' }
    };
    const typeInfo = typeTranslations[itemType] || { text: itemType, icon: "" };
    typeSpan.innerHTML = `${typeInfo.icon} ${typeInfo.text}`;
    if (itemType === "Series" && ChildCount) {
      typeSpan.innerHTML += ` (${ChildCount} ${config.languageLabels.sezon})`;
    }
    if (itemType === "BoxSet" && ChildCount) {
      typeSpan.innerHTML += ` (${ChildCount} ${config.languageLabels.seri})`;
    }
    statusContainer.appendChild(typeSpan);
  }

  if (UserData && config.showWatchedInfo) {
    const watchedSpan = document.createElement("span");
    watchedSpan.className = "watched-status";

    let watchedText = UserData.Played
      ? `<i class="fa-light fa-circle-check"></i> ${config.languageLabels.izlendi}`
      : `<i class="fa-light fa-circle-xmark"></i> ${config.languageLabels.izlenmedi}`;

    if (UserData.Played && UserData.PlayCount > 0) {
      watchedText += ` (${UserData.PlayCount})`;
    }

    watchedSpan.innerHTML = watchedText;
    statusContainer.appendChild(watchedSpan);
  }

  if (RunTimeTicks && config.showRuntimeInfo) {
    const runtimeSpan = document.createElement("span");
    runtimeSpan.className = "sure";
    const calcRuntime = (ticks) => {
      const totalMinutes = Math.floor(ticks / 600000000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return hours > 0
        ? `${hours}${config.languageLabels.sa} ${minutes}${config.languageLabels.dk}`
        : `${minutes}${config.languageLabels.dk}`;
    };
    runtimeSpan.innerHTML = `<i class="fa-regular fa-hourglass-end"></i> ${
      Array.isArray(RunTimeTicks)
        ? RunTimeTicks.map(val => calcRuntime(val)).join(", ")
        : calcRuntime(RunTimeTicks)
    }`;
    statusContainer.appendChild(runtimeSpan);
  }

  const videoStream = MediaStreams ? MediaStreams.find(s => s.Type === "Video") : null;
  if (videoStream && config.showQualityInfo) {
    const qualitySpan = document.createElement("span");
    qualitySpan.className = "video-quality";
    let baseQuality = "SD";
    if (videoStream.Width >= 3840) {
      baseQuality = "4K";
    } else if (videoStream.Width >= 2560) {
      baseQuality = "2K";
    } else if (videoStream.Width >= 1920) {
      baseQuality = "FullHD";
    } else if (videoStream.Width >= 1280) {
      baseQuality = "HD";
    }
    let qualityText = baseQuality;
    if (config.showQualityDetail) {
      if (videoStream.Codec) qualityText += ` ${videoStream.Codec}`;
      if (videoStream.VideoRangeType) qualityText += ` ${videoStream.VideoRangeType}`;
    }
    const qualityIcon =
      videoStream.Width < 1280
        ? `<i class="fa-regular fa-standard-definition"></i>`
        : `<i class="fa-regular fa-high-definition"></i>`;
    qualitySpan.innerHTML = `${qualityIcon} ${qualityText}`;
    statusContainer.appendChild(qualitySpan);
  }

  return statusContainer;
}

export function createActorSlider(People, config) {
  const sliderWrapper = document.createElement("div");
  sliderWrapper.className = "slider-wrapper";
  applyContainerStyles(sliderWrapper, 'slider');

  const actorContainer = document.createElement("div");
  actorContainer.className = "artist-container";

  const leftArrow = document.createElement("button");
  leftArrow.className = "slider-arrow left hidden";
  leftArrow.innerHTML = `<i class="fa-light fa-left-to-line"></i>`;

  const rightArrow = document.createElement("button");
  rightArrow.className = "slider-arrow right hidden";
  rightArrow.innerHTML = `<i class="fa-light fa-right-to-line"></i>`;

  sliderWrapper.appendChild(leftArrow);
  sliderWrapper.appendChild(actorContainer);
  sliderWrapper.appendChild(rightArrow);

  if (People) {
    const allActors = People.filter(p => p.Type === "Actor");
    const actorsForSlide = allActors.slice(0, config.artistLimit || 3);

    actorsForSlide.forEach(actor => {
      const actorDiv = document.createElement("div");
      actorDiv.className = "actor-item";

      const actorContent = document.createElement("div");
      actorContent.className = "actor-content";

      const actorLink = document.createElement("a");
      actorLink.href = `/web/#/details?id=${actor.Id}`;
      actorLink.target = "_blank";
      actorLink.style.textDecoration = "none";

      if (config.showActorImg) {
        const actorImg = document.createElement("img");
        actorImg.className = "actor-image";
        if (actor.PrimaryImageTag) {
          actorImg.src = `/Items/${actor.Id}/Images/Primary?fillHeight=320&fillWidth=320&quality=96&tag=${actor.PrimaryImageTag}`;
          actorImg.alt = actor.Name;
        } else {
          actorImg.src = "slider/src/images/nofoto.png";
          actorImg.alt = "No Image";
        }
        actorImg.onerror = () => {
          actorImg.src = "slider/src/images/nofoto.png";
        };
        actorLink.appendChild(actorImg);
      }

      actorContent.appendChild(actorLink);

      const roleSpan = document.createElement("span");
      roleSpan.className = "actor-role";
      roleSpan.textContent = config.showActorRole ? actor.Role || "" : "";
      actorContent.appendChild(roleSpan);

      const nameSpan = document.createElement("span");
      nameSpan.className = "actor-name";
      nameSpan.textContent = config.showActorInfo ? actor.Name || "" : "";
      actorContent.appendChild(nameSpan);

      actorDiv.appendChild(actorContent);
      actorContainer.appendChild(actorDiv);
    });
  }

  return sliderWrapper;
}

export function createInfoContainer({ config, Genres, ProductionYear, ProductionLocations }) {
  const container = document.createElement("div");
  container.className = "info-container";
  applyContainerStyles(container, 'info');

  const normalizeKey = str =>
    str?.toString().toLowerCase().replace(/\s+/g, "");

  if (Genres && Genres.length && config.showGenresInfo) {
    const genresSpan = document.createElement("span");
    genresSpan.className = "genres";
    genresSpan.innerHTML = `<i class="fa-regular fa-masks-theater"></i> ${Genres.map(
      genre => {
        const key = normalizeKey(genre);
        const matchedEntry = Object.entries(config.languageLabels.turler || {}).find(
          ([labelKey]) => normalizeKey(labelKey) === key
        );
        return matchedEntry ? matchedEntry[1] : genre;
      }
    ).join(", ")} <i class="fa-solid fa-sparkle fa-2xs" style="color: #ffffff;"></i>`;
    container.appendChild(genresSpan);
  }

  if (ProductionYear && config.showYearInfo) {
    const yearSpan = document.createElement("span");
    yearSpan.className = "yil";
    yearSpan.innerHTML = `<i class="fa-regular fa-calendar"></i> ${
      Array.isArray(ProductionYear)
        ? ProductionYear.join(
            '<i class="fa-solid fa-sparkle fa-2xs" style="color: #ffffff;"></i>'
          )
        : ProductionYear
    } <i class="fa-solid fa-sparkle fa-2xs" style="color: #ffffff;"></i>`;
    container.appendChild(yearSpan);
  }

  if (ProductionLocations && config.showCountryInfo) {
    const countrySpan = document.createElement("span");
    countrySpan.className = "ulke";
    const getFlagEmoji = (code) =>
      code
        ? code
            .toUpperCase()
            .split("")
            .map(char => String.fromCodePoint(127397 + char.charCodeAt()))
            .join("")
        : "";

    const getCountryInfo = (countryRaw) => {
      const key = normalizeKey(countryRaw);
      const matchedEntry = Object.entries(config.languageLabels.ulke || {}).find(
        ([labelKey]) => normalizeKey(labelKey) === key
      );
      return matchedEntry
        ? matchedEntry[1]
        : { code: countryRaw.slice(0, 2).toUpperCase(), name: countryRaw };
    };

    countrySpan.innerHTML = `<i class="fa-regular fa-location-dot"></i> ${
      Array.isArray(ProductionLocations)
        ? ProductionLocations.map(c => {
            const info = getCountryInfo(c);
            return `${getFlagEmoji(info.code)} ${info.name}`;
          }).join(' <i class="fa-solid fa-sparkle fa-2xs" style="color: #ffffff;"></i> ')
        : (() => {
            const info = getCountryInfo(ProductionLocations);
            return `${getFlagEmoji(info.code)} ${info.name}`;
          })()
    }`;
    container.appendChild(countrySpan);
  }

  return container;
}


export function createDirectorContainer({ config, People }) {
  const container = document.createElement("div");
  container.className = "director-container";
  applyContainerStyles(container, 'director');

  if (People && People.length > 0 && config.showDirectorWriter) {
    if (config.showDirector) {
      const directors = People.filter(p => p.Type?.toLowerCase() === "director");
      if (directors.length) {
        const directorNames = directors.map(d => d.Name).join(", ");
        const directorSpan = document.createElement("span");
        directorSpan.className = "yonetmen";
        directorSpan.textContent = `${config.languageLabels.yonetmen}: ${directorNames}`;
        container.appendChild(directorSpan);
      }
    }
    if (config.showWriter) {
      const writers = People.filter(p => p.Type?.toLowerCase() === "writer");
      const matchingWriters = writers.filter(w =>
        config.allowedWriters.includes(w.Name.toLowerCase())
      );
      if (matchingWriters.length) {
        const writerNames = matchingWriters.map(w => w.Name).join(", ");
        const writerSpan = document.createElement("span");
        writerSpan.className = "writer";
        writerSpan.textContent = `${writerNames} ${config.languageLabels.yazar}  ...`;
        container.appendChild(writerSpan);
      }
    }
  }

  return container;
}

export function createRatingContainer({ config, CommunityRating, CriticRating, OfficialRating }) {
  const container = document.createElement("div");
  container.className = "rating-container";
  applyContainerStyles(container, 'rating');

  let ratingExists = false;

  if (config.showRatingInfo) {
    if (config.showCommunityRating && CommunityRating) {
      let ratingValue = Array.isArray(CommunityRating)
        ? Math.round((CommunityRating.reduce((a, b) => a + b, 0) / CommunityRating.length) * 10) / 10
        : Math.round(CommunityRating * 10) / 10;

      const ratingPercentage = ratingValue * 9.5;
      const ratingSpan = document.createElement("span");
      ratingSpan.className = "rating";
      ratingSpan.innerHTML = `
        <span class="star-rating" style="position: relative; display: inline-block; font-size: 1em; color: #ccc;">
          <i class="fa-regular fa-star"></i>
          <span class="star-filled" style="position: absolute; bottom: 0; left: 0; width: auto; color: gold; overflow: hidden; clip-path: inset(${100 - ratingPercentage}% 0 0 0);">
            <i class="fa-solid fa-star" style="display: block;"></i>
          </span>
        </span> ${ratingValue} <i class="fa-solid fa-sparkle fa-2xs" style="color: #ffffff;"></i>`;
      container.appendChild(ratingSpan);
      ratingExists = true;
    }

    if (config.showCriticRating && CriticRating) {
      const criticSpan = document.createElement("span");
      criticSpan.className = "t-rating";
      criticSpan.innerHTML = `<i class="fa-duotone fa-solid fa-tomato" style="--fa-primary-color: #01902e; --fa-secondary-color: #f93208; --fa-secondary-opacity: 1;"></i> ${
        Array.isArray(CriticRating) ? CriticRating.join(", ") : CriticRating
      } <i class="fa-solid fa-sparkle fa-2xs" style="color: #ffffff;"></i>`;
      container.appendChild(criticSpan);
      ratingExists = true;
    }

    if (config.showOfficialRating && OfficialRating) {
      const officialRatingSpan = document.createElement("span");
      officialRatingSpan.className = "officialrating";
      officialRatingSpan.innerHTML = `<i class="fa-solid fa-family"></i> ${
        Array.isArray(OfficialRating) ? OfficialRating.join(", ") : OfficialRating
      }`;
      container.appendChild(officialRatingSpan);
      ratingExists = true;
    }
  }

  return { container, ratingExists };
}

export function createLanguageContainer({ config, MediaStreams, itemType }) {
  const container = document.createElement("div");
  container.className = "language-container";

  if (
    !config.showLanguageInfo ||
    !MediaStreams ||
    MediaStreams.length === 0 ||
    itemType.toLowerCase() === "series"
  ) {
    console.log("Dil - Ses ve Altyazı bilgileri gösterilmiyor veya bilgi mevcut değil.");
    return container;
  }

  const audioCodecs = ["ac3", "mp3", "aac", "flac", "dts", "truehd", "eac3"];
  const subtitleCodecs = ["srt", "ass", "vtt", "subrip"];

  const audioStreams = MediaStreams.filter(
    stream => stream.Codec && audioCodecs.includes(stream.Codec.toLowerCase())
  );
  const subtitleStreams = MediaStreams.filter(
    stream => stream.Codec && subtitleCodecs.includes(stream.Codec.toLowerCase())
  );

  const hasTurkishAudio = audioStreams.some(
    stream => stream.Language?.toLowerCase() === config.defaultLanguage
  );
  const hasTurkishSubtitle = subtitleStreams.some(
    stream => stream.Language?.toLowerCase() === config.defaultLanguage
  );

  let audioLabel = "";
  let subtitleLabel = "";

  if (hasTurkishAudio) {
    audioLabel = `<i class="fa-regular fa-language"></i> ${config.languageLabels.audio}`;
  } else {
    const defaultAudioStream = audioStreams.find(stream => stream.IsDefault);
    const fallbackLanguage = defaultAudioStream?.Language || "";
    audioLabel =
      `<i class="fa-regular fa-language"></i> ${config.languageLabels.original}` +
      (fallbackLanguage ? ` ${fallbackLanguage}` : "");
  }

  if (!hasTurkishAudio && hasTurkishSubtitle) {
    subtitleLabel = `<i class="fa-solid fa-subtitles"></i> ${config.languageLabels.subtitle}`;
  }

  const selectedAudioStream =
    audioStreams.find(stream => stream.Language?.toLowerCase() === config.defaultLanguage) ||
    audioStreams[0];

  if (selectedAudioStream) {
    const channelsText = selectedAudioStream.Channels
      ? `${selectedAudioStream.Channels} ${config.languageLabels.channel}`
      : "";
    const bitRateText = selectedAudioStream.BitRate
      ? `${Math.floor(selectedAudioStream.BitRate / 1000)} kbps`
      : "";
    const codecText = selectedAudioStream.Codec
      ? selectedAudioStream.Codec.toUpperCase()
      : "";

    if (channelsText || bitRateText || codecText) {
      audioLabel += ` <i class="fa-solid fa-volume-high"></i> ${channelsText} - ${bitRateText} <i class="fa-solid fa-microchip"></i> ${codecText}`;
    }
  }

  if (audioLabel) {
    const audioSpan = document.createElement("span");
    audioSpan.className = "audio-label";
    audioSpan.innerHTML = audioLabel;
    container.appendChild(audioSpan);
  }

  if (subtitleLabel) {
    const subtitleSpan = document.createElement("span");
    subtitleSpan.className = "subtitle-label";
    subtitleSpan.innerHTML = subtitleLabel;
    container.appendChild(subtitleSpan);
  }

  return container;
}

export function createMetaContainer() {
  const container = document.createElement("div");
  container.className = "meta-container";
  applyContainerStyles(container, 'meta');
  return container;
}

export function createMainContentContainer() {
  const container = document.createElement("div");
  container.className = "main-content-container";
  return container;
}

export function createPlotContainer(config, Overview) {
  const container = document.createElement("div");
  container.className = "plot-container";
  applyContainerStyles(container, 'plot');

  if (config.showDescriptions && config.showPlotInfo && Overview) {
    if (config.showbPlotInfo && config.languageLabels.konu) {
      const plotBSpan = document.createElement("span");
      plotBSpan.className = "plotb";
      plotBSpan.textContent = config.languageLabels.konu;
      container.appendChild(plotBSpan);
    }
    const plotSpan = document.createElement("span");
    plotSpan.className = "plot";
    plotSpan.textContent = "\u00A0\u00A0" + Overview;
    container.appendChild(plotSpan);
  }
  return container;
}

export function createTitleContainer({ config, Taglines, title, OriginalTitle }) {
  const container = document.createElement("div");
  container.className = "title-container";
  applyContainerStyles(container, 'title');

  if (config.showDescriptions && config.showTitleInfo && title) {
    const titleSpan = document.createElement("span");
    titleSpan.className = "baslik";
    titleSpan.textContent = title;
    container.appendChild(titleSpan);
  }

  if (Taglines && Taglines.length && config.showDescriptions && config.showSloganInfo) {
    const sloganSpan = document.createElement("span");
    sloganSpan.className = "slogan";
    sloganSpan.innerHTML = `“ ${Taglines.join(
      ' <i class="fa-solid fa-sparkle fa-2xs" style="color: #ffffff;"></i> '
    )} ”`;
    container.appendChild(sloganSpan);
  }

  if (config.showDescriptions && config.showOriginalTitleInfo && OriginalTitle) {
    if (!config.hideOriginalTitleIfSame || title !== OriginalTitle) {
      const originalTitleSpan = document.createElement("span");
      originalTitleSpan.className = "o-baslik";
      originalTitleSpan.textContent = OriginalTitle;
      container.appendChild(originalTitleSpan);
    }
  }

  return container;
}
