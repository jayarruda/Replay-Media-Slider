import { getConfig } from "../config.js";
import { createCheckbox, createSection, createNumberInput } from "../settings.js";
import { applySettings } from "./applySettings.js";
import { getAuthHeader } from "../api.js";

const cfg = getConfig();
const DEFAULT_ORDER = [
  "Marvel Studios","Pixar","Walt Disney Pictures","Disney+","DC",
  "Warner Bros. Pictures","Lucasfilm Ltd.","Columbia Pictures",
  "Paramount Pictures","Netflix","DreamWorks Animation"
];

const ALIASES = {
  "Marvel Studios": ["marvel studios","marvel","marvel entertainment","marvel studios llc"],
  "Pixar": ["pixar","pixar animation studios","disney pixar"],
  "Walt Disney Pictures": ["walt disney","walt disney pictures"],
  "Disney+": ["disney+","disney plus","disney+ originals","disney plus originals","disney+ studio"],
  "DC": ["dc entertainment","dc"],
  "Warner Bros. Pictures": ["warner bros","warner bros.","warner bros pictures","warner bros. pictures","warner brothers"],
  "Lucasfilm Ltd.": ["lucasfilm","lucasfilm ltd","lucasfilm ltd."],
  "Columbia Pictures": ["columbia","columbia pictures","columbia pictures industries"],
  "Paramount Pictures": ["paramount","paramount pictures","paramount pictures corporation"],
  "Netflix": ["netflix"],
  "DreamWorks Animation": ["dreamworks","dreamworks animation","dreamworks pictures"]
};

const JUNK_WORDS = [
  "ltd","ltd.","llc","inc","inc.","company","co.","corp","corp.","the",
  "pictures","studios","animation","film","films","pictures.","studios."
];

const nbase = s =>
  (s || "")
    .toLowerCase()
    .replace(/[().,™©®\-:_+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const strip = s => {
  let out = " " + nbase(s) + " ";
  for (const w of JUNK_WORDS) out = out.replace(new RegExp(`\\s${w}\\s`, "g"), " ");
  return out.trim();
};

const toks = s => strip(s).split(" ").filter(Boolean);

const CANONICALS = new Map(DEFAULT_ORDER.map(n => [n.toLowerCase(), n]));

const ALIAS_TO_CANON = (() => {
  const m = new Map();
  for (const [canon, aliases] of Object.entries(ALIASES)) {
    m.set(canon.toLowerCase(), canon);
    for (const a of aliases) m.set(String(a).toLowerCase(), canon);
  }
  return m;
})();

function toCanonicalStudioName(name) {
  if (!name) return null;
  const key = String(name).toLowerCase();
  return ALIAS_TO_CANON.get(key) || CANONICALS.get(key) || null;
}

function mergeOrder(defaults, custom) {
  const out = [];
  const seen = new Set();

  for (const n of (custom || [])) {
    const canon = toCanonicalStudioName(n) || n;
    const k = String(canon).toLowerCase();
    if (!seen.has(k)) { out.push(canon); seen.add(k); }
  }
  for (const n of defaults) {
    const k = n.toLowerCase();
    if (!seen.has(k)) { out.push(n); seen.add(k); }
  }
  return out;
}

function createHiddenInput(id, value) {
  const inp = document.createElement("input");
  inp.type = "hidden";
  inp.id = id;
  inp.name = id;
  inp.value = value;
  return inp;
}

function createDraggableList(id, items, labels) {
  const wrap = document.createElement("div");
  wrap.className = "setting-input setting-dnd";

  const lab = document.createElement("label");
  lab.textContent = labels?.studioHubsOrderLabel || "Sıralama (sürükle-bırak)";
  lab.style.display = "block";
  lab.style.marginBottom = "6px";

  const list = document.createElement("ul");
  list.id = id;
  list.className = "dnd-list";
  list.style.listStyle = "none";
  list.style.padding = "0";
  list.style.margin = "0";
  list.style.border = "1px solid var(--theme-text-color, #8882)";
  list.style.borderRadius = "8px";
  list.style.maxHeight = "320px";
  list.style.overflow = "auto";

  items.forEach(name => {
    const li = document.createElement("li");
    li.className = "dnd-item";
    li.draggable = true;
    li.dataset.name = name;
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "8px";
    li.style.padding = "8px 10px";
    li.style.borderBottom = "1px solid #0002";
    li.style.background = "var(--theme-background, rgba(255,255,255,0.02))";

    const handle = document.createElement("span");
    handle.className = "dnd-handle";
    handle.textContent = "↕";
    handle.title = labels?.dragToReorder || "Sürükle-bırak";
    handle.style.cursor = "grab";
    handle.style.userSelect = "none";
    handle.style.fontWeight = "700";

    const txt = document.createElement("span");
    txt.textContent = name;
    txt.style.flex = "1";

    li.appendChild(handle);
    li.appendChild(txt);
    list.appendChild(li);
  });

  let dragEl = null;

  list.addEventListener("dragstart", (e) => {
    const li = e.target.closest(".dnd-item");
    if (!li) return;
    dragEl = li;
    li.style.opacity = "0.6";
    e.dataTransfer.effectAllowed = "move";
  });

  list.addEventListener("dragend", (e) => {
    const li = e.target.closest(".dnd-item");
    if (!li) return;
    li.style.opacity = "";
    dragEl = null;
  });

  list.addEventListener("dragover", (e) => {
    e.preventDefault();
    const over = e.target.closest(".dnd-item");
    if (!dragEl || !over || over === dragEl) return;
    const rect = over.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    list.insertBefore(dragEl, before ? over : over.nextSibling);
  });

  wrap.appendChild(lab);
  wrap.appendChild(list);
  return { wrap, list };
}

export function createStudioHubsPanel(config, labels) {
  const panel = document.createElement('div');
  panel.id = 'studio-panel';
  panel.className = 'setting-item';

  const section = createSection(
    labels?.studioHubsSettings ||
    config.languageLabels.studioHubsSettings ||
    'Stüdyo Koleksiyonları Ayarları'
  );

  const enableCheckbox = createCheckbox(
    'enableStudioHubs',
    labels?.enableStudioHubs || config.languageLabels.enableStudioHubs || 'Stüdyo Koleksiyonlarını Etkinleştir',
    config.enableStudioHubs
  );
  section.appendChild(enableCheckbox);

  const enableHoverVideo = createCheckbox(
    'studioHubsHoverVideo',
    labels?.studioHubsHoverVideo || 'Hover’da video oynat',
    config.studioHubsHoverVideo
  );
  section.appendChild(enableHoverVideo);

  const countWrap = createNumberInput(
    'studioHubsCardCount',
    labels?.studioHubsCardCount || 'Gösterilecek kart sayısı (Ana ekran)',
    Number.isFinite(config.studioHubsCardCount) ? config.studioHubsCardCount : 10,
    1,
    48
  );
  section.appendChild(countWrap);

  const ratingWrap = createNumberInput(
   'studioHubsMinRating',
   labels?.studioHubsMinRating || 'Minimum Derecelendirme',
   Number.isFinite(config.studioHubsMinRating) ? config.studioHubsMinRating : 6.5,
   1,
   10,
   0.1
 );
section.appendChild(ratingWrap);

  const baseOrder = mergeOrder(
    DEFAULT_ORDER,
    Array.isArray(config.studioHubsOrder) && config.studioHubsOrder.length
      ? config.studioHubsOrder
      : []
  );

  const hidden = createHiddenInput('studioHubsOrder', JSON.stringify(baseOrder));
  const { wrap: dndWrap, list } = createDraggableList('studioHubsOrderList', baseOrder, labels);

  section.appendChild(dndWrap);
  section.appendChild(hidden);

  (async () => {
    try {
      const r = await fetch(
        `/Studios?Limit=300&Recursive=true&SortBy=SortName&SortOrder=Ascending`,
        { headers: { "Accept": "application/json", "Authorization": getAuthHeader() } }
      );
      if (!r.ok) throw new Error(`Studios fetch failed: ${r.status}`);
      const data = await r.json();
      const items = Array.isArray(data?.Items) ? data.Items : (Array.isArray(data) ? data : []);

      const existing = new Set(
        [...list.querySelectorAll(".dnd-item")].map(li => li.dataset.name.toLowerCase())
      );

      const toAdd = [];
      for (const s of items) {
        const canon = toCanonicalStudioName(s?.Name);
        if (!canon) continue;
        if (!existing.has(canon.toLowerCase())) {
          existing.add(canon.toLowerCase());
          toAdd.push(canon);
        }
      }

      if (toAdd.length) {
        const appendSorted = toAdd.sort(
          (a, b) => DEFAULT_ORDER.indexOf(a) - DEFAULT_ORDER.indexOf(b)
        );

        for (const name of appendSorted) {
          const li = document.createElement("li");
          li.className = "dnd-item";
          li.draggable = true;
          li.dataset.name = name;
          li.style.display = "flex";
          li.style.alignItems = "center";
          li.style.gap = "8px";
          li.style.padding = "8px 10px";
          li.style.borderBottom = "1px solid #0002";
          li.style.background = "var(--theme-background, rgba(255,255,255,0.02))";

          const handle = document.createElement("span");
          handle.className = "dnd-handle";
          handle.textContent = "↕";
          handle.title = labels?.dragToReorder || "Sürükle-bırak";
          handle.style.cursor = "grab";
          handle.style.userSelect = "none";
          handle.style.fontWeight = "700";

          const txt = document.createElement("span");
          txt.textContent = name;
          txt.style.flex = "1";

          li.appendChild(handle);
          li.appendChild(txt);
          list.appendChild(li);
        }

        const names = [...list.querySelectorAll(".dnd-item")].map(li => li.dataset.name);
        hidden.value = JSON.stringify(names);
      }
    } catch (e) {
      console.warn("studioHubsPage: Studios genişletme başarısız:", e);
    }
  })();

  const refreshHidden = () => {
    const names = [...list.querySelectorAll(".dnd-item")].map(li => li.dataset.name);
    hidden.value = JSON.stringify(names);
  };
  list.addEventListener("dragend", refreshHidden);
  list.addEventListener("drop", refreshHidden);

  panel.appendChild(section);
  return panel;
}
