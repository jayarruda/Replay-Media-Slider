import { makeApiRequest } from "./api.js";
import { getServerAddress, getConfig } from "./config.js";

const config = getConfig();
let customAvatarAdded = false;
let avatarObserver = null;
let currentAvatarElement = null;

export async function updateHeaderUserAvatar() {
  const config = getConfig?.();
  if (config && config.createAvatar === false) {
    cleanAvatars();
    return;
  }

  const headerButton = await waitForElement("button.headerUserButton");
  if (!headerButton) {
    console.warn("Header user button bulunamadı.");
    return;
  }

  try {
    const user = await makeApiRequest("/Users/Me");
    if (!user) {
      console.log("Kullanıcı bilgisi alınamadı.");
      return;
    }

    if (hasJellyfinAvatar(headerButton)) {
      if (customAvatarAdded) {
        cleanAvatars();
        customAvatarAdded = false;
      }
      return;
    }

    const existingCustomAvatar = headerButton.querySelector(".custom-user-avatar");
    if (existingCustomAvatar) {
      updateAvatarElement(existingCustomAvatar, user);
      return;
    }

    const avatarElement = createInitialsAvatar(user);
    if (!avatarElement) return;

    cleanAvatars(headerButton);
    avatarElement.classList.add("custom-user-avatar");
    headerButton.appendChild(avatarElement);
    currentAvatarElement = avatarElement;
    customAvatarAdded = true;
    setupAvatarProtection(headerButton, user);

  } catch (err) {
    console.error("Kullanıcı avatarı alınırken hata:", err);
  }
}

function updateAvatarElement(avatarElement, user) {
  const config = getConfig();
  const initials = getInitials(user?.Name) || "?";
  avatarElement.textContent = initials;

  Object.assign(avatarElement.style, {
    width: `${config.avatarWidth}px`,
    height: `${config.avatarHeight}px`,
    fontSize: `${config.avatarFontSize}px`,
    color: getAvatarColor(user.Id),
    textShadow: config.avatarTextShadow
  });
}

function cleanAvatars(container = document) {
  const elementsToRemove = container.querySelectorAll(`
    .material-icons.person,
    .user-avatar,
    .user-avatar-initials,
    .custom-user-avatar
  `);

  elementsToRemove.forEach(el => el.remove());
  currentAvatarElement = null;

  if (customAvatarAdded) {
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

function createInitialsAvatar(user) {
    const initials = getInitials(user.Name);
    const initialsDiv = document.createElement("div");
    initialsDiv.textContent = initials;
    initialsDiv.dataset.userId = user.Id;

    const config = getConfig();
    const avatarColor = getAvatarColor(user.Id);

    const style = {
        width: `${config.avatarWidth}px`,
        height: `${config.avatarHeight}px`,
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
        textRendering: 'optimizeLegibility'
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


function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';

  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    return (words[0].slice(0, 2)).toUpperCase();
  }
}


function cleanExistingAvatars(container) {
  const elementsToRemove = container.querySelectorAll(`
    .material-icons.person,
    .user-avatar,
    .user-avatar-initials,
    .custom-user-avatar
  `);

  elementsToRemove.forEach(el => el.remove());

  if (customAvatarAdded) {
    container.style.backgroundImage = 'none';
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
  const observer = new MutationObserver((mutations) => {
    const currentAvatar = headerButton.querySelector(".custom-user-avatar");
    const materialIcon = headerButton.querySelector(".material-icons.person");

    if (!currentAvatar || materialIcon) {
      observer.disconnect();
      cleanExistingAvatars(headerButton);
      const newAvatar = createInitialsAvatar(user);
      newAvatar.classList.add("custom-user-avatar");
      headerButton.appendChild(newAvatar);
      customAvatarAdded = true;
      setupAvatarProtection(headerButton, user);
    }
  });

  observer.observe(headerButton, {
    childList: true,
    subtree: true
  });
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

function createAvatarElement(user) {
  const avatarElement = document.createElement("div");
  const initials = getInitials(user?.Name) || "?";
  avatarElement.textContent = initials;

  const config = getConfig();
  const userColor = getAvatarColor(user?.Id) || "#888888";

  Object.assign(avatarElement.style, {
    width: `${config.avatarWidth}px`,
    height: `${config.avatarHeight}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: userColor,
    backgroundColor: "transparent",
    fontWeight: "bold",
    fontSize: `${config.avatarFontSize}px`,
    fontFamily: config.avatarFontFamily,
    pointerEvents: "none",
    textShadow: config.avatarTextShadow,
    fontFeatureSettings: '"kern" 1, "liga" 1',
    fontKerning: 'normal',
    textRendering: 'optimizeLegibility',
    opacity: "0",
    transition: "opacity 0.3s ease-in-out"
  });

  if (config.avatarColorMethod === 'gradient') {
    avatarElement.style.background = userColor;
    avatarElement.style.color = '#FFFFFF';
    avatarElement.style.backgroundClip = 'text';
    avatarElement.style.webkitBackgroundClip = 'text';
    avatarElement.style.webkitTextFillColor = 'transparent';
  }

  requestAnimationFrame(() => {
    avatarElement.style.opacity = "1";
  });

  avatarElement.classList.add("custom-user-avatar");
  return avatarElement;
}


export function initAvatarSystem() {
    const style = document.createElement('style');
    style.textContent = `
        .custom-user-avatar {
            font-synthesis: none;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
    `;
    document.head.appendChild(style);

    updateHeaderUserAvatar();
    const intervalId = setInterval(updateHeaderUserAvatar, 3000);
    return () => clearInterval(intervalId);
}

export function updateAvatarStyles() {
    const config = getConfig();
    const avatars = document.querySelectorAll('.custom-user-avatar');

    avatars.forEach(avatar => {
        const userId = avatar.dataset.userId || '';
        const avatarColor = getAvatarColor(userId);

        const style = {
            width: `${config.avatarWidth}px`,
            height: `${config.avatarHeight}px`,
            fontSize: `${config.avatarFontSize}px`,
            fontFamily: config.avatarFontFamily,
            textShadow: config.avatarTextShadow,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            fontFeatureSettings: '"kern" 1, "liga" 1',
            fontKerning: 'normal',
            textRendering: 'optimizeLegibility'
        };

        if (config.avatarColorMethod === 'gradient') {
            style.background = avatarColor;
            style.color = '#FFFFFF';
            style.backgroundClip = 'text';
            style.webkitBackgroundClip = 'text';
            style.webkitTextFillColor = 'transparent';
        } else {
            style.color = avatarColor;
            style.backgroundColor = 'transparent';
        }

        Object.assign(avatar.style, style);
    });
}
