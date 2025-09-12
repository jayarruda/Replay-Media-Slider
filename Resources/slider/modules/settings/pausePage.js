import { getConfig } from "../config.js";
import { createCheckbox, createSection } from "../settings.js";

export function createPausePanel(_config, labels) {
  const config = getConfig();
  const sap = Object.assign({enabled:true,idleThresholdMs:45000,unfocusedThresholdMs:15000,offscreenThresholdMs:10000,useIdleDetection:true,respectPiP:true}, (config.smartAutoPause||{}));

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
  const imagePrefContainer = document.createElement('div');
  imagePrefContainer.className = 'fsetting-item';

  const imagePrefLabel = document.createElement('label');
  imagePrefLabel.textContent = labels.pauseImagePreference || 'Görsel Önceliği';
  imagePrefLabel.htmlFor = 'pauseOverlayImagePreference';
  imagePrefLabel.className = 'settings-label';

  const imagePrefSelect = document.createElement('select');
  imagePrefSelect.name = 'pauseOverlayImagePreference';
  imagePrefSelect.id = 'pauseOverlayImagePreference';
  imagePrefSelect.className = 'settings-select';

  ['auto', 'logo', 'disc', 'title', 'logo-title', 'disc-logo-title', 'disc-title'].forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labels['pauseImage_' + value] || value;
    option.selected = config.pauseOverlay.imagePreference === value;
    imagePrefSelect.appendChild(option);
  });

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
  const smartSection = createSection(labels.smartPauseSettings || 'Akıllı Otomatik Duraklatma');
  const smartEnable = createCheckbox(
    'smartAutoPause',
    labels.smartAutoPauseEnable || 'Akıllı Otomatik Duraklatmayı Etkinleştir',
    sap.enabled !== false
  );
  smartSection.appendChild(smartEnable);

  const smartDesc = document.createElement('div');
  smartDesc.className = 'description-text';
  smartDesc.textContent =
    labels.smartAutoPauseDescription ||
    'Kullanıcı etkinliği, odak/sekme durumu ve içerik görünürlüğüne göre videoyu otomatik duraklatır.';
  smartSection.appendChild(smartDesc);
  function addMinuteRow({name, id, label, msValue, minMin=0.1, maxMin=100, stepMin=0.1}) {
    const wrap = document.createElement('div');
    wrap.className = 'fsetting-item';

    const l = document.createElement('label');
    l.className = 'settings-label';
    l.htmlFor = id;
    l.textContent = label;

    const input = document.createElement('input');
    input.type = 'number';
    input.name = name;
    input.id = id;
    input.className = 'settings-input';
    input.min = String(minMin);
    input.max = String(maxMin);
    input.step = String(stepMin);
    const minutes = Math.max(minMin, Math.min(maxMin, (Number(msValue)||0) / 60000));
    input.value = String(minutes);
    const hint = document.createElement('div');
    hint.className = 'description-text';
    hint.textContent = (labels.minutesHint || '(0.1 – 100 dk arası )');

    wrap.appendChild(l);
    wrap.appendChild(input);
    wrap.appendChild(hint);
    smartSection.appendChild(wrap);
  }

  addMinuteRow({
    name: 'smartIdleThresholdMs',
    id: 'smartIdleThresholdMs',
    label: labels.smartIdleThresholdMs || 'Etkinlik Yoksa Duraklat (dk)',
    msValue: sap.idleThresholdMs ?? 2700000
  });

  addMinuteRow({
    name: 'smartUnfocusedThresholdMs',
    id: 'smartUnfocusedThresholdMs',
    label: labels.smartUnfocusedThresholdMs || 'Pencere Odakta Değilse Duraklat (dk)',
    msValue: sap.unfocusedThresholdMs ?? 60000
  });

  addMinuteRow({
    name: 'smartOffscreenThresholdMs',
    id: 'smartOffscreenThresholdMs',
    label: labels.smartOffscreenThresholdMs || 'Video Görünmüyorsa Duraklat (dk)',
    msValue: sap.offscreenThresholdMs ?? 6000
  });

  const idleDetectCbx = createCheckbox(
    'smartUseIdleDetection',
    labels.smartUseIdleDetection || 'Idle Detection API kullan (mümkünse)',
    sap.useIdleDetection !== false
  );
  smartSection.appendChild(idleDetectCbx);

  const respectPiPCbx = createCheckbox(
    'smartRespectPiP',
    labels.smartRespectPiP || 'PiP açıkken duraklatma',
    sap.respectPiP !== false
  );
  smartSection.appendChild(respectPiPCbx);

  function toggleSmartFields(enabled) {
    const ids = ['smartIdleThresholdMs','smartUnfocusedThresholdMs','smartOffscreenThresholdMs','smartUseIdleDetection','smartRespectPiP'];
    ids.forEach(i => {
      const el = smartSection.querySelector('#'+i) || smartSection.querySelector(`[name="${i}"]`);
      if (el) el.disabled = !enabled;
    });
  }

  toggleSmartFields(sap.enabled !== false);

  smartEnable.querySelector('input')?.addEventListener('change', (e) => {
    toggleSmartFields(e.target.checked);
  });

  panel.appendChild(section);
  panel.appendChild(smartSection);

  return panel;
}
