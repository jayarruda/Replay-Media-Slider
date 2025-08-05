import { getConfig } from "../config.js";
import { createCheckbox, createImageTypeSelect, bindCheckboxKontrol, bindTersCheckboxKontrol, createSection } from "../settings.js";
import { applySettings, applyRawConfig } from "./applySettings.js";

export function createMusicPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'music-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.gmmpSettings || 'GMMP Ayarları');

    const notificationToggleDiv = document.createElement('div');
    notificationToggleDiv.className = 'setting-item';

    const enabledGmmpInput = document.createElement('input');
    enabledGmmpInput.type = 'checkbox';
    enabledGmmpInput.checked = config.enabledGmmp !== false;
    enabledGmmpInput.name = 'enabledGmmp';
    enabledGmmpInput.id = 'enabledGmmp';

    const enabledGmmpLabel = document.createElement('label');
    enabledGmmpLabel.textContent = labels.enabledGmmp || 'Müzik Çaları Aktif Et';
    enabledGmmpLabel.htmlFor = 'enabledGmmp';

    const notificationToggleInput = document.createElement('input');
    notificationToggleInput.type = 'checkbox';
    notificationToggleInput.checked = config.notificationsEnabled !== false;
    notificationToggleInput.name = 'notificationsEnabled';
    notificationToggleInput.id = 'notificationsEnabled';

    const notificationToggleLabel = document.createElement('label');
    notificationToggleLabel.textContent = labels.notificationsEnabled || 'Bildirimleri Göster:';
    notificationToggleLabel.htmlFor = 'notificationsEnabled';

    notificationToggleDiv.append(enabledGmmpInput, enabledGmmpLabel, notificationToggleInput, notificationToggleLabel);
    section.appendChild(notificationToggleDiv);

    const albumArtBgDiv = document.createElement('div');
    albumArtBgDiv.className = 'setting-item';

    const albumArtBgLabel = document.createElement('label');
    albumArtBgLabel.textContent = labels.useAlbumArtAsBackground || 'Albüm kapağını arka plan yap:';

    const albumArtBgInput = document.createElement('input');
    albumArtBgInput.type = 'checkbox';
    albumArtBgInput.checked = config.useAlbumArtAsBackground || false;
    albumArtBgInput.name = 'useAlbumArtAsBackground';
    albumArtBgInput.id = 'useAlbumArtAsBackground';

    albumArtBgDiv.append(albumArtBgLabel, albumArtBgInput);
    section.appendChild(albumArtBgDiv);

    const blurDiv = document.createElement('div');
    blurDiv.className = 'setting-item';

    const blurLabel = document.createElement('label');
    blurLabel.textContent = labels.backgroundBlur || 'Arka plan bulanıklığı:';
    blurLabel.htmlFor = 'albumArtBackgroundBlur';

    const blurInput = document.createElement('input');
    blurInput.type = 'range';
    blurInput.min = '0';
    blurInput.max = '20';
    blurInput.step = '1';
    blurInput.value = config.albumArtBackgroundBlur ?? 10;
    blurInput.name = 'albumArtBackgroundBlur';
    blurInput.id = 'albumArtBackgroundBlur';

    const blurValue = document.createElement('span');
    blurValue.className = 'range-value';
    blurValue.textContent = blurInput.value + 'px';

    blurInput.addEventListener('input', () => {
        blurValue.textContent = blurInput.value + 'px';
    });

    blurDiv.append(blurLabel, blurInput, blurValue);
    section.appendChild(blurDiv);

    const opacityDiv = document.createElement('div');
    opacityDiv.className = 'setting-item';

    const opacityLabel = document.createElement('label');
    opacityLabel.textContent = labels.backgroundOpacity || 'Arka plan şeffaflığı:';
    opacityLabel.htmlFor = 'albumArtBackgroundOpacity';

    const opacityInput = document.createElement('input');
    opacityInput.type = 'range';
    opacityInput.min = '0';
    opacityInput.max = '1';
    opacityInput.step = '0.1';
    opacityInput.value = config.albumArtBackgroundOpacity ?? 0.5;
    opacityInput.name = 'albumArtBackgroundOpacity';
    opacityInput.id = 'albumArtBackgroundOpacity';

    const opacityValue = document.createElement('span');
    opacityValue.className = 'range-value';
    opacityValue.textContent = opacityInput.value;

    opacityInput.addEventListener('input', () => {
        opacityValue.textContent = opacityInput.value;
    });

    opacityDiv.append(opacityLabel, opacityInput, opacityValue);
    section.appendChild(opacityDiv);

    const styleDiv = document.createElement('div');
    styleDiv.className = 'setting-item';
    const styleLabel = document.createElement('label');
    styleLabel.textContent = labels.playerStyle || 'Player Stili:';
    const styleSelect = document.createElement('select');
    styleSelect.name = 'playerStyle';

    const styles = [
        { value: 'player', label: labels.yatayStil || 'Yatay Stil' },
        { value: 'newplayer', label: labels.dikeyStil || 'Dikey Stil' }
    ];

    styles.forEach(style => {
        const option = document.createElement('option');
        option.value = style.value;
        option.textContent = style.label;
        if (style.value === (config.playerStyle || 'player')) {
            option.selected = true;
        }
        styleSelect.appendChild(option);
    });

    styleDiv.append(styleLabel, styleSelect);
    section.appendChild(styleDiv);

    const themeDiv = document.createElement('div');
    themeDiv.className = 'setting-item';
    const themeLabel = document.createElement('label');
    themeLabel.textContent = labels.playerTheme || 'Player Teması:';
    const themeSelect = document.createElement('select');
    themeSelect.name = 'playerTheme';

    const themes = [
        { value: 'dark', label: labels.darkTheme || 'Karanlık Tema' },
        { value: 'light', label: labels.lightTheme || 'Aydınlık Tema' }
    ];

    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.value;
        option.textContent = theme.label;
        if (theme.value === (config.playerTheme || 'dark')) {
            option.selected = true;
        }
        themeSelect.appendChild(option);
    });

    themeDiv.append(themeLabel, themeSelect);
    section.appendChild(themeDiv);

    const dateLocaleDiv = document.createElement('div');
    dateLocaleDiv.className = 'setting-item';
    const dateLocaleLabel = document.createElement('label');
    dateLocaleLabel.textContent = labels.dateLocale || 'Tarih Formatı:';
    const dateLocaleSelect = document.createElement('select');
    dateLocaleSelect.name = 'dateLocale';

    const locales = [
    { value: 'tr-TR', label: '🇹🇷 Türkçe' },
    { value: 'en-US', label: '🇺🇸 English (US)' },
    { value: 'en-GB', label: '🇬🇧 English (UK)' },
    { value: 'de-DE', label: '🇩🇪 Deutsch' },
    { value: 'fr-FR', label: '🇫🇷 Français' },
    { value: 'es-ES', label: '🇪🇸 Español' },
    { value: 'it-IT', label: '🇮🇹 Italiano' },
    { value: 'ru-RU', label: '🇷🇺 Русский' },
    { value: 'ja-JP', label: '🇯🇵 日本語' },
    { value: 'zh-CN', label: '🇨🇳 简体中文' },
    { value: 'pt-PT', label: '🇵🇹 Português (Portugal)' },
    { value: 'pt-BR', label: '🇧🇷 Português (Brasil)' },
    { value: 'nl-NL', label: '🇳🇱 Nederlands' },
    { value: 'sv-SE', label: '🇸🇪 Svenska' },
    { value: 'pl-PL', label: '🇵🇱 Polski' },
    { value: 'uk-UA', label: '🇺🇦 Українська' },
    { value: 'ko-KR', label: '🇰🇷 한국어' },
    { value: 'ar-SA', label: '🇸🇦 العربية' },
    { value: 'hi-IN', label: '🇮🇳 हिन्दी' },
    { value: 'fa-IR', label: '🇮🇷 فارسی' },
];

    locales.forEach(locale => {
        const option = document.createElement('option');
        option.value = locale.value;
        option.textContent = locale.label;
        if (locale.value === config.dateLocale) {
            option.selected = true;
        }
        dateLocaleSelect.appendChild(option);
    });

    dateLocaleDiv.append(dateLocaleLabel, dateLocaleSelect);
    section.appendChild(dateLocaleDiv);

    const musicLimitDiv = document.createElement('div');
    musicLimitDiv.className = 'setting-item';
    const musicLimitLabel = document.createElement('label');
    musicLimitLabel.textContent = labels.muziklimit || 'Oynatma Listesi Öğe Sayısı:';
    const musicLimitInput = document.createElement('input');
    musicLimitInput.type = 'number';
    musicLimitInput.value = config.muziklimit || 30;
    musicLimitInput.name = 'muziklimit';
    musicLimitInput.min = 1;
    musicLimitDiv.append(musicLimitLabel, musicLimitInput);
    section.appendChild(musicLimitDiv);

    const nextTrackDiv = document.createElement('div');
    nextTrackDiv.className = 'setting-item';
    const nextTrackLabel = document.createElement('label');
    nextTrackLabel.textContent = labels.nextTrack || 'Sıradaki Şarkılar Limiti';
    const nextTrackInput = document.createElement('input');
    nextTrackInput.type = 'number';
    nextTrackInput.value = config.nextTrack || 30;
    nextTrackInput.name = 'nextTrack';
    nextTrackInput.min = 0;
    nextTrackDiv.append(nextTrackLabel, nextTrackInput);
    section.appendChild(nextTrackDiv);

    const songLimitDiv = document.createElement('div');
    songLimitDiv.className = 'setting-item';
    const songLimitLabel = document.createElement('label');
    songLimitLabel.textContent = labels.sarkilimit || 'Sayfa başına şarkı sayısı:';
    const songLimitInput = document.createElement('input');
    songLimitInput.type = 'number';
    songLimitInput.value = config.sarkilimit || 200;
    songLimitInput.name = 'sarkilimit';
    songLimitInput.min = 1;
    songLimitDiv.append(songLimitLabel, songLimitInput);
    section.appendChild(songLimitDiv);

    const albumLimitDiv = document.createElement('div');
    albumLimitDiv.className = 'setting-item';
    const albumLimitLabel = document.createElement('label');
    albumLimitLabel.textContent = labels.albumlimit || 'Sayfa başına albüm sayısı:';
    const albumLimitInput = document.createElement('input');
    albumLimitInput.type = 'number';
    albumLimitInput.value = config.albumlimit || 20;
    albumLimitInput.name = 'albumlimit';
    albumLimitInput.min = 1;
    albumLimitDiv.append(albumLimitLabel, albumLimitInput);
    section.appendChild(albumLimitDiv);

    const id3LimitDiv = document.createElement('div');
    id3LimitDiv.className = 'setting-item';
    const id3LimitLabel = document.createElement('label');
    id3LimitLabel.textContent = labels.id3limit || 'Gruplama Limiti:';
    id3LimitLabel.title = labels.id3limitTitle || 'Id3 etiket sorgulamanın eş zamanlı olarak kaç tane yapılacağı belirleyen değer';
    const id3LimitInput = document.createElement('input');
    id3LimitInput.type = 'number';
    id3LimitInput.value = config.id3limit || 5;
    id3LimitInput.name = 'id3limit';
    id3LimitInput.min = 1;
    id3LimitInput.max = 200;
    id3LimitInput.title = labels.id3limitTitle || 'Id3 etiket sorgulamanın eş zamanlı olarak kaç tane yapılacağı belirleyen değer';
    id3LimitDiv.append(id3LimitLabel, id3LimitInput);
    section.appendChild(id3LimitDiv);

    const maxExcludeIdsForUriDiv = document.createElement('div');
    maxExcludeIdsForUriDiv.className = 'setting-item';
    const maxExcludeIdsForUriLabel = document.createElement('label');
    maxExcludeIdsForUriLabel.textContent = labels.maxExcludeIdsForUri || 'Maksimum ID Sayısı';
    maxExcludeIdsForUriLabel.title = labels.maxExcludeIdsForTitle || 'Bu değer, Liste yenilemek için API isteğinde aynı anda gönderilebilecek "Hariç Tutulacak Geçmiş Liste Sayısı" listesinin maksimum uzunluğunu belirler. Büyük değerler sunucu isteklerinin boyutunu aşarak hatalara neden olabilir. İsteklerin hatasız çalışması için genellikle 50-200 arası bir değer önerilir.';
    const maxExcludeIdsForUriInput = document.createElement('input');
    maxExcludeIdsForUriInput.type = 'number';
    maxExcludeIdsForUriInput.value = config.maxExcludeIdsForUri || 100;
    maxExcludeIdsForUriInput.title = labels.maxExcludeIdsForTitle || 'Bu değer, Liste yenilemek için API isteğinde aynı anda gönderilebilecek "Hariç Tutulacak Geçmiş Liste Sayısı" listesinin maksimum uzunluğunu belirler. Büyük değerler sunucu isteklerinin boyutunu aşarak hatalara neden olabilir. İsteklerin hatasız çalışması için genellikle 50-200 arası bir değer önerilir.';
    maxExcludeIdsForUriInput.name = 'maxExcludeIdsForUri';
    maxExcludeIdsForUriInput.min = 1;
    maxExcludeIdsForUriDiv.append(maxExcludeIdsForUriLabel, maxExcludeIdsForUriInput);
    section.appendChild(maxExcludeIdsForUriDiv);

    const historyLimitDiv = document.createElement('div');
    historyLimitDiv.className = 'setting-item';
    const historyLimitLabel = document.createElement('label');
    historyLimitLabel.textContent = labels.historylimit || 'Hariç Tutulacak Geçmiş Liste Sayısı';
    historyLimitLabel.title = labels.historylimitTitle || 'Yeni listelere, geçmiş listeler içerisindeki şarkıları dahil etmemek için limit belirleyin';
    const historyLimitInput = document.createElement('input');
    historyLimitInput.type = 'number';
    historyLimitInput.value = config.historylimit || 10;
    historyLimitInput.name = 'historylimit';
    historyLimitInput.title = labels.historylimitTitle || 'Yeni listelere, geçmiş listeler içerisindeki şarkıları dahil etmemek için limit belirleyin';
    historyLimitInput.min = 1;
    historyLimitDiv.append(historyLimitLabel, historyLimitInput);
    section.appendChild(historyLimitDiv);

    const groupLimitDiv = document.createElement('div');
    groupLimitDiv.className = 'setting-item';
    const groupLimitLabel = document.createElement('label');
    groupLimitLabel.textContent = labels.gruplimit || 'Gruplama Limiti:';
    groupLimitLabel.title = labels.gruplimitTitle || 'Mevcut oynatma listesine ekleme yapılırken gruplama limiti';
    const groupLimitInput = document.createElement('input');
    groupLimitInput.type = 'number';
    groupLimitInput.value = config.gruplimit || 100;
    groupLimitInput.name = 'gruplimit';
    groupLimitInput.min = 1;
    groupLimitInput.max = 400;
    groupLimitInput.title = labels.gruplimitTitle || 'Mevcut oynatma listesine ekleme yapılırken gruplama limiti';
    groupLimitDiv.append(groupLimitLabel, groupLimitInput);
    section.appendChild(groupLimitDiv);

    const nextTracksSourceDiv = document.createElement('div');
    nextTracksSourceDiv.className = 'setting-item';
    const nextTracksSourceLabel = document.createElement('label');
    nextTracksSourceLabel.textContent = labels.nextTracksSource || 'Sıradaki Şarkılar Kaynağı:';
    const nextTracksSourceSelect = document.createElement('select');
    nextTracksSourceSelect.name = 'nextTracksSource';

    const sources = [
        { value: 'playlist', label: labels.playlist || 'Oynatma Listesi' },
        { value: 'top', label: labels.topTracks || 'En Çok Dinlenenler' },
        { value: 'recent', label: labels.recentTracks || 'Son Dinlenenler' },
        { value: 'latest', label: labels.latestTracks || 'Son Eklenenler' },
        { value: 'favorites', label: labels.favorites || 'Favorilerim' }
    ];

    sources.forEach(source => {
    const option = document.createElement('option');
    option.value = source.value;
    option.textContent = source.label;
    if (source.value === (config.nextTracksSource || 'playlist')) {
        option.selected = true;
    }
    nextTracksSourceSelect.appendChild(option);
});

    nextTracksSourceDiv.append(nextTracksSourceLabel, nextTracksSourceSelect);
    section.appendChild(nextTracksSourceDiv);

    const topTrackDiv = document.createElement('div');
    topTrackDiv.className = 'setting-item';
    const topTrackLabel = document.createElement('label');
    topTrackLabel.textContent = labels.topLimit || 'Sıradaki Şarkılar Limiti';
    const topTrackInput = document.createElement('input');
    topTrackInput.type = 'number';
    topTrackInput.value = config.topTrack || 30;
    topTrackInput.name = 'topTrack';
    topTrackInput.min = 0;
    topTrackDiv.append(topTrackLabel, topTrackInput);
    section.appendChild(topTrackDiv);

    panel.appendChild(section);
    return panel;
}
