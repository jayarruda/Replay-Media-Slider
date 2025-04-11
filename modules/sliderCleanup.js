import { setCurrentIndex } from "./sliderState.js";
import { stopSlideTimer } from "./timer.js";

export function fullSliderReset() {
  if (window.intervalChangeSlide) {
    clearInterval(window.intervalChangeSlide);
    window.intervalChangeSlide = null;
  }
  if (window.sliderTimeout) {
    clearTimeout(window.sliderTimeout);
    window.sliderTimeout = null;
  }

  setCurrentIndex(0);
  stopSlideTimer();
  cleanupSlider();

  window.mySlider = {};
  window.cachedListContent = "";
  console.log("Slider tamamen resetlendi.");
}

export function cleanupSlider() {
  if (window.mySlider) {
    if (window.mySlider.autoSlideTimeout) {
      clearTimeout(window.mySlider.autoSlideTimeout);
    }
    if (window.mySlider.sliderTimeout) {
      clearTimeout(window.mySlider.sliderTimeout);
    }
    if (window.mySlider.intervalChangeSlide) {
      clearInterval(window.mySlider.intervalChangeSlide);
    }
    window.mySlider = {};
    console.log("Global slider instance temizlendi.");
  }

  const indexPage = document.querySelector("#indexPage:not(.hide)");
  if (indexPage) {
    const sliderContainer = indexPage.querySelector("#slides-container");
    if (sliderContainer) {
      sliderContainer.remove();
      console.log("Eski slider container kaldırıldı.");
    }
  }
}
