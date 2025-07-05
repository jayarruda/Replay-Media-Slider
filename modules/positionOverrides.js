import { getConfig } from './config.js';
import { updateSlidePosition } from './positionUtils.js';

export function forceHomeSectionsTop() {
  const applyAlways = () => {
    const containers = document.querySelectorAll('.homeSectionsContainer');
    containers.forEach(container => {
      const topValue = getConfig().homeSectionsTop;
      if (typeof topValue === 'number' && !isNaN(topValue) && topValue !== 0) {
        container.style.setProperty('top', `${topValue}vh`, 'important');
      } else {
        container.style.removeProperty('top');
      }
    });
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
      playerToggle.style.setProperty('margin-left', '12px', 'important');
      playerToggle.style.setProperty('text-shadow', 'rgb(255, 255, 255) 0px 0px 2px', 'important');
      playerToggle.style.setProperty('color', 'inherit', 'important');
      playerToggle.style.setProperty('cursor', 'pointer', 'important');
      playerToggle.style.setProperty('border', 'none', 'important');
      playerToggle.style.setProperty('font-size', '1.2em', 'important');
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
