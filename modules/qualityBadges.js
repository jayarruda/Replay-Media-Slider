/**
 * The use of this file without proper attribution to the original author (G-grbz - https://github.com/G-grbz)
 * and without obtaining permission is considered unethical and is not permitted.
 */

import { getCachedQuality, setCachedQuality } from './cacheManager.js';
import { fetchItemDetails } from './api.js';
import { getVideoQualityText } from "./containerUtils.js";
import { getConfig } from "./config.js";

const config = getConfig();
const BATCH_SIZE = 10;
let processingQueue = [];
let isProcessing = false;

const observerOptions = {
    rootMargin: '200px',
    threshold: 0.01
};

let observer = null;
let mutationObserver = null;

function isValidItemType(card) {
    const typeIndicator = card.querySelector('.itemTypeIndicator')?.textContent ||
                         card.closest('[data-type]')?.getAttribute('data-type');
    return typeIndicator && ['Movie', 'Episode'].includes(typeIndicator);
}

async function processQueue() {
    if (isProcessing || processingQueue.length === 0) return;

    isProcessing = true;
    const batch = processingQueue.splice(0, BATCH_SIZE);

    try {
        const results = await Promise.allSettled(
            batch.map(({ card, itemId }) => processCard(card, itemId))
        );
    } catch (error) {
        console.error('Kuyruk işlenirken hata oluştu:', error);
    } finally {
        isProcessing = false;
        if (processingQueue.length > 0) {
            setTimeout(processQueue, 500);
        }
    }
}

async function processCard(card, itemId) {
    if (!isValidItemType(card) || card.querySelector('.quality-badge') || !card.isConnected) {
        return;
    }

    const cachedQuality = await getCachedQuality(itemId);
    if (cachedQuality) {
        createBadge(card, cachedQuality);
        return;
    }

    try {
        const quality = await fetchAndCacheQuality(itemId);
        if (quality && card.isConnected) {
            createBadge(card, quality);
        }
    } catch (error) {
        console.error(`Kart işlenirken hata oluştu (${itemId}):`, error);
    }
}

export async function addQualityBadge(card, itemId = null) {
    if (!card || !card.isConnected || !isValidItemType(card)) return;

    itemId = itemId || card.closest('[data-id]')?.getAttribute('data-id');
    if (!itemId) return;

    processingQueue.push({ card, itemId });
    if (!isProcessing) {
        processQueue();
    }
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
        console.error('Kalite bilgisi alınırken hata oluştu:', error);
        throw error;
    }
    return null;
}
function createBadge(card, qualityText) {
    if (!card.isConnected || card.querySelector('.quality-badge') || !isValidItemType(card)) return;

    const badge = document.createElement('div');
    badge.className = 'quality-badge';
    badge.innerHTML = `
        <span class="quality-text">${qualityText}</span>
    `;
    if (!document.getElementById('quality-badge-style')) {
        const style = document.createElement('style');
        style.id = 'quality-badge-style';
        style.textContent = `
            .quality-badge {
                position: absolute;
                top: 8px;
                left: 8px;
                color: white;
                display: flex;
                align-items: center;
                z-index: 10;
                pointer-events: none;
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
            if (entry.isIntersecting && isValidItemType(entry.target)) {
                addQualityBadge(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const cards = node.querySelectorAll?.('.cardImageContainer, .cardOverlayContainer') || [];
                    cards.forEach(card => {
                        if (!card.querySelector('.quality-badge') && isValidItemType(card)) {
                            observer.observe(card);
                        }
                    });
                    if (node.matches?.('.cardImageContainer, .cardOverlayContainer') && isValidItemType(node)) {
                        observer.observe(node);
                    }
                }
            });
        });
    });

    document.querySelectorAll('.cardImageContainer, .cardOverlayContainer').forEach(card => {
        if (!card.querySelector('.quality-badge') && isValidItemType(card)) {
            observer.observe(card);
        }
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
    }
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

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.cardImageContainer, .cardOverlayContainer')) {
        initializeQualityBadges();
    }
});
