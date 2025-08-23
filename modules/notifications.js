import { makeApiRequest, getSessionInfo, fetchItemDetails, getVideoStreamUrl, playNow } from "./api.js";
import { getConfig, getServerAddress } from "./config.js";
import { getVideoQualityText } from "./containerUtils.js";
import { getCurrentVersionFromEnv, compareSemver } from "./update.js";

const config = getConfig();
const POLL_INTERVAL_MS = 15_000;
const TOAST_DURATION_MS = config.toastDuration;
const MAX_NOTIFS = config.maxNotifications;
const TOAST_DEDUP_MS = 5 * 60 * 1000;
const TOAST_GAP_MS = 250;
const MAX_STORE = 200;
const UPDATE_BANNER_KEY      = () => storageKey("updateBanner");
const UPDATE_TOAST_SHOWN_KEY = () => storageKey("updateToastShown");
const UPDATE_TOAST_INFO_KEY = () => storageKey("updateToastInfo");
const UPDATE_LIST_ID = (latest) => `update:${latest}`;

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
  if (it?.HasPrimaryImage || it?.ImageTags?.Primary || it?.Series?.ImageTags?.Primary) return true;
  if (it?.Type === "Episode" && (it?.SeriesId || it?.Series?.Id)) return true;
  return false;
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

function upsertUpdateNotification({ latest, url }) {
  const id = UPDATE_LIST_ID(latest);
  notifState.list = notifState.list.filter(n => n.id !== id);
  notifState.list.unshift({
    id,
    itemId: null,
    title: `${config.languageLabels?.updateAvailable || "Yeni sürüm mevcut"}: ${latest}`,
    timestamp: Date.now(),
    status: "update",
    url,
    read: false
  });
  notifState.list = notifState.list.filter(n => n.status !== "update" || n.id === id);
  saveState();
  updateBadge();
  if (document.querySelector("#jfNotifModal.open")) renderNotifications();
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
    status: x.status || "added",
    read: typeof x.read === "boolean" ? x.read : false
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

function getCreatedTs(item) {
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
            <button id="jfNotifModeToggle" class="jf-notif-theme-toggle" title="${(config.languageLabels?.switchToDark)||'Koyu temaya geç'}">
              <i class="material-icons" aria-hidden="true">dark_mode</i>
            </button>
            <button id="jfNotifMarkAllRead" class="jf-notif-markallread" title="${config.languageLabels.markAllRead || 'Tümünü okundu say'}">
              <i class="fa-solid fa-eye"></i>
            </button>
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
              <div class="jf-notif-subtitle">${config.languageLabels.latestNotifications}</div>
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

  document.getElementById("jfNotifMarkAllRead")
  ?.addEventListener("click", (e) => { e.stopPropagation(); markAllNotificationsRead(); });

loadThemePreference();
loadThemeModePreference();
updateBadge();
renderUpdateBanner();

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

  const contentUnread = notifState.list.reduce((acc, n) => acc + (n.read ? 0 : 1), 0);
const lastSeenAct = Number(notifState.activityLastSeen || 0);
const systemUnread = (config.enableCounterSystem && Array.isArray(notifState.activities))
  ? notifState.activities.reduce((acc, a) => {
      const ts = Date.parse(a?.Date || "") || 0;
      return acc + (ts > lastSeenAct ? 1 : 0);
    }, 0)
  : 0;

const total = contentUnread + systemUnread;
  const count = total > 99 ? "99+" : String(total);
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
  let items = compact.sort((a,b)=> (b.timestamp||0)-(a.timestamp||0)).slice(0, MAX_NOTIFS);

const updates = items.filter(n => n.status === "update");
const normals = items.filter(n => n.status !== "update");
items = [...updates, ...normals];

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
    const isUpdate = (n.status === "update");
if (isUpdate) {
  li.className = "jf-notif-item jf-notif-update";
  li.innerHTML = `
    <div class="meta">
      <div class="title">
        <span class="jf-badge jf-badge-update" title="${config.languageLabels?.updateAvailable || 'Yeni sürüm mevcut'}">
          <i class="fa-solid fa-arrows-rotate"></i>
        </span>
        ${escapeHtml(n.title || `${config.languageLabels?.updateAvailable || "Yeni sürüm mevcut"}`)}
        ${!n.read ? `<span class="jf-pill-unread">${escapeHtml(config.languageLabels?.unread || "Yeni")}</span>` : ""}
      </div>
      <div class="time">${formatTime(n.timestamp)}</div>
    </div>
    <div class="actions">
      <a class="lnk" target="_blank" rel="noopener" href="${escapeHtml(n.url || "https://github.com/G-grbz/Jellyfin-Media-Slider/releases")}">
        ${escapeHtml(config.languageLabels?.viewOnGithub || "GitHub’da Gör / İndir")}
      </a>
      ${!n.read ? `
        <button class="mark-read" title="${config.languageLabels?.markRead || 'Okundu say'}">
          <i class="fa-solid fa-envelope-open"></i>
        </button>` : ""}
      <button class="del" title="${escapeHtml(config.languageLabels?.removeTooltip || 'Kaldır')}">
        <i class="fa-solid fa-circle-xmark"></i>
      </button>
    </div>
  `;

  li.querySelector(".mark-read")?.addEventListener("click", (ev) => {
    ev.stopPropagation();
    markNotificationRead(n.id);
  });
  li.querySelector(".del")?.addEventListener("click", (ev) => {
    ev.stopPropagation();
    removeNotification(n.id);
  });

  frag.appendChild(li);
  return;
}

    li.className = "jf-notif-item";

    const d = details[i];
    const status = n.status === "removed" ? "removed" : "added";
    const statusLabel = status === "removed"
      ? (config.languageLabels.removedLabel || "Kaldırıldı")
      : (config.languageLabels.addedLabel || "Eklendi");

    let title = n.title || config.languageLabels.newContentDefault;
    if (d.ok && d.data?.Type === "Episode") {
  const seriesName  = d.data.SeriesName || "";
  const seasonNum   = d.data.ParentIndexNumber || 0;
  const episodeNum  = d.data.IndexNumber || 0;
  const episodeName = d.data.Name || "";

  title = formatEpisodeHeading({
    seriesName,
    seasonNum,
    episodeNum,
    episodeTitle: episodeName,
    locale: (config.defaultLanguage || "tur"),
    labels: config.languageLabels || {}
  });
} else if (d.ok && d.data?.Type === "Episode" && d.data?.SeriesName) {
      title = `${d.data.SeriesName} - ${title}`;
    }

    const imgSrc = (d.ok && hasPrimaryImage(d.data)) ? safePosterImageSrc(d.data, 80, 80) : "";
    const vStream = d.ok ? pickVideoStream(d.data?.MediaStreams) : null;
    const qualityHtml = vStream ? getVideoQualityText(vStream) : "";

    const isUnread = !n.read;
if (isUnread) li.classList.add("unread");

li.innerHTML = `
  ${imgSrc ? `<img class="thumb" src="${imgSrc}" alt="">` : ""}
  <div class="meta">
    <div class="title">
      <span class="jf-badge ${status === "removed" ? "jf-badge-removed" : "jf-badge-added"}">${escapeHtml(statusLabel)}</span>
      ${escapeHtml(title)}
      ${isUnread ? `<span class="jf-pill-unread">${escapeHtml(config.languageLabels?.unread || "Yeni")}</span>` : ""}
    </div>
    <div class="time">${formatTime(n.timestamp)}</div>
    ${qualityHtml ? `<div class="quality">${qualityHtml}</div>` : ""}
  </div>
  <div class="actions">
  ${isUnread ? `
    <button class="mark-read"
            title="${config.languageLabels?.markRead || 'Okundu say'}">
      <i class="fa-solid fa-envelope-open"></i>
    </button>` : ""}
  <button class="del"
          title="${config.languageLabels.removeTooltip}">
    <i class="fa-solid fa-circle-xmark"></i></i>
  </button>
</div>
`;

li.querySelector(".mark-read")?.addEventListener("click", (ev) => {
  ev.stopPropagation();
  markNotificationRead(n.id);
});

if (status !== "removed" && n.itemId) {
  li.addEventListener("click", () => {
    markNotificationRead(n.id, { silent: true });
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
    read: false,
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
   const merged = resolved ? { ...it, ...resolved } : { ...it };
   if (!merged.Name && resolved?.Name) merged.Name = resolved.Name;
   notifState.toastQueue.push({ type, it: merged, status: safeStatus });
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


  const { type, it, status = "added", items, total } = next;
  const c = document.querySelector("#jfToastContainer");
  if (!c) {
    notifState.toastQueue.unshift(next);
    setTimeout(runToastQueue, 500);
    return;
  }

  notifState.toastShowing = true;

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

  } else if (type === "update") {
    const title = it?.Name || (config.languageLabels.updateAvailable || "Yeni sürüm mevcut");
    const desc  = it?.Overview ? ` – ${escapeHtml(it.Overview)}` : "";
    toast.innerHTML = `
      <div class="text">
        <b>${escapeHtml(title)}</b><br>
        ${desc}
      </div>
    `;
    if (it?.Url) {
      toast.style.cursor = "pointer";
      toast.addEventListener("click", () => window.open(it.Url, "_blank", "noopener"));
    }

    } else if (type === "content") {
    let displayName = it.Name || "";
    if (it.Type === "Episode") {
      displayName = formatEpisodeHeading({
        seriesName: it.SeriesName || "",
        seasonNum: it.ParentIndexNumber || 0,
        episodeNum: it.IndexNumber || 0,
        episodeTitle: it.Name || "",
        locale: (config.defaultLanguage || "tur"),
        labels: config.languageLabels || {}
      });
    }
    const statusLabel = status === "removed"
      ? (config.languageLabels.removedLabel || "Kaldırıldı")
      : (config.languageLabels.addedLabel || "Eklendi");
   toast.innerHTML = `
    ${status !== "removed" ? `<img class="thumb" src="${safePosterImageSrc(it, 80, 80)}" alt="" onerror="this.style.display='none'">` : ""}
     <div class="text">
       <b>
         <span class="jf-badge ${status === "removed" ? "jf-badge-removed" : "jf-badge-added"}">${escapeHtml(statusLabel)}</span>
         ${status === "removed" ? (config.languageLabels.contentChanged || "İçerik değişti") : config.languageLabels.newContentAdded}
       </b><br>
       ${escapeHtml(displayName)}
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
  if (it?.Url) {
    toast.style.cursor = "pointer";
    toast.addEventListener("click", () => window.open(it.Url, "_blank", "noopener"));
  }
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

function markActivityRead(a, { silent = false } = {}) {
  const ts = Date.parse(a?.Date || "") || 0;
  if (ts > (notifState.activityLastSeen || 0)) {
    notifState.activityLastSeen = ts;
    saveState();
    updateBadge();
    if (!silent) renderNotifications();
  }
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

  function safeParseTs(s) {
  const t = Date.parse(s || "");
  return Number.isFinite(t) ? t : 0;
}

const fresh =
  acts
    .map((a, idx) => {
      const id = a.Id || `${a.Type}:${a.Date}`;
      return { a, id, idx, ts: clampToNow(safeParseTs(a?.Date)) };
    })
    .filter(({ id }) => !notifState.activitySeenIds.has(id))
    .sort((x, y) => (x.ts - y.ts) || (x.idx - y.idx))
    .map(x => x.a);

   const nonRemoval = [];
  let newestFreshTs = 0;

   for (const a of fresh) {
     const id = a.Id || `${a.Type}:${a.Date}`;
     notifState.activitySeenIds.add(id);

    const ts = Date.parse(a?.Date || "") || 0;
    if (ts > newestFreshTs) newestFreshTs = ts;

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


function activityKey(a) {
  if (a?.Id) return `activity:${a.Id}`;
  return `activity:${a.Type || "act"}|${a.Date || ""}|${a.Overview || ""}|${a.Name || ""}`;
}

function enqueueActivityToastBurst(activities = []) {
  if (!config.enableToastSystem) return;

  const seen = new Set();
  const uniq = [];
  for (const a of activities) {
    const k = activityKey(a);
    if (seen.has(k)) continue;
    if (!toastShouldEnqueue(k)) continue;
    seen.add(k);
    uniq.push(a);
  }

  if (!uniq.length) return;

  const LIMIT = 6;
  const picks = uniq.length <= LIMIT ? uniq : [uniq[0], uniq[uniq.length - 1]];
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

function markNotificationRead(id, { silent = false } = {}) {
  let changed = false;
  notifState.list = notifState.list.map(n => {
    if (n.id === id && !n.read) {
      changed = true;
      return { ...n, read: true };
    }
    return n;
  });
  if (changed) {
    saveState();
    updateBadge();
    if (!silent) renderNotifications();
  }
}

function markAllNotificationsRead() {
  let changed = false;
  notifState.list = notifState.list.map(n => {
    if (!n.read) { changed = true; return { ...n, read: true }; }
    return n;
  });
  if (changed) {
    saveState();
    updateBadge();
    renderNotifications();
    requestAnimationFrame(updateBadge);
  }
}

function getStoredUpdateBanner() {
  try { return JSON.parse(localStorage.getItem(UPDATE_BANNER_KEY()) || "null"); } catch { return null; }
}
function setStoredUpdateBanner(data) {
  if (!data) localStorage.removeItem(UPDATE_BANNER_KEY());
  else localStorage.setItem(UPDATE_BANNER_KEY(), JSON.stringify(data));
}
function getUpdateToastShown() {
  return localStorage.getItem(UPDATE_TOAST_SHOWN_KEY()) || "";
}
function setUpdateToastShown(v) {
  localStorage.setItem(UPDATE_TOAST_SHOWN_KEY(), v || "");
}

export function renderUpdateBanner() {
  const el = document.getElementById("jfUpdateBanner");
  if (!el) return;

  const data = getStoredUpdateBanner();
  if (!data || !data.latest) {
    el.style.display = "none";
    return;
  }

  const current = getCurrentVersionFromEnv();
  if (compareSemver(current, data.latest) >= 0) {
    setStoredUpdateBanner(null);
    el.style.display = "none";
    return;
  }

  el.style.display = "flex";

  const txt = el.querySelector(".txt");
  const lnk = el.querySelector(".lnk");
  const dis = el.querySelector(".dismiss");

  txt.textContent = `${config.languageLabels?.updateAvailable || "Yeni sürüm mevcut"}: ${data.latest}`;
  lnk.textContent = config.languageLabels?.viewOnGithub || "GitHub'da Gör / İndir";
  lnk.href = data.url || "https://github.com/G-grbz/Jellyfin-Media-Slider/releases";

  dis.onclick = () => {
    el.style.display = "none";
    setStoredUpdateBanner(null);
  };
}

window.jfNotifyUpdateAvailable = ({ latest, url, remindMs }) => {
  try {
    setStoredUpdateBanner({ latest, url });
    renderUpdateBanner();
    upsertUpdateNotification({ latest, url });

    const DEFAULT_REMIND = 12 * 60 * 60 * 1000;
    const remindEvery = (typeof remindMs === "number" && remindMs >= 0) ? remindMs : DEFAULT_REMIND;

    const info = getUpdateToastInfo();
    const now = Date.now();
    let shouldShow = !info || info.latest !== latest || (now - Number(info.shownAt || 0)) >= remindEvery;

    if (shouldShow) {
      notifState.toastQueue.push({
        type: "update",
        it: {
          Name: config.languageLabels?.updateAvailable || "Yeni sürüm mevcut",
          Overview: `${latest}`,
          Url: url
        }
      });
      runToastQueue();
      setUpdateToastInfo({ latest, shownAt: now });
    }
  } catch (e) {
    console.warn("jfNotifyUpdateAvailable error:", e);
  }
};

 function getUpdateToastInfo() {
  const old = localStorage.getItem(UPDATE_TOAST_SHOWN_KEY());
  if (old) {
    try {
      localStorage.removeItem(UPDATE_TOAST_SHOWN_KEY());
      const info = { latest: old, shownAt: 0 };
      localStorage.setItem(UPDATE_TOAST_INFO_KEY(), JSON.stringify(info));
      return info;
    } catch {}
  }
  try {
    return JSON.parse(localStorage.getItem(UPDATE_TOAST_INFO_KEY()) || "null");
  } catch { return null; }
}
function setUpdateToastInfo(info) {
  if (!info) localStorage.removeItem(UPDATE_TOAST_INFO_KEY());
  else localStorage.setItem(UPDATE_TOAST_INFO_KEY(), JSON.stringify(info));
}

function formatEpisodeHeading({
  seriesName,
  seasonNum,
  episodeNum,
  episodeTitle,
  locale = (getConfig()?.defaultLanguage || "tur"),
  labels = (getConfig()?.languageLabels || {})
}) {
  const lx = {
    season: labels.season || { tur:"Sezon", eng:"Season", fre:"Saison", deu:"Staffel", rus:"Сезон" }[locale] || "Season",
    episode: labels.episode || { tur:"Bölüm", eng:"Episode", fre:"Épisode", deu:"Folge",  rus:"Серия" }[locale] || "Episode",
  };

  const patterns = {
    tur: "{series} - {seasonNum}. {season} {episodeNum}. {episode}{titlePart}",
    eng: "{series} — {season} {seasonNum}, {episode} {episodeNum}{titlePart}",
    fre: "{series} — {season} {seasonNum}, {episode} {episodeNum}{titlePart}",
    deu: "{series} — {season} {seasonNum}, {episode} {episodeNum}{titlePart}",
    rus: "{series} — {seasonNum} {season}, {episodeNum} {episode}{titlePart}",
    default: "{series} — {season} {seasonNum}, {episode} {episodeNum}{titlePart}",
  };
  const pat = patterns[locale] || patterns.default;

  const genericTitleTemplates = {
    tur: "{episodeNum}. {episode}",
    eng: "{episode} {episodeNum}",
    fre: "{episode} {episodeNum}",
    deu: "{episode} {episodeNum}",
    rus: "{episode} {episodeNum}",
    default: "{episode} {episodeNum}",
  };
  const genTitlePat = genericTitleTemplates[locale] || genericTitleTemplates.default;

  const normalizedTitle = String(episodeTitle || "").trim().toLowerCase();
  const localizedGenericTitle = genTitlePat
    .replace("{episode}", lx.episode)
    .replace("{episodeNum}", String(episodeNum))
    .trim()
    .toLowerCase();

  const titlePart = normalizedTitle && normalizedTitle !== localizedGenericTitle
    ? `: ${episodeTitle.trim()}`
    : "";

  return pat
    .replace("{series}", seriesName)
    .replace("{season}", lx.season)
    .replace("{episode}", lx.episode)
    .replace("{seasonNum}", String(seasonNum))
    .replace("{episodeNum}", String(episodeNum))
    .replace("{titlePart}", titlePart);
}
