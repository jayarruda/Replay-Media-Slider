const QUALITY_CACHE_STORAGE_KEY = 'videoQualityCache';

const videoQualityCache = {
    data: new Map(),
    maxSize: 1000,
    load() {
        const str = localStorage.getItem('videoQualityCache');
        if (str) {
            try {
                const obj = JSON.parse(str);
                for (const [k, v] of Object.entries(obj)) {
                    if (v.type && ['Movie', 'Episode'].includes(v.type)) {
                        this.data.set(k, v);
                    }
                }
            } catch (e) {
                this.data = new Map();
            }
        }
    },
    save() {
        const obj = {};
        for (let [k, v] of this.data.entries()) {
            obj[k] = v;
        }
        localStorage.setItem('videoQualityCache', JSON.stringify(obj));
    },
    get(itemId) {
        return this.data.get(itemId);
    },
    set(itemId, entry) {
        if (entry.type && ['Movie', 'Episode'].includes(entry.type)) {
            if (this.data.size >= this.maxSize) {
                const oldestKey = this.data.keys().next().value;
                this.data.delete(oldestKey);
            }
            this.data.set(itemId, entry);
            this.save();
        }
    }
};

videoQualityCache.load();

const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000;

export async function getCachedQuality(itemId) {
    const cached = videoQualityCache.get(itemId);
    if (cached && typeof cached === 'object' &&
        (Date.now() - cached.timestamp < CACHE_EXPIRY) &&
        ['Movie', 'Episode'].includes(cached.type)) {
        return cached.quality;
    }
    return null;
}

export function setCachedQuality(itemId, quality, type) {
    if (!['Movie', 'Episode'].includes(type)) {
        return;
    }
    videoQualityCache.set(itemId, {
        quality,
        type,
        timestamp: Date.now()
    });
}

export function clearQualityCache() {
    try {
        videoQualityCache.data.clear();
        localStorage.removeItem(QUALITY_CACHE_STORAGE_KEY);
    } catch (e) {
        videoQualityCache.data = new Map();
    }
}
