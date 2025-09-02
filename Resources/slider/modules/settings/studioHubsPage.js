import { getConfig } from "../config.js";
import { createCheckbox, createSection } from "../settings.js";
import { applySettings } from "./applySettings.js";

const cfg = getConfig();

function createNumberInput(id, label, value, min = 1, max = 48) {
  const wrap = document.createElement("div");
  wrap.className = "setting-input setting-number";
  const lab = document.createElement("label");
  lab.setAttribute("for", id);
  lab.textContent = label;
  const inp = document.createElement("input");
  inp.type = "number";
  inp.id = id;
  inp.name = id;
  inp.min = String(min);
  inp.max = String(max);
  inp.step = "1";
  inp.value = String(value ?? "");
  wrap.appendChild(lab);
  wrap.appendChild(inp);
  return { wrap, input: inp };
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
  panel.className = 'settings-panel';

  const section = createSection(labels?.studioHubsSettings || config.languageLabels.studioHubsSettings || 'Stüdyo Koleksiyonları Ayarları');
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
  const { wrap: countWrap } = createNumberInput(
    'studioHubsCardCount',
    labels?.studioHubsCardCount || 'Gösterilecek kart sayısı',
    Number.isFinite(config.studioHubsCardCount) ? config.studioHubsCardCount : 10,
    1,
    48
  );
  section.appendChild(countWrap);
  const order = Array.isArray(config.studioHubsOrder) && config.studioHubsOrder.length
    ? [...config.studioHubsOrder]
    : [
        "Marvel Studios","Pixar","Walt Disney Pictures","Disney+","DC",
        "Warner Bros. Pictures","Lucasfilm Ltd.","Columbia Pictures","Paramount Pictures","Netflix"
      ];

  const hidden = createHiddenInput('studioHubsOrder', JSON.stringify(order));
  const { wrap: dndWrap, list } = createDraggableList('studioHubsOrderList', order, labels);
  section.appendChild(dndWrap);
  section.appendChild(hidden);
  const refreshHidden = () => {
    const names = [...list.querySelectorAll(".dnd-item")].map(li => li.dataset.name);
    hidden.value = JSON.stringify(names);
  };
  list.addEventListener("dragend", refreshHidden);
  list.addEventListener("drop", refreshHidden);

  panel.appendChild(section);
  return panel;
}
