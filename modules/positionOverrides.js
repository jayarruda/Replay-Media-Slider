import { getConfig } from './config.js';
import { updateSlidePosition } from './positionUtils.js';

export function forceHomeSectionsTop() {
  const apply = () => {
    const container = document.querySelector('.homeSectionsContainer');
    if (!container) return;
    const topValue = getConfig().homeSectionsTop;
    if (typeof topValue === 'number' && !isNaN(topValue) && topValue !== 0) {
      container.style.setProperty('top', `${topValue}vh`, 'important');
    } else {
      container.style.removeProperty('top');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    updateSlidePosition();
    apply();
  }


  const obs = new MutationObserver(apply);
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true
  });
}
