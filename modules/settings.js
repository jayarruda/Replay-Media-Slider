import { getConfig } from "./config.js";
import { loadCSS } from "./player/main.js";
import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';
import { showNotification } from "./player/ui/notification.js";
import { createPositionEditor } from './positionSettings.js';
import { updateSlidePosition } from './positionUtils.js';
import { createBackupRestoreButtons } from './configExporter.js';

let settingsModal = null;

export function createSettingsModal() {
    const existing = document.getElementById('settings-modal');
    if (existing) {
        existing.remove();
        settingsModal = null;
    }

    if (settingsModal) {
        return settingsModal;
    }

    const config = getConfig();
    const currentLang = config.defaultLanguage || getDefaultLanguage();
    const labels = getLanguageLabels(currentLang) || {};

    const modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.className = 'settings-modal';

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    const modalContent = document.createElement('div');
    modalContent.className = 'settings-modal-content';

    modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    const closeBtn = document.createElement('span');
    closeBtn.className = 'settings-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => modal.style.display = 'none';

    const title = document.createElement('h2');
    title.textContent = labels.sliderSettings || 'Slider Ayarları';

    const tabContainer = document.createElement('div');
    tabContainer.className = 'settings-tabs';

    const tabContent = document.createElement('div');
    tabContent.className = 'settings-tab-content';

    const sliderTab = createTab('slider', labels.sliderSettings || 'Slider Ayarları', true);
    const musicTab = createTab('music', labels.gmmpSettings || 'GMMP Ayarları', true);
    const pauseTab = createTab('pause', labels.pauseSettings || 'Durdurma Ekranı', true);
    const positionTab = createTab('position', labels.positionSettings || 'Konumlardıma Ayarları', true);
    const queryTab = createTab('query', labels.queryStringInput || 'API Sorgu Parametresi', true);
    const logoTitleTab = createTab('logo-title', labels.logoOrTitleHeader || 'Logo/Başlık', true);
    const statusRatingTab = createTab('status-rating', labels.statusRatingInfo || 'Durum ve Puan Bilgileri', true);
    const actorTab = createTab('actor', labels.actorInfo || 'Artist Bilgileri', true);
    const directorTab = createTab('director', labels.directorWriter || 'Yönetmen ve Yazar', true);
    const languageTab = createTab('language', labels.languageInfoHeader || 'Ses ve Altyazı', true);
    const descriptionTab = createTab('description', labels.descriptionsHeader || 'Açıklamalar', true);
    const providerTab = createTab('provider', labels.providerHeader || 'Dış Bağlantılar', true);
    const buttonsTab = createTab('buttons', labels.buttons || 'Butonlar', true);
    const infoTab = createTab('info', labels.infoHeader || 'Tür, Yıl ve Ülke', true);
    const exporterTab = createTab('exporter', labels.backupRestore || 'Yedekle - Geri Yükle', true);
    const aboutTab = createTab('about', labels.aboutHeader || 'Hakkında', true);

    tabContainer.append(
        sliderTab, musicTab, pauseTab, positionTab,
        queryTab, statusRatingTab, actorTab, directorTab,
        languageTab, logoTitleTab, descriptionTab, providerTab,
        buttonsTab, infoTab, exporterTab, aboutTab
    );

    const sliderPanel = createSliderPanel(config, labels);
    const musicPanel = createMusicPanel(config, labels);
    const pausePanel = createPausePanel(config, labels);
    const positionPanel = createPositionPanel(config, labels);
    const queryPanel = createQueryPanel(config, labels);
    const statusRatingPanel = createStatusRatingPanel(config, labels);
    const actorPanel = createActorPanel(config, labels);
    const directorPanel = createDirectorPanel(config, labels);
    const languagePanel = createLanguagePanel(config, labels);
    const logoTitlePanel = createLogoTitlePanel(config, labels);
    const descriptionPanel = createDescriptionPanel(config, labels);
    const providerPanel = createProviderPanel(config, labels);
    const buttonsPanel = createButtonsPanel(config, labels);
    const infoPanel = createInfoPanel(config, labels);
    const exporterPanel = createExporterPanel(config, labels);
    const aboutPanel = createAboutPanel(labels);

    [
        sliderPanel, musicPanel, positionPanel, queryPanel, statusRatingPanel,
        actorPanel, directorPanel, languagePanel, logoTitlePanel,
        descriptionPanel, providerPanel, buttonsPanel, infoPanel,
        pausePanel, exporterPanel, aboutPanel
    ].forEach(panel => {
        panel.style.display = 'none';
    });
    sliderPanel.style.display = 'block';

    tabContent.append(
        sliderPanel, musicPanel, statusRatingPanel, actorPanel,
        directorPanel, queryPanel, languagePanel, logoTitlePanel,
        descriptionPanel, providerPanel, buttonsPanel, infoPanel,
        pausePanel, positionPanel, aboutPanel, exporterPanel
    );

    [
        sliderTab, musicTab, queryTab, statusRatingTab,
        actorTab, directorTab, languageTab, logoTitleTab,
        descriptionTab, providerTab, buttonsTab, infoTab,
        positionTab, pauseTab, aboutTab, exporterTab
    ].forEach(tab => {
        tab.addEventListener('click', () => {
            [
                sliderTab, musicTab, queryTab, statusRatingTab,
                actorTab, directorTab, languageTab, logoTitleTab,
                descriptionTab, providerTab, buttonsTab, infoTab,
                positionTab, pauseTab, aboutTab, exporterTab,
            ].forEach(t => {
                t.classList.remove('active');
            });
            [
                sliderPanel, statusRatingPanel, actorPanel, directorPanel,
                musicPanel, queryPanel, languagePanel, logoTitlePanel,
                descriptionPanel, providerPanel, buttonsPanel, infoPanel,
                positionPanel, aboutPanel, exporterPanel, pausePanel
            ].forEach(panel => {
                panel.style.display = 'none';
            });

            tab.classList.add('active');
            const panelId = tab.getAttribute('data-tab');
            document.getElementById(`${panelId}-panel`).style.display = 'block';

            setTimeout(() => {
                tab.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }, 10);
        });
    });

    const form = document.createElement('form');
    form.append(tabContainer, tabContent);

    const btnDiv = document.createElement('div');
    btnDiv.className = 'btn-item';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.textContent = labels.saveSettings || 'Kaydet';

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.textContent = labels.uygula || 'Uygula';
    applyBtn.style.marginLeft = '10px';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = labels.resetToDefaults || 'Sıfırla';
    resetBtn.style.marginLeft = '10px';
    resetBtn.className = 'reset-btn';
    resetBtn.onclick = () => {
        createConfirmationModal(
            labels.resetConfirm || 'Tüm ayarları varsayılan değerlere sıfırlamak istediğinize emin misiniz?',
            resetAllSettings,
            labels
        );
    };

    form.onsubmit = (e) => {
        e.preventDefault();
        applySettings(true);
    };

    applyBtn.onclick = () => {
        applySettings(false);
        showNotification(
            `<i class="fas fa-floppy-disk" style="margin-right: 8px;"></i> ${config.languageLabels.settingsSavedModal || "Ayarlar kaydedildi. Değişikliklerin aktif olması için slider sayfasını yenileyin."}`,
            3000,
            'info'
        );
    };


    btnDiv.append(saveBtn, applyBtn, resetBtn, );
    form.appendChild(btnDiv);

    modalContent.append(closeBtn, title, form);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);


    function resetAllSettings() {
        Object.keys(config).forEach(key => {
            localStorage.removeItem(key);
        });
        location.reload();
    }

     setTimeout(() => {
      setupMobileTextareaBehavior();
    }, 100);

    return modal;
}


export function applySettings(reload = false) {
        const form = document.querySelector('#settings-modal form');
        if (!form) return;
        const formData = new FormData(form);
        const config = getConfig();
        const oldTheme = getConfig().playerTheme;
        const oldPlayerStyle = getConfig().playerStyle;
        const updatedConfig = {
            ...config,
            playerTheme: formData.get('playerTheme'),
            playerStyle: formData.get('playerStyle'),
            defaultLanguage: formData.get('defaultLanguage'),
            dateLocale: formData.get('dateLocale') || 'tr-TR',
            sliderDuration: parseInt(formData.get('sliderDuration'), 10),
            limit: parseInt(formData.get('limit'), 10),
            gecikmeSure: parseInt(formData.get('gecikmeSure'), 10),
            cssVariant: formData.get('cssVariant'),
            useAlbumArtAsBackground: formData.get('useAlbumArtAsBackground') === 'on',
            albumArtBackgroundBlur: parseInt(formData.get('albumArtBackgroundBlur')),
            albumArtBackgroundOpacity: parseFloat(formData.get('albumArtBackgroundOpacity')),

            showCast: formData.get('showCast') === 'on',
            showProgressBar: formData.get('showProgressBar') === 'on',
            enableTrailerPlayback: formData.get('enableTrailerPlayback') === 'on',
            gradientOverlayImageType: formData.get('gradientOverlayImageType'),
            manualBackdropSelection: formData.get('manualBackdropSelection') === 'on',
            indexZeroSelection: formData.get('indexZeroSelection') === 'on',
            backdropImageType: formData.get('backdropImageType'),
            minHighQualityWidth: parseInt(formData.get('minHighQualityWidth'), 10),
            backdropMaxWidth: parseInt(formData.get('backdropMaxWidth'), 10),
            minPixelCount: parseInt(formData.get('minPixelCount'), 10),
            enableImageSizeFilter: formData.get('enableImageSizeFilter') === 'on',
            minImageSizeKB: parseInt(formData.get('minImageSizeKB'), 10),
            maxImageSizeKB: parseInt(formData.get('maxImageSizeKB'), 10),
            showDotNavigation: formData.get('showDotNavigation') === 'on',
            dotBackgroundImageType: formData.get('dotBackgroundImageType'),
            dotBackgroundBlur: parseInt(formData.get('dotBackgroundBlur')),
            dotBackgroundOpacity: parseFloat(formData.get('dotBackgroundOpacity')),
            dotPosterMode: formData.get('dotPosterMode') === 'on',

            showStatusInfo: formData.get('showStatusInfo') === 'on',
            showTypeInfo: formData.get('showTypeInfo') === 'on',
            showWatchedInfo: formData.get('showWatchedInfo') === 'on',
            showRuntimeInfo: formData.get('showRuntimeInfo') === 'on',
            showQualityInfo: formData.get('showQualityInfo') === 'on',
            showQualityDetail: formData.get('showQualityDetail') === 'on',
            showRatingInfo: formData.get('showRatingInfo') === 'on',
            showCommunityRating: formData.get('showCommunityRating') === 'on',
            showCriticRating: formData.get('showCriticRating') === 'on',
            showOfficialRating: formData.get('showOfficialRating') === 'on',

            showActorAll: formData.get('showActorAll') === 'on',
            showActorInfo: formData.get('showActorInfo') === 'on',
            showActorImg: formData.get('showActorImg') === 'on',
            showActorRole: formData.get('showActorRole') === 'on',
            artistLimit: parseInt(formData.get('artistLimit'), 10),


            showDirectorWriter: formData.get('showDirectorWriter') === 'on',
            showDirector: formData.get('showDirector') === 'on',
            showWriter: formData.get('showWriter') === 'on',
            aktifSure: parseInt(formData.get('aktifSure'), 10),
            girisSure: parseInt(formData.get('girisSure'), 10),
            allowedWriters: formData.get('allowedWriters') ?
                formData.get('allowedWriters').split(',').map(w => w.trim()) : [],

            muziklimit: parseInt(formData.get('muziklimit'), 10),
            nextTrack: parseInt(formData.get('nextTrack'), 10) || 30,
            topTrack: parseInt(formData.get('topTrack'), 10) || 100,
            sarkilimit: parseInt(formData.get('sarkilimit'), 10),
            id3limit: parseInt(formData.get('id3limit'), 10),
            albumlimit: parseInt(formData.get('albumlimit'), 10),
            gruplimit: parseInt(formData.get('gruplimit'), 10),
            historylimit: parseInt(formData.get('historylimit'), 10),
            maxExcludeIdsForUri: parseInt(formData.get('maxExcludeIdsForUri'), 10),
            notificationsEnabled: formData.get('notificationsEnabled') === 'on',
            nextTracksSource: formData.get('nextTracksSource'),

            useListFile: formData.get('useListFile') === 'on',
            useManualList: formData.get('useManualList') === 'on',
            manualListIds: formData.get('manualListIds'),
            customQueryString: (() => {
              const raw = formData.get('customQueryString')?.trim();
              if (!raw) {
                return getConfig().customQueryString;
              }
              return raw;
            })(),
            sortingKeywords: (() => {
              const raw = formData.get('sortingKeywords')?.trim();
              if (!raw) {
                return getConfig().sortingKeywords;
              }
              return raw.split(',').map(k => k.trim());
            })(),

            showLanguageInfo: formData.get('showLanguageInfo') === 'on',

            showLogoOrTitle: formData.get('showLogoOrTitle') === 'on',
            displayOrder: formData.get('displayOrder') || 'logo,disk,originalTitle',
            showTitleOnly: formData.get('showTitleOnly') === 'on',
            showDiscOnly: formData.get('showDiscOnly') === 'on',

            showDescriptions: formData.get('showDescriptions') === 'on',
            showSloganInfo: formData.get('showSloganInfo') === 'on',
            showTitleInfo: formData.get('showTitleInfo') === 'on',
            showOriginalTitleInfo: formData.get('showOriginalTitleInfo') === 'on',
            hideOriginalTitleIfSame: formData.get('hideOriginalTitleIfSame') === 'on',
            showPlotInfo: formData.get('showPlotInfo') === 'on',
            showbPlotInfo: formData.get('showbPlotInfo') === 'on',

            showProviderInfo: formData.get('showProviderInfo') === 'on',
            showSettingsLink: formData.get('showSettingsLink') === 'on',
            showTrailerIcon: formData.get('showTrailerIcon') === 'on',

            showTrailerButton: formData.get('showTrailerButton') === 'on',
            trailerBackgroundImageType: formData.get('trailerBackgroundImageType'),
            showWatchButton: formData.get('showWatchButton') === 'on',
            watchBackgroundImageType: formData.get('watchBackgroundImageType'),
            showFavoriteButton: formData.get('showFavoriteButton') === 'on',
            favoriteBackgroundImageType: formData.get('favoriteBackgroundImageType'),
            showPlayedButton: formData.get('showPlayedButton') === 'on',
            playedBackgroundImageType: formData.get('playedBackgroundImageType'),
            buttonBackgroundBlur: parseInt(formData.get('buttonBackgroundBlur')),
            buttonBackgroundOpacity: parseFloat(formData.get('buttonBackgroundOpacity')),

            showInfo: formData.get('showInfo') === 'on',
            showGenresInfo: formData.get('showGenresInfo') === 'on',
            showYearInfo: formData.get('showYearInfo') === 'on',
            showCountryInfo: formData.get('showCountryInfo') === 'on',

            homeSectionsTop: parseInt(formData.get('homeSectionsTop'), 10) || 0,
            slideTop: parseInt(formData.get('slideTop'), 10) || 0,
            slideLeft: parseInt(formData.get('slideLeft'), 10) || 0,
            slideWidth: parseInt(formData.get('slideWidth'), 10) || 0,
            slideHeight: parseInt(formData.get('slideHeight'), 10) || 0,

            logoContainerTop: parseInt(formData.get('logoContainerTop'), 10) || 0,
            logoContainerLeft: parseInt(formData.get('logoContainerLeft'), 10) || 0,
            logoContainerWidth: parseInt(formData.get('logoContainerWidth'), 10) || 0,
            logoContainerHeight: parseInt(formData.get('logoContainerHeight'), 10) || 0,
            logoContainerDisplay: formData.get('logoContainerDisplay'),
            logoContainerFlexDirection: formData.get('logoContainerFlexDirection'),
            logoContainerJustifyContent: formData.get('logoContainerJustifyContent'),
            logoContainerAlignItems: formData.get('logoContainerAlignItems'),
            logoContainerFlexWrap: formData.get('logoContainerFlexWrap'),

            buttonContainerTop: parseInt(formData.get('buttonContainerTop'), 10) || 0,
            buttonContainerLeft: parseInt(formData.get('buttonContainerLeft'), 10) || 0,
            buttonContainerWidth: parseInt(formData.get('buttonContainerWidth'), 10) || 0,
            buttonContainerHeight: parseInt(formData.get('buttonContainerHeight'), 10) || 0,
            buttonContainerDisplay: formData.get('buttonContainerDisplay'),
            buttonContainerFlexDirection: formData.get('buttonContainerFlexDirection'),
            buttonContainerJustifyContent: formData.get('buttonContainerJustifyContent'),
            buttonContainerAlignItems: formData.get('buttonContainerAlignItems'),
            buttonContainerFlexWrap: formData.get('buttonContainerFlexWrap'),

            metaContainerTop: parseInt(formData.get('metaContainerTop'), 10) || 0,
            metaContainerLeft: parseInt(formData.get('metaContainerLeft'), 10) || 0,
            metaContainerWidth: parseInt(formData.get('metaContainerWidth'), 10) || 0,
            metaContainerHeight: parseInt(formData.get('metaContainerHeight'), 10) || 0,
            metaContainerDisplay: formData.get('metaContainerDisplay'),
            metaContainerFlexDirection: formData.get('metaContainerFlexDirection'),
            metaContainerJustifyContent: formData.get('metaContainerJustifyContent'),
            metaContainerAlignItems: formData.get('metaContainerAlignItems'),
            metaContainerFlexWrap: formData.get('metaContainerFlexWrap'),

            plotContainerTop: parseInt(formData.get('plotContainerTop'), 10) || 0,
            plotContainerLeft: parseInt(formData.get('plotContainerLeft'), 10) || 0,
            plotContainerWidth: parseInt(formData.get('plotContainerWidth'), 10) || 0,
            plotContainerHeight: parseInt(formData.get('plotContainerHeight'), 10) || 0,
            plotContainerDisplay: formData.get('plotContainerDisplay'),
            plotContainerFlexDirection: formData.get('plotContainerFlexDirection'),
            plotContainerJustifyContent: formData.get('plotContainerJustifyContent'),
            plotContainerAlignItems: formData.get('plotContainerAlignItems'),
            plotContainerFlexWrap: formData.get('plotContainerFlexWrap'),
            plotContainerFontSize: parseInt(formData.get('plotContainerFontSize'), 10) || 0,
            plotContainerColor: parseInt(formData.get('plotContainerColor'), 10) || 0,

            titleContainerTop: parseInt(formData.get('titleContainerTop'), 10) || 0,
            titleContainerLeft: parseInt(formData.get('titleContainerLeft'), 10) || 0,
            titleContainerWidth: parseInt(formData.get('titleContainerWidth'), 10) || 0,
            titleContainerHeight: parseInt(formData.get('titleContainerHeight'), 10) || 0,
            titleContainerDisplay: formData.get('titleContainerDisplay'),
            titleContainerFlexDirection: formData.get('titleContainerFlexDirection'),
            titleContainerJustifyContent: formData.get('titleContainerJustifyContent'),
            titleContainerAlignItems: formData.get('titleContainerAlignItems'),
            titleContainerFlexWrap: formData.get('titleContainerFlexWrap'),

            directorContainerTop: parseInt(formData.get('directorContainerTop'), 10) || 0,
            directorContainerLeft: parseInt(formData.get('directorContainerLeft'), 10) || 0,
            directorContainerWidth: parseInt(formData.get('directorContainerWidth'), 10) || 0,
            directorContainerHeight: parseInt(formData.get('directorContainerHeight'), 10) || 0,
            directorContainerDisplay: formData.get('directorContainerDisplay'),
            directorContainerFlexDirection: formData.get('directorContainerFlexDirection'),
            directorContainerJustifyContent: formData.get('directorContainerJustifyContent'),
            directorContainerAlignItems: formData.get('directorContainerAlignItems'),
            directorContainerFlexWrap: formData.get('directorContainerFlexWrap'),

            infoContainerTop: parseInt(formData.get('infoContainerTop'), 10) || 0,
            infoContainerLeft: parseInt(formData.get('infoContainerLeft'), 10) || 0,
            infoContainerWidth: parseInt(formData.get('infoContainerWidth'), 10) || 0,
            infoContainerHeight: parseInt(formData.get('infoContainerHeight'), 10) || 0,
            infoContainerDisplay: formData.get('infoContainerDisplay'),
            infoContainerFlexDirection: formData.get('infoContainerFlexDirection'),
            infoContainerJustifyContent: formData.get('infoContainerJustifyContent'),
            infoContainerAlignItems: formData.get('infoContainerAlignItems'),
            infoContainerFlexWrap: formData.get('infoContainerFlexWrap'),

            mainContainerTop: parseInt(formData.get('mainContainerTop'), 10) || 0,
            mainContainerLeft: parseInt(formData.get('mainContainerLeft'), 10) || 0,
            mainContainerWidth: parseInt(formData.get('mainContainerWidth'), 10) || 0,
            mainContainerHeight: parseInt(formData.get('mainContainerHeight'), 10) || 0,
            mainContainerDisplay: formData.get('mainContainerDisplay'),
            mainContainerFlexDirection: formData.get('mainContainerFlexDirection'),
            mainContainerJustifyContent: formData.get('mainContainerJustifyContent'),
            mainContainerAlignItems: formData.get('mainContainerAlignItems'),
            mainContainerFlexWrap: formData.get('mainContainerFlexWrap'),

            sliderContainerTop: parseInt(formData.get('sliderContainerTop'), 10) || 0,
            sliderContainerLeft: parseInt(formData.get('sliderContainerLeft'), 10) || 0,
            sliderContainerWidth: parseInt(formData.get('sliderContainerWidth'), 10) || 0,
            sliderContainerHeight: parseInt(formData.get('sliderContainerHeight'), 10) || 0,
            sliderContainerDisplay: formData.get('sliderContainerDisplay'),
            sliderContainerFlexDirection: formData.get('sliderContainerFlexDirection'),
            sliderContainerJustifyContent: formData.get('sliderContainerJustifyContent'),
            sliderContainerAlignItems: formData.get('sliderContainerAlignItems'),
            sliderContainerFlexWrap: formData.get('sliderContainerFlexWrap'),

            providerContainerTop: parseInt(formData.get('providerContainerTop'), 10) || 0,
            providerContainerLeft: parseInt(formData.get('providerContainerLeft'), 10) || 0,
            providerContainerWidth: parseInt(formData.get('providerContainerWidth'), 10) || 0,
            providerContainerHeight: parseInt(formData.get('providerContainerHeight'), 10) || 0,
            providerContainerDisplay: formData.get('providerContainerDisplay'),
            providerContainerFlexDirection: formData.get('providerContainerFlexDirection'),
            providerContainerJustifyContent: formData.get('providerContainerJustifyContent'),
            providerContainerAlignItems: formData.get('providerContainerAlignItems'),
            providerContainerFlexWrap: formData.get('providerContainerFlexWrap'),

            providericonsContainerTop: parseInt(formData.get('providericonsContainerTop'), 10) || 0,
            providericonsContainerLeft: parseInt(formData.get('providericonsContainerLeft'), 10) || 0,
            providericonsContainerWidth: parseInt(formData.get('providericonsContainerWidth'), 10) || 0,
            providericonsContainerHeight: parseInt(formData.get('providericonsContainerHeight'), 10) || 0,
            providericonsContainerDisplay: formData.get('providericonsContainerDisplay'),
            providericonsContainerFlexDirection: formData.get('providericonsContainerFlexDirection'),
            providericonsContainerJustifyContent: formData.get('providericonsContainerJustifyContent'),
            providericonsContainerAlignItems: formData.get('providericonsContainerAlignItems'),
            providericonsContainerFlexWrap: formData.get('providericonsContainerFlexWrap'),

            statusContainerTop: parseInt(formData.get('statusContainerTop'), 10) || 0,
            statusContainerLeft: parseInt(formData.get('statusContainerLeft'), 10) || 0,
            statusContainerWidth: parseInt(formData.get('statusContainerWidth'), 10) || 0,
            statusContainerHeight: parseInt(formData.get('statusContainerHeight'), 10) || 0,
            statusContainerDisplay: formData.get('statusContainerDisplay'),
            statusContainerFlexDirection: formData.get('statusContainerFlexDirection'),
            statusContainerJustifyContent: formData.get('statusContainerJustifyContent'),
            statusContainerAlignItems: formData.get('statusContainerAlignItems'),
            statusContainerFlexWrap: formData.get('statusContainerFlexWrap'),

            ratingContainerTop: parseInt(formData.get('ratingContainerTop'), 10) || 0,
            ratingContainerLeft: parseInt(formData.get('ratingContainerLeft'), 10) || 0,
            ratingContainerWidth: parseInt(formData.get('ratingContainerWidth'), 10) || 0,
            ratingContainerHeight: parseInt(formData.get('ratingContainerHeight'), 10) || 0,
            ratingContainerDisplay: formData.get('ratingContainerDisplay'),
            ratingContainerFlexDirection: formData.get('ratingContainerFlexDirection'),
            ratingContainerJustifyContent: formData.get('ratingContainerJustifyContent'),
            ratingContainerAlignItems: formData.get('ratingContainerAlignItems'),
            ratingContainerFlexWrap: formData.get('ratingContainerFlexWrap'),

            existingDotContainerTop: parseInt(formData.get('existingDotContainerTop'), 10) || 0,
            existingDotContainerLeft: parseInt(formData.get('existingDotContainerLeft'), 10) || 0,
            existingDotContainerWidth: parseInt(formData.get('existingDotContainerWidth'), 10) || 0,
            existingDotContainerHeight: parseInt(formData.get('existingDotContainerHeight'), 10) || 0,
            existingDotContainerDisplay: formData.get('existingDotContainerDisplay'),
            existingDotContainerFlexDirection: formData.get('existingDotContainerFlexDirection'),
            existingDotContainerJustifyContent: formData.get('existingDotContainerJustifyContent'),
            existingDotContainerAlignItems: formData.get('existingDotContainerAlignItems'),
            existingDotContainerFlexWrap: formData.get('existingDotContainerFlexWrap'),

            progressBarTop: parseInt(formData.get('progressBarTop'), 10) || 0,
            progressBarLeft: parseInt(formData.get('progressBarLeft'), 10) || 0,
            progressBarWidth: parseInt(formData.get('progressBarWidth'), 10) || 100,
            progressBarHeight: parseInt(formData.get('progressBarHeight'), 10) || 0,

            pauseOverlay: formData.get('pauseOverlay') === 'on' ? 'true' : 'false',
            pauseOverlayImagePreference: formData.get('pauseOverlayImagePreference') || 'auto',
            pauseOverlayShowPlot: formData.get('pauseOverlayShowPlot') === 'on',
            pauseOverlayShowMetadata: formData.get('pauseOverlayShowMetadata') === 'on',
            pauseOverlayShowLogo: formData.get('pauseOverlayShowLogo') === 'on',
            pauseOverlayShowBackdrop: formData.get('pauseOverlayShowBackdrop') === 'on',
        };

        updateConfig(updatedConfig);
        updateSlidePosition();

        const rawInput = formData.get('sortingKeywords')?.trim();
        if (!rawInput) {
          localStorage.removeItem('sortingKeywords');
        } else {
          localStorage.setItem('sortingKeywords', JSON.stringify(updatedConfig.sortingKeywords));
        }
        if (oldTheme !== updatedConfig.playerTheme || oldPlayerStyle !== updatedConfig.playerStyle) {
        loadCSS();
    }

        if (reload) {
            location.reload();
        }
    }


export function applyRawConfig(config) {
  if (!config || typeof config !== 'object') return;

  Object.entries(config).forEach(([key, value]) => {
    try {
      if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, String(value));
      }
    } catch (e) {
      console.warn(`'${key}' değeri ayarlanamadı:`, e);
    }
  });

  updateSlidePosition();

  if (config.playerTheme || config.playerStyle) {
    loadCSS?.();
  }

  location.reload();
}

function createConfirmationModal(message, callback, labels) {
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.style.display = 'block';

        const modalContent = document.createElement('div');
        modalContent.className = 'confirmation-modal-content';

        const messageEl = document.createElement('p');
        messageEl.textContent = message;

        const btnContainer = document.createElement('div');
        btnContainer.className = 'confirmation-btn-container';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'confirm-btn';
        confirmBtn.textContent = labels.yes || 'Evet';
        confirmBtn.onclick = () => {
            callback();
            modal.remove();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn';
        cancelBtn.textContent = labels.no || 'Hayır';
        cancelBtn.onclick = () => modal.remove();

        btnContainer.append(confirmBtn, cancelBtn);
        modalContent.append(messageEl, btnContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        return modal;
    }

function createSliderPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'slider-panel';
    panel.className = 'settings-panel';

    const languageDiv = document.createElement('div');
    languageDiv.className = 'setting-item';
    const languageLabel = document.createElement('label');
    languageLabel.textContent = labels.defaultLanguage || 'Dil:';
    const languageSelect = document.createElement('select');
    languageSelect.name = 'defaultLanguage';

    const languages = [
        { value: 'tur', label: labels.optionTurkish || '🇹🇷 Türkçe' },
        { value: 'eng', label: labels.optionEnglish || '🇬🇧 English' },
        { value: 'deu', label: labels.optionGerman || '🇩🇪 Deutsch' },
        { value: 'fre', label: labels.optionFrench || '🇫🇷 Français' },
        { value: 'rus', label: labels.optionRussian || '🇷🇺 Русский' },
    ];

    languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.value;
        option.textContent = lang.label;
        if (lang.value === config.defaultLanguage) {
            option.selected = true;
        }
        languageSelect.appendChild(option);
    });

    languageDiv.append(languageLabel, languageSelect);

    const cssDiv = document.createElement('div');
    cssDiv.className = 'fsetting-item';
    const cssLabel = document.createElement('label');
    cssLabel.textContent = labels.gorunum || 'CSS Varyantı:';
    const cssSelect = document.createElement('select');
    cssSelect.name = 'cssVariant';

    const variants = [
        { value: 'kompak', label: labels.kompaktslider || 'Kompakt' },
        { value: 'fullslider', label: labels.tamslider || 'Tam Ekran' },
        { value: 'normalslider', label: labels.normalslider || 'Normal' },
    ];

    variants.forEach(variant => {
        const option = document.createElement('option');
        option.value = variant.value;
        option.textContent = variant.label;
        if (variant.value === config.cssVariant) {
            option.selected = true;
        }
        cssSelect.appendChild(option);
    });

    cssDiv.append(cssLabel, cssSelect);

    const sliderDiv = document.createElement('div');
    sliderDiv.className = 'fsetting-item';
    const sliderLabel = document.createElement('label');
    sliderLabel.textContent = labels.sliderDuration || 'Slider Süresi (ms):';
    const sliderInput = document.createElement('input');
    sliderInput.type = 'number';
    sliderInput.value = config.sliderDuration || 15000;
    sliderInput.name = 'sliderDuration';
    sliderInput.min = 1000;
    sliderInput.step = 250;
    sliderDiv.append(sliderLabel, sliderInput);

    const sliderDesc = document.createElement('div');
    sliderDesc.className = 'description-text';
    sliderDesc.textContent = labels.sliderDurationDescription || 'Bu ayar, ms cinsinden olmalıdır.';
    sliderDiv.appendChild(sliderDesc);


    const showProgressCheckbox = createCheckbox('showProgressBar', labels.progressBar || 'ProgressBar\'ı Göster', config.showProgressBar);
    sliderDiv.appendChild(showProgressCheckbox);

    const trailerPlaybackCheckbox = createCheckbox(
        'enableTrailerPlayback',
        labels.enableTrailerPlayback || 'Yerleşik Fragman Oynatımına İzin Ver',
        config.enableTrailerPlayback
    );
    sliderDiv.appendChild(trailerPlaybackCheckbox);

    const delayDiv = document.createElement('div');
    delayDiv.className = 'fsetting-item trailer-delay-container';
    const delayLabel = document.createElement('label');
    delayLabel.textContent = labels.gecikmeInput || 'Yerleşik Fragman Gecikme Süresi (ms):';
    const delayInput = document.createElement('input');
    delayInput.type = 'number';
    delayInput.value = config.gecikmeSure || 500;
    delayInput.name = 'gecikmeSure';
    delayInput.min = 0;
    delayInput.max = 10000;
    delayInput.step = 50;
    delayDiv.append(delayLabel, delayInput);
    sliderDiv.appendChild(delayDiv);

    const gradientDiv = document.createElement('div');
    gradientDiv.className = 'fsetting-item gradient-overlay-container';
    const gradientLabel = document.createElement('label');
    gradientLabel.textContent = labels.gradientOverlayImageType || 'Yerleşik Fragman Oynatıldığında Gösterilecek Görsel Türü:';
    const gradientSelect = createImageTypeSelect('gradientOverlayImageType', config.gradientOverlayImageType || 'backdropUrl', true);
    gradientDiv.append(gradientLabel, gradientSelect);
    sliderDiv.appendChild(gradientDiv);

    bindCheckboxKontrol('#enableTrailerPlayback', '.trailer-delay-container', 0.6, [delayInput]);
    bindCheckboxKontrol('#enableTrailerPlayback', '.gradient-overlay-container', 0.6, [gradientSelect]);

    const indexZeroCheckbox = createCheckbox(
    'indexZeroSelection',
    labels.indexZeroSelection || 'Her zaman 0 indeksli görseli seç',
    config.indexZeroSelection
    );
    sliderDiv.appendChild(indexZeroCheckbox);

    const indexZeroDesc = document.createElement('div');
    indexZeroDesc.className = 'description-text';
    indexZeroDesc.textContent = labels.indexZeroDescription || 'Aktif olduğunda her zaman 0 indeksli görsel seçilir (diğer kalite filtrelerini devre dışı bırakır).';
    sliderDiv.appendChild(indexZeroDesc);

    const manualBackdropCheckbox = createCheckbox(
        'manualBackdropSelection',
        labels.manualBackdropSelection || 'Slide Arkaplanı Değiştir',
        config.manualBackdropSelection
    );
    sliderDiv.appendChild(manualBackdropCheckbox);

    const backdropDiv = document.createElement('div');
    backdropDiv.className = 'fsetting-item backdrop-container';
    const backdropLabel = document.createElement('label');
    backdropLabel.textContent = labels.slideBackgroundImageType || 'Slider Arka Plan Görsel Türü:';
    const backdropSelect = createImageTypeSelect('backdropImageType', config.backdropImageType || 'backdropUrl', true);
    backdropDiv.append(backdropLabel, backdropSelect);
    sliderDiv.appendChild(backdropDiv);

    const minQualityDiv = document.createElement('div');
    minQualityDiv.className = 'fsetting-item min-quality-container';
    const minQualityLabel = document.createElement('label');
    minQualityLabel.textContent = labels.minHighQualityWidthInput || 'Minimum Genişlik (px):';

    const minQualityInput = document.createElement('input');
    minQualityInput.type = 'number';
    minQualityInput.value = config.minHighQualityWidth || 1920;
    minQualityInput.name = 'minHighQualityWidth';
    minQualityInput.min = 1;

    const minQualityDesc = document.createElement('div');
    minQualityDesc.className = 'description-text';
    minQualityDesc.textContent = labels.minHighQualitydescriptiontext ||
        'Bu ayar, arkaplan olarak atanacak görselin minimum genişliğini belirler.("Slide Arkaplanı Değiştir" aktif ise çalışmaz. Eğer belirlenen genişlikte görsel yok ise en kalitelisi seçilecektir.)';

    minQualityDiv.append(minQualityLabel, minQualityInput, minQualityDesc);
    sliderDiv.appendChild(minQualityDiv);

    bindCheckboxKontrol('#manualBackdropSelection', '.backdrop-container', 0.6, [backdropSelect]);
    bindTersCheckboxKontrol('#manualBackdropSelection', '.min-quality-container', 0.6, [minQualityInput]);

    const backdropMaxWidthDiv = document.createElement('div');
    backdropMaxWidthDiv.className = 'fsetting-item min-quality-container';
    const backdropMaxWidthLabel = document.createElement('label');
    backdropMaxWidthLabel.textContent = labels.backdropMaxWidthInput || 'Maksimum Ölçek (px):';

    const backdropMaxWidthInput = document.createElement('input');
    backdropMaxWidthInput.type = 'number';
    backdropMaxWidthInput.value = config.backdropMaxWidth || 1920;
    backdropMaxWidthInput.name = 'backdropMaxWidth';
    backdropMaxWidthInput.min = 1;

    const backdropMaxWidthDesc = document.createElement('div');
    backdropMaxWidthDesc.className = 'description-text';
    backdropMaxWidthDesc.textContent = labels.backdropMaxWidthLabel ||
        'Arkaplan olarak atanacak görsel girilen değer boyutunda ölçeklenir.("Slide Arkaplanı Değiştir" aktif ise çalışmaz. Görsel, belirlenen değerden küçük ise ölçeklendirmez)';

    backdropMaxWidthDiv.append(backdropMaxWidthLabel, backdropMaxWidthInput, backdropMaxWidthDesc);
    sliderDiv.appendChild(backdropMaxWidthDiv);

    const minPixelDiv = document.createElement('div');
    minPixelDiv.className = 'fsetting-item min-quality-container';
    const minPixelLabel = document.createElement('label');
    minPixelLabel.textContent = labels.minPixelCountInput || 'Minimum Piksel Sayısı:';

    const minPixelInput = document.createElement('input');
    minPixelInput.type = 'number';
    minPixelInput.value = config.minPixelCount || (1920 * 1080);
    minPixelInput.name = 'minPixelCount';
    minPixelInput.min = 1;

    const minPixelDesc = document.createElement('div');
    minPixelDesc.className = 'description-text';
    minPixelDesc.textContent = labels.minPixelCountDescription ||
    'Genişlik × yükseklik sonucudur. Bu değerden küçük görseller düşük kaliteli sayılır. Örn: 1920×1080 = 2073600';

    minPixelDiv.append(minPixelLabel, minPixelInput, minPixelDesc);
    sliderDiv.appendChild(minPixelDiv);

    const sizeFilterToggleDiv = document.createElement('div');
    sizeFilterToggleDiv.className = 'fsetting-item min-quality-container';

    const sizeFilterLabel = document.createElement('label');
    sizeFilterLabel.textContent = labels.enableImageSizeFilter || 'Görsel Boyut Filtrelemesini Etkinleştir';
    sizeFilterLabel.htmlFor = 'enableImageSizeFilter';

    const sizeFilterCheckbox = document.createElement('input');
    sizeFilterCheckbox.type = 'checkbox';
    sizeFilterCheckbox.id = 'enableImageSizeFilter';
    sizeFilterCheckbox.name = 'enableImageSizeFilter';
    sizeFilterCheckbox.checked = config.enableImageSizeFilter ?? false;

    sizeFilterLabel.prepend(sizeFilterCheckbox);
    sizeFilterToggleDiv.appendChild(sizeFilterLabel);
    sliderDiv.appendChild(sizeFilterToggleDiv);

    const minSizeDiv = document.createElement('div');
    minSizeDiv.className = 'fsetting-item min-quality-container';
    const minSizeLabel = document.createElement('label');
    minSizeLabel.textContent = labels.minImageSizeKB || 'Minimum Görsel Boyutu (KB):';

    const minSizeInput = document.createElement('input');
    minSizeInput.type = 'number';
    minSizeInput.value = config.minImageSizeKB || 800;
    minSizeInput.name = 'minImageSizeKB';
    minSizeInput.min = 1;

    const minSizeDesc = document.createElement('div');
    minSizeDesc.className = 'description-text';
    minSizeDesc.textContent = labels.minImageSizeDescription || 'Seçilecek görselin minimum dosya boyutunu KB cinsinden belirtir.';

    minSizeDiv.append(minSizeLabel, minSizeInput, minSizeDesc);
    sliderDiv.appendChild(minSizeDiv);

    const maxSizeDiv = document.createElement('div');
    maxSizeDiv.className = 'fsetting-item min-quality-container';
    const maxSizeLabel = document.createElement('label');
    maxSizeLabel.textContent = labels.maxImageSizeKB || 'Maksimum Görsel Boyutu (KB):';

    const maxSizeInput = document.createElement('input');
    maxSizeInput.type = 'number';
    maxSizeInput.value = config.maxImageSizeKB || 1500;
    maxSizeInput.name = 'maxImageSizeKB';
    maxSizeInput.min = 1;

    const maxSizeDesc = document.createElement('div');
    maxSizeDesc.className = 'description-text';
    maxSizeDesc.textContent = labels.maxImageSizeDescription || 'Seçilecek görselin maksimum dosya boyutunu KB cinsinden belirtir.';

    maxSizeDiv.append(maxSizeLabel, maxSizeInput, maxSizeDesc);
    sliderDiv.appendChild(maxSizeDiv);

    bindTersCheckboxKontrol('#manualBackdropSelection', '.min-quality-container', 0.6, [minPixelInput, minSizeInput, maxSizeInput, backdropMaxWidthInput]);
    bindCheckboxKontrol('#enableImageSizeFilter', '.min-quality-container', 0.6, [minSizeInput, maxSizeInput]);

    const dotNavCheckbox = createCheckbox(
        'showDotNavigation',
        labels.showDotNavigation || 'Dot Navigasyonu Göster',
        config.showDotNavigation
    );
        sliderDiv.appendChild(dotNavCheckbox);

        const posterDotsCheckbox = createCheckbox(
        'dotPosterMode',
        labels.dotPosterMode || 'Poster Boyutlu Dot Navigasyonu',
        config.dotPosterMode
    );
    sliderDiv.appendChild(posterDotsCheckbox);

    const posterDotsDesc = document.createElement('div');
    posterDotsDesc.className = 'description-text';
    posterDotsDesc.textContent = labels.posterDotsDescription || 'Dot navigasyonu poster boyutuna getirir ( Slider Alanınıda konumlandırma gerektirir )';
    sliderDiv.appendChild(posterDotsDesc);

    const dotBgDiv = document.createElement('div');
    dotBgDiv.className = 'fsetting-item dot-bg-container';
    const dotBgLabel = document.createElement('label');
    dotBgLabel.textContent = labels.dotBackgroundImageType || 'Dot Arka Plan Görsel Türü:';
    const dotBgSelect = createImageTypeSelect(
        'dotBackgroundImageType',
        config.dotBackgroundImageType || 'useSlideBackground',
        true,
        true
    );
        dotBgDiv.append(dotBgLabel, dotBgSelect);
        sliderDiv.appendChild(dotBgDiv);

    bindCheckboxKontrol('#showDotNavigation', '.dot-bg-container', 0.6, [dotBgSelect, dotBgLabel]);

    const dotblurDiv = document.createElement('div');
    dotblurDiv.className = 'setting-item';

    const dotblurLabel = document.createElement('label');
    dotblurLabel.textContent = labels.backgroundBlur || 'Arka plan bulanıklığı:';
    dotblurLabel.htmlFor = 'dotBackgroundBlur';

    const dotblurInput = document.createElement('input');
    dotblurInput.type = 'range';
    dotblurInput.min = '0';
    dotblurInput.max = '20';
    dotblurInput.step = '1';
    dotblurInput.value = config.dotBackgroundBlur ?? 10;
    dotblurInput.name = 'dotBackgroundBlur';
    dotblurInput.id = 'dotBackgroundBlur';

    const dotblurValue = document.createElement('span');
    dotblurValue.className = 'range-value';
    dotblurValue.textContent = dotblurInput.value + 'px';

    dotblurInput.addEventListener('input', () => {
    dotblurValue.textContent = dotblurInput.value + 'px';
    });

    dotblurDiv.append(dotblurLabel, dotblurInput, dotblurValue);
    sliderDiv.appendChild(dotblurDiv);

    const dotopacityDiv = document.createElement('div');
    dotopacityDiv.className = 'setting-item';

    const dotopacityLabel = document.createElement('label');
    dotopacityLabel.textContent = labels.backgroundOpacity || 'Arka plan şeffaflığı:';
    dotopacityLabel.htmlFor = 'dotBackgroundOpacity';

    const dotopacityInput = document.createElement('input');
    dotopacityInput.type = 'range';
    dotopacityInput.min = '0';
    dotopacityInput.max = '1';
    dotopacityInput.step = '0.1';
    dotopacityInput.value = config.dotBackgroundOpacity ?? 0.5;
    dotopacityInput.name = 'dotBackgroundOpacity';
    dotopacityInput.id = 'dotBackgroundOpacity';

    const dotopacityValue = document.createElement('span');
    dotopacityValue.className = 'range-value';
    dotopacityValue.textContent = dotopacityInput.value;

    dotopacityInput.addEventListener('input', () => {
    dotopacityValue.textContent = dotopacityInput.value;
    });

    dotopacityDiv.append(dotopacityLabel, dotopacityInput, dotopacityValue);
    sliderDiv.appendChild(dotopacityDiv);

        panel.append(languageDiv, cssDiv, sliderDiv);
        return panel;
    }

    function createStatusRatingPanel(config, labels) {
        const panel = document.createElement('div');
        panel.id = 'status-rating-panel';
        panel.className = 'settings-panel';

        const statusSection = createSection(labels.showStatusInfo || 'Durum Bilgileri');
        const statusCheckbox = createCheckbox('showStatusInfo', labels.showStatusInfo || 'Durum Bilgilerini Göster', config.showStatusInfo);
        statusSection.appendChild(statusCheckbox);

        const statusSubOptions = document.createElement('div');
        statusSubOptions.className = 'sub-options status-sub-options';
        statusSubOptions.appendChild(createCheckbox('showTypeInfo', labels.showTypeInfo || 'Medya Türü', config.showTypeInfo));
        statusSubOptions.appendChild(createCheckbox('showWatchedInfo', labels.showWatchedInfo || 'İzlenme', config.showWatchedInfo));
        statusSubOptions.appendChild(createCheckbox('showRuntimeInfo', labels.showRuntimeInfo || 'Süre', config.showRuntimeInfo));
        statusSubOptions.appendChild(createCheckbox('showQualityInfo', labels.showQualityInfo || 'Kalite', config.showQualityInfo));

        const qualityDetailSubOptions = document.createElement('div');
        qualityDetailSubOptions.className = 'sub-options quality-detail-options';
        qualityDetailSubOptions.appendChild(createCheckbox('showQualityDetail', labels.showQualityDetail || 'Kalite Detayı', config.showQualityDetail));
        statusSubOptions.appendChild(qualityDetailSubOptions);
        statusSection.appendChild(statusSubOptions);

        bindCheckboxKontrol('#showStatusInfo', '.status-sub-options');
        bindCheckboxKontrol('#showQualityInfo', '.quality-detail-options');

        const ratingSection = createSection(labels.ratingInfoHeader || 'Puan Bilgileri');
        const ratingCheckbox = createCheckbox('showRatingInfo', labels.ratingInfo || 'Derecelendirmeleri Göster', config.showRatingInfo);
        ratingSection.appendChild(ratingCheckbox);

        const ratingSubOptions = document.createElement('div');
        ratingSubOptions.className = 'sub-options rating-sub-options';
        ratingSubOptions.appendChild(createCheckbox('showCommunityRating', labels.showCommunityRating || 'Topluluk', config.showCommunityRating));
        ratingSubOptions.appendChild(createCheckbox('showCriticRating', labels.showCriticRating || 'Rotten Tomato', config.showCriticRating));
        ratingSubOptions.appendChild(createCheckbox('showOfficialRating', labels.showOfficialRating || 'Sertifikasyon', config.showOfficialRating));
        ratingSection.appendChild(ratingSubOptions);

        bindCheckboxKontrol('#showRatingInfo', '.rating-sub-options');

        const description = document.createElement('div');
        description.className = 'description-text';
        description.textContent = labels.statusRatingDescription || 'Bu ayar, içeriğin kalite, izlenme durumu, medya türü, süre ve puanlama bilgilerinin görünürlüğünü kontrol eder.';
        ratingSection.appendChild(description);

        panel.append(statusSection, ratingSection);
        return panel;
    }

    function createActorPanel(config, labels) {
        const panel = document.createElement('div');
        panel.id = 'actor-panel';
        panel.className = 'settings-panel';

        const section = createSection(labels.actorInfo || 'Artist Bilgileri');

        const actorAllCheckbox = createCheckbox('showActorAll', labels.showActorAll || 'Hiçbiri', config.showActorAll);
        section.appendChild(actorAllCheckbox);

        const actorCheckbox = createCheckbox('showActorInfo', labels.showActorInfo || 'Artist İsimlerini Göster', config.showActorInfo);
        const actorCheckboxInput = actorCheckbox.querySelector('input');
        actorCheckboxInput.setAttribute('data-group', 'actor');
        section.appendChild(actorCheckbox);

        const actorSubOptions = document.createElement('div');
        actorSubOptions.className = 'sub-options actor-sub-options';
        const actorImgCheckbox = createCheckbox('showActorImg', labels.showActorImg || 'Artist Resimlerini Göster', config.showActorImg);
        const actorImgCheckboxInput = actorImgCheckbox.querySelector('input');
        actorImgCheckboxInput.setAttribute('data-group', 'actor');
        actorSubOptions.appendChild(actorImgCheckbox);
        section.appendChild(actorSubOptions);

        const actorRolOptions = document.createElement('div');
        actorRolOptions.className = 'sub-options actor-rol-options';
        const actorRoleCheckbox = createCheckbox('showActorRole', labels.showActorRole || 'Artist Rollerini Göster', config.showActorRole);
        const actorRoleCheckboxInput = actorRoleCheckbox.querySelector('input');
        actorRoleCheckboxInput.setAttribute('data-group', 'actor');
        actorRolOptions.appendChild(actorRoleCheckbox);
        section.appendChild(actorRolOptions);

        const artistLimitDiv = document.createElement('div');
        artistLimitDiv.className = 'setting-item artist-limit-container';
        const artistLimitLabel = document.createElement('label');
        artistLimitLabel.textContent = labels.artistLimit || 'Gösterilecek Aktör Sayısı:';
        const artistLimitInput = document.createElement('input');
        artistLimitInput.type = 'number';
        artistLimitInput.value = config.artistLimit || 3;
        artistLimitInput.name = 'artistLimit';
        artistLimitInput.min = 1;
        artistLimitInput.step = 1;
        artistLimitInput.setAttribute('data-group', 'actor');
        artistLimitDiv.append(artistLimitLabel, artistLimitInput);
        section.appendChild(artistLimitDiv);

        const description = document.createElement('div');
        description.className = 'description-text';
        description.textContent = labels.actorInfoDescription || 'Bu ayar, içeriğin ilk 3 artist bilgilerinin görünürlüğünü kontrol eder.';
        section.appendChild(description);

        panel.appendChild(section);

    setTimeout(() => {
        bindTersCheckboxKontrol(
            'input[name="showActorAll"]',
            null,
            0.5,
            Array.from(panel.querySelectorAll('[data-group="actor"]'))
        );
    }, 0);

    return panel;
}

    function createDirectorPanel(config, labels) {
        const panel = document.createElement('div');
        panel.id = 'director-panel';
        panel.className = 'settings-panel';

        const section = createSection(labels.directorWriter || 'Yönetmen ve Yazar Ayarları');
        const directorCheckbox = createCheckbox('showDirectorWriter', labels.showDirectorWriter || 'Yönetmen ve Yazar Bilgilerini Göster', config.showDirectorWriter);
        section.appendChild(directorCheckbox);

        const subOptions = document.createElement('div');
        subOptions.className = 'sub-options director-sub-options';
        subOptions.appendChild(createCheckbox('showDirector', labels.showDirector || 'Yönetmen', config.showDirector));
        subOptions.appendChild(createCheckbox('showWriter', labels.showWriter || 'Yazar', config.showWriter));
        section.appendChild(subOptions);

        bindCheckboxKontrol('#showDirectorWriter', '.director-sub-options');

        const description = document.createElement('div');
        description.className = 'description-text';
        description.textContent = labels.directorWriterDescription || 'Bu ayar, içeriğin yazar ve yönetmen görünürlüğünü kontrol eder. (Yazar bilgisi sadece aşağıdaki listede var ise)';
        section.appendChild(description);

        const writersHeader = document.createElement('h2');
        writersHeader.textContent = labels.writersListHeader || 'Yazarlar Listesi';
        section.appendChild(writersHeader);

        const writersDiv = document.createElement('div');
        writersDiv.className = 'setting-item writersLabel';
        const writersLabel = document.createElement('label');
        writersLabel.textContent = labels.writersListLabel || 'İsimleri virgül ile ayırınız:';
        const writersInput = document.createElement('textarea');
        writersInput.id = 'allowedWritersInput';
        writersInput.name = 'allowedWriters';
        writersInput.rows = 4;
        writersInput.placeholder = labels.writersListPlaceholder || 'Örnek: Quentin TARANTINO, Nuri Bilge CEYLAN';
        writersInput.value = config.allowedWriters ? config.allowedWriters.join(', ') : '';
        writersDiv.append(writersLabel, writersInput);
        section.appendChild(writersDiv);

        const girisSureDiv = document.createElement('div');
        girisSureDiv.className = 'setting-item writersLabel';
        const girisSureLabel = document.createElement('label');
        girisSureLabel.textContent = labels.girisSure || 'Giriş Süresi (ms):';
        const girisSureInput = document.createElement('input');
        girisSureInput.type = 'number';
        girisSureInput.value = config.girisSure || 1000;
        girisSureInput.name = 'girisSure';
        girisSureInput.min = 50;
        girisSureInput.step = 50;

        girisSureDiv.append(girisSureLabel, girisSureInput);
        section.appendChild(girisSureDiv);

        const aktifSureDiv = document.createElement('div');
        aktifSureDiv.className = 'setting-item writersLabel';
        const aktifSureLabel = document.createElement('label');
        aktifSureLabel.textContent = labels.aktifSure || 'Aktiflik Süresi (ms):';
        const aktifSureInput = document.createElement('input');
        aktifSureInput.type = 'number';
        aktifSureInput.value = config.aktifSure || 5000;
        aktifSureInput.name = 'aktifSure';
        aktifSureInput.min = 50;
        aktifSureInput.step = 50;
        aktifSureDiv.append(aktifSureLabel, aktifSureInput);
        section.appendChild(aktifSureDiv);

        panel.appendChild(section);
        return panel;
    }

function createMusicPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'music-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.gmmpSettings || 'GMMP Ayarları');

    const notificationToggleDiv = document.createElement('div');
    notificationToggleDiv.className = 'setting-item';

    const notificationToggleInput = document.createElement('input');
    notificationToggleInput.type = 'checkbox';
    notificationToggleInput.checked = config.notificationsEnabled !== false;
    notificationToggleInput.name = 'notificationsEnabled';
    notificationToggleInput.id = 'notificationsEnabled';

    const notificationToggleLabel = document.createElement('label');
    notificationToggleLabel.textContent = labels.notificationsEnabled || 'Bildirimleri Göster:';
    notificationToggleLabel.htmlFor = 'notificationsEnabled';

    notificationToggleDiv.append(notificationToggleInput, notificationToggleLabel);
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

function createQueryPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'query-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.queryStringInput || 'Api Sorgu Parametresi');
    const randomContentDiv = document.createElement('div');
    const randomContentCheckbox = createCheckbox(
        'useRandomContent',
        labels.useRandomContent || 'Rastgele İçerik',
        false
    );
    randomContentDiv.appendChild(randomContentCheckbox);
    section.appendChild(randomContentDiv);

    const useListFileCheckbox = createCheckbox(
      'useListFile',
      labels.useListFile || 'list.txt kullan',
      config.useListFile
    );
    section.appendChild(useListFileCheckbox);

    const manualListDiv = document.createElement('div');
    manualListDiv.className = 'form-group';
    const useManualListCheckbox = createCheckbox(
      'useManualList',
      labels.useManualList || 'Özel Liste Hazırla',
      config.useManualList
    );
    manualListDiv.appendChild(useManualListCheckbox);

    const manualListIdsDiv = document.createElement('div');
    manualListIdsDiv.className = 'form-group manual-list-container';
    manualListIdsDiv.id = 'manualListIdsContainer';
    manualListIdsDiv.style.display = config.useManualList ? 'block' : 'none';

    const manualListIdsLabel = document.createElement('label');
    manualListIdsLabel.textContent = labels.manualListIdsInput || 'İçerik ID\'leri (virgülle ayırın):';

    const manualListIdsInput = document.createElement('textarea');
    manualListIdsInput.className = 'form-control';
    manualListIdsInput.rows = 4;
    manualListIdsInput.name = 'manualListIds';
    manualListIdsInput.value = config.manualListIds || '';

    manualListIdsDiv.append(manualListIdsLabel, manualListIdsInput);

    section.appendChild(manualListDiv);
    section.appendChild(manualListIdsDiv);

    const limitDiv = document.createElement('div');
    limitDiv.className = 'setting-item limit-container';

    const limitLabel = document.createElement('label');
    limitLabel.textContent = labels.limit || 'Slider Limiti:';

    const limitInput = document.createElement('input');
    limitInput.type = 'number';
    limitInput.value = typeof config.limit !== 'undefined' ? config.limit : 20;
    limitInput.name = 'limit';
    limitInput.min = 1;
    limitInput.max = 100;

    limitDiv.append(limitLabel, limitInput);
    section.appendChild(limitDiv);

    const queryStringHeader = document.createElement('h3');
    const queryStringLabel = document.createElement('label');
    queryStringLabel.className = 'customQueryStringInput query-string-label';
    queryStringLabel.textContent = labels.customQueryString || 'Api Sorgu Dizesi:';
    queryStringHeader.appendChild(queryStringLabel);
    section.appendChild(queryStringHeader);

    const queryStringDesc = document.createElement('div');
    queryStringDesc.className = 'description-text';
    queryStringDesc.textContent = labels.customQueryStringNote ||
      '(Ne yaptığınız hakkında fikriniz yok ise bu alanı değiştirmeyin ve sadece list.txt kullanılmadıkça etkin olduğunu unutmayın.)';
    section.appendChild(queryStringDesc);

    const queryStringTextarea = document.createElement('textarea');
    queryStringTextarea.id = 'customQueryStringInput';
    queryStringTextarea.className = 'query-string-input';
    queryStringTextarea.rows = 4;
    queryStringTextarea.name = 'customQueryString';
    queryStringTextarea.placeholder = labels.customQueryStringPlaceholder ||
      'Örnek: IncludeItemTypes=Movie&hasOverview=true&imageTypes=Backdrop';
    queryStringTextarea.value = config.customQueryString;
    section.appendChild(queryStringTextarea);

    const sortingLabel = document.createElement('label');
    sortingLabel.textContent = labels.sortingKeywords || 'Anahtar Kelimeler (virgül ile ayırınız)';
    section.appendChild(sortingLabel);

    const sortingTextarea = document.createElement('textarea');
    sortingTextarea.id = 'sortingKeywordsInput';
    sortingTextarea.name = 'sortingKeywords';
    sortingTextarea.placeholder = 'DateCreated,PremiereDate,ProductionYear';
    sortingTextarea.value = config.sortingKeywords || '';
    section.appendChild(sortingTextarea);

    const finalDesc = document.createElement('div');
    finalDesc.className = 'description-text';
    finalDesc.innerHTML = labels.customQueryStringDescription ||
      'Bu ayar, slider için özel bir sorgu dizesi belirlemenizi sağlar. Tanımlı \'IncludeItemTypes\' itemleri: Movie, BoxSet ve Series\'dir. Anahtar Kelimeler alanı ise karıştırma yapılmaması gereken değerler içindir. Detaylar İçin <a href="https://api.jellyfin.org" target="_blank">burayı ziyaret edin.</a>.';
    section.appendChild(finalDesc);

    function handleSelection(selectedCheckbox) {
        const checkboxes = [
            randomContentCheckbox.querySelector('input'),
            useListFileCheckbox.querySelector('input'),
            useManualListCheckbox.querySelector('input')
        ];

        checkboxes.forEach(cb => {
            if (cb !== selectedCheckbox) cb.checked = false;
        });

        const isRandom = (selectedCheckbox === checkboxes[0]);
        queryStringTextarea.disabled = !isRandom;
        limitInput.disabled = !isRandom;
        sortingTextarea.disabled = !isRandom;
        queryStringLabel.style.opacity = isRandom ? '1' : '0.6';

        manualListIdsDiv.style.display = (selectedCheckbox === checkboxes[2]) ? 'flex' : 'none';
        manualListIdsInput.disabled = (selectedCheckbox !== checkboxes[2]);
    }

    [randomContentCheckbox, useListFileCheckbox, useManualListCheckbox].forEach(chkDiv => {
        chkDiv.querySelector('input').addEventListener('change', function() {
            if (this.checked) handleSelection(this);
        });
    });

    if (config.useListFile) {
        useListFileCheckbox.querySelector('input').checked = true;
        handleSelection(useListFileCheckbox.querySelector('input'));
    } else if (config.useManualList) {
        useManualListCheckbox.querySelector('input').checked = true;
        handleSelection(useManualListCheckbox.querySelector('input'));
    } else {
        randomContentCheckbox.querySelector('input').checked = true;
        handleSelection(randomContentCheckbox.querySelector('input'));
    }

    panel.appendChild(section);
    return panel;
}


function createLanguagePanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'language-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.languageInfoHeader || 'Ses ve Altyazı Bilgileri');
    section.appendChild(createCheckbox('showLanguageInfo', labels.languageInfo || 'Ses ve Altyazı Bilgilerini Göster', config.showLanguageInfo));

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.languageInfoDescription || 'Bu ayar aktifleştirildiğinde seçilen dile ait ses bilgileri içerikte mevcut ise yazdırılır. Dilinize ait ses bulunamazsa altyazı bilgileri aranır. Dilinize ait altyazı mevcut ise bilgi yazdırır.';
    section.appendChild(description);

    panel.appendChild(section);
    return panel;
}

function createLogoTitlePanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'logo-title-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.logoOrTitleHeader || 'Logo / Başlık Ayarları');
    const logoCheckbox = createCheckbox('showLogoOrTitle', labels.showLogoOrTitle || 'Logo Görselini Göster', config.showLogoOrTitle);
    section.appendChild(logoCheckbox);

    const displayOrderDiv = document.createElement('div');
    displayOrderDiv.className = 'sub-options logo-sub-options';
    displayOrderDiv.id = 'displayOrderContainer';
    const displayOrderLabel = document.createElement('label');
    const displayOrderSpan = document.createElement('span');
    displayOrderSpan.textContent = labels.displayOrderlabel || 'Görüntüleme Sırası:';
    const displayOrderInput = document.createElement('input');
    displayOrderInput.type = 'text';
    displayOrderInput.id = 'displayOrderInput';
    displayOrderInput.name = 'displayOrder';
    displayOrderInput.placeholder = 'logo,disk,originalTitle';
    displayOrderInput.value = config.displayOrder || '';
    const displayOrderSmall = document.createElement('small');
    displayOrderSmall.textContent = labels.displayOrderhelp || '(Örnek: logo,disk,originalTitle)';
    displayOrderLabel.append(displayOrderSpan, displayOrderInput, displayOrderSmall);
    displayOrderDiv.appendChild(displayOrderLabel);
    section.appendChild(displayOrderDiv);

    const titleOnlyCheckbox = createCheckbox('showTitleOnly', labels.showTitleOnly || 'Logo Yerine Orijinal Başlık Göster', config.showTitleOnly);
    const titleOnlyDiv = document.createElement('div');
    titleOnlyDiv.className = 'sub-options title-sub-options';
    titleOnlyDiv.id = 'showTitleOnlyLabel';
    titleOnlyDiv.appendChild(titleOnlyCheckbox);
    section.appendChild(titleOnlyDiv);

    const discOnlyCheckbox = createCheckbox('showDiscOnly', labels.showDiscOnly || 'Logo Yerine Disk Görseli Göster', config.showDiscOnly);
    const discOnlyDiv = document.createElement('div');
    discOnlyDiv.className = 'sub-options disc-sub-options';
    discOnlyDiv.id = 'showDiscOnlyLabel';
    discOnlyDiv.appendChild(discOnlyCheckbox);
    section.appendChild(discOnlyDiv);

    function setupMutuallyExclusive(checkbox1, checkbox2) {
        const cb1 = checkbox1.querySelector('input');
        const cb2 = checkbox2.querySelector('input');

        cb1.addEventListener('change', function() {
            if (this.checked) {
                cb2.checked = false;
            }
        });

        cb2.addEventListener('change', function() {
            if (this.checked) {
                cb1.checked = false;
            }
        });
    }

    setupMutuallyExclusive(titleOnlyCheckbox, discOnlyCheckbox);

    bindCheckboxKontrol('#showLogoOrTitle', '.logo-sub-options');
    bindTersCheckboxKontrol('#showLogoOrTitle', '.title-sub-options');
    bindTersCheckboxKontrol('#showLogoOrTitle', '.disc-sub-options');

    if (titleOnlyCheckbox.querySelector('input').checked && discOnlyCheckbox.querySelector('input').checked) {
        discOnlyCheckbox.querySelector('input').checked = false;
    }

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.logoOrTitleDescription || 'Bu ayar, slider üzerinde logo veya orijinal başlık görünürlüğünü kontrol eder.';
    section.appendChild(description);

    panel.appendChild(section);
    return panel;
}

function createDescriptionPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'description-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.descriptionsHeader || 'Açıklama Ayarları');
    const descCheckbox = createCheckbox('showDescriptions', labels.showDescriptions || 'Bilgileri Göster', config.showDescriptions);
    section.appendChild(descCheckbox);

    const subOptions = document.createElement('div');
    subOptions.className = 'sub-options desc-sub-options';
    subOptions.appendChild(createCheckbox('showSloganInfo', labels.showSloganInfo || 'Slogan', config.showSloganInfo));
    subOptions.appendChild(createCheckbox('showTitleInfo', labels.showTitleInfo || 'Başlık', config.showTitleInfo));
    subOptions.appendChild(createCheckbox('showOriginalTitleInfo', labels.showOriginalTitleInfo || 'Orijinal Başlık', config.showOriginalTitleInfo));

    const hideIfSameWrapper = document.createElement('div');
    hideIfSameWrapper.className = 'hide-original-if-same-wrapper';
    hideIfSameWrapper.appendChild(createCheckbox('hideOriginalTitleIfSame', labels.hideOriginalTitleIfSame || 'Başlık ile Aynı İse Orijinal Başlığı Gösterme', config.hideOriginalTitleIfSame));
    subOptions.appendChild(hideIfSameWrapper);

    subOptions.appendChild(createCheckbox('showPlotInfo', labels.showPlotInfo || 'Konu Metni', config.showPlotInfo));

    const plotOnlyDiv = document.createElement('div');
    plotOnlyDiv.className = 'sub-options plot-sub-options';
    plotOnlyDiv.id = 'showPlotOnlyLabel';
    plotOnlyDiv.appendChild(createCheckbox('showbPlotInfo', labels.showbPlotInfo || 'Konu Başlığı', config.showbPlotInfo));
    subOptions.appendChild(plotOnlyDiv);

    section.appendChild(subOptions);

    bindCheckboxKontrol('#showDescriptions', '.desc-sub-options');
    bindCheckboxKontrol('#showPlotInfo', '.plot-sub-options');
    bindCheckboxKontrol('#showOriginalTitleInfo', '.hide-original-if-same-wrapper');

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.descriptionsDescription || 'Bu ayar, içeriğin konu, slogan, başlık ve orijinal başlık bilgilerinin görünürlüğünü kontrol eder.';
    section.appendChild(description);

    panel.appendChild(section);
    return panel;
}


function createProviderPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'provider-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.providerHeader || 'Dış Bağlantılar / Sağlayıcı Ayarları');
    section.appendChild(createCheckbox('showProviderInfo', labels.showProviderInfo || 'Metaveri Bağlantıları Göster', config.showProviderInfo));

    section.appendChild(createCheckbox('showCast', labels.showCast || 'Chromecast\'ı Göster', config.showCast));

    const settingsLinkDiv = document.createElement('div');
    settingsLinkDiv.id = 'settingsLinkContainer';
    settingsLinkDiv.appendChild(createCheckbox('showSettingsLink', labels.showSettingsLink || 'Ayarlar Kısayolunu Göster', config.showSettingsLink));
    section.appendChild(settingsLinkDiv);

    const trailerIconDiv = document.createElement('div');
    trailerIconDiv.appendChild(createCheckbox('showTrailerIcon', labels.showTrailerIcon || 'Fragman İkonunu Göster', config.showTrailerIcon));
    section.appendChild(trailerIconDiv);

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.providerDescription || 'Bu ayar, metaveri bağlantılarının görünürlüğünü kontrol eder.';
    section.appendChild(description);

    panel.appendChild(section);
    return panel;
}

function createAboutPanel(labels) {
    const panel = document.createElement('div');
    panel.id = 'about-panel';
    panel.className = 'settings-panel';

    const section = createSection('JELLYFIN MEDIA SLIDER');

    const info = document.createElement('div');
    info.className = 'ggrbz-info';
    info.textContent = labels.aboutHeader || 'Hakkında';
    section.appendChild(info);

    const aboutContent = document.createElement('div');
    aboutContent.className = 'about-content';

    const creatorInfo = document.createElement('p');
    creatorInfo.textContent = ` G-GRBZ ${labels.aboutCreator || 'Tarafından Hazarlanmıştır'}`;
    creatorInfo.style.fontWeight = 'bold';
    creatorInfo.style.marginBottom = '20px';

    const supportInfo = document.createElement('p');
    supportInfo.textContent = labels.aboutSupport || 'Öneri, istek veya sorunlar için:';
    supportInfo.style.marginBottom = '10px';

    const githubLink = document.createElement('a');
    githubLink.href = 'https://github.com/G-grbz/';
    githubLink.target = '_blank';
    githubLink.textContent = labels.aboutGithub || 'GitHub: https://github.com/G-grbz/';
    githubLink.style.display = 'block';
    githubLink.style.marginBottom = '10px';
    githubLink.style.color = '#00a8ff';

    const emailLink = document.createElement('a');
    emailLink.href = 'mailto:gkhn.gurbuz@hotmail.com';
    emailLink.innerHTML = `${labels.aboutEmail || 'E Posta:'} gkhn.gurbuz@hotmail.com`;
    emailLink.style.display = 'block';
    emailLink.style.color = '#00a8ff';

    aboutContent.append(creatorInfo, supportInfo, githubLink, emailLink);
    section.appendChild(aboutContent);

    panel.appendChild(section);
    return panel;
}

function createButtonsPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'buttons-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.buttons || 'Buton Ayarları');

    const trailerButtonDiv = document.createElement('div');
    trailerButtonDiv.appendChild(createCheckbox('showTrailerButton', labels.showTrailerButton || 'Fragman Butonunu Göster', config.showTrailerButton));
    section.appendChild(trailerButtonDiv);

    const trailerBgDiv = document.createElement('div');
    trailerBgDiv.className = 'setting-item trailer-bg-container';
    const trailerBgLabel = document.createElement('label');
    trailerBgLabel.textContent = labels.buttonBackgroundImageType || 'Buton Arka Plan Görsel Türü:';
    const trailerBgSelect = createImageTypeSelect('trailerBackgroundImageType', config.trailerBackgroundImageType || 'backdropUrl', true);
    trailerBgDiv.append(trailerBgLabel, trailerBgSelect);
    section.appendChild(trailerBgDiv);

    bindCheckboxKontrol('#showTrailerButton', '.trailer-bg-container', 0.6, [trailerBgSelect]);

    const watchButtonDiv = document.createElement('div');
    watchButtonDiv.appendChild(createCheckbox('showWatchButton', labels.showWatchButton || 'İzle Butonunu Göster', config.showWatchButton));
    section.appendChild(watchButtonDiv);

    const watchBgDiv = document.createElement('div');
    watchBgDiv.className = 'setting-item watch-bg-container';
    const watchBgLabel = document.createElement('label');
    watchBgLabel.textContent = labels.buttonBackgroundImageType || 'Buton Arka Plan Görsel Türü:';
    const watchBgSelect = createImageTypeSelect('watchBackgroundImageType', config.watchBackgroundImageType || 'backdropUrl', true);
    watchBgDiv.append(watchBgLabel, watchBgSelect);
    section.appendChild(watchBgDiv);

    bindCheckboxKontrol('#showWatchButton', '.watch-bg-container', 0.6, [watchBgSelect]);

    const favoriteButtonDiv = document.createElement('div');
    favoriteButtonDiv.appendChild(createCheckbox('showFavoriteButton', labels.showFavoriteButton || 'Favori Butonunu Göster', config.showFavoriteButton));
    section.appendChild(favoriteButtonDiv);

    const favoriBgDiv = document.createElement('div');
    favoriBgDiv.className = 'setting-item favorite-bg-container';
    const favoriBgLabel = document.createElement('label');
    favoriBgLabel.textContent = labels.buttonBackgroundImageType || 'Buton Arka Plan Görsel Türü:';
    const favoriBgSelect = createImageTypeSelect('favoriteBackgroundImageType', config.favoriteBackgroundImageType || 'backdropUrl', true);
    favoriBgDiv.append(favoriBgLabel, favoriBgSelect);
    section.appendChild(favoriBgDiv);

    bindCheckboxKontrol('#showFavoriteButton', '.favorite-bg-container', 0.6, [favoriBgSelect]);

    const playedButtonDiv = document.createElement('div');
    playedButtonDiv.appendChild(createCheckbox('showPlayedButton', labels.showPlayedButton || 'İzlenme Durumu Kontrol Butonunu Göster', config.showPlayedButton));
    section.appendChild(playedButtonDiv);

    const playedBgDiv = document.createElement('div');
    playedBgDiv.className = 'setting-item played-bg-container';
    const playedBgLabel = document.createElement('label');
    playedBgLabel.textContent = labels.buttonBackgroundImageType || 'Buton Arka Plan Görsel Türü:';
    const playedBgSelect = createImageTypeSelect('playedBackgroundImageType', config.playedBackgroundImageType || 'backdropUrl', true);
    playedBgDiv.append(playedBgLabel, playedBgSelect);
    section.appendChild(playedBgDiv);

    bindCheckboxKontrol('#showPlayedButton', '.played-bg-container', 0.6, [playedBgSelect]);

    const buttonOpacityDiv = document.createElement('div');
    buttonOpacityDiv.className = 'setting-item';
    const buttonOpacityLabel = document.createElement('label');
    buttonOpacityLabel.textContent = labels.backgroundOpacity || 'Buton Arka Plan Şeffaflığı:';
    const buttonOpacityInput = document.createElement('input');
    buttonOpacityInput.type = 'range';
    buttonOpacityInput.min = '0.3';
    buttonOpacityInput.max = '1';
    buttonOpacityInput.step = '0.1';
    buttonOpacityInput.name = 'buttonOpacity';
    buttonOpacityInput.id = 'buttonOpacity';
    buttonOpacityInput.value = config.buttonBackgroundOpacity ?? 0.5;
    buttonOpacityInput.name = 'buttonBackgroundOpacity';
    const buttonOpacityValue = document.createElement('span');
    buttonOpacityValue.className = 'range-value';
    buttonOpacityValue.textContent = buttonOpacityInput.value;
    buttonOpacityInput.addEventListener('input', () => {
        buttonOpacityValue.textContent = buttonOpacityInput.value;
    });
    buttonOpacityDiv.append(buttonOpacityLabel, buttonOpacityInput, buttonOpacityValue);
    section.appendChild(buttonOpacityDiv);

    const buttonblurDiv = document.createElement('div');
    buttonblurDiv.className = 'setting-item';

    const buttonblurLabel = document.createElement('label');
    buttonblurLabel.textContent = labels.backgroundBlur || 'Arka plan bulanıklığı:';
    buttonblurLabel.htmlFor = 'buttonBackgroundBlur';

    const buttonblurInput = document.createElement('input');
    buttonblurInput.type = 'range';
    buttonblurInput.min = '0';
    buttonblurInput.max = '20';
    buttonblurInput.step = '1';
    buttonblurInput.value = config.buttonBackgroundBlur ?? 10;
    buttonblurInput.name = 'buttonBackgroundBlur';
    buttonblurInput.id = 'buttonBackgroundBlur';

    const buttonblurValue = document.createElement('span');
    buttonblurValue.className = 'range-value';
    buttonblurValue.textContent = buttonblurInput.value + 'px';

    buttonblurInput.addEventListener('input', () => {
    buttonblurValue.textContent = buttonblurInput.value + 'px';
    });

    buttonblurDiv.append(buttonblurLabel, buttonblurInput, buttonblurValue);
    section.appendChild(buttonblurDiv);

    panel.appendChild(section);
    return panel;
}

function createInfoPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'info-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.infoHeader || 'Tür, Yıl ve Ülke Bilgileri');
    const infoCheckbox = createCheckbox('showInfo', labels.showInfo || 'Tür, Yıl ve Ülke Bilgilerini Göster', config.showInfo);
    section.appendChild(infoCheckbox);

    const subOptions = document.createElement('div');
    subOptions.className = 'sub-options info-sub-options';
    subOptions.appendChild(createCheckbox('showGenresInfo', labels.showGenresInfo || 'Tür', config.showGenresInfo));
    subOptions.appendChild(createCheckbox('showYearInfo', labels.showYearInfo || 'Yıl', config.showYearInfo));
    subOptions.appendChild(createCheckbox('showCountryInfo', labels.showCountryInfo || 'Ülke', config.showCountryInfo));
    section.appendChild(subOptions);

    bindCheckboxKontrol('#showInfo', '.info-sub-options');

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.infoDescription || 'Bu ayar, içeriğin türü, yapım yılı ve yapımcı ülke bilgilerinin görünürlüğünü kontrol eder.';
    section.appendChild(description);

    panel.appendChild(section);
    return panel;
}


function createPositionPanel(config, labels) {
  const panel = document.createElement('div');
  panel.id = 'position-panel';
  panel.className = 'position-panel';

  const section = createSection();
  const positionEditor = createPositionEditor(config, labels, section);
  positionEditor.render();

  panel.appendChild(section);
  return panel;
}

function createPausePanel(config, labels) {
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

function createExporterPanel(config, labels) {
  const panel = document.createElement('div');
  panel.id = 'exporter-panel';
  panel.className = 'exporter-panel';

  panel.appendChild(createBackupRestoreButtons());

  document.documentElement.style.setProperty(
    '--file-select-text',
    `"${config.languageLabels.yedekSec || 'Dosya Seç'}"`
  );

  return panel;
}

function createTab(id, label, isActive = false, isDisabled = false) {
    const tab = document.createElement('div');
    tab.className = `settings-tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled-tab' : ''}`;
    tab.setAttribute('data-tab', id);
    tab.textContent = label;

    if (isDisabled) {
        tab.style.opacity = '0.5';
        tab.style.pointerEvents = 'none';
        tab.style.cursor = 'not-allowed';
    }

    return tab;
}

function createSection(title) {
    const section = document.createElement('div');
    section.className = 'settings-section';

    if (title) {
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = title;
        section.appendChild(sectionTitle);
    }

    return section;
}

function createCheckbox(name, label, isChecked) {
    const container = document.createElement('div');
    container.className = 'setting-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = name;
    checkbox.id = name;

    const storedValue = localStorage.getItem(name);
    if (storedValue !== null) {
        checkbox.checked = storedValue === 'true';
    } else {
        checkbox.checked = isChecked !== false;
    }

    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = name;
    checkboxLabel.textContent = label;

    container.append(checkbox, checkboxLabel);
    return container;
}

function createImageTypeSelect(name, selectedValue, includeExtended = false, includeUseSlide = false) {
    const select = document.createElement('select');
    select.name = name;

    const config = getConfig();
    const currentLang = config.defaultLanguage || getDefaultLanguage();
    const labels = getLanguageLabels(currentLang) || {};

    const options = [
        {
            value: 'none',
            label: labels.imageTypeNone || 'Hiçbiri'
        },
        {
            value: 'backdropUrl',
            label: labels.imageTypeBackdrop || 'Backdrop Görseli'
        },
        {
            value: 'landscapeUrl',
            label: labels.imageTypeLandscape || 'Landscape Görseli'
        },
        {
            value: 'primaryUrl',
            label: labels.imageTypePoster || 'Poster Görseli'
        },
        {
            value: 'logoUrl',
            label: labels.imageTypeLogo || 'Logo Görseli'
        },
        {
            value: 'bannerUrl',
            label: labels.imageTypeBanner || 'Banner Görseli'
        },
        {
            value: 'artUrl',
            label: labels.imageTypeArt || 'Art Görseli'
        },
        {
            value: 'discUrl',
            label: labels.imageTypeDisc || 'Disk Görseli'
        }
    ];

    const storedValue = localStorage.getItem(name);
    const finalSelectedValue = storedValue !== null ? storedValue : selectedValue;

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        if (option.value === finalSelectedValue) {
            optionElement.selected = true;
        }
        select.appendChild(optionElement);
    });

    return select;
}

function bindCheckboxKontrol(
    mainCheckboxSelector,
    subContainerSelector,
    disabledOpacity = 0.5,
    additionalElements = []
) {
    setTimeout(() => {
        const mainCheckbox = document.querySelector(mainCheckboxSelector);
        const subContainer = document.querySelector(subContainerSelector);

        if (!mainCheckbox) return;
        const allElements = [];
        if (subContainer) {
            allElements.push(
                ...subContainer.querySelectorAll('input'),
                ...subContainer.querySelectorAll('select'),
                ...subContainer.querySelectorAll('textarea'),
                ...subContainer.querySelectorAll('label')
            );
        }
        additionalElements.forEach(el => el && allElements.push(el));

        const updateElementsState = () => {
            const isMainChecked = mainCheckbox.checked;

            allElements.forEach(element => {
                if (element.tagName === 'LABEL') {
                    element.style.opacity = isMainChecked ? '1' : disabledOpacity;
                } else {
                    element.disabled = !isMainChecked;
                    element.style.opacity = isMainChecked ? '1' : disabledOpacity;
                }
            });
            if (subContainer) {
                subContainer.style.opacity = isMainChecked ? '1' : disabledOpacity;
                subContainer.classList.toggle('disabled', !isMainChecked);
            }
        };
        updateElementsState();
        mainCheckbox.addEventListener('change', updateElementsState);
    }, 50);
}

function bindTersCheckboxKontrol(
    mainCheckboxSelector,
    targetContainerSelector,
    disabledOpacity = 0.6,
    targetElements = []
) {
    setTimeout(() => {
        const mainCheckbox = document.querySelector(mainCheckboxSelector);
        const targetContainer = document.querySelector(targetContainerSelector);

        if (!mainCheckbox) return;
        const allElements = targetElements.slice();
        if (targetContainer) {
            allElements.push(
                ...targetContainer.querySelectorAll('input'),
                ...targetContainer.querySelectorAll('select'),
                ...targetContainer.querySelectorAll('textarea')
            );
        }

        const updateElementsState = () => {
            const isMainChecked = mainCheckbox.checked;
            allElements.forEach(element => {
                element.disabled = isMainChecked;
                element.style.opacity = isMainChecked ? disabledOpacity : '1';
            });

            if (targetContainer) {
                targetContainer.style.opacity = isMainChecked ? disabledOpacity : '1';
                targetContainer.classList.toggle('disabled', isMainChecked);
            }
        };
        updateElementsState();
        mainCheckbox.addEventListener('change', updateElementsState);
    }, 50);
}

export function initSettings(defaultTab = 'slider') {
    const modal = createSettingsModal();

    return {
        open: (tab = defaultTab) => {
            const tabs = modal.querySelectorAll('.settings-tab');
            const panels = modal.querySelectorAll('.settings-panel');
            tabs.forEach(tab => tab.classList.remove('active'));
            panels.forEach(panel => panel.style.display = 'none');
            const targetTab = modal.querySelector(`.settings-tab[data-tab="${tab}"]`);
            const targetPanel = modal.querySelector(`#${tab}-panel`);

            if (targetTab && targetPanel) {
                targetTab.classList.add('active');
                targetPanel.style.display = 'block';
            } else {
                const sliderTab = modal.querySelector('.settings-tab[data-tab="slider"]');
                const sliderPanel = modal.querySelector('#slider-panel');
                sliderTab.classList.add('active');
                sliderPanel.style.display = 'block';
            }

            modal.style.display = 'block';
        },
        close: () => { modal.style.display = 'none'; }
    };
}

export function isLocalStorageAvailable() {
    try {
        const testKey = 'test';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

export function updateConfig(updatedConfig) {
    Object.entries(updatedConfig).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
            localStorage.setItem(key, value ? 'true' : 'false');
        } else if (Array.isArray(value)) {
            localStorage.setItem(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
            localStorage.setItem(key, value.toString());
        }
    });

    if (updatedConfig.defaultLanguage !== undefined) {
        localStorage.setItem('defaultLanguage', updatedConfig.defaultLanguage);
    }

    if (updatedConfig.dateLocale !== undefined) {
        localStorage.setItem('dateLocale', updatedConfig.dateLocale);
    }

    if (!isLocalStorageAvailable()) return;

    const keysToSave = [
        'playerTheme',
        'playerStyle',
        'useAlbumArtAsBackground',
        'albumArtBackgroundBlur',
        'albumArtBackgroundOpacity',
        'buttonBackgroundBlur',
        'buttonBackgroundOpacity',
        'dotBackgroundBlur',
        'dotBackgroundOpacity',
        'nextTracksSource'
    ];

    keysToSave.forEach(key => {
        const value = updatedConfig[key];
        if (value !== undefined && value !== null) {
            localStorage.setItem(key, value.toString());
        }
    });
}

function setupMobileTextareaBehavior() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;

  const textareas = modal.querySelectorAll('textarea');

  textareas.forEach(textarea => {
    textarea.addEventListener('focus', function() {
      if (!isMobileDevice()) return;
      this.style.position = 'fixed';
      this.style.bottom = '50%';
      this.style.left = '0';
      this.style.right = '0';
      this.style.zIndex = '10000';
      this.style.height = '30vh';

      setTimeout(() => {
        this.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300);
    });

    textarea.addEventListener('blur', function() {
      if (!isMobileDevice()) return;
      this.style.position = '';
      this.style.bottom = '';
      this.style.left = '';
      this.style.right = '';
      this.style.zIndex = '';
      this.style.height = '';
    });
  });
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
