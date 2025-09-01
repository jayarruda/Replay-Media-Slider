import { getConfig } from "../config.js";
import { createCheckbox, createSection } from "../settings.js";
import { applySettings } from "./applySettings.js";

const config = getConfig();

export function createStudioHubsPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'studio-panel';
    panel.className = 'settings-panel';

    const section = createSection(config.languageLabels.studioHubsSettings || 'Stüdyo Koleksiyonlarını');

    const enableCheckbox = createCheckbox(
    'enableStudioHubs',
    config.languageLabels.enableStudioHubs || 'Stüdyo Koleksiyonlarını Etkinleştir',
    config.enableStudioHubs
);
    section.appendChild(enableCheckbox);
    panel.appendChild(section);
    return panel;
}
