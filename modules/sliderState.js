import { getConfig } from "./config.js";

let currentIndex = 0;
let autoSlideTimeout = null;
let slideStartTime = 0;
let remainingTime = 0;

export function setCurrentIndex(index) {
  currentIndex = index;
}

export function getCurrentIndex() {
  return currentIndex;
}

export function getSlideDuration() {
  return getConfig().sliderDuration;
}

export function setAutoSlideTimeout(timeout) {
  autoSlideTimeout = timeout;
}

export function getAutoSlideTimeout() {
  return autoSlideTimeout;
}

export function setSlideStartTime(time) {
  slideStartTime = time;
}

export function getSlideStartTime() {
  return slideStartTime;
}

export function setRemainingTime(time) {
  remainingTime = time;
}

export function getRemainingTime() {
  return remainingTime;
}
