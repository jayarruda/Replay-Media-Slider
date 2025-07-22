import { getConfig } from "../config.js";
import { createCheckbox, createSection, createNumberInput, createTextInput, createSelect } from "../settings.js";
import { applySettings } from "./applySettings.js";
import { clearAvatarCache, cleanAvatars, updateHeaderUserAvatar  } from "../userAvatar.js";
import { debounce } from "../utils.js";
export function createAvatarPanel(config, labels) {
  const panel = document.createElement('div');
  panel.id = 'avatar-panel';
  panel.className = 'settings-panel';

  const section = createSection(labels.avatarCreateInput || 'Avatar Ayarları');

  const avatarCheckbox = createCheckbox('createAvatar', labels.createAvatar || 'Avatar Oluşturmayı Etkinleştir', config.createAvatar);
  section.appendChild(avatarCheckbox);

  const avatarStyleSelect = createSelect(
    'avatarStyle',
    labels.avatarStyle || 'Avatar Stili',
    [
      { value: 'initials', text: labels.avatarStyleInitials || 'Baş Harfler' },
      { value: 'dicebear', text: labels.avatarStyleDicebear || 'Dicebear Avatar' }
    ],
    config.avatarStyle || 'initials'
  );
  section.appendChild(avatarStyleSelect);

  const dicebearStyleSelect = createSelect(
    'dicebearStyle',
    labels.dicebearStyle || 'Dicebear Stili',
    [
      { value: 'adventurer', text: labels.adventurer },
      { value: 'adventurer-neutral', text: labels.adventurerNeutral },
      { value: 'avataaars', text: labels.avataaars },
      { value: 'avataaars-neutral', text: labels.avataaarsNeutral },
      { value: 'big-ears', text: labels.bigEars },
      { value: 'big-ears-neutral', text: labels.bigEarsNeutral },
      { value: 'big-smile', text: labels.bigSmile },
      { value: 'bottts', text: labels.bottts },
      { value: 'bottts-neutral', text: labels.botttsNeutral },
      { value: 'croodles', text: labels.croodles },
      { value: 'croodles-neutral', text: labels.croodlesNeutral },
      { value: 'dylan', text: labels.dylan },
      { value: 'fun-emoji', text: labels.funEmoji },
      { value: 'glass', text: labels.glass },
      { value: 'icons', text: labels.icons },
      { value: 'identicon', text: labels.identicon },
      { value: 'initials', text: labels.initials },
      { value: 'lorelei', text: labels.lorelei },
      { value: 'lorelei-neutral', text: labels.loreleiNeutral },
      { value: 'micah', text: labels.micah },
      { value: 'miniavs', text: labels.miniAvatars },
      { value: 'notionists', text: labels.notionists },
      { value: 'notionists-neutral', text: labels.notionistsNeutral },
      { value: 'open-peeps', text: labels.openPeeps },
      { value: 'personas', text: labels.personas },
      { value: 'pixel-art', text: labels.pixelArt },
      { value: 'pixel-art-neutral', text: labels.pixelArtNeutral },
      { value: 'rings', text: labels.rings },
      { value: 'shapes', text: labels.shapes },
      { value: 'thumbs', text: labels.thumbs }
    ],
    config.dicebearStyle || 'initials'
  );
    dicebearStyleSelect.style.display = config.avatarStyle === 'dicebear' ? 'block' : 'none';
    section.appendChild(dicebearStyleSelect);

    const dicebearPositionCheckbox = createCheckbox('dicebearPosition', labels.dicebearPosition || 'Avatar Dışa Çıkar', config.dicebearPosition);
    section.appendChild(dicebearPositionCheckbox);

    const dicebearBgCheckbox = createCheckbox(
    'dicebearBackgroundEnabled',
    labels.dicebearBackgroundEnabled || 'Dicebear Arkaplanı Etkinleştir',
    config.dicebearBackgroundEnabled !== false
  );
    dicebearBgCheckbox.style.display = config.avatarStyle === 'dicebear' ? 'flex' : 'none';
    section.appendChild(dicebearBgCheckbox);

    const dicebearBgColor = createColorInput(
    'dicebearBackgroundColor',
    labels.dicebearBackgroundColor || 'Dicebear Arkaplan Rengi',
    config.dicebearBackgroundColor || '#FF4081'
  );
    dicebearBgColor.style.display = config.avatarStyle === 'dicebear' ? 'block' : 'none';
    section.appendChild(dicebearBgColor);

    const applyDicebearBtn = document.createElement('button');
    applyDicebearBtn.type = 'button';
    applyDicebearBtn.id = 'applyDicebearAvatar';
    applyDicebearBtn.textContent = labels.uygula || 'DiceBear Avatar Uygula';
    applyDicebearBtn.className = 'btn';
    applyDicebearBtn.style.display = config.avatarStyle === 'dicebear' ? 'block' : 'none';

    applyDicebearBtn.addEventListener('click', async () => {
  clearAvatarCache();
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('avatar-') && key.includes('dicebear')) {
      sessionStorage.removeItem(key);
    }
  });
  cleanAvatars(document.querySelector('button.headerUserButton'));
  await updateHeaderUserAvatar();
});

    section.appendChild(applyDicebearBtn);

    const scaleSection = document.createElement('div');
    scaleSection.className = 'avatar-item';

    const scaleLabel = document.createElement('label');
    scaleLabel.textContent = labels.avatarScale || 'Avatar Büyütme Oranı';
    scaleLabel.htmlFor = 'avatarScale';

    const scaleInput = document.createElement('input');
    scaleInput.type = 'range';
    scaleInput.min = '0.5';
    scaleInput.max = '3';
    scaleInput.step = '0.1';
    scaleInput.value = config.avatarScale || '1';
    scaleInput.name = 'avatarScale';
    scaleInput.id = 'avatarScale';
    scaleInput.className = 'range-input';

    const scaleValue = document.createElement('span');
    scaleValue.className = 'range-value';
    scaleValue.textContent = `${scaleInput.value}x`;

    scaleInput.addEventListener('input', () => {
    scaleValue.textContent = `${scaleInput.value}x`;
});

    const debouncedScaleUpdate = debounce(() => {
    clearAvatarCache();
    applySettings(false);
  }, 300);

    scaleInput.addEventListener('change', debouncedScaleUpdate);

    scaleSection.append(scaleLabel, scaleInput, scaleValue);
    section.appendChild(scaleSection);

    const dicebearRadius = createNumberInput(
    'dicebearRadius',
    labels.dicebearRadius || 'Dicebear Yuvarlaklık (0-50)',
    config.dicebearRadius || 50,
    0,
    50
  );
    dicebearRadius.style.display = config.avatarStyle === 'dicebear' ? 'block' : 'none';
    section.appendChild(dicebearRadius);
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
    colorMethodSelect.style.display = config.avatarStyle === 'initials' ? 'block' : 'none';
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

    const widthInput = createNumberInput('avatarWidth', labels.avatarWidth || 'Avatar Genişliği (px)', config.avatarWidth, 10, 50);
    widthInput.querySelector('input').addEventListener('change', () => applySettings(false));
    section.appendChild(widthInput);

    const heightInput = createNumberInput('avatarHeight', labels.avatarHeight || 'Avatar Yüksekliği (px)', config.avatarHeight, 10, 50);
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
    clearAvatarCache();
    applySettings(false);
  });

  avatarCheckbox.querySelector('input').addEventListener('change', () => {
    clearAvatarCache();
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
    avatarStyleSelect.querySelector('select').addEventListener('change', (e) => {
    const isDicebear = e.target.value === 'dicebear';
    dicebearStyleSelect.style.display = isDicebear ? 'block' : 'none';
    dicebearBgColor.style.display = isDicebear ? 'block' : 'none';
    dicebearBgCheckbox.style.display = isDicebear ? 'block' : 'none';
    dicebearRadius.style.display = isDicebear ? 'block' : 'none';
    colorMethodSelect.style.display = isDicebear ? 'none' : 'block';
    applyDicebearBtn.style.display = isDicebear ? 'block' : 'none';
    dicebearPositionCheckbox.style.display = isDicebear ? 'block' : 'none';
    clearAvatarCache();
    applySettings(false);
  });

    const cacheClearingInputs = [
    dicebearStyleSelect, dicebearBgColor, dicebearBgCheckbox, dicebearRadius,
    solidColorInput, gradientSelect, fontFamilySelect,
    widthInput, heightInput, fontSizeInput, textShadowInput, dicebearPositionCheckbox
  ];

  cacheClearingInputs.forEach(input => {
    const element = input.querySelector('input, select');
    if (element) {
      element.addEventListener('change', () => {
        clearAvatarCache();
        applySettings(false);
      });
    }
  });

  return panel;
}

export function createColorInput(name, label, value) {
    const container = document.createElement('div');
    container.className = 'input-container';

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.htmlFor = name;

    const colorContainer = document.createElement('div');
    colorContainer.style.display = 'flex';
    colorContainer.style.alignItems = 'center';
    colorContainer.style.gap = '8px';

    const input = document.createElement('input');
    input.type = 'color';
    input.id = name;
    input.name = name;
    input.value = value || '#FF4081';

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = value || '#FF4081';
    textInput.className = 'color-text-input';
    textInput.style.flex = '1';

    const debouncedApply = debounce(() => {
        applySettings(false);
    }, 300);

    input.addEventListener('change', () => {
        textInput.value = input.value;
        debouncedApply();
    });

    textInput.addEventListener('change', () => {
        if (/^#[0-9A-F]{6}$/i.test(textInput.value)) {
            input.value = textInput.value;
            debouncedApply();
        }
    });

    colorContainer.appendChild(input);
    colorContainer.appendChild(textInput);

    container.appendChild(labelElement);
    container.appendChild(colorContainer);

    return container;
}


function getSystemFonts(labels) {
    const systemFonts = [
        { value: 'inherit', text: labels.fontInherit || 'Varsayılan' },
        { value: 'Arial, sans-serif', text: 'Arial' },
        { value: 'Helvetica, sans-serif', text: 'Helvetica' },
        { value: '"Times New Roman", serif', text: 'Times New Roman' },
        { value: 'Georgia, serif', text: 'Georgia' },
        { value: 'Verdana, sans-serif', text: 'Verdana' },
        { value: '"Trebuchet MS", sans-serif', text: 'Trebuchet MS' },
        { value: '"Palatino Linotype", serif', text: 'Palatino Linotype' },
        { value: '"Lucida Sans Unicode", sans-serif', text: 'Lucida Sans Unicode' },
        { value: '"Segoe UI", sans-serif', text: 'Segoe UI' },
        { value: 'Courier New, monospace', text: 'Courier New' },
        { value: 'Impact, sans-serif', text: 'Impact' },
        { value: '"Comic Sans MS", cursive, sans-serif', text: 'Comic Sans MS' },
        { value: 'Roboto, sans-serif', text: 'Roboto' },
        { value: '"Open Sans", sans-serif', text: 'Open Sans' },
        { value: '"Poppins", sans-serif', text: 'Poppins' },
        { value: '"Montserrat", sans-serif', text: 'Montserrat' },
        { value: '"Lato", sans-serif', text: 'Lato' },
        { value: '"Raleway", sans-serif', text: 'Raleway' },
        { value: '"Nunito", sans-serif', text: 'Nunito' },
        { value: '"Quicksand", sans-serif', text: 'Quicksand' },
        { value: '"Rubik", sans-serif', text: 'Rubik' },
        { value: '"Ubuntu", sans-serif', text: 'Ubuntu' },
        { value: '"Merriweather", serif', text: 'Merriweather' },
        { value: '"Playfair Display", serif', text: 'Playfair Display' },
        { value: 'Righteous, cursive', text: 'Righteous' },
        { value: '"Pacifico", cursive', text: 'Pacifico' },
        { value: '"Caveat", cursive', text: 'Caveat (El Yazısı)' },
        { value: '"Shadows Into Light", cursive', text: 'Shadows Into Light' },
        { value: '"Indie Flower", cursive', text: 'Indie Flower' },
        { value: 'system-ui, sans-serif', text: labels.systemdefault || 'Sistem Varsayılanı' },
        { value: '-apple-system, BlinkMacSystemFont', text: labels.appledefault || 'Apple Sistem Varsayılanı' },
        { value: '"Segoe UI", Roboto, Oxygen', text: 'Windows/Linux' }
    ];

    if (navigator.userAgent.includes('Windows')) {
        systemFonts.push(
            { value: '"Microsoft YaHei", sans-serif', text: 'Microsoft YaHei (Çince)' },
            { value: '"Microsoft JhengHei", sans-serif', text: 'Microsoft JhengHei (Çince-TW)' }
        );
    }

    if (navigator.userAgent.includes('Mac')) {
        systemFonts.push(
            { value: '"San Francisco", -apple-system', text: 'San Francisco' },
            { value: '"SF Pro Display", -apple-system', text: 'SF Pro Display' }
        );
    }

    return systemFonts;
}
