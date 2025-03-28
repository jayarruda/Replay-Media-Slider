import { stopSlideTimer, startSlideTimer } from "./timer.js";
import { SLIDE_DURATION } from "./timer.js";
import { getConfig } from './config.js';
import {
  ensureProgressBarExists,
  resetProgressBar,
  startProgressBarWithDuration,
  pauseProgressBar,
  resumeProgressBar,
} from "./progressBar.js";
import {
  getCurrentIndex,
  setCurrentIndex,
  getSlideDuration,
  setAutoSlideTimeout,
  getAutoSlideTimeout,
  setSlideStartTime,
  getSlideStartTime,
  setRemainingTime,
  getRemainingTime,
} from "./sliderState.js";

export function changeSlide(direction) {
  const slides = document.querySelectorAll(".slide");
  if (!slides.length) return;
  const currentIndex = getCurrentIndex();
  const newIndex = (currentIndex + direction + slides.length) % slides.length;
  setCurrentIndex(newIndex);
  console.log("Slide değişiyor, currentIndex:", newIndex);
  displaySlide(newIndex);
}

export function updateActiveDot() {
  const currentIndex = getCurrentIndex();
  const dots = document.querySelectorAll(".dot");
  dots.forEach((dot, index) => {
    if (index === currentIndex) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
}


export function createDotNavigation() {
  const config = getConfig();
  if (!config.showDotNavigation) {
    const existingDotContainer = document.querySelector(".dot-navigation-container");
    if (existingDotContainer) existingDotContainer.remove();
    return;
  }

  const dotType = config.dotBackgroundImageType;
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) return;
  const slidesContainer = indexPage.querySelector("#slides-container");
  const slides = slidesContainer.querySelectorAll(".slide");

  let dotContainer = slidesContainer.querySelector(".dot-navigation-container");
  if (dotContainer) dotContainer.remove();

  dotContainer = document.createElement("div");
  dotContainer.className = "dot-navigation-container";
  const currentIndex = getCurrentIndex();

  slides.forEach((slide, index) => {
    const dot = document.createElement("span");
    dot.className = "dot";
    let imageUrl = "";
    if (dotType === "none") {
      imageUrl = "";
    } else if (dotType === "useSlideBackground") {
      imageUrl = slide.dataset.background;
    } else {
      imageUrl = slide.dataset[dotType];
    }

    if (imageUrl) {
      dot.style.backgroundImage = `url(${imageUrl})`;
      dot.style.backgroundSize = "cover";
      dot.style.backgroundPosition = "center";
    }
    if (index === currentIndex) {
      dot.classList.add("active");
    }
    dot.addEventListener("click", () => {
      setCurrentIndex(index);
      displaySlide(index);
    });
    dotContainer.appendChild(dot);
  });

  slidesContainer.appendChild(dotContainer);
}

export function displaySlide(index) {
  console.log("displaySlide çağrıldı, index:", index);
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) return;
  const slides = indexPage.querySelectorAll(".slide");
  slides.forEach((slide, i) => {
    if (i === index) {
      slide.style.opacity = "0";
      slide.style.display = "block";
      setTimeout(() => {
        slide.style.opacity = "1";
        slide.classList.add("active");
        const directorContainer = slide.querySelector(".director-container");
        if (directorContainer) {
          directorContainer.style.opacity = "0";
          directorContainer.style.display = "none";
          directorContainer.style.transition = "opacity 1s";
          setTimeout(() => {
            directorContainer.style.display = "flex";
            directorContainer.style.opacity = "1";
          }, 1000);
          setTimeout(() => {
            directorContainer.style.opacity = "0";
          }, 7500);
        }
      }, 50);
    } else {
      slide.style.opacity = "0";
      slide.classList.remove("active");
      setTimeout(() => (slide.style.display = "none"), 500);
    }
  });
  resetProgressBar();
  stopSlideTimer();
  setRemainingTime(SLIDE_DURATION);
  startSlideTimer();
  updateActiveDot();
  createDotNavigation();
}
