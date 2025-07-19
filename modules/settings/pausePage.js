import { getConfig } from "../config.js";
import { createCheckbox, createSection } from "../settings.js";

export function createPausePanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'pause-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.pauseSettings || 'Durdurma Ekranı Ayarları');

    const enableCheckbox = createCheckbox(
    'pauseOverlay',
    labels.enablePauseOverlay || 'Durdurma Ekranını Etkinleştir',
    config.pauseOverlay.enabled
);
    section.appendChild(enableCheckbox);

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.pauseOverlayDescription ||
        'Bu özellik etkinleştirildiğinde, video duraklatıldığında içerik bilgilerini gösteren bir ekran görüntülenir.';
    section.appendChild(description);

    const imagePrefLabel = document.createElement('label');
    imagePrefLabel.textContent = labels.pauseImagePreference || 'Görsel Önceliği';
    imagePrefLabel.htmlFor = 'pauseOverlayImagePreference';
    imagePrefLabel.className = 'settings-label';

    const imagePrefSelect = document.createElement('select');
    imagePrefSelect.name = 'pauseOverlayImagePreference';
    imagePrefSelect.id = 'pauseOverlayImagePreference';
    imagePrefSelect.className = 'settings-select';

    ['auto', 'logo', 'disc', 'title'].forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labels['pauseImage_' + value] || value;
    option.selected = config.pauseOverlay.imagePreference === value;
    imagePrefSelect.appendChild(option);
});

    const imagePrefContainer = document.createElement('div');
    imagePrefContainer.className = 'form-group';
    imagePrefContainer.appendChild(imagePrefLabel);
    imagePrefContainer.appendChild(imagePrefSelect);
    section.appendChild(imagePrefContainer);

    const showPlotCheckbox = createCheckbox(
    'pauseOverlayShowPlot',
    labels.showPlot || 'Konu Açıklamasını Göster',
    config.pauseOverlay.showPlot !== false
);
section.appendChild(showPlotCheckbox);

const showMetadataCheckbox = createCheckbox(
    'pauseOverlayShowMetadata',
    labels.showMetadata || 'Bilgi Satırlarını Göster',
    config.pauseOverlay.showMetadata !== false
);
section.appendChild(showMetadataCheckbox);

const showLogoCheckbox = createCheckbox(
    'pauseOverlayShowLogo',
    labels.showLogo || 'Logo/Disk/Yazı Göster',
    config.pauseOverlay.showLogo !== false
);
section.appendChild(showLogoCheckbox);

const showBackdropCheckbox = createCheckbox(
    'pauseOverlayShowBackdrop',
    labels.showBackdrop || 'Arka Plan Görselini Göster',
    config.pauseOverlay.showBackdrop !== false
);
section.appendChild(showBackdropCheckbox);

    panel.appendChild(section);
    return panel;
}
