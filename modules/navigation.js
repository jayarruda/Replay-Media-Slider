import { stopSlideTimer, startSlideTimer } from "./timer.js";
import { SLIDE_DURATION } from "./timer.js";
import { getConfig } from './config.js';
import { ensureProgressBarExists, resetProgressBar, startProgressBarWithDuration, pauseProgressBar, resumeProgressBar } from "./progressBar.js";
import { getCurrentIndex, setCurrentIndex, getSlideDuration, setAutoSlideTimeout, getAutoSlideTimeout, setSlideStartTime, getSlideStartTime, setRemainingTime, getRemainingTime } from "./sliderState.js";
import { applyContainerStyles } from "./positionUtils.js"
import { playNow } from "./api.js";

const config = getConfig();

const animationStyles = `
@keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }

    @keyframes shake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        50% { transform: translateX(4px); }
        75% { transform: translateX(-2px); }
        100% { transform: translateX(0); }
    }

    @keyframes fadeZoomIn {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    @keyframes diagonalSlideIn {
        from {
            transform: translate(-100%, -100%) scale(0.5);
            opacity: 0;
        }
        to {
            transform: translate(0, 0) scale(1);
            opacity: 1;
        }
    }

    .slide {
        transform-style: preserve-3d;
        perspective: 1000px;
        backface-visibility: hidden;
    }

    .dot-navigation-container {
        position: relative;
    }

    .poster-dot {
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .poster-dot.active {
        position: relative;
        z-index: 10;
    }

    .poster-dot img {
        transition: all 0.3s ease;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .poster-dot.active.color-animation img {
        filter: brightness(1.2) saturate(1.5) !important;
    }

    .poster-dot.color-animation img {
        filter: brightness(1) saturate(1);
        transition: filter 0.5s ease;
    }

    .poster-dot.scale-animation {
        transform: scale(1);
        transition: transform 0.3s ease;
    }

    .poster-dot.scale-animation.active {
        transform: scale(1.1);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
    }

    .poster-dot.bounce-animation.active {
        animation: bounce 0.5s;
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
    }

    .poster-dot.rotate-animation {
        transform: rotate(0deg);
        transition: transform 0.3s ease;
    }

    .poster-dot.rotate-animation.active {
        transform: rotate(5deg);
    }

    .poster-dot.float-animation {
        transform: translateY(0);
        transition: transform 0.3s ease;
    }

    .poster-dot.float-animation.active {
        transform: translateY(-10px);
    }

    .poster-dot.pulse-animation.active {
        animation: pulse 0.8s ease-in-out;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }

    .poster-dot.tilt-animation {
        transform: rotate(0deg);
        transition: transform 0.4s ease;
    }

    .poster-dot.tilt-animation.active {
        transform: rotate(-5deg);
    }

    .poster-dot.shake-animation.active {
        animation: shake 0.4s ease;
        box-shadow: 0 0 5px rgba(255, 255, 255, 0.4);
    }

    .slide.fadezoom-animation {
        animation: fadeZoomIn 0.6s ease forwards;
    }

    .slide.diagonal-animation {
        animation: diagonalSlideIn 0.7s ease forwards;
    }
`;

const existingStyle = document.getElementById('slide-animation-styles');
if (existingStyle) {
    existingStyle.remove();
}

const styleElement = document.createElement('style');
styleElement.id = 'slide-animation-styles';
styleElement.innerHTML = animationStyles;
document.head.appendChild(styleElement);

let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50;

export function changeSlide(direction) {
  const slides = document.querySelectorAll(".slide");
  if (!slides.length) return;

  stopSlideTimer();
  resetProgressBar();

  const currentIndex = getCurrentIndex();
  const newIndex = (currentIndex + direction + slides.length) % slides.length;
  setCurrentIndex(newIndex);

  console.log("Slayt değişiyor, yeni indeks:", newIndex);
  displaySlide(newIndex);

  setRemainingTime(SLIDE_DURATION);
  startSlideTimer();
}

export function updateActiveDot() {
  const currentIndex = getCurrentIndex();
  const dots = document.querySelectorAll(".dot");
  const config = getConfig();

  dots.forEach((dot, index) => {
    const wasActive = dot.classList.contains("active");
    const isActive = index === currentIndex;

    dot.classList.toggle("active", isActive);

    if (config.dotPosterMode && config.enableDotPosterAnimations) {
        if (wasActive !== isActive) {
            applyDotPosterAnimation(dot, isActive);
        }
    }
  });
}

let centerCalledOnce = false;

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
  if (!slidesContainer) {
    console.warn("Slayt konteynırı bulunamadı, nokta navigasyonu oluşturulamıyor");
    return;
  }

  const slides = slidesContainer.querySelectorAll(".slide");
  if (!slides.length) return;

  let dotContainer = slidesContainer.querySelector(".dot-navigation-container");
  if (!dotContainer) {
    dotContainer = document.createElement("div");
    dotContainer.className = "dot-navigation-container";
    applyContainerStyles(dotContainer, 'existingDot');
    slidesContainer.appendChild(dotContainer);
  }

  const currentIndex = getCurrentIndex();

  if (config.dotPosterMode) {
    dotContainer.innerHTML = "";
    dotContainer.classList.add("dot-poster-mode");

    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "dot-scroll-wrapper";

    slides.forEach((slide, index) => {
  const itemId = slide.dataset.itemId;
  if (!itemId) {
    console.warn(`Dot oluşturulamadı: slide ${index} için itemId eksik`);
    return;
  }

  const dot = document.createElement("div");
  dot.className = "dot poster-dot";
  dot.dataset.index = index;
  dot.dataset.itemId = itemId;

  const imageUrl = dotType === "useSlideBackground"
    ? slide.dataset.background
    : slide.dataset[dotType];

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.className = "dot-poster-image";
    image.style.opacity = config.dotBackgroundOpacity || 0.3;
    image.style.filter = `blur(${config.dotBackgroundBlur ?? 10}px)`;
    dot.appendChild(image);
  }

  const positionTicks = Number(slide.dataset.playbackpositionticks);
  const runtimeTicks = Number(slide.dataset.runtimeticks);

  if (
    config.showPlaybackProgress &&
    !isNaN(positionTicks) &&
    !isNaN(runtimeTicks) &&
    positionTicks > 0 &&
    positionTicks < runtimeTicks
  ) {
    const progressContainer = document.createElement("div");
    progressContainer.className = "dot-progress-container";

    const barWrapper = document.createElement("div");
    barWrapper.className = "dot-duration-bar-wrapper";

    const bar = document.createElement("div");
    bar.className = "dot-duration-bar";

    const percentage = Math.min((positionTicks / runtimeTicks) * 100, 100);
    bar.style.width = `${percentage.toFixed(1)}%`;

    const remainingMinutes = Math.round((runtimeTicks - positionTicks) / 600000000);
    const text = document.createElement("span");
    text.className = "dot-duration-remaining";
    text.innerHTML = `<i class="fa-regular fa-hourglass-half"></i> ${remainingMinutes} ${config.languageLabels.dakika} ${config.languageLabels.kaldi}`;

    barWrapper.appendChild(bar);
    progressContainer.appendChild(barWrapper);
    progressContainer.appendChild(text);
    dot.appendChild(progressContainer);
  }

  const playButton = document.createElement("button");
  playButton.className = "dot-play-button";
  const isPlayed = slide.dataset.played === "true";
  playButton.textContent = isPlayed ? config.languageLabels.devamet : config.languageLabels.izle;

  playButton.addEventListener("click", async (e) => {
    e.stopPropagation();
    const itemId = e.currentTarget.closest(".poster-dot")?.dataset.itemId;
    if (!itemId) {
      alert("Oynatma başlatılamadı: itemId eksik");
      return;
    }
    try {
      await playNow(itemId);
    } catch (error) {
      console.error("Oynatma hatası:", error);
      alert("Oynatma başlatılamadı: " + error.message);
    }
  });

  dot.appendChild(playButton);
  dot.classList.toggle("active", index === currentIndex);
if (config.dotPosterMode && config.enableDotPosterAnimations) {
    applyDotPosterAnimation(dot, index === currentIndex);
}

dot.addEventListener("click", () => {
    if (index !== getCurrentIndex()) {
        changeSlide(index - getCurrentIndex());
    }
});

if (config.dotPosterMode && config.enableDotPosterAnimations) {
    dot.addEventListener("mouseenter", () => {
        if (!dot.classList.contains("active")) {
            dot.style.transform = "scale(1.05)";
            dot.style.zIndex = "5";
        }
    });

    dot.addEventListener("mouseleave", () => {
        if (!dot.classList.contains("active")) {
            dot.style.transform = "";
            dot.style.zIndex = "";
        }
    });
}

  scrollWrapper.appendChild(dot);
});

    const leftArrow = document.createElement("button");
    leftArrow.className = "dot-arrow dot-arrow-left";
    leftArrow.innerHTML = "&#10094;";
    leftArrow.addEventListener("click", () => {
      scrollWrapper.scrollBy({ left: -scrollWrapper.clientWidth, behavior: "smooth" });
    });

    const rightArrow = document.createElement("button");
    rightArrow.className = "dot-arrow dot-arrow-right";
    rightArrow.innerHTML = "&#10095;";
    rightArrow.addEventListener("click", () => {
      scrollWrapper.scrollBy({ left: scrollWrapper.clientWidth, behavior: "smooth" });
    });

    dotContainer.append(leftArrow, scrollWrapper, rightArrow);

    const resizeObserver = new ResizeObserver(() => {
      centerActiveDot();
    });
    resizeObserver.observe(scrollWrapper);

    setTimeout(centerActiveDot, 300);
    return;
  }

  dotContainer.innerHTML = "";
  const currentDotIndex = getCurrentIndex();

  slides.forEach((slide, index) => {
    const dot = document.createElement("span");
    dot.className = "dot";

    const imageUrl = dotType === "useSlideBackground"
      ? slide.dataset.background
      : slide.dataset[dotType];

    if (imageUrl) {
      const imageOverlay = document.createElement("div");
      imageOverlay.className = "dot-image-overlay";
      imageOverlay.style.backgroundImage = `url(${imageUrl})`;
      imageOverlay.style.backgroundSize = "cover";
      imageOverlay.style.backgroundPosition = "center";
      imageOverlay.style.opacity = config.dotBackgroundOpacity || 0.3;
      imageOverlay.style.filter = `blur(${config.dotBackgroundBlur ?? 10}px)`;
      dot.appendChild(imageOverlay);
    }

    dot.classList.toggle("active", index === currentDotIndex);
    dot.addEventListener("click", () => {
      if (index !== getCurrentIndex()) {
        changeSlide(index - getCurrentIndex());
      }
    });

    dotContainer.appendChild(dot);
  });
}


function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function centerActiveDot() {
  const scrollWrapper = document.querySelector(".dot-scroll-wrapper");
  const activeDot = scrollWrapper?.querySelector(".poster-dot.active");
  if (!scrollWrapper || !activeDot) return;

  const wrapperRect = scrollWrapper.getBoundingClientRect();
  const dotRect = activeDot.getBoundingClientRect();

  const isFullyVisible =
    dotRect.left >= wrapperRect.left &&
    dotRect.right <= wrapperRect.right;

  const dotCenter = dotRect.left + dotRect.width / 2;
  const isCentered =
    dotCenter > wrapperRect.left + wrapperRect.width * 0.4 &&
    dotCenter < wrapperRect.right - wrapperRect.width * 0.4;

  if (isFullyVisible && isCentered) return;

  const scrollAmount = activeDot.offsetLeft - (scrollWrapper.clientWidth / 1) + (activeDot.offsetWidth / 2);
  const currentScroll = scrollWrapper.scrollLeft;

  if (Math.abs(currentScroll - scrollAmount) > 10) {
    scrollWrapper.scrollTo({ left: scrollAmount, behavior: "smooth" });
  }
}


export function displaySlide(index) {
  console.log(`Slayt gösteriliyor: ${index}`);
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) return;

  const slides = indexPage.querySelectorAll(".slide");
  if (!slides.length) return;

  const currentSlide = slides[index];
  if (!currentSlide) return;

  const currentIndex = getCurrentIndex();
  const direction = index > currentIndex ? 1 : -1;
  const activeSlide = indexPage.querySelector(".slide.active");

  if (activeSlide) {
    applySlideAnimation(activeSlide, currentSlide, direction);
  } else {
    currentSlide.style.display = "block";
    currentSlide.style.opacity = "1";
  }

  if (activeSlide) {
    applySlideAnimation(activeSlide, currentSlide, direction);
  }

  slides.forEach(slide => {
    if (slide !== currentSlide) {
      slide.classList.remove("active");
      setTimeout(() => {
        if (!slide.classList.contains("active")) {
          slide.style.display = "none";
        }
      }, getConfig().slideAnimationDuration || 300);
    }
  });

  currentSlide.style.display = "block";
  setTimeout(() => {
    currentSlide.classList.add("active");
    currentSlide.dispatchEvent(new CustomEvent("slideActive"));

    const directorContainer = currentSlide.querySelector(".director-container");
    if (directorContainer) {
      directorContainer.style.transition = "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease";
      directorContainer.style.transform = "scale(0.95)";
      directorContainer.style.opacity = "0";
      directorContainer.style.display = "none";

      setTimeout(() => {
        directorContainer.style.display = "flex";
        setTimeout(() => {
          directorContainer.style.transform = "scale(1)";
          directorContainer.style.opacity = "1";
        }, 50);
        setTimeout(() => {
          directorContainer.style.opacity = "0";
        }, config.aktifSure);
      }, config.girisSure);
    }
  }, 50);

  updateActiveDot();
  createDotNavigation();
  initSliderArrows(currentSlide);
  initSwipeEvents();
}

function initSliderArrows(slide) {
  const actorContainer = slide.querySelector(".artist-container");
  const leftArrow = slide.querySelector(".slider-arrow.left");
  const rightArrow = slide.querySelector(".slider-arrow.right");

  if (!actorContainer || !leftArrow || !rightArrow) return;

  const updateArrows = () => {
    const maxScrollLeft = actorContainer.scrollWidth - actorContainer.clientWidth;
    leftArrow.classList.toggle("hidden", actorContainer.scrollLeft <= 0);
    rightArrow.classList.toggle("hidden", actorContainer.scrollLeft >= maxScrollLeft - 1);
  };

  leftArrow.onclick = () => {
    actorContainer.scrollBy({ left: -actorContainer.clientWidth, behavior: "smooth" });
    setTimeout(updateArrows, 300);
  };

  rightArrow.onclick = () => {
    actorContainer.scrollBy({ left: actorContainer.clientWidth, behavior: "smooth" });
    setTimeout(updateArrows, 300);
  };

  actorContainer.addEventListener("scroll", updateArrows);
  setTimeout(updateArrows, 100);
}

export function initSwipeEvents() {
  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (!indexPage) return;

  const slidesContainer = indexPage.querySelector("#slides-container");
  if (!slidesContainer) return;

  slidesContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
  slidesContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  slidesContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
}

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}

function handleTouchMove(e) {
  if (Math.abs(e.changedTouches[0].screenX - touchStartX) >
      Math.abs(e.changedTouches[0].screenY - touchStartY)) {
    e.preventDefault();
  }
}

function handleTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipeGesture();
}

function handleSwipeGesture() {
  const deltaX = touchEndX - touchStartX;

  if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
    if (deltaX > 0) {
      changeSlide(-1);
    } else {
      changeSlide(1);
    }
  }
}

function applySlideAnimation(currentSlide, newSlide, direction) {
    if (!currentSlide || !newSlide) return;

    const config = getConfig();
    if (!config.enableSlideAnimations) {
        newSlide.style.display = "block";
        newSlide.style.opacity = "1";
        return;
    }

    const duration = config.slideAnimationDuration || 500;
    const transitionType = config.slideTransitionType || 'fade';

    currentSlide.style.transition = `all ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`;
    newSlide.style.transition = `all ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`;
    newSlide.style.display = "block";

    if (transitionType === 'fade' || !transitionType) {
        currentSlide.style.opacity = "0";
        newSlide.style.opacity = "0";

        setTimeout(() => {
            newSlide.style.opacity = "1";
        }, 20);

        return;
    }

    switch (transitionType) {
    case 'slide':
        currentSlide.style.transition = 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out';
        newSlide.style.transition = 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out';

        currentSlide.style.transform = `translateX(${direction > 0 ? '-100%' : '100%'})`;
        currentSlide.style.opacity = '0';

        newSlide.style.transform = `translateX(${direction > 0 ? '100%' : '-100%'})`;
        newSlide.style.opacity = '1';

        setTimeout(() => {
            newSlide.style.transform = 'translateX(0)';
        }, 20);
        break;

        case 'flip':
            currentSlide.style.transform = `rotateY(${direction > 0 ? -180 : 180}deg)`;
            currentSlide.style.opacity = "0";
            newSlide.style.transform = `rotateY(${direction > 0 ? 180 : -180}deg)`;
            newSlide.style.opacity = "0";
            setTimeout(() => {
                newSlide.style.transform = "rotateY(0deg)";
                newSlide.style.opacity = "1";
            }, 10);
            break;

        case 'glitch':
            currentSlide.style.filter = "blur(10px)";
            currentSlide.style.opacity = "0";
            newSlide.style.filter = "blur(10px)";
            newSlide.style.opacity = "0";
            newSlide.style.clipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";

            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    if (newSlide) {
                        newSlide.style.clipPath = `polygon(
                            0 ${Math.random() * 100}%,
                            100% ${Math.random() * 100}%,
                            100% ${Math.random() * 100}%,
                            0 ${Math.random() * 100}%
                        )`;
                    }
                }, i * 50);
            }

            setTimeout(() => {
                if (newSlide) {
                    newSlide.style.filter = "blur(0)";
                    newSlide.style.opacity = "1";
                    newSlide.style.clipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
                }
            }, duration - 100);
            break;

        case 'morph':
            currentSlide.style.borderRadius = "50%";
            currentSlide.style.transform = "scale(0.1) rotate(180deg)";
            currentSlide.style.opacity = "0";
            newSlide.style.borderRadius = "50%";
            newSlide.style.transform = "scale(0.1) rotate(-180deg)";
            newSlide.style.opacity = "0";
            setTimeout(() => {
                if (newSlide) {
                    newSlide.style.borderRadius = "0";
                    newSlide.style.transform = "scale(1) rotate(0deg)";
                    newSlide.style.opacity = "1";
                }
            }, 10);
            break;

        case 'cube':
            currentSlide.style.transform = `translateZ(-200px) rotateY(${direction > 0 ? -90 : 90}deg)`;
            currentSlide.style.opacity = "0";
            newSlide.style.transform = `translateZ(-200px) rotateY(${direction > 0 ? 90 : -90}deg)`;
            newSlide.style.opacity = "0";
            setTimeout(() => {
                if (newSlide) {
                    newSlide.style.transform = "translateZ(0) rotateY(0deg)";
                    newSlide.style.opacity = "1";
                }
            }, 10);
            break;

        case 'zoom':
            currentSlide.style.transform = "scale(1.5)";
            currentSlide.style.opacity = "0";
            newSlide.style.transform = "scale(0.5)";
            newSlide.style.opacity = "0";
            setTimeout(() => {
                if (newSlide) {
                    newSlide.style.transform = "scale(1)";
                    newSlide.style.opacity = "1";
                }
            }, 10);
            break;

        case 'slide3d':
            currentSlide.style.transform = `translateX(${direction > 0 ? -100 : 100}%) translateZ(-100px) rotateY(30deg)`;
            currentSlide.style.opacity = "0";
            newSlide.style.transform = `translateX(${direction > 0 ? 100 : -100}%) translateZ(-100px) rotateY(-30deg)`;
            newSlide.style.opacity = "0";
            setTimeout(() => {
                if (newSlide) {
                    newSlide.style.transform = "translateX(0) translateZ(0) rotateY(0deg)";
                    newSlide.style.opacity = "1";
                }
            }, 10);
            break;

            case 'diagonal':
            currentSlide.style.transform = `translate(${direction > 0 ? "-100%" : "100%"}, -100%)`;
            currentSlide.style.opacity = "0";
            newSlide.style.transform = `translate(${direction > 0 ? "100%" : "-100%"}, 100%)`;
            newSlide.style.opacity = "0";
            setTimeout(() => {
                    newSlide.style.transform = "translate(0, 0)";
                    newSlide.style.opacity = "1";
            }, 10);
            break;

            case 'fadezoom':
            currentSlide.style.opacity = "1";
            currentSlide.style.transform = "scale(1)";
            newSlide.style.opacity = "0";
            newSlide.style.transform = "scale(1.5)";
            setTimeout(() => {
                    newSlide.style.opacity = "1";
                    newSlide.style.transform = "scale(1)";
            }, 10);
            break;

            case 'parallax':
            currentSlide.style.transition = 'transform 0.7s cubic-bezier(0.22, 0.61, 0.36, 1)';
            newSlide.style.transition = 'transform 0.7s cubic-bezier(0.22, 0.61, 0.36, 1)';

            currentSlide.style.transform = `translateX(${direction > 0 ? '-30%' : '30%'})`;
            newSlide.style.transform = `translateX(${direction > 0 ? '50%' : '-50%'})`;

            setTimeout(() => {
                    newSlide.style.transform = 'translateX(0)';
            }, 20);
            break;

            case 'blur-fade':
            currentSlide.style.transition = 'filter 0.6s ease, opacity 0.6s ease';
            newSlide.style.transition = 'filter 0.6s ease, opacity 0.6s ease';

            currentSlide.style.filter = 'blur(5px)';
            currentSlide.style.opacity = '0';
            newSlide.style.filter = 'blur(5px)';
            newSlide.style.opacity = '0';
            setTimeout(() => {
            newSlide.style.filter = 'blur(0)';
            newSlide.style.opacity = '1';
            }, 20);
            break;

        default:
            if (newSlide) {
                newSlide.style.opacity = "1";
            }
    }

    setTimeout(() => {
        if (currentSlide) {
            currentSlide.style.transform = "";
            currentSlide.style.filter = "";
            currentSlide.style.clipPath = "";
            currentSlide.style.borderRadius = "";
        }
        if (newSlide) {
            newSlide.style.transform = "";
            newSlide.style.filter = "";
            newSlide.style.clipPath = "";
            newSlide.style.borderRadius = "";
        }
    }, duration);
  setTimeout(() => {
        currentSlide.style.opacity = "0";
    }, duration - 100);
}

function applyDotPosterAnimation(dot, isActive) {
    const config = getConfig();
    if (!config.enableDotPosterAnimations || !config.dotPosterMode) return;

    const duration = config.dotPosterAnimationDuration;
    const transitionType = config.dotPosterTransitionType;

    dot.classList.remove(
        'scale-animation',
        'bounce-animation',
        'rotate-animation',
        'color-animation',
        'float-animation',
        'pulse-animation',
        'tilt-animation',
        'shake-animation'
    );

    dot.classList.add(`${transitionType}-animation`);

    dot.style.transition = `all ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;

    switch (transitionType) {
        case 'scale':
            dot.style.transform = isActive ? "scale(1.1)" : "scale(1)";
            dot.style.zIndex = isActive ? "10" : "";
            dot.style.boxShadow = isActive ? "0 0 20px rgba(255, 255, 255, 0.5)" : "";
            break;
        case 'bounce':
            dot.style.animation = isActive ? `bounce ${duration}ms` : "";
            dot.style.boxShadow = isActive ? "0 0 15px rgba(255, 255, 255, 0.7)" : "";
            break;
        case 'rotate':
            dot.style.transform = isActive ? "rotate(5deg)" : "rotate(0deg)";
            break;
        case 'color':
            const image = dot.querySelector('img');
            if (image) {
                image.style.filter = isActive
                    ? "brightness(1.2) saturate(1.5)"
                    : "brightness(1) saturate(1)";
            }
            break;
        case 'float':
            dot.style.transform = isActive
                ? "translateY(-10px)"
                : "translateY(0)";
            break;
        case 'pulse':
        case 'tilt':
        case 'shake':
            break;
    }
}
