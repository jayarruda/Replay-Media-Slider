import { getConfig } from './config.js';
import { updateSlidePosition } from './positionUtils.js';

export function forceHomeSectionsTop() {
  const applyAlways = () => {
    const topValue = getConfig().homeSectionsTop;

    const elements = [
      ...document.querySelectorAll('.homeSectionsContainer'),
      document.querySelector('#favoritesTab')
    ];

    elements.forEach(el => {
      if (!el) return;

      if (typeof topValue === 'number' && !isNaN(topValue) && topValue !== 0) {
        el.style.setProperty('top', `${topValue}vh`, 'important');
      } else {
        el.style.removeProperty('top');
      }
    });
    waitForFavoritesTabAndApply(topValue);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAlways);
  } else {
    applyAlways();
  }

  const observer = new MutationObserver(applyAlways);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: false
  });
}

function waitForFavoritesTabAndApply(topValue) {
  let tries = 0;
  function attempt() {
    const el = document.querySelector('#favoritesTab');
    if (el) {
      if (typeof topValue === 'number' && !isNaN(topValue) && topValue !== 0) {
        el.style.setProperty('top', `${topValue}vh`, 'important');
      } else {
        el.style.removeProperty('top');
      }
      return;
    }
    if (++tries < 30) setTimeout(attempt, 100);
  }
  attempt();
}


export function forceSkinHeaderPointerEvents() {
  const apply = () => {
    document.querySelectorAll('html .skinHeader').forEach(el => {
      el.style.setProperty('pointer-events', 'all', 'important');
    });

    const playerToggle = document.querySelector('button#jellyfinPlayerToggle');
    if (playerToggle) {
      playerToggle.style.setProperty('display', 'block', 'important');
      playerToggle.style.setProperty('opacity', '1', 'important');
      playerToggle.style.setProperty('pointer-events', 'all', 'important');
      playerToggle.style.setProperty('background', 'none', 'important');
      playerToggle.style.setProperty('text-shadow', 'rgb(255, 255, 255) 0px 0px 2px', 'important');
      playerToggle.style.setProperty('cursor', 'pointer', 'important');
      playerToggle.style.setProperty('border', 'none', 'important');
      playerToggle.style.setProperty('font-size', '1.4em', 'important');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: false
  });
}
