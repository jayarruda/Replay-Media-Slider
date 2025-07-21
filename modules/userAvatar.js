import { makeApiRequest } from "./api.js";
import { getServerAddress, getConfig } from "./config.js";

const config = getConfig();
let customAvatarAdded = false;
let avatarObserver = null;
let currentAvatarElement = null;

const userCache = {
  data: null,
  timestamp: 0,
  cacheDuration: config.avatarCacheDuration || 1800000
};

const DICEBEAR_OPTIONS = {
  styles: [
    { id: 'adventurer', name: 'Adventurer' },
    { id: 'adventurer-neutral', name: 'Adventurer Neutral' },
    { id: 'avataaars', name: 'Avataaars' },
    { id: 'avataaars-neutral', name: 'Avataaars Neutral' },
    { id: 'big-ears', name: 'Big Ears' },
    { id: 'big-ears-neutral', name: 'Big Ears Neutral' },
    { id: 'big-smile', name: 'Big Smile' },
    { id: 'bottts', name: 'Bottts' },
    { id: 'bottts-neutral', name: 'Bottts Neutral' },
    { id: 'croodles', name: 'Croodles' },
    { id: 'croodles-neutral', name: 'Croodles Neutral' },
    { id: 'dylan', name: 'Dylan' },
    { id: 'fun-emoji', name: 'Fun Emoji' },
    { id: 'glass', name: 'Glass' },
    { id: 'icons', name: 'Icons' },
    { id: 'identicon', name: 'Identicon' },
    { id: 'initials', name: 'Initials' },
    { id: 'lorelei', name: 'Lorelei' },
    { id: 'lorelei-neutral', name: 'Lorelei Neutral' },
    { id: 'micah', name: 'Micah' },
    { id: 'miniavs', name: 'Mini Avatars' },
    { id: 'notionists', name: 'Notionists' },
    { id: 'notionists-neutral', name: 'Notionists Neutral' },
    { id: 'open-peeps', name: 'Open Peeps' },
    { id: 'personas', name: 'Personas' },
    { id: 'pixel-art', name: 'Pixel Art' },
    { id: 'pixel-art-neutral', name: 'Pixel Art Neutral' },
    { id: 'rings', name: 'Rings' },
    { id: 'shapes', name: 'Shapes' },
    { id: 'thumbs', name: 'Thumbs' }
  ],
  baseUrl: 'https://api.dicebear.com/9.x'
};

export async function updateHeaderUserAvatar() {
  try {
    console.log("Avatar güncelleme başlatılıyor...");

    const config = getConfig?.();
    if (config && config.createAvatar === false) {
      console.log("Avatar oluşturma devre dışı bırakıldı, temizlik yapılıyor...");
      cleanAvatars();
      return;
    }

    const [headerButton, user] = await Promise.all([
      waitForElement("button.headerUserButton"),
      ensureUserData()
    ]);

    if (!headerButton) {
      console.warn("Kullanıcı butonu bulunamadı!");
      return;
    }

    if (!user) {
      console.warn("Kullanıcı bilgileri alınamadı!");
      return;
    }

    if (hasJellyfinAvatar(headerButton)) {
      if (customAvatarAdded) {
        console.log("Jellyfin avatarı tespit edildi, özel avatar temizleniyor...");
        cleanAvatars();
        customAvatarAdded = false;
      }
      return;
    }

    const existingCustomAvatar = headerButton.querySelector(".custom-user-avatar");
    if (existingCustomAvatar) {
      console.log("Mevcut avatar güncelleniyor...");
      updateAvatarElement(existingCustomAvatar, user);
      return;
    }

    console.log("Yeni avatar oluşturuluyor...");
    const avatarElement = await createAvatar(user);
    if (!avatarElement) {
      console.warn("Avatar oluşturulamadı!");
      return;
    }

    cleanAvatars(headerButton);
    avatarElement.classList.add("custom-user-avatar");
    headerButton.appendChild(avatarElement);
    currentAvatarElement = avatarElement;
    customAvatarAdded = true;

    applyAvatarStyles(avatarElement);
    setupAvatarProtection(headerButton, user);
    console.log("Avatar başarıyla güncellendi!");

  } catch (err) {
    console.error("Avatar güncelleme hatası:", err);
  }
}

async function ensureUserData() {
  const now = Date.now();
  if (!userCache.data || now - userCache.timestamp > userCache.cacheDuration) {
    console.log("Kullanıcı verileri yenileniyor...");
    userCache.data = await makeApiRequest("/Users/Me");
    userCache.timestamp = now;
  }
  return userCache.data;
}

async function createAvatar(user) {
  const config = getConfig();
  const cacheKey = `avatar-${user.Id}-${config.avatarStyle}-${config.dicebearStyle || ''}`;

  console.log(`Avatar önbellek anahtarı: ${cacheKey}`);
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    console.log("Önbellekten avatar yükleniyor...");
    const div = document.createElement('div');
    div.innerHTML = cached;
    return div.firstChild;
  }

  console.log("Yeni avatar oluşturuluyor...");
  const avatar = config.avatarStyle === 'dicebear' && config.dicebearStyle
    ? await createDicebearAvatar(user)
    : createInitialsAvatar(user);

  if (avatar) {
    console.log("Avatar önbelleğe alınıyor...");
    sessionStorage.setItem(cacheKey, avatar.outerHTML);
  }

  return avatar;
}

async function createDicebearAvatar(user) {
  try {
    console.log("DiceBear avatarı oluşturuluyor...");
    const config = getConfig();
    const style = config.dicebearStyle || 'initials';
    const seed = encodeURIComponent(user.Name || user.Id);
    const size = Math.max(config.avatarWidth, config.avatarHeight, 64);
    const scale = parseFloat(getConfig().avatarScale) || 1;

    const params = new URLSearchParams();
    params.append('seed', seed);
    params.append('size', size.toString());

    if (config.dicebearBackgroundEnabled && config.dicebearBackgroundColor && config.dicebearBackgroundColor !== 'transparent') {
      params.append('backgroundColor', config.dicebearBackgroundColor.replace('#', ''));
    }

    params.append('radius', config.dicebearRadius || 50);

    const url = `${DICEBEAR_OPTIONS.baseUrl}/${style}/svg?${params.toString()}`;
    console.log(`DiceBear URL: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DiceBear hatası: ${response.status}`);
    }

    const svg = await response.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');

    if (svgDoc.querySelector('parsererror')) {
      throw new Error('Geçersiz SVG verisi alındı');
    }

    const svgElement = svgDoc.documentElement;
    svgElement.setAttribute('width', `${config.avatarWidth}px`);
    svgElement.setAttribute('height', `${config.avatarHeight}px`);
    svgElement.style.transformOrigin = 'center';
    svgElement.style.borderRadius = '50%';
    svgElement.style.transform = `scale(${scale})`;

    if (config.dicebearBackgroundEnabled && config.dicebearBackgroundColor && config.dicebearBackgroundColor !== 'transparent') {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "100%");
      rect.setAttribute("height", "100%");
      rect.setAttribute("fill", config.dicebearBackgroundColor);
      svgElement.insertBefore(rect, svgElement.firstChild);
    } else {
      svgElement.style.backgroundColor = 'transparent';
    }

    console.log("DiceBear avatarı başarıyla oluşturuldu");
    return svgElement;
  } catch (error) {
    console.error('DiceBear avatar oluşturma hatası, baş harflerle avatar oluşturuluyor:', error);
    return createInitialsAvatar(user);
  }
}

function createInitialsAvatar(user) {
  console.log("Baş harflerle avatar oluşturuluyor...");
  const initials = getInitials(user.Name);
  const initialsDiv = document.createElement("div");
  initialsDiv.textContent = initials;
  initialsDiv.dataset.userId = user.Id;

  const config = getConfig();
  const scale = config.avatarScale || 1;
  const avatarColor = getAvatarColor(user.Id);

  const style = {
    width: `${config.avatarWidth}px`,
    height: `${config.avatarHeight}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'center',
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: `${config.avatarFontSize}px`,
    fontFamily: config.avatarFontFamily,
    pointerEvents: "none",
    textShadow: config.avatarTextShadow,
    fontFeatureSettings: '"kern" 1, "liga" 1',
    fontKerning: 'normal',
    textRendering: 'optimizeLegibility',
    opacity: '0',
    transition: 'opacity 0.3s ease'
  };

  if (config.avatarColorMethod === 'gradient') {
    style.background = avatarColor;
    style.color = '#FFFFFF';
    style.backgroundClip = 'text';
    style.webkitBackgroundClip = 'text';
    style.webkitTextFillColor = 'transparent';
  } else {
    style.color = avatarColor;
    style.backgroundColor = "transparent";
  }

  Object.assign(initialsDiv.style, style);
  return initialsDiv;
}

function applyAvatarStyles(element) {
  if (!element) return;

  element.style.opacity = '0';
  element.style.transition = 'opacity 0.3s ease';

  requestAnimationFrame(() => {
    element.style.opacity = '1';
    element.classList.add('loaded');
    console.log("Avatar görsel efekti uygulandı");
  });
}

function updateAvatarElement(avatarElement, user) {
  const config = getConfig();
  if (config.avatarStyle === 'dicebear' && avatarElement.tagName === 'svg') {
    const currentBg = avatarElement.querySelector('rect')?.getAttribute('fill') || 'transparent';
    const newBg = config.dicebearBackgroundColor || 'transparent';

    if (currentBg === newBg.replace('#', '')) {
      console.log("Dicebear avatarı ve arkaplanı aynı, güncelleme atlanıyor.");
      return;
    }
  }

  if (config.avatarStyle === 'dicebear' && avatarElement.tagName === 'svg') {
    console.log("Dicebear avatarı zaten mevcut, güncelleme atlanıyor.");
    return;
  }

  const newInitials = getInitials(user?.Name) || "?";
  if (avatarElement.textContent === newInitials) {
    console.log("Avatar zaten güncel, yeniden çizilmeye gerek yok.");
    return;
  }

  console.log("Avatar elementi güncelleniyor...");
  avatarElement.textContent = newInitials;

  Object.assign(avatarElement.style, {
    width: `${config.avatarWidth}px`,
    height: `${config.avatarHeight}px`,
    fontSize: `${config.avatarFontSize}px`,
    color: getAvatarColor(user.Id),
    textShadow: config.avatarTextShadow
  });

  applyAvatarStyles(avatarElement);
}


export function cleanAvatars(container = document) {
  console.log("Eski avatarlar temizleniyor...");
  const elementsToRemove = container.querySelectorAll(`
    .material-icons.person,
    .user-avatar,
    .user-avatar-initials,
    .custom-user-avatar
  `);
  elementsToRemove.forEach(el => el.remove());
  currentAvatarElement = null;
  if (customAvatarAdded && container instanceof HTMLElement) {
    container.style.backgroundImage = 'none';
  }
}

function getAvatarColor(userId) {
  const config = getConfig();

  switch(config.avatarColorMethod) {
    case 'random':
      return getRandomColor(userId);
    case 'solid':
      return config.avatarSolidColor || '#FF4081';
    case 'gradient':
      return config.avatarGradient || 'linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 100%)';
    case 'dynamic':
    default:
      return getDynamicColor(userId);
  }
}

function hasJellyfinAvatar(headerButton) {
  if (headerButton.style.backgroundImage &&
      headerButton.style.backgroundImage !== 'none' &&
      headerButton.style.backgroundImage.includes('/Users/') &&
      headerButton.style.backgroundImage.includes('/Images/Primary')) {
    return true;
  }

  if (headerButton.classList.contains('headerUserButtonRound')) {
    return true;
  }

  const materialIcon = headerButton.querySelector('.material-icons.person');
  if (materialIcon) {
    return false;
  }

  return false;
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';

  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    return (words[0].slice(0, 2)).toUpperCase();
  }
}

async function waitForElement(selector, attempts = 0) {
  const el = document.querySelector(selector);
  if (el) return el;
  if (attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return waitForElement(selector, attempts + 1);
  }
  return null;
}

function setupAvatarProtection(headerButton, user) {
  console.log("Avatar koruma sistemi başlatılıyor...");

  if (avatarObserver) {
    avatarObserver.disconnect();
    console.log("Eski gözlemci kapatıldı");
  }

  avatarObserver = new MutationObserver((mutations) => {
    const currentAvatar = headerButton.querySelector(".custom-user-avatar");
    const materialIcon = headerButton.querySelector(".material-icons.person");

    if (!currentAvatar || materialIcon) {
      console.log("Avatar değişikliği tespit edildi, yeniden oluşturuluyor...");
      avatarObserver.disconnect();
      updateHeaderUserAvatar();
    }
  });

  avatarObserver.observe(headerButton, {
    childList: true,
    subtree: true
  });

  console.log("Avatar gözlemcisi aktif edildi");
}

function getDynamicColor(userId) {
  if (!userId) return '#FF4081';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 90;
  const lightness = 45;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getRandomColor(userId) {
  const colors = [
    '#FF1744', '#F50057', '#D500F9', '#651FFF', '#3D5AFE',
    '#2979FF', '#00B0FF', '#00E5FF', '#1DE9B6', '#00E676',
    '#76FF03', '#C6FF00', '#FFEA00', '#FFC400', '#FF9100',
    '#FF3D00', '#8D6E63', '#5D4037', '#795548', '#9E9D24',
    '#607D8B', '#4DB6AC', '#BA68C8', '#F06292', '#A1887F',
    '#EF5350', '#AB47BC', '#7E57C2', '#5C6BC0', '#42A5F5',
    '#29B6F6', '#26C6DA', '#26A69A', '#9CCC65', '#D4E157',
    '#FFB300', '#F4511E', '#6D4C41', '#789262', '#AEEA00',
    '#00ACC1', '#00897B', '#43A047', '#9C27B0', '#AD1457',
    '#C2185B', '#7B1FA2', '#512DA8', '#303F9F', '#1976D2'
  ];

  if (!userId) return colors[0];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export function initAvatarSystem() {
  console.log("Avatar sistemi başlatılıyor...");

  const style = document.createElement('style');
  style.textContent = `
    .custom-user-avatar {
      opacity: 0;
      transition: opacity 0.3s ease;
      font-synthesis: none;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      border-radius: 50%;
      overflow: hidden;
    }
    .custom-user-avatar.loaded {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
  updateHeaderUserAvatar();
  let retryCount = 0;
  const maxRetries = 5;
  const applyButton = document.getElementById('applyDicebearAvatar');
  if (applyButton) {
    applyButton.addEventListener('click', async () => {
      console.log("DiceBear avatar manuel olarak güncelleniyor...");
      clearAvatarCache();
      await updateHeaderUserAvatar();
    });
  }
  const tryOnce = async () => {
  try {
    await updateHeaderUserAvatar();
  } catch (err) {
    retryCount++;
    if (retryCount < maxRetries) {
      setTimeout(tryOnce, 1000);
    } else {
      console.error("Avatar güncellenemedi, maksimum deneme sayısına ulaşıldı.");
    }
  }
};

tryOnce();


  console.log("Avatar sistemi başarıyla başlatıldı");
  return () => {
    clearInterval(intervalId);
    if (avatarObserver) {
      avatarObserver.disconnect();
    }
  };
}

export function updateAvatarStyles() {
  console.log("Avatar stilleri güncelleniyor...");
  const config = getConfig();
  const avatars = document.querySelectorAll('.custom-user-avatar');

  avatars.forEach(avatar => {
    const scale = parseFloat(config.avatarScale) || 1;
    const currentScale = parseFloat(avatar.style.transform?.replace('scale(', '')?.replace(')', '')) || 1;
    if (Math.abs(currentScale - scale) < 0.05) return;

    if (config.avatarStyle === 'dicebear' && avatar.tagName === 'svg') {
      Object.assign(avatar.style, {
        transform: `scale(${scale})`,
        transformOrigin: 'center'
      });
    } else {
      avatar.style.transform = `scale(${scale})`;
      avatar.style.transformOrigin = 'center';
    }
  });
}

export function clearAvatarCache() {
  console.log("Avatar önbelleği temizleniyor...");
  userCache.data = null;
  userCache.timestamp = 0;
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('avatar-') && key.includes('dicebear')) {
      sessionStorage.removeItem(key);
    }
  });

  console.log("Avatar önbelleği başarıyla temizlendi");
}
