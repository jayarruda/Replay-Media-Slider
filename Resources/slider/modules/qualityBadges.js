import { getCachedQuality, setCachedQuality, clearQualityCache, getQualitySnapshot } from './cacheManager.js';
import { fetchItemDetails } from './api.js';
import { getVideoQualityText } from "./containerUtils.js";
import { getConfig } from "./config.js";

const config = getConfig();

const BATCH_SIZE = 50;
const STICKY_MODE = true;
const QB_VER = '2';

let processingQueue = [];
let isProcessing = false;
let snapshotMap = null;

const observerOptions = {
  rootMargin: '1000px',
  threshold: 0
};

const memoryQualityHints = new Map();

export function primeQualityFromItems(items = []) {
  for (const it of items) {
    try {
      if (!it || !it.Id) continue;
      if (!['Movie','Episode'].includes(it.Type)) continue;
      const vs = it.MediaStreams?.find(s => s.Type === 'Video');
      if (!vs) continue;
      const q = getVideoQualityText(vs);
      if (!q) continue;
      memoryQualityHints.set(it.Id, q);
      setCachedQuality(it.Id, q, it.Type);
    } catch {}
  }
}

export function annotateDomWithQualityHints(root = document) {
  try {
    const nodes = root.querySelectorAll?.('.cardImageContainer[data-id], .cardOverlayContainer[data-id]') || [];
    nodes.forEach(card => {
      const id = card.getAttribute('data-id');
      if (!id) return;
      const q = card.dataset.quality
            || memoryQualityHints.get(id)
            || snapshotMap?.get(id);
      if (q) createBadge(card, q);
    });
  } catch {}
}

let observer = null;
let mutationObserver = null;

function isValidItemType(card) {
  const typeIndicator = card.querySelector('.itemTypeIndicator')?.textContent
                     || card.closest('[data-type]')?.getAttribute('data-type');
  return typeIndicator && ['Movie', 'Episode'].includes(typeIndicator);
}

async function processQueue() {
  if (isProcessing || processingQueue.length === 0) return;
  isProcessing = true;
  const batch = processingQueue.splice(0, BATCH_SIZE);

  try {
    await Promise.allSettled(batch.map(({ card, itemId }) => processCard(card, itemId)));
  } catch (error) {
    console.error('Kuyruk işlenirken hata oluştu:', error);
  } finally {
    isProcessing = false;
    if (processingQueue.length > 0) {
      const delay = Math.min(1500, 200 + processingQueue.length * 10);
      setTimeout(processQueue, delay);
    }
  }
}

async function processCard(card, itemId) {
  if (!card?.isConnected || !isValidItemType(card)) return;
  if (card.querySelector('.quality-badge')) {
    if (card.dataset.qbVer === QB_VER) return;
    return;
  }

  const hinted = card.dataset?.quality || memoryQualityHints.get(itemId) || snapshotMap?.get(itemId);
  if (hinted) return createBadge(card, hinted);
  const cachedQuality = await getCachedQuality(itemId);
  if (cachedQuality) return createBadge(card, cachedQuality);

  try {
    const quality = await fetchAndCacheQuality(itemId);
    if (quality && card.isConnected) createBadge(card, quality);
  } catch (error) {
    if (error?.name !== 'QuotaExceededError') {
      console.error(`Kart işlenirken hata oluştu (${itemId}):`, error);
    }
  }
}

export async function addQualityBadge(card, itemId = null) {
  if (!card || !card.isConnected || !isValidItemType(card)) return;

  itemId = itemId || card.closest('[data-id]')?.getAttribute('data-id');
  if (!itemId) return;
  if (card.querySelector('.quality-badge')) return;

  processingQueue.push({ card, itemId });
  if (!isProcessing) processQueue();
}

async function fetchAndCacheQuality(itemId) {
  try {
    const itemDetails = await fetchItemDetails(itemId);
    if (itemDetails && ['Movie', 'Episode'].includes(itemDetails.Type)) {
      const videoStream = itemDetails.MediaStreams?.find(s => s.Type === "Video");
      if (videoStream) {
        const quality = getVideoQualityText(videoStream);
        await setCachedQuality(itemId, quality, itemDetails.Type);
        return quality;
      }
    }
  } catch (error) {
    if (error?.name !== 'QuotaExceededError') {
      console.error('Kalite bilgisi alınırken hata oluştu:', error);
    }
    throw error;
  }
  return null;
}

function createBadge(card, qualityText) {
  if (!card?.isConnected || !isValidItemType(card)) return;
  if (card.querySelector('.quality-badge')) return;
  if (!card.dataset.quality && qualityText) card.dataset.quality = qualityText;

  const badge = document.createElement('div');
  badge.className = 'quality-badge';
  badge.innerHTML = `<span class="quality-text">${qualityText}</span>`;
  card.dataset.qbVer = QB_VER;
  if (STICKY_MODE) card.dataset.qbSticky = '1';

  if (!document.getElementById('quality-badge-style')) {
    const style = document.createElement('style');
    style.id = 'quality-badge-style';
    style.textContent = `
      .quality-badge {
        position: absolute;
        top: 0;
        left: 0;
        color: white;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        z-index: 10;
        pointer-events: none;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0,0,0,.6);
      }
      .quality-badge .quality-text {
        border-radius: 6px;
        padding: 3px 6px;
        line-height: 1;
        font-size: 12px;
        letter-spacing: .2px;
      }
      img.range-icon, img.codec-icon, img.quality-icon {
        width: 24px;
        height: 18px;
        background: rgba(30,30,40,.7);
        border-radius: 4px;
        padding: 1px;
      }
    `;
    document.head.appendChild(style);
  }

  card.appendChild(badge);
}

function initObservers() {
  if (observer) observer.disconnect();
  if (mutationObserver) mutationObserver.disconnect();

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!isValidItemType(entry.target)) return;
      addQualityBadge(entry.target);
      observer.unobserve(entry.target);
    });
  }, observerOptions);

  mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const cards = node.querySelectorAll?.('.cardImageContainer, .cardOverlayContainer') || [];
        cards.forEach(card => {
          if (!isValidItemType(card)) return;
          annotateDomWithQualityHints(card);
          if (!card.querySelector('.quality-badge')) observer.observe(card);
        });

        if (node.matches?.('.cardImageContainer, .cardOverlayContainer') && isValidItemType(node)) {
          annotateDomWithQualityHints(node);
          if (!node.querySelector('.quality-badge')) observer.observe(node);
        }
      });
    });
  });
  document.querySelectorAll('.cardImageContainer, .cardOverlayContainer').forEach(card => {
    if (!isValidItemType(card)) return;
    annotateDomWithQualityHints(card);
    if (!card.querySelector('.quality-badge')) observer.observe(card);
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });
}

export function initializeQualityBadges() {
  if (config.enableQualityBadges && window.qualityBadgesInitialized) {
    cleanupQualityBadges();
  }

  if (!document.getElementById('quality-badges-style')) {
    const style = document.createElement('style');
    style.id = 'quality-badges-style';
    style.textContent = '';
    document.head.appendChild(style);
  }

  try { snapshotMap = getQualitySnapshot() || new Map(); } catch { snapshotMap = new Map(); }
  try { annotateDomWithQualityHints(document); } catch {}

  initObservers();
  window.qualityBadgesInitialized = true;
  return cleanupQualityBadges;
}

export function cleanupQualityBadges() {
  if (observer) observer.disconnect();
  if (mutationObserver) mutationObserver.disconnect();
  processingQueue = [];
  isProcessing = false;
  window.qualityBadgesInitialized = false;
}

export function removeAllQualityBadgesFromDOM() {
  if (STICKY_MODE) return;
  document.querySelectorAll('.quality-badge').forEach(el => el.remove());
}

export function rebuildQualityBadges() {
  cleanupQualityBadges();
  if (!STICKY_MODE) removeAllQualityBadgesFromDOM();
  initializeQualityBadges();
}

export function clearQualityBadgesCacheAndRefresh() {
  try {
    clearQualityCache();
  } finally {
    const nodes = document.querySelectorAll('.quality-badge');
    nodes.forEach(el => el.remove());
    rebuildQualityBadges();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.cardImageContainer, .cardOverlayContainer')) {
    initializeQualityBadges();
  }
});
