import { getConfig } from "../config.js";
import { createCheckbox, createSection } from "../settings.js";
import { applySettings } from "./applySettings.js";

const config = getConfig();

export function createNotificationsPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'notifications-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.notificationsSettings || 'Bildirim Ayarları');

    const enableCheckbox = createCheckbox(
    'enableNotifications',
    labels.enableNotifications || 'Bildirim Simgesini Etkinleştir',
    config.enableNotifications
);
    section.appendChild(enableCheckbox);

    const enableToastNewCheckbox = createCheckbox(
    'enableToastNew',
    labels.enableToastNew || 'Yeni eklenenler için toast bildirimi etkinleştir.',
    config.enableToastNew
);
    section.appendChild(enableToastNewCheckbox);


    const enableToastSystemCheckbox = createCheckbox(
    'enableToastSystem',
    labels.enableToastSystem || 'Sistem bildirimleri için toast bildirimi etkinleştir.',
    config.enableToastSystem
);
    section.appendChild(enableToastSystemCheckbox);

    const maxNotificationsDiv = document.createElement('div');
    maxNotificationsDiv.className = 'setting-item limit-container';

    const maxNotificationsLabel = document.createElement('label');
    maxNotificationsLabel.textContent = labels.maxNotifications || 'Gösterilecek Bildirim Limiti:';

    const maxNotificationsInput = document.createElement('input');
    maxNotificationsInput.type = 'number';
    maxNotificationsInput.value = typeof config.maxNotifications !== 'undefined' ? config.maxNotifications : 15;
    maxNotificationsInput.name = 'maxNotifications';
    maxNotificationsInput.min = 1;
    maxNotificationsInput.max = 100;

    maxNotificationsLabel.htmlFor = 'maxNotificationsInput';
    maxNotificationsInput.id = 'maxNotificationsInput';
    maxNotificationsDiv.append(maxNotificationsLabel, maxNotificationsInput);
    section.appendChild(maxNotificationsDiv);

    const toastDurationDiv = document.createElement('div');
    toastDurationDiv.className = 'setting-item limit-container';

    const toastDurationLabel = document.createElement('label');
    toastDurationLabel.textContent = labels.toastDuration || 'Toast Süresi (ms):';

    const toastDurationInput = document.createElement('input');
    toastDurationInput.type = 'number';
    toastDurationInput.value = typeof config.toastDuration !== 'undefined' ? config.toastDuration : 4000;
    toastDurationInput.name = 'toastDuration';
    toastDurationInput.min = 1000;
    toastDurationInput.max = 20000;

    toastDurationLabel.htmlFor = 'toastDurationInput';
    toastDurationInput.id = 'toastDurationInput';
    toastDurationDiv.append(toastDurationLabel, toastDurationInput);
    section.appendChild(toastDurationDiv);

    const enableRenderResumeCheckbox = createCheckbox(
    'enableRenderResume',
    labels.enableRenderResume || 'İzlenmesi Yarım Kalanları Görüntüle',
    config.enableRenderResume
);
    section.appendChild(enableRenderResumeCheckbox);

    const renderResumeDiv = document.createElement('div');
    renderResumeDiv.className = 'setting-item limit-container';

    const renderResumeLabel = document.createElement('label');
    renderResumeLabel.textContent = labels.playingLimit || 'İzlemeye Devam Et Limiti';

    const renderResumeInput = document.createElement('input');
    renderResumeInput.type = 'number';
    renderResumeInput.value = typeof config.renderResume !== 'undefined' ? config.renderResume : 10;
    renderResumeInput.name = 'renderResume';
    renderResumeInput.min = 1;
    renderResumeInput.max = 30;

    renderResumeLabel.htmlFor = 'renderResumeInput';
    renderResumeInput.id = 'renderResumeInput';
    renderResumeDiv.append(renderResumeLabel, renderResumeInput);
    section.appendChild(renderResumeDiv);

    panel.appendChild(section);
    return panel;
}
