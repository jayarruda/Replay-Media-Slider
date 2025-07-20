import { getConfig } from "../config.js";
import { createCheckbox, createSection, createNumberInput, createTextInput, createSelect } from "../settings.js";
import { applySettings } from "./applySettings.js";

export function createAvatarPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'avatar-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.avatarCreateInput || 'Avatar Ayarları');

    const avatarCheckbox = createCheckbox('createAvatar', labels.createAvatar || 'Avatar Oluşturmayı Etkinleştir', config.createAvatar);
    section.appendChild(avatarCheckbox);

    const colorMethodSelect = createSelect(
        'avatarColorMethod',
        labels.avatarColorMethod || 'Renk Belirleme Yöntemi',
        [
            { value: 'dynamic', text: labels.avatarColorDynamic || 'Dinamik (Kullanıcı ID\'sine göre)' },
            { value: 'random', text: labels.avatarColorRandom || 'Rastgele (Sabit renk paleti)' },
            { value: 'solid', text: labels.avatarColorSolid || 'Sabit Renk' },
            { value: 'gradient', text: labels.avatarColorGradient || 'Gradyan Renk' }
        ],
        config.avatarColorMethod
    );
    section.appendChild(colorMethodSelect);


    const solidColorInput = createColorInput('avatarSolidColor', labels.avatarSolidColor || 'Sabit Renk Seçin', config.avatarSolidColor || '#FF4081');
    solidColorInput.style.display = config.avatarColorMethod === 'solid' ? 'block' : 'none';
    section.appendChild(solidColorInput);

   const gradientSelect = createSelect(
    'avatarGradient',
    labels.avatarGradient || 'Gradyan Seçimi',
    [
        { value: 'linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%)', text: labels.gradient1 || 'Kızıl Güneş' },
        { value: 'linear-gradient(135deg, #36D1DC 0%, #5B86E5 100%)', text: labels.gradient2 || 'Deniz Mavisi' },
        { value: 'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)', text: labels.gradient3 || 'Tropikal Yeşil' },
        { value: 'linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 100%)', text: labels.gradient4 || 'Tatlı Pembe' },
        { value: 'linear-gradient(135deg, #FDBB2D 0%, #3A1C71 100%)', text: labels.gradient5 || 'Altın-Mor Gece' },
        { value: 'linear-gradient(135deg, #FC6076 0%, #FF9A44 100%)', text: labels.gradient6 || 'Turuncu Şafak' },
        { value: 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)', text: labels.gradient7 || 'Aqua-Lime' },
        { value: 'linear-gradient(135deg, #C33764 0%, #1D2671 100%)', text: labels.gradient8 || 'Gece Yarısı Moru' },
        { value: 'linear-gradient(135deg, #FBD3E9 0%, #BB377D 100%)', text: labels.gradient9 || 'Pembe Lila' },
        { value: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', text: labels.gradient10 || 'Kraliyet Mavisi' },
        { value: 'linear-gradient(135deg, #30E8BF 0%, #FF8235 100%)', text: labels.gradient11 || 'Yeşil-Turuncu Enerji' },
        { value: 'linear-gradient(135deg, #FFB75E 0%, #ED8F03 100%)', text: labels.gradient12 || 'Altın Turuncu' },
        { value: 'linear-gradient(135deg, #D38312 0%, #A83279 100%)', text: labels.gradient13 || 'Çöl Işıltısı' },
        { value: 'linear-gradient(135deg, #3CA55C 0%, #B5AC49 100%)', text: labels.gradient14 || 'Orman Yolu' },
        { value: 'linear-gradient(135deg, #FFDEE9 0%, #B5FFFC 100%)', text: labels.gradient15 || 'Pembe-Buz Mavisi' }
        ],
        config.avatarGradient
    );
    gradientSelect.style.display = config.avatarColorMethod === 'gradient' ? 'block' : 'none';
    section.appendChild(gradientSelect);

    const fontFamilySelect = createSelect(
        'avatarFontFamily',
        labels.avatarFontFamily || 'Yazı Tipi',
        getSystemFonts(labels),
        config.avatarFontFamily
    );
    fontFamilySelect.querySelector('select').addEventListener('change', () => applySettings(false));
    section.appendChild(fontFamilySelect);

    const widthInput = createNumberInput('avatarWidth', labels.avatarWidth || 'Avatar Genişliği (px)', config.avatarWidth, 10, 25);
    widthInput.querySelector('input').addEventListener('change', () => applySettings(false));
    section.appendChild(widthInput);

    const heightInput = createNumberInput('avatarHeight', labels.avatarHeight || 'Avatar Yüksekliği (px)', config.avatarHeight, 10, 25);
    heightInput.querySelector('input').addEventListener('change', () => applySettings(false));
    section.appendChild(heightInput);

    const fontSizeInput = createNumberInput('avatarFontSize', labels.avatarFontSize || 'Yazı Boyutu (px)', config.avatarFontSize, 8, 20);
    fontSizeInput.querySelector('input').addEventListener('change', () => applySettings(false));
    section.appendChild(fontSizeInput);

    const textShadowInput = createTextInput('avatarTextShadow', labels.avatarTextShadow || 'Yazı Gölgesi', config.avatarTextShadow);
    textShadowInput.querySelector('input').addEventListener('change', () => applySettings(false));
    section.appendChild(textShadowInput);

    colorMethodSelect.querySelector('select').addEventListener('change', (e) => {
    solidColorInput.style.display = e.target.value === 'solid' ? 'block' : 'none';
    gradientSelect.style.display = e.target.value === 'gradient' ? 'block' : 'none';
    applySettings(false);
});

    avatarCheckbox.querySelector('input').addEventListener('change', () => {
    applySettings(false);
});

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.avatarOverlayDescription ||
        'Bu özellik etkinleştirildiğinde, profil resmi olmayan kullanıcıların kullanıcı isimlerinden avatar oluşturur.';
    section.appendChild(description);

    panel.appendChild(section);
    solidColorInput.querySelector('input[type="color"]').addEventListener('change', () => applySettings(false));
    solidColorInput.querySelector('input[type="text"]').addEventListener('change', () => applySettings(false));
    gradientSelect.querySelector('select').addEventListener('change', () => applySettings(false));

    return panel;
}

export function createColorInput(name, label, value) {
    const container = document.createElement('div');
    container.className = 'input-container';

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.htmlFor = name;

    const input = document.createElement('input');
    input.type = 'color';
    input.id = name;
    input.name = name;
    input.value = value || '#FF4081';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = value || '#FF4081';
    textInput.className = 'color-text-input';

    input.addEventListener('input', () => {
        textInput.value = input.value;
    });

    textInput.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(textInput.value)) {
            input.value = textInput.value;
        }
    });

    container.appendChild(labelElement);
    container.appendChild(input);
    container.appendChild(textInput);

    return container;
}

function getSystemFonts(labels) {
    const systemFonts = [
        { value: 'inherit', text: labels.fontInherit || 'Varsayılan' },
        { value: 'Arial, sans-serif', text: 'Arial' },
        { value: 'Helvetica, sans-serif', text: 'Helvetica' },
        { value: '"Times New Roman", serif', text: 'Times New Roman' },
        { value: 'Georgia, serif', text: 'Georgia' },
        { value: 'Courier, monospace', text: 'Courier' },
        { value: 'Verdana, sans-serif', text: 'Verdana' },
        { value: '"Comic Sans MS", cursive', text: 'Comic Sans' },
        { value: 'Impact, sans-serif', text: 'Impact' },
        { value: 'Righteous', text: 'Righteous' },
        { value: '"Trebuchet MS", sans-serif', text: 'Trebuchet' },
        { value: '"Palatino Linotype", serif', text: 'Palatino' },
        { value: '"Lucida Sans Unicode", sans-serif', text: 'Lucida Sans' },
        { value: '"Segoe UI", sans-serif', text: 'Segoe UI' },
        { value: 'Roboto, sans-serif', text: 'Roboto' },
        { value: '"Open Sans", sans-serif', text: 'Open Sans' },
        { value: 'system-ui, sans-serif', text: labels.systemdefault || 'Sistem Varsayılanı' },
        { value: '-apple-system, BlinkMacSystemFont', text: labels.appledefault || 'Apple Sistem' },
        { value: '"Segoe UI", Roboto, Oxygen', text: 'Windows/Linux' }
    ];

    if (navigator.userAgent.includes('Windows')) {
        systemFonts.push(
            { value: '"Microsoft YaHei", sans-serif', text: 'Microsoft YaHei' },
            { value: '"Microsoft JhengHei", sans-serif', text: 'Microsoft JhengHei' }
        );
    }

    if (navigator.userAgent.includes('Mac')) {
        systemFonts.push(
            { value: '"San Francisco", -apple-system', text: 'San Francisco' },
            { value: '"SF Pro Display", -apple-system', text: 'SF Pro' }
        );
    }

    return systemFonts;
}
