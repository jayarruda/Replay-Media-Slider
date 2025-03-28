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
    window.mySlider = null;
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
};
