/**
 * The use of this file without proper attribution to the original author (G-grbz - https://github.com/G-grbz)
 * and without obtaining permission is considered unethical and is not permitted.
 */
import { makeApiRequest, getSessionInfo, fetchItemDetails, getVideoStreamUrl, playNow } from "./api.js";
import { getConfig, getServerAddress } from "./config.js";
import { getVideoQualityText } from "./containerUtils.js";

const config = getConfig();
const POLL_INTERVAL_MS = 15_000;
const TOAST_DURATION_MS = config.toastDuration;
const MAX_NOTIFS = config.maxNotifications;
const TOAST_DEDUP_MS = 5 * 60 * 1000;
const TOAST_GAP_MS = 250;
const MAX_STORE = 200;

let notifRenderGen = 0;
let recentToastMap = new Map();
let notifState = {
  list: [],
  lastSeenCreatedAt: 0,
  toastQueue: [],
  toastShowing: false,
  seenIds: new Set(),
  activitySeenIds: new Set(),
  activityLastSeen: 0,
  activities: [],
  isModalOpen: false,
};

function hasPrimaryImage(it) {
  return Boolean(
    it?.HasPrimaryImage ||
    it?.ImageTags?.Primary ||
    it?.Series?.ImageTags?.Primary
  );
}

function safePosterImageSrc(it, maxWidth = 80, quality = 80) {
  if (!hasPrimaryImage(it)) return "";
  const id = (it?.Type === "Episode" && (it?.SeriesId || it?.Series?.Id))
    ? (it.SeriesId || it.Series.Id)
    : (it?.Id || it?.ItemId || it?.id);
  const tag = it?.ImageTags?.Primary || it?.Series?.ImageTags?.Primary || "";
  const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : "";

  return id ? `/Items/${id}/Images/Primary?maxWidth=${maxWidth}&quality=${quality}${tagParam}` : "";
}


function posterImageSrc(it, maxWidth = 80, quality = 80) {
  const id =
    (it?.Type === "Episode" && (it?.SeriesId || it?.Series?.Id))
      ? (it.SeriesId || it.Series.Id)
      : (it?.Id || it?.ItemId || it?.id);

  return id ? `/Items/${id}/Images/Primary?maxWidth=${maxWidth}&quality=${quality}` : "";
}

function moreItemsLabel(n) {
  const tail = (config.languageLabels.moreItems || "içerik daha");
  return `${n} ${tail}`;
}

function toastShouldEnqueue(key) {
  const now = Date.now();
  for (const [k, t] of recentToastMap) {
    if (now - t > TOAST_DEDUP_MS) recentToastMap.delete(k);
  }
  if (recentToastMap.has(key)) return false;
  recentToastMap.set(key, now);
  return true;
}

function getThemePreferenceKey() {
  const userId = getSafeUserId();
  return `jf:notifTheme:${userId || "nouser"}`;
}

function loadThemePreference() {
  const theme = localStorage.getItem(getThemePreferenceKey()) || '1';
  setTheme(theme);
}

function setTheme(themeNumber) {
  const link = document.getElementById("jfNotifCss");
  if (!link) return;

  const href =
    themeNumber === '1' ? 'slider/src/notifications.css' :
    themeNumber === '2' ? 'slider/src/notifications2.css' :
                          'slider/src/notifications3.css';

  link.href = href;
  localStorage.setItem(getThemePreferenceKey(), themeNumber);
}

function toggleTheme() {
  const current = localStorage.getItem(getThemePreferenceKey()) || '1';
  const next = current === '1' ? '2' : current === '2' ? '3' : '1';
  setTheme(next);
}

async function fetchLatestAll() {
  const { userId } = getSessionInfo();

  let latestVideo = [];
  try {
    latestVideo = await makeApiRequest(
      `/Users/${userId}/Items?SortBy=DateCreated&SortOrder=Descending` +
      `&IncludeItemTypes=Movie,Episode&Recursive=true&Limit=50` +
      `&Fields=DateCreated,DateAdded,PremiereDate,DateLastMediaAdded,SeriesName,ParentIndexNumber,IndexNumber,SeriesId`
    );
    latestVideo = Array.isArray(latestVideo?.Items) ? latestVideo.Items : (Array.isArray(latestVideo) ? latestVideo : []);
  } catch (e) {
    throw e;
  }

  const processedVideo = await Promise.all(latestVideo.map(async (item) => {
  if (item.Type === 'Episode' && item.SeriesId) {
    try {
      const seriesInfo = await makeApiRequest(`/Items/${item.SeriesId}`);
      return {
        ...item,
        _seriesDateAdded: seriesInfo?.DateAdded || null,
        ImageTags: seriesInfo.ImageTags,
        ParentBackdropItemId: seriesInfo.Id,
        ParentBackdropImageTags: seriesInfo.BackdropImageTags
      };
    } catch (e) {
      return item;
    }
  }
  return item;
}));

  let latestAudioResp;
  try {
    latestAudioResp = await makeApiRequest(
      `/Users/${userId}/Items?SortBy=DateCreated&SortOrder=Descending&IncludeItemTypes=Audio&Recursive=true&Limit=50`
    );
  } catch (e) {
    console.error("[notif] Latest(Audio) isteği hata:", e);
    latestAudioResp = {};
  }

  const audioItems = Array.isArray(latestAudioResp?.Items) ? latestAudioResp.Items : [];
  const combined = [...processedVideo, ...audioItems];

  const uniqMap = new Map();
  combined.forEach(it => { if (it?.Id) uniqMap.set(it.Id, it); });

  const out = Array.from(uniqMap.values());
  return out;
}

async function backfillFromLastSeen() {
  if (!notifState.seenIds) notifState.seenIds = new Set();

  const items = await fetchLatestAll();
  if (!items.length) return;

   const newestTsRaw = items.reduce((acc, it) => Math.max(acc, getCreatedTs(it)), 0);
 const newestTs = clampToNow(newestTsRaw);

  if (!notifState.lastSeenCreatedAt) {
    items.forEach(it => notifState.seenIds.add(it.Id));
    notifState.lastSeenCreatedAt = newestTs || Date.now();
    saveState();
    updateBadge();
    return;
  }
  const fresh = items
   .filter(it =>
    !notifState.seenIds.has(it.Id) ||
     getCreatedTs(it) > notifState.lastSeenCreatedAt
   )
    .sort((a, b) => getCreatedTs(a) - getCreatedTs(b));

  if (fresh.length) {
  enqueueToastBurst(fresh, { type: "content" });
}

  if (newestTs) {
   notifState.lastSeenCreatedAt = Math.max(
     clampToNow(notifState.lastSeenCreatedAt),
     newestTs
   );
 }
  if (fresh.length) {
    saveState();
    updateBadge();
    if (document.querySelector("#jfNotifModal.open")) {
      renderNotifications();
    }
  }
}

function storageKey(base) {
  const userId = getSafeUserId();
  return `jf:${base}:${userId || "nouser"}`;
}

function getSafeUserId() {
  try { return getSessionInfo().userId; } catch { return null; }
}

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey("notifications"));
    if (raw) {
      notifState.list = JSON.parse(raw).map(x => ({
        ...x,
        status: x.status || "added"
      }));
    }
  } catch {}

  const tsRaw = localStorage.getItem(storageKey("lastSeenCreatedAt"));
  notifState.lastSeenCreatedAt = tsRaw ? Number(tsRaw) : 0;

  try {
    const seenRaw = localStorage.getItem(storageKey("seenIds"));
    notifState.seenIds = seenRaw ? new Set(JSON.parse(seenRaw)) : new Set();
  } catch { notifState.seenIds = new Set(); }

  const actTsRaw = localStorage.getItem(storageKey("activityLastSeen"));
  notifState.activityLastSeen = actTsRaw ? Number(actTsRaw) : 0;
  try {
    const actSeenRaw = localStorage.getItem(storageKey("activitySeenIds"));
    notifState.activitySeenIds = actSeenRaw ? new Set(JSON.parse(actSeenRaw)) : new Set();
  } catch { notifState.activitySeenIds = new Set(); }
}

function saveState() {
  try {
    localStorage.setItem(
      storageKey("notifications"),
      JSON.stringify(notifState.list.slice(0, MAX_STORE))
    );
    localStorage.setItem(storageKey("lastSeenCreatedAt"), String(notifState.lastSeenCreatedAt || 0));
    localStorage.setItem(storageKey("seenIds"), JSON.stringify(Array.from(notifState.seenIds || [])));
    localStorage.setItem(storageKey("activityLastSeen"), String(notifState.activityLastSeen || 0));
    localStorage.setItem(storageKey("activitySeenIds"), JSON.stringify(Array.from(notifState.activitySeenIds || [])));
  } catch {}
}

async function getCreatedTs(item) {
  if (item.Type === "Episode" && item.SeriesId) {
    try {
      const seriesInfo = await makeApiRequest(`/Items/${item.SeriesId}`);

      if (seriesInfo && seriesInfo.DateAdded) {
        return Date.parse(seriesInfo.DateAdded);
      }
    } catch (e) {
      console.error("Dizi bilgisi alınamadı:", e);
    }
  }

  const seriesTs = Date.parse(item?._seriesDateAdded || "") || 0;

  return (
    seriesTs ||
    Date.parse(item?.DateCreated || "") ||
    Date.parse(item?.DateAdded || "") ||
    Date.parse(item?.AddedAt || "") ||
    Date.parse(item?.PremiereDate || "") ||
    Date.parse(item?.DateLastMediaAdded || "") ||
    0
  );
}

function ensureUI() {
  if (!config.enableNotifications) return;
  let header = document.querySelector(".headerRight");
  if (!header) return;
  if (!header.querySelector("#jfNotifBtn")) {
  const btn = document.createElement("button");
  btn.id = "jfNotifBtn";
  btn.type = "button";
  btn.className = "headerSyncButton syncButton headerButton headerButtonRight paper-icon-button-light";
  btn.setAttribute("is", "paper-icon-button-light");
  btn.innerHTML = `
  <i class="material-icons notif" aria-hidden="true">notifications</i>
  <span class="jf-notif-badge" hidden></span>
`;

  btn.setAttribute("aria-label", config.languageLabels.recentNotifications);
  btn.title = config.languageLabels.recentNotifications;
  btn.addEventListener("click", openModal);

  header.prepend(btn);
}

  if (!document.querySelector("#jfNotifModal")) {
    const modal = document.createElement("div");
    modal.id = "jfNotifModal";
    modal.className = "jf-notif-modal";
    modal.innerHTML = `
  <div class="jf-notif-backdrop" data-close></div>
  <div class="jf-notif-panel">
    <div class="jf-notif-head">
      <div class="jf-notif-title">${config.languageLabels.recentNotifications}</div>
      <div class="jf-notif-actions">
        <!-- YENİ: Light/Dark toggle -->
        <button id="jfNotifModeToggle" class="jf-notif-theme-toggle" title="${(config.languageLabels?.switchToDark)||'Koyu temaya geç'}">
          <i class="material-icons" aria-hidden="true">dark_mode</i>
        </button>
        <!-- Mevcut tema dosyası (1/2/3) değiştirici -->
        <button id="jfNotifThemeToggle" class="jf-notif-theme-toggle" title="${config.languageLabels.themeToggleTooltip}">
          <i class="fa-solid fa-paintbrush"></i>
        </button>
        <button id="jfNotifClearAll" class="jf-notif-clearall">${config.languageLabels.clearAll}</button>
        <button class="jf-notif-close" data-close>×</button>
      </div>
    </div>

        <div class="jf-notif-tabs">
          <button class="jf-notif-tab active" data-tab="new">${config.languageLabels.newAddedTab || "Yeni Eklenenler"}</button>
          <button class="jf-notif-tab" data-tab="system">${config.languageLabels.systemNotifications || "Sistem Bildirimleri"}</button>
        </div>

        <div class="jf-notif-content">
          <div class="jf-notif-tab-content" data-tab="new">
            <div class="jf-notif-section">
              <div class="jf-notif-subtitle">${config.languageLabels.latestTracks}</div>
              <ul class="jf-notif-list" id="jfNotifList"></ul>
            </div>
            ${config.enableRenderResume ? `
              <div class="jf-notif-section watching">
                <div class="jf-notif-subtitle">${config.languageLabels.unfinishedWatching}</div>
                <div class="jf-resume-list" id="jfResumeList"></div>
              </div>
            ` : ''}
          </div>

          <div class="jf-notif-tab-content" data-tab="system" style="display:none;">
            <ul class="jf-activity-list" id="jfActivityList"></ul>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => {
      if (e.target.matches("[data-close]")) closeModal();
    });
  }

  document.getElementById("jfNotifThemeToggle")
    ?.addEventListener("click", toggleTheme);

  document.getElementById("jfNotifClearAll")
  ?.addEventListener("click", (e) => { e.stopPropagation(); clearAllNotifications(); closeModal(); });

  if (!document.querySelector("#jfToastContainer")) {
    const c = document.createElement("div");
    c.id = "jfToastContainer";
    c.className = "jf-toast-container";
    document.body.appendChild(c);
  }

  if (!document.getElementById("jfNotifCss")) {
    const link = document.createElement("link");
    link.id = "jfNotifCss";
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = "slider/src/notifications.css";
    document.head.appendChild(link);
  }
  document.getElementById("jfNotifModeToggle")
  ?.addEventListener("click", (e) => { e.stopPropagation(); toggleThemeMode(); });

document.getElementById("jfNotifThemeToggle")
  ?.addEventListener("click", toggleTheme);

loadThemePreference();
loadThemeModePreference();
updateBadge();

  document.querySelectorAll(".jf-notif-tab").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      const tabName = tabBtn.getAttribute("data-tab");
      document.querySelectorAll(".jf-notif-tab").forEach(b => b.classList.toggle("active", b === tabBtn));
      document.querySelectorAll(".jf-notif-tab-content").forEach(c => {
        c.style.display = (c.getAttribute("data-tab") === tabName) ? "" : "none";
      });
    });
  });
}

export function forcejfNotifBtnPointerEvents() {
  const apply = () => {
    document.querySelectorAll('html .skinHeader').forEach(el => {
      el.style.setProperty('pointer-events', 'all', 'important');
    });

    const jfNotifBtnToggle = document.querySelector('#jfNotifBtn');
    if (jfNotifBtnToggle) {
      jfNotifBtnToggle.style.setProperty('display', 'inline-flex', 'important');
      jfNotifBtnToggle.style.setProperty('opacity', '1', 'important');
      jfNotifBtnToggle.style.setProperty('pointer-events', 'all', 'important');
      jfNotifBtnToggle.style.setProperty('text-shadow', 'rgb(255, 255, 255) 0px 0px 2px', 'important');
      jfNotifBtnToggle.style.setProperty('cursor', 'pointer', 'important');
      jfNotifBtnToggle.style.setProperty('border', 'none', 'important');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }

  const obs = new MutationObserver(apply);
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true
  });
}

function openModal() {
  const m = document.querySelector("#jfNotifModal");
  if (!m) return;
  m.classList.add("open");
  notifState.isModalOpen = true;

  renderNotifications();

  if (config.enableRenderResume) {
    renderResume();
  }

  pollActivities();
}

 function closeModal() {
   const m = document.querySelector("#jfNotifModal");
  if (m) m.classList.remove("open");
  notifState.isModalOpen = false;
  if (config.enableCounterSystem && Array.isArray(notifState.activities)) {
    const newest = notifState.activities.reduce((acc, a) => {
      const ts = Date.parse(a?.Date || "") || 0;
      return Math.max(acc, ts);
    }, 0);
    if (newest && newest > (notifState.activityLastSeen || 0)) {
      notifState.activityLastSeen = newest;
      saveState();
      updateBadge();
    }
  }
 }

function updateBadge() {
  const badges = document.querySelectorAll(".jf-notif-badge");
  const btns = document.querySelectorAll("#jfNotifBtn");
  if (!badges.length && !btns.length) return;

  const contentCount = notifState.list.length;
  const lastSeenAct = Number(notifState.activityLastSeen || 0);
  const systemCount = (config.enableCounterSystem && Array.isArray(notifState.activities))
    ? notifState.activities.reduce((acc, a) => {
        const ts = Date.parse(a?.Date || "") || 0;
        return acc + (ts > lastSeenAct ? 1 : 0);
      }, 0)
    : 0;
  const total = contentCount + systemCount;
  const count = Math.min(total, 99);
  const show = count > 0;
  const label = String(count);

  btns.forEach(btn => {
    btn.setAttribute("data-count", label);
    if (show) {
      btn.setAttribute("data-has-notifs", "true");
    } else {
      btn.removeAttribute("data-has-notifs");
    }
  });

  badges.forEach(badge => {
    badge.textContent = show ? label : "";
    badge.setAttribute("data-count", show ? label : "");
    badge.setAttribute("aria-hidden", show ? "false" : "true");
    badge.hidden = !show;
    badge.style.display = show ? "" : "none";
  });
}

async function renderNotifications() {
  const ul = document.querySelector("#jfNotifList");
  if (!ul) return;
  const gen = ++notifRenderGen;
  const map = new Map();
  for (const n of notifState.list) {
    const key = `${n.itemId || "none"}:${n.status || "added"}`;
    const prev = map.get(key);
    if (!prev || (n.timestamp || 0) > (prev.timestamp || 0)) map.set(key, n);
  }
  const compact = Array.from(map.values());
  const items = compact
    .sort((a,b)=> (b.timestamp||0)-(a.timestamp||0))
    .slice(0, MAX_NOTIFS);

  if (items.length === 0) {
    ul.innerHTML = `
      <li class="jf-notif-empty">
        <i class="fa-solid fa-box-open" aria-hidden="true"></i>
        <span>${config.languageLabels.noNewContent || "Yeni içerik yok."}</span>
      </li>`;
    return;
  }

  const details = await Promise.all(items.map(async (n) => {
    try {
      if (n.itemId) {
        const d = await fetchItemDetails(n.itemId);
        return { ok: true, data: d };
      }
    } catch {}
    return { ok: false, data: null };
  }));

  function pickVideoStream(ms) {
  return Array.isArray(ms) ? ms.find(s => s.Type === "Video") : null;
}

  if (gen !== notifRenderGen) return;

  ul.innerHTML = "";
  const frag = document.createDocumentFragment();

  items.forEach((n, i) => {
    const li = document.createElement("li");
    li.className = "jf-notif-item";

    const d = details[i];
    const status = n.status === "removed" ? "removed" : "added";
    const statusLabel = status === "removed"
      ? (config.languageLabels.removedLabel || "Kaldırıldı")
      : (config.languageLabels.addedLabel || "Eklendi");

    let title = n.title || config.languageLabels.newContentDefault;
    if (d.ok && d.data?.Type === "Episode" && d.data?.SeriesName) {
      title = `${d.data.SeriesName} - ${title}`;
    }

    const imgSrc = (d.ok && hasPrimaryImage(d.data)) ? safePosterImageSrc(d.data, 80, 80) : "";
    const vStream = d.ok ? pickVideoStream(d.data?.MediaStreams) : null;
    const qualityHtml = vStream ? getVideoQualityText(vStream) : "";

    li.innerHTML = `
      ${imgSrc ? `<img class="thumb" src="${imgSrc}" alt="">` : ""}
      <div class="meta">
        <div class="title">
          <span class="jf-badge ${status === "removed" ? "jf-badge-removed" : "jf-badge-added"}">${escapeHtml(statusLabel)}</span>
          ${escapeHtml(title)}
        </div>
        <div class="time">${formatTime(n.timestamp)}</div>
        ${qualityHtml ? `<div class="quality">${qualityHtml}</div>` : ""}
      </div>
      <button class="del" title="${config.languageLabels.removeTooltip}">×</button>
    `;

    if (status !== "removed" && n.itemId) {
    li.addEventListener("click", () => {
    closeModal();
    window.location.href = `/web/#/details?id=${n.itemId}`;
  });
}
    li.querySelector(".del").addEventListener("click", (ev) => {
      ev.stopPropagation();
      removeNotification(n.id);
    });

    frag.appendChild(li);
  });

  if (gen !== notifRenderGen) return;
  ul.appendChild(frag);
}

function scrollToLastItem() {
    const list = document.querySelector('.jf-notif-list');
    if (list && list.lastElementChild) {
        list.lastElementChild.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
        });
    }
}

function formatTimeLeft(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const parts = [];
  if (h > 0) parts.push(`${h}${config.languageLabels.sa}`);
  if (m > 0) parts.push(`${m}${config.languageLabels.dk}`);
  if (s > 0) parts.push(`${s}${config.languageLabels.sn}`);
  return parts.join(" ");
}

async function renderResume() {
  if (!config.enableRenderResume) return;

  const container = document.querySelector("#jfResumeList");
  if (!container) return;
  container.innerHTML = `<div class="jf-loading">${config.languageLabels.loadingText}</div>`;
  try {
    const { userId } = getSessionInfo();
    const data = await makeApiRequest(`/Users/${userId}/Items/Resume?Limit=${config.renderResume || 10}&MediaTypes=Video`);
    const items = Array.isArray(data?.Items) ? data.Items : [];
if (!items.length) {
  container.innerHTML = `<div class="jf-empty">${config.languageLabels.noUnfinishedContent}</div>`;
  return;
}

const details = await Promise.all(
  items.map(it => fetchItemDetails(it.Id).catch(() => null))
);

container.innerHTML = "";
items.forEach((it, idx) => {
  const card = document.createElement("div");
  card.className = "jf-resume-card";

  const pct = Math.round(((it?.UserData?.PlaybackPositionTicks || 0) / (it?.RunTimeTicks || 1)) * 100);
  const totalSec = (it.RunTimeTicks || 0) / 10_000_000;
  const playedSec = (it?.UserData?.PlaybackPositionTicks || 0) / 10_000_000;
  const remainingSec = Math.max(totalSec - playedSec, 0);
  const d = details[idx];
  const vStream = d && Array.isArray(d.MediaStreams) ? d.MediaStreams.find(s => s.Type === "Video") : null;
  const qualityHtml = vStream ? getVideoQualityText(vStream) : "";

  card.innerHTML = `
    ${hasPrimaryImage(it) ? `<img class="poster" src="${safePosterImageSrc(it, 160, 80)}" alt="">` : ""}
    <div class="resume-meta">
      <div class="name">${escapeHtml(it.Name || config.languageLabels.newContentDefault)}</div>
      ${qualityHtml ? `<div class="quality">${qualityHtml}</div>` : ""}
      <div class="progress"><div class="bar" style="width:${Math.min(pct,100)}%"></div></div>
      <div class="time-left">${formatTimeLeft(remainingSec)} ${config.languageLabels.kaldi}</div>
      <button class="resume-btn">${config.languageLabels.devamet}</button>
    </div>
  `;
  card.querySelector(".resume-btn").addEventListener("click", () => {
  playNow(it.Id);
  closeModal();
});
  container.appendChild(card);
});
  } catch (e) {
    console.error("Resume listesi alınamadı:", e);
    container.innerHTML = `<div class="jf-error">${config.languageLabels.listError}</div>`;
  }
}

async function pollLatest({ seedIfFirstRun = false } = {}) {
  if (!notifState.seenIds) notifState.seenIds = new Set();
  try {
    const items = await fetchLatestAll();
    if (!items.length) return;

    const newestTs = clampToNow(items.reduce((acc, it) => Math.max(acc, getCreatedTs(it)), 0));

    if (seedIfFirstRun && (!notifState.lastSeenCreatedAt || notifState.seenIds.size === 0)) {
      items.forEach(it => notifState.seenIds.add(it.Id));
      notifState.lastSeenCreatedAt = newestTs || Date.now();
      saveState();
      updateBadge();
      return;
    }

    const fresh = items
     .filter(it =>
       !notifState.seenIds.has(it.Id) ||
       getCreatedTs(it) > (notifState.lastSeenCreatedAt || 0)
     )
      .sort((a, b) => getCreatedTs(a) - getCreatedTs(b));

    const nowTs = Date.now();
    for (const it of fresh) {
      pushNotification({
        itemId: it.Id,
        title: it.Name || config.languageLabels.newContentDefault,
        timestamp: nowTs,
        status: "added",
      });
      notifState.seenIds.add(it.Id);
    }

    const TOAST_GROUP_THRESHOLD = config.toastGroupThreshold || 5;
    if (fresh.length >= TOAST_GROUP_THRESHOLD) {
      enqueueToastGroup(fresh);
    } else {
      for (const it of fresh) queueToast(it);
    }

    if (newestTs) {
     notifState.lastSeenCreatedAt = Math.max(
       clampToNow(notifState.lastSeenCreatedAt),
       newestTs
     );
   }

    if (fresh.length) {
      saveState();
      updateBadge();
      if (document.querySelector("#jfNotifModal.open")) {
        renderNotifications();
      }
    }
  } catch (e) {
    console.error("Latest poll hatası:", e);
  }
}

function pushNotification(n) {
  const ts = n.timestamp || Date.now();
  const key = `${n.itemId || "none"}:${n.status || "added"}`;

  notifState.list = notifState.list.filter(item =>
    !(item.itemId === n.itemId && item.status === n.status)
  );

  const id = `${n.itemId || n.id || Math.random().toString(36).slice(2)}:${ts}`;
  notifState.list.unshift({
    id,
    itemId: n.itemId,
    title: n.title,
    timestamp: ts,
    status: n.status || "added",
  });

  if (notifState.list.length > MAX_STORE) {
    notifState.list = notifState.list.slice(0, MAX_STORE);
  }

  saveState();
}

function removeNotification(id) {
  const before = notifState.list.length;
  notifState.list = notifState.list.filter(n => n.id !== id);
  if (notifState.list.length !== before) {
    saveState();
    renderNotifications();
    updateBadge();
    requestAnimationFrame(updateBadge);
  }
}

function clearAllNotifications() {
  if (!notifState.list.length) return;
  notifState.list = [];
  saveState();
  renderNotifications();
  updateBadge();
  requestAnimationFrame(updateBadge);
}

function queueToast(it, { type = "content", status = "added" } = {}) {
  if (type === "content" && !config.enableToastNew) return;
  if (type === "activity" && !config.enableToastSystem) return;

  const key = `${type}:${status}:${it.Id || it.ItemId || it.id || it.Name}`;
  if (!toastShouldEnqueue(key)) return;

  const useId = it.Id || it.ItemId;
  const safeStatus = status === "removed" ? "removed" : "added";

  const push = (resolved) => {
    const titled = resolved?.Type === 'Episode' && resolved?.SeriesName
      ? { ...it, Name: `${resolved.SeriesName} - ${it.Name || resolved.Name || ""}` }
      : { ...it, Name: it.Name || resolved?.Name };

    notifState.toastQueue.push({ type, it: titled, status: safeStatus });
    runToastQueue();
  };

  if (useId) {
    fetchItemDetails(useId).then(push).catch(() => {
      notifState.toastQueue.push({ type, it, status: safeStatus });
      runToastQueue();
    });
  } else {
    notifState.toastQueue.push({ type, it, status: safeStatus });
    runToastQueue();
  }
}

function enqueueToastBurst(items, { type = "content" } = {}) {
  if (type === "content" && !config.enableToastNew) return;
  if (type === "activity" && !config.enableToastSystem) return;

  const seen = new Set();
  const uniq = [];
  for (const it of items) {
    const k = `${type}:${it.Id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (!toastShouldEnqueue(k)) continue;
    uniq.push(it);
  }

  if (uniq.length === 0) return;
  if (uniq.length === 1) {
    notifState.toastQueue.push({ type, it: uniq[0] });
  } else if (uniq.length === 2) {
    notifState.toastQueue.push({ type, it: uniq[0] }, { type, it: uniq[1] });
  } else {
    notifState.toastQueue.push({ type, it: uniq[0] }, { type, it: uniq[uniq.length - 1] });
  }

  runToastQueue();
}

function enqueueToastGroup(items, { type = "content" } = {}) {
  if (type === "content" && !config.enableToastNew) return;
  if (!Array.isArray(items) || items.length === 0) return;

  const seen = new Set();
  const uniq = [];
  for (const it of items) {
    const id = it?.Id || it?.ItemId || it?.id || it?.Name;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    uniq.push(it);
  }
  if (!uniq.length) return;

  const head = uniq.slice(0, 4);
  notifState.toastQueue.push({
    type: "content-group",
    items: head,
    total: uniq.length
  });
  runToastQueue();
}

function runToastQueue() {
  if (notifState.toastShowing) return;

  while (notifState.toastQueue.length &&
         notifState.toastQueue[0].type === "activity" &&
         !config.enableToastSystem) {
    notifState.toastQueue.shift();
  }

  const next = notifState.toastQueue.shift();
  if (!next) return;

  notifState.toastShowing = true;

  const { type, it, status = "added", items, total } = next;
  const c = document.querySelector("#jfToastContainer");
  if (!c) return;

  const toast = document.createElement("div");
  toast.className = "jf-toast" + (type === "activity" ? " jf-toast-activity" : "");

  if (type === "content-group") {
    const arr = Array.isArray(items) ? items : [];
    const first = arr[0] || {};
    const firstPoster = hasPrimaryImage(first) ? safePosterImageSrc(first, 80, 80) : "";
    const next3 = arr.slice(1, 4);
    const restCount = Math.max((total || arr.length) - arr.length, 0);

    const statusLabel = (config.languageLabels.addedLabel || "Eklendi");
    const firstName = escapeHtml(first?.Name || config.languageLabels.newContentDefault);
    const namesList = next3.map(x => `<li>${escapeHtml(x?.Name || "")}</li>`).join("");
    const moreHtml = restCount > 0 ? `<div class="more">${escapeHtml(moreItemsLabel(restCount))}</div>` : "";

    toast.innerHTML = `
     ${firstPoster ? `<img class="thumb" src="${firstPoster}" alt="" onerror="this.style.display='none'">` : ""}
      <div class="text">
        <b>
          <span class="jf-badge jf-badge-added">${escapeHtml(statusLabel)}</span>
          ${escapeHtml(config.languageLabels.newContentAdded)}
        </b><br>
        ${firstName}
        ${namesList ? `<ul class="names">${namesList}</ul>` : ""}
        ${moreHtml}
      </div>
    `;
    toast.addEventListener("click", () => {
      if (typeof openModal === "function") openModal();
    });

  } else if (type === "content") {
  const statusLabel = status === "removed"
    ? (config.languageLabels.removedLabel || "Kaldırıldı")
    : (config.languageLabels.addedLabel || "Eklendi");

  toast.innerHTML = `
    ${status !== "removed" && hasPrimaryImage(it) ? `<img class="thumb" src="${safePosterImageSrc(it, 80, 80)}" alt="">` : ""}
    <div class="text">
      <b>
        <span class="jf-badge ${status === "removed" ? "jf-badge-removed" : "jf-badge-added"}">${escapeHtml(statusLabel)}</span>
        ${status === "removed" ? (config.languageLabels.contentChanged || "İçerik değişti") : config.languageLabels.newContentAdded}
      </b><br>
      ${escapeHtml(it.Name || "")}
    </div>
  `;
  if (status !== "removed") {
    toast.addEventListener("click", () => it.Id && playNow(it.Id));
  }
} else {
    const title = it?.Name || it?.Type || (config.languageLabels.systemNotifications || "Sistem Bildirimi");
    const desc = it?.Overview ? ` – ${escapeHtml(it.Overview)}` : "";
    toast.innerHTML = `
      <div class="text">
        <b>${config.languageLabels.systemNotificationAdded || "Sistem bildirimi"}</b><br>
        ${escapeHtml(title)}${desc}
      </div>
    `;
  }

  c.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      c.removeChild(toast);
      setTimeout(() => {
        notifState.toastShowing = false;
        runToastQueue();
      }, TOAST_GAP_MS);
    }, 250);
  }, TOAST_DURATION_MS);
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch { return ""; }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

export async function initNotifications() {
  await waitForSessionReady(7000);
  migrateNouserToUser();

  loadState();
  ensureUI();

  const retry = setInterval(() => {
    ensureUI();
    if (document.querySelector("#jfNotifBtn") && document.querySelector("#jfNotifModal")) {
      clearInterval(retry);
    }
  }, 500);

  await backfillFromLastSeen();
  await pollLatest({ seedIfFirstRun: true });
  await pollActivities({ seedIfFirstRun: true });

  setInterval(() => pollLatest(), POLL_INTERVAL_MS);
  setInterval(() => pollActivities(), POLL_INTERVAL_MS);

  window.forceCheckNotifications = () => { pollLatest(); pollActivities(); };

  window.addEventListener("focus", () => {
    if (document.querySelector("#jfNotifModal.open")) {
      renderResume();
      pollActivities();
    }
  });
}

async function waitForSessionReady(timeoutMs = 7000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const s = getSessionInfo();
      if (s && s.userId) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

function migrateNouserToUser() {
  const uid = getSafeUserId();
  if (!uid) return;

  const parts = ["notifications", "lastSeenCreatedAt", "seenIds"];
  for (const p of parts) {
    const src = `jf:${p}:nouser`;
    const dst = `jf:${p}:${uid}`;
    const v = localStorage.getItem(src);
    if (v && !localStorage.getItem(dst)) {
      localStorage.setItem(dst, v);
      console.log(`[notif] migrated ${p} from nouser -> ${uid}`);
    }
  }
}

function clampToNow(ts) {
  const now = Date.now();
  return Math.min(Number(ts) || 0, now);
}

async function fetchActivityLog(limit = 30) {
  try {
    const resp = await makeApiRequest(`/System/ActivityLog/Entries?StartIndex=0&Limit=${limit}`);
    const items = Array.isArray(resp?.Items) ? resp.Items : (Array.isArray(resp) ? resp : []);
    return items;
  } catch (e) {
  if (e?.status !== 403 && e?.message && !String(e.message).includes("403")) {
    console.error("[notif] ActivityLog isteği hata:", e);
  }
  return [];
}
}

function renderActivities(activities = []) {
  const ul = document.querySelector("#jfActivityList");
  if (!ul) return;
  ul.innerHTML = "";

  if (!activities.length) {
    ul.innerHTML = `<li class="jf-activity-empty">${config.languageLabels.noSystemActivities || "Henüz sistem bildirimi yok."}</li>`;
    return;
  }

  const lastSeenAct = Number(notifState.activityLastSeen || 0);

  activities.forEach(a => {
    const ts = Date.parse(a?.Date || "") || 0;
    const title = a?.Name || a?.Type || "Etkinlik";
    const desc = a?.Overview || "";
    const id = a?.Id || `act:${ts}:${title}`;

    const li = document.createElement("li");
    li.className = "jf-activity-item";
    if (ts > lastSeenAct) li.classList.add("unread");
    li.innerHTML = `
      <div class="icon"><i class="fa-solid fa-circle-info"></i></div>
      <div class="meta">
        <div class="title">
          ${escapeHtml(title)}
          ${ts > lastSeenAct ? `<span class="jf-pill-unread">${escapeHtml(config.languageLabels?.unread || "Yeni")}</span>` : ""}
        </div>
        ${desc ? `<div class="desc">${escapeHtml(desc)}</div>` : ""}
        <div class="time">${formatTime(ts)}</div>
      </div>
    `;

    if (a?.ItemId) li.addEventListener("click", () => playNow(a.ItemId));

    ul.appendChild(li);
  });
}

function isRemovalActivity(a) {
  const t = (a?.Type || "").toLowerCase();
  const n = (a?.Name || "").toLowerCase();
  const o = (a?.Overview || "").toLowerCase();

  return (
    t.includes("remove") || t.includes("deleted") || t.includes("delete") ||
    n.includes("remove") || n.includes("deleted") || n.includes("delete") ||
    o.includes("remove") || o.includes("deleted") || o.includes("delete") ||
    n.includes("kaldır") || o.includes("kaldır") || o.includes("silindi") || n.includes("silindi")
  );
}

async function pollActivities({ seedIfFirstRun = false } = {}) {
  if (!notifState.activitySeenIds) notifState.activitySeenIds = new Set();

  const acts = await fetchActivityLog(30);
  if (!acts.length) {
    notifState.activities = [];
    updateBadge();
    renderActivities([]);
    return;
  }

  const newestTs = clampToNow(
    acts.reduce((acc, a) => Math.max(acc, Date.parse(a?.Date || "") || 0), 0)
  );

  if (seedIfFirstRun && (!notifState.activityLastSeen || notifState.activitySeenIds.size === 0)) {
     acts.forEach(a => notifState.activitySeenIds.add(a.Id || `${a.Type}:${a.Date}`));
     notifState.activityLastSeen = newestTs || Date.now();
    notifState.activities = acts;
    saveState();
    updateBadge();
    renderActivities(acts);
     return;
   }

  const fresh = acts
    .filter(a => {
      const id = a.Id || `${a.Type}:${a.Date}`;
      const ts = Date.parse(a?.Date || "") || 0;
      return !notifState.activitySeenIds.has(id) || ts > (notifState.activityLastSeen || 0);
    })
    .sort((a, b) => (Date.parse(a?.Date || "") || 0) - (Date.parse(b?.Date || "") || 0));

  const nonRemoval = [];

  for (const a of fresh) {
    const id = a.Id || `${a.Type}:${a.Date}`;
    notifState.activitySeenIds.add(id);

    if (isRemovalActivity(a)) {
      const itemId = a.ItemId || a.Item?.Id;
      const title = a.Item?.Name || a.Name || a.Type || "İçerik";
      pushNotification({
        itemId,
        title,
        timestamp: Date.parse(a?.Date || "") || Date.now(),
        status: "removed",
      });
      queueToast({ Id: itemId, Name: title }, { type: "content", status: "removed" });
    } else {
      nonRemoval.push(a);
    }
  }

  enqueueActivityToastBurst(nonRemoval);

  notifState.activities = acts;
  saveState();
  updateBadge();
  renderActivities(acts);

  if (document.querySelector("#jfNotifModal.open")) {
    renderNotifications();
    updateBadge();
  }
}

function queueActivityToast(a) {
  const c = document.querySelector("#jfToastContainer");
  if (!c) return;

  const toast = document.createElement("div");
  toast.className = "jf-toast jf-toast-activity";
  const title = a?.Name || a?.Type || (config.languageLabels.newContentDefault);
  const desc = a?.Overview || "";
  toast.innerHTML = `
    <div class="text">
      <b>${config.languageLabels.systemNotificationAdded || "Sistem bildirimi"}</b><br>
      ${escapeHtml(title)}${desc ? ` – ${escapeHtml(desc)}` : ""}
    </div>
  `;
  c.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => { c.removeChild(toast); }, 250);
  }, TOAST_DURATION_MS);
}

function enqueueActivityToastBurst(activities = []) {
  if (!config.enableToastSystem) return;
  const keyOf = a => (a?.Id || `${a.Type || "act"}:${a.Date || ""}:${a.Name || ""}`);

  const seen = new Set();
  const uniq = [];
  for (const a of activities) {
    const k = `activity:${keyOf(a)}`;
    if (seen.has(k)) continue;
    if (!toastShouldEnqueue(k)) continue;
    seen.add(k);
    uniq.push(a);
  }

  if (!uniq.length) return;

  const picks = uniq.length <= 2 ? uniq : [uniq[0], uniq[uniq.length - 1]];
  for (const a of picks) {
    notifState.toastQueue.push({ type: "activity", it: a });
  }
  runToastQueue();
}

function getThemeModeKey() {
  const userId = getSafeUserId();
  return `jf:notifThemeMode:${userId || "nouser"}`;
}

function setThemeMode(mode) {
  const m = (mode === "dark") ? "dark" : "light";
  document.documentElement.setAttribute("data-notif-theme", m);
  try { localStorage.setItem(getThemeModeKey(), m); } catch {}
  const btn = document.getElementById("jfNotifModeToggle");
  if (btn) {
    const icon = btn.querySelector(".material-icons");
    if (icon) icon.textContent = (m === "dark") ? "light_mode" : "dark_mode";
    btn.title = (m === "dark")
      ? (config.languageLabels?.switchToLight || "Açık temaya geç")
      : (config.languageLabels?.switchToDark  || "Koyu temaya geç");
  }
}

function loadThemeModePreference() {
  let m = null;
  try { m = localStorage.getItem(getThemeModeKey()); } catch {}
  if (!m) {
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    m = prefersDark ? "dark" : "light";
  }
  setThemeMode(m);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener?.("change", (ev) => {
    setThemeMode(ev.matches ? "dark" : "light");
  });
}

function toggleThemeMode() {
  const current = document.documentElement.getAttribute("data-notif-theme") || "light";
  setThemeMode(current === "dark" ? "light" : "dark");
}

