import { getConfig } from "./config.js";
import {
  makeApiRequest,
  fetchLocalTrailers,
  pickBestLocalTrailer,
  getVideoStreamUrl
} from "./api.js";

let __pop = null;
let __timer = null;
let __cleanup = null;
let __presenceTimer = null;
let __openSeq = 0;
let __navSeq  = 0;
let __tombstoneUntil = 0;
let __lastItemId = null;

function ensureEl() {
  if (__pop) return __pop;

  const el = document.createElement("div");
  el.className = "mini-trailer-popover";
  el.style.position = "fixed";
  el.style.zIndex = "99999";
  el.style.left = "0";
  el.style.top = "0";
  el.style.display = "none";
  el.innerHTML = `
    <div class="mtp-inner">
      <div class="mtp-player"></div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
  .mini-trailer-popover {
  width: 360px;
  max-width: min(360px, calc(100vw - 24px));
  display: none;
  opacity: 0;
  transform: translateY(6px) scale(.985);
  pointer-events: none;
  transition:
    opacity .16s ease-out,
    transform .22s cubic-bezier(.22,.61,.36,1);
  will-change: opacity, transform;
}
  .mini-trailer-popover.visible {
  display: block !important;
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
  .mini-trailer-popover .mtp-inner {
  background: linear-gradient(90deg,rgba(24,27,38,.94) 60%,transparent);
  overflow: hidden;
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid hsla(0,0%,100%,.12);
  box-shadow: 0 12px 32px rgba(0,0,0,.3), 0 4px 8px rgba(0,0,0,.2);
}
  .mini-trailer-popover video,
  .mini-trailer-popover iframe {
  width: 100%;
  height: 200px;
  display: block;
  border: 0;
  border-radius: 16px;
  opacity: 0;
  transition: opacity .25s ease-out;
}

  .mini-trailer-popover.visible video,
  .mini-trailer-popover.visible iframe {
    opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .mini-trailer-popover,
  .mini-trailer-popover video,
  .mini-trailer-popover iframe {
    transition: none !important;
    transform: none !important;
  }
}
  `;
  document.head.appendChild(style);
  (document.body || document.documentElement).appendChild(el);
  __pop = el;
  return el;
}

function destroyPopover() {
  if (!__pop) return;
  try {
    const host = __pop.querySelector(".mtp-player");
    if (host) host.innerHTML = "";
    __pop.remove();
  } catch {}
  __pop = null;
}

function getBaseRect(anchor) {
  const miniInfo = document.querySelector(".mini-poster-popover.visible");
  const sourceEl =
    (miniInfo && document.contains(miniInfo)) ? miniInfo :
    (anchor && document.contains(anchor)) ? anchor : null;
  if (!sourceEl) return null;
  return { rect: sourceEl.getBoundingClientRect(), sourceEl };
}

function measure(pop) {
  const prevDisplay = pop.style.display;
  const prevOpacity = pop.style.opacity;
  pop.style.display = "block";
  pop.style.opacity = "0";
  const pw = pop.offsetWidth || 420;
  const ph = pop.offsetHeight || 236 + 16;
  pop.style.display = prevDisplay || "";
  pop.style.opacity = prevOpacity || "";
  return { pw, ph };
}

function placeNear(anchor) {
  if (!__pop || !anchor || !document.contains(anchor)) return false;

  const base = getBaseRect(anchor);
  if (!base) return false;

  const { rect: baseRect } = base;
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const margin = 8;
  const vGap = 14;
  const { pw, ph } = measure(__pop);

  const spaceBottom = (vh - baseRect.bottom) - margin;
  const spaceTop    = (baseRect.top) - margin;
  const placeBottom = spaceBottom >= ph || spaceBottom >= spaceTop;

  let left = baseRect.left + (baseRect.width - pw) / 2;
  left = Math.max(margin, Math.min(left, vw - pw - margin));

  let top;
  if (placeBottom) {
    top = baseRect.bottom + vGap;
    if (top + ph + margin > vh) top = vh - ph - margin;
  } else {
    top = baseRect.top - vGap - ph;
    if (top < margin) top = margin;
  }

  __pop.style.left = `${Math.round(left)}px`;
  __pop.style.top  = `${Math.round(top)}px`;
  return true;
}

function setupLiveSync(anchor) {
  teardownLiveSync();
  const base = getBaseRect(anchor);
  const sourceEl = base?.sourceEl;

  const onReflow = () => {
    if (!anchor || !document.contains(anchor)) { hardClose(true); return; }
    placeNear(anchor);
  };

  window.addEventListener("scroll", onReflow, true);
  window.addEventListener("resize", onReflow, true);
  const ro = new ResizeObserver(onReflow);
  if (sourceEl) ro.observe(sourceEl);
  const mo = new MutationObserver(onReflow);
  if (sourceEl) mo.observe(sourceEl, { attributes: true, attributeFilter: ["style", "class"] });

  if (__presenceTimer) clearInterval(__presenceTimer);
  __presenceTimer = setInterval(() => {
    if (!anchor || !document.contains(anchor)) hardClose(true);
  }, 400);

  __cleanup = () => {
    window.removeEventListener("scroll", onReflow, true);
    window.removeEventListener("resize", onReflow, true);
    try { ro.disconnect(); } catch {}
    try { mo.disconnect(); } catch {}
    if (__presenceTimer) { clearInterval(__presenceTimer); __presenceTimer = null; }
    __cleanup = null;
  };
}

function teardownLiveSync() {
  if (typeof __cleanup === "function") {
    __cleanup();
  }
}

function ytEmbed(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (!host.includes("youtube.com") && !host.includes("youtu.be")) return null;

    let id = "";
    if (host.includes("youtu.be")) id = u.pathname.slice(1);
    else id = u.searchParams.get("v") || "";
    if (!id) return null;

    const params = new URLSearchParams({
      autoplay: "1",
      mute: "0",
      controls: "0",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      enablejsapi: "1",
      origin: location.origin
    });
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
  } catch {}
  return null;
}

async function resolveBestTrailerUrl(itemId) {
  try {
    const locals = await fetchLocalTrailers(itemId);
    const best = pickBestLocalTrailer(locals);
    if (best?.Id) {
      const url = await getVideoStreamUrl(best.Id, 360, 0);
      if (url) return { type: "video", src: url };
    }
  } catch {}

  try {
    const full = await makeApiRequest(`/Items/${itemId}`);
    const remotes = Array.isArray(full?.RemoteTrailers) ? full.RemoteTrailers : [];
    if (remotes.length) {
      const yt = remotes.find(r => ytEmbed(r?.Url));
      if (yt) return { type: "youtube", src: ytEmbed(yt.Url) };
      const first = remotes.find(r => typeof r?.Url === "string");
      if (first) return { type: "video", src: first.Url };
    }
  } catch {}

  return null;
}

function renderPlayer(container, kind, src) {
  container.innerHTML = "";
  if (kind === "youtube") {
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.frameBorder = "0";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.sandbox = "allow-same-origin allow-scripts allow-popups allow-presentation";
    iframe.classList.add("studio-trailer-iframe");
    container.appendChild(iframe);
    return;
  }

  const video = document.createElement("video");
  video.src = src;
  video.autoplay = true;
  video.muted = false;
  video.controls = false;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.classList.add("studio-trailer-video");
  container.appendChild(video);
}

function stopAndClearMedia() {
  if (!__pop) return;
  const host = __pop.querySelector(".mtp-player");
  if (!host) return;

  const vid = host.querySelector("video");
  if (vid) {
    try {
      vid.pause();
      vid.removeAttribute("src");
      vid.load();
    } catch {}
  }
  const iframe = host.querySelector("iframe");
  if (iframe) iframe.src = "";
  host.innerHTML = "";
}

function hardClose(destroy = false) {
  __openSeq++;
  try { hideTrailerPopover(0); } catch {}
  stopAndClearMedia();
  if (destroy) destroyPopover();
  __lastItemId = null;
}

(() => {
  if (window.__studioTrailerNavGuardsInstalled) return;
  window.__studioTrailerNavGuardsInstalled = true;

  const markNav = () => {
    __navSeq++;
    __tombstoneUntil = Date.now() + 1500;
    window.__studioTrailerKillToken = (window.__studioTrailerKillToken || 0) + 1;
    hardClose(true);
  };

  ["pushState", "replaceState"].forEach((fn) => {
    const orig = history[fn];
    if (typeof orig === "function") {
      history[fn] = function (...args) {
        const ret = orig.apply(this, args);
        markNav();
        return ret;
      };
    }
  });

  window.addEventListener("popstate", markNav, true);
  window.addEventListener("hashchange", markNav, true);
  window.addEventListener("pagehide", () => markNav(), true);
  document.addEventListener("visibilitychange", () => { if (document.hidden) markNav(); }, true);
  window.addEventListener("studiohubs:navigated", markNav, true);
  document.addEventListener("click", () => { setTimeout(markNav, 0); }, true);
})();

export async function tryOpenTrailerPopover(anchorEl, itemId) {
  const cfg = getConfig();
  if (!cfg?.studioMiniTrailerPopover) return false;
  if (!anchorEl || !document.contains(anchorEl)) return false;
  if (Date.now() < __tombstoneUntil) return false;

  const myOpenSeq = ++__openSeq;
  const myNavSeq  = __navSeq;
  const myKill    = window.__studioTrailerKillToken || 0;

  const best = await resolveBestTrailerUrl(itemId);
  if (!best) return false;
  if (Date.now() < __tombstoneUntil) return false;
  if (myOpenSeq !== __openSeq || myNavSeq !== __navSeq) return false;
  if ((window.__studioTrailerKillToken || 0) !== myKill) return false;
  if (!document.contains(anchorEl)) return false;

  const pop = ensureEl();
  const host = pop.querySelector(".mtp-player");
  renderPlayer(host, best.type, best.src);

  const placed = placeNear(anchorEl);
  if (!placed) { hardClose(true); return false; }

  setupLiveSync(anchorEl);
  requestAnimationFrame(() => {
    if (!__pop) return;
    if (Date.now() < __tombstoneUntil) { hardClose(true); return; }
    if (myOpenSeq !== __openSeq || myNavSeq !== __navSeq) return;
    if ((window.__studioTrailerKillToken || 0) !== myKill) return;
    if (!document.contains(anchorEl)) { hardClose(true); return; }

    __lastItemId = itemId || null;
    __pop.classList.add("visible");
  });

  return true;
}

export function hideTrailerPopover(delay = 120) {
  if (!__pop) return;
  if (__timer) { clearTimeout(__timer); __timer = null; }
  __timer = setTimeout(() => {
    if (!__pop) return;
    __pop.classList.remove("visible");
    teardownLiveSync();
    stopAndClearMedia();
  }, delay);
}
