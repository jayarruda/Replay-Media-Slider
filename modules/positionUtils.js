import { getConfig } from "./config.js";

const config = getConfig();

export function applyContainerStyles(container, type = '') {
  const config = getConfig();
  let prefix;
  if (type === 'progress') {
    prefix = 'progressBar';
  } else if (type) {
    prefix = `${type}Container`;
  } else {
    prefix = 'slide';
  }

  if (config[`${prefix}Top`]) {
    container.style.top = `${config[`${prefix}Top`]}%`;
  } else {
    container.style.top = '';
  }

  if (config[`${prefix}Left`]) {
    container.style.left = `${config[`${prefix}Left`]}%`;
  } else {
    container.style.left = '';
  }

  if (config[`${prefix}Width`]) {
    container.style.width = `${config[`${prefix}Width`]}%`;
  } else {
    container.style.width = '';
  }

  if (config[`${prefix}Height`]) {
    container.style.height = `${config[`${prefix}Height`]}%`;
  } else {
    container.style.height = '';
  }

  if (type && type !== 'slide') {
    if (config[`${prefix}Display`]) {
      container.style.display = config[`${prefix}Display`];
    } else {
      container.style.display = '';
    }

    if (config[`${prefix}FlexDirection`]) {
      container.style.flexDirection = config[`${prefix}FlexDirection`];
    } else {
      container.style.flexDirection = '';
    }

    if (config[`${prefix}JustifyContent`]) {
      container.style.justifyContent = config[`${prefix}JustifyContent`];
    } else {
      container.style.justifyContent = '';
    }

    if (config[`${prefix}AlignItems`]) {
      container.style.alignItems = config[`${prefix}AlignItems`];
    } else {
      container.style.alignItems = '';
    }

    if (config[`${prefix}FlexWrap`]) {
      container.style.flexWrap = config[`${prefix}FlexWrap`];
    } else {
      container.style.flexWrap = '';
    }
  }
}

export function updateSlidePosition() {
  const config = getConfig();

  const slidesContainer = document.querySelector("#slides-container");
  if (slidesContainer) applyContainerStyles(slidesContainer);

  document.querySelectorAll('.logo-container').forEach(container => {
    applyContainerStyles(container, 'logo');
  });
  document.querySelectorAll('.meta-container').forEach(container => {
    applyContainerStyles(container, 'meta');
  });
  document.querySelectorAll('.plot-container').forEach(container => {
    applyContainerStyles(container, 'plot');
  });
  document.querySelectorAll('.title-container').forEach(container => {
    applyContainerStyles(container, 'title');
  });
  document.querySelectorAll('.director-container').forEach(container => {
    applyContainerStyles(container, 'director');
  });
  document.querySelectorAll('.info-container').forEach(container => {
    applyContainerStyles(container, 'info');
  });
  document.querySelectorAll('.main-button-container').forEach(container => {
    applyContainerStyles(container, 'button');
  });
  document.querySelectorAll('.dot-navigation-container').forEach(container => {
    applyContainerStyles(container, 'existingDot');
  });
  document.querySelectorAll('.provider-container').forEach(container => {
    applyContainerStyles(container, 'provider');
  });

  const sliderWrapper = document.querySelector(".slider-wrapper");
  if (sliderWrapper) applyContainerStyles(sliderWrapper, 'slider');

  const progressBar = document.querySelector(".slide-progress-bar");
  if (progressBar) applyContainerStyles(progressBar, 'progress');

  const homeSectionsContainer = document.querySelector(".homeSectionsContainer");
  if (homeSectionsContainer) {
    if (config.homeSectionsTop) {
      homeSectionsContainer.style.top = `${config.homeSectionsTop}vh`;
    } else {
      homeSectionsContainer.style.top = '';
    }
  }
}
