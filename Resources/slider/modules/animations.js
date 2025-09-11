import { getConfig } from './config.js';

const animationStyles = `

@keyframes slideInFromTop {
    0% { transform: translateY(-100%); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

@keyframes eye {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1) rotate(-3deg);
  }
}

@keyframes slideInFromBottom {
    0% { transform: translateY(100%); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

@keyframes rotateIn {
    0% { transform: rotate(-180deg) scale(0); opacity: 0; }
    100% { transform: rotate(0deg) scale(1); opacity: 1; }
}

@keyframes flipInX {
    0% { transform: perspective(400px) rotateX(90deg); opacity: 0; }
    100% { transform: perspective(400px) rotateX(0deg); opacity: 1; }
}

@keyframes flipInY {
    0% { transform: perspective(400px) rotateY(90deg); opacity: 0; }
    100% { transform: perspective(400px) rotateY(0deg); opacity: 1; }
}

@keyframes zoomOutIn {
    0% { transform: scale(1.5); opacity: 0; }
    50% { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
}

@keyframes swirlIn {
    0% {
        transform: rotate(-540deg) scale(0);
        opacity: 0;
    }
    100% {
        transform: rotate(0deg) scale(1);
        opacity: 1;
    }
}

@keyframes foldIn {
    0% {
        transform: scaleX(0) scaleY(0);
        opacity: 0;
    }
    100% {
        transform: scaleX(1) scaleY(1);
        opacity: 1;
    }
}

@keyframes newspaperIn {
    0% {
        transform: scale(0) rotate(720deg);
        opacity: 0;
    }
    100% {
        transform: scale(1) rotate(0deg);
        opacity: 1;
    }
}

@keyframes jelly {
    0%, 100% { transform: scale(1, 1); }
    25% { transform: scale(0.9, 1.1); }
    50% { transform: scale(1.1, 0.9); }
    75% { transform: scale(0.95, 1.05); }
}

@keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }

    @keyframes shake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        50% { transform: translateX(4px); }
        75% { transform: translateX(-2px); }
        100% { transform: translateX(0); }
    }

    @keyframes fadeZoomIn {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    @keyframes diagonalSlideIn {
        from {
            transform: translate(-100%, -100%) scale(0.5);
            opacity: 0;
        }
        to {
            transform: translate(0, 0) scale(1);
            opacity: 1;
        }
    }

    .slide {
        transform-style: preserve-3d;
        perspective: 1000px;
        backface-visibility: hidden;
    }

    .poster-dot {
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .poster-dot.active {
        position: relative;
        z-index: 10;
    }

    .poster-dot img {
        transition: all 0.3s ease;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .poster-dot.active.color-animation img {
        filter: brightness(1.2) saturate(1.5) !important;
    }

    .poster-dot.color-animation img {
        filter: brightness(1) saturate(1);
        transition: filter 0.5s ease;
    }

    .poster-dot.scale-animation {
        transform: scale(1);
        transition: transform 0.3s ease;
    }

    .poster-dot.scale-animation.active {
        transform: scale(1.1);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
    }

    .poster-dot.bounce-animation.active {
        animation: bounce 0.5s;
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
    }

    .poster-dot.rotate-animation {
        transform: rotate(0deg);
        transition: transform 0.3s ease;
    }

    .poster-dot.rotate-animation.active {
        transform: rotate(5deg);
    }

    .poster-dot.float-animation {
        transform: translateY(0);
        transition: transform 0.3s ease;
    }

    .poster-dot.float-animation.active {
        transform: translateY(-10px);
    }

    .poster-dot.pulse-animation.active {
        animation: pulse 0.8s ease-in-out;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }

    .poster-dot.tilt-animation {
        transform: rotate(0deg);
        transition: transform 0.4s ease;
    }

    .poster-dot.tilt-animation.active {
        transform: rotate(-5deg);
    }

    .poster-dot.shake-animation.active {
        animation: shake 0.4s ease;
        box-shadow: 0 0 5px rgba(255, 255, 255, 0.4);
    }

    .slide.fadezoom-animation {
        animation: fadeZoomIn 0.6s ease forwards;
    }

    .slide.diagonal-animation {
        animation: diagonalSlideIn 0.7s ease forwards;
    }

    .rubberBand {
        animation: rubberBand 0.8s;
    }

    .swing {
        transform-origin: top center;
        animation: swing 1s;
    }

    .flip {
        backface-visibility: visible;
        animation: flip 1s;
    }

    .flash {
        animation: flash 1s;
    }
    .wobble {
        animation: wobble 1s;
    }

    .glow {
        animation: glow 2s infinite;
    }

    .jelly-animation {
    animation: jelly 0.6s ease;
}

.eye-animation {
    animation: jelly 0.6s ease;
}


    @keyframes glow {
        0% { box-shadow: 0 0 5px rgba(255,255,255,0.5); }
        50% { box-shadow: 0 0 20px rgba(255,255,255,0.9); }
        100% { box-shadow: 0 0 5px rgba(255,255,255,0.5); }
    }

    @keyframes rubberBand {
        0% { transform: scale(1); }
        30% { transform: scaleX(1.25) scaleY(0.75); }
        40% { transform: scaleX(0.75) scaleY(1.25); }
        60% { transform: scaleX(1.15) scaleY(0.85); }
        100% { transform: scale(1); }
    }

    @keyframes swing {
        20% { transform: rotate(15deg); }
        40% { transform: rotate(-10deg); }
        60% { transform: rotate(5deg); }
        80% { transform: rotate(-5deg); }
        100% { transform: rotate(0deg); }
    }

    @keyframes flip {
        0% { transform: perspective(200px) rotateY(0); }
       50% { transform: perspective(200px) rotateY(180deg); }
        100% { transform: perspective(200px) rotateY(360deg); }
    }

@keyframes flash {
    0%, 50%, 100% { opacity: 1; }
    25%, 75% { opacity: 0.3; }
}

@keyframes wobble {
    0% { transform: translateX(0%); }
    15% { transform: translateX(-25%) rotate(-5deg); }
    30% { transform: translateX(20%) rotate(3deg); }
    45% { transform: translateX(-15%) rotate(-3deg); }
    60% { transform: translateX(10%) rotate(2deg); }
    75% { transform: translateX(-5%) rotate(-1deg); }
    100% { transform: translateX(0%); }
}
`;

    const existingStyle = document.getElementById('slide-animation-styles');
        if (existingStyle) {
        existingStyle.remove();
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'slide-animation-styles';
    styleElement.innerHTML = animationStyles;
    document.head.appendChild(styleElement);

export function applySlideAnimation(currentSlide, newSlide, direction) {
    if (!currentSlide || !newSlide) return;

    const config = getConfig();
    if (!config.enableSlideAnimations) {
        newSlide.style.display = "block";
        newSlide.style.opacity = "1";
        return;
    }

    const duration = config.slideAnimationDuration || 500;
    const transitionType = config.slideTransitionType || 'fade';
    const same = currentSlide === newSlide;

    newSlide.style.display = "block";
    newSlide.style.zIndex = "2";
    newSlide.style.transition = `all ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`;
    if (!same) {
      currentSlide.style.transition = `all ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`;
      currentSlide.style.zIndex = "1";
    }

    if (same) {
      newSlide.style.opacity = "0";
      requestAnimationFrame(() => { newSlide.style.opacity = "1"; });
      setTimeout(() => {
        newSlide.style.transition = "";
        newSlide.style.opacity = "1";
      }, duration);
      return;
    }

    function cleanupStyles() {
        if (currentSlide) {
            currentSlide.style.transition = "";
            currentSlide.style.transform = "";
            currentSlide.style.opacity = "0";
            currentSlide.style.filter = "";
            currentSlide.style.clipPath = "";
            currentSlide.style.borderRadius = "";
            currentSlide.style.zIndex = "";
            currentSlide.style.display = "none";
            currentSlide.style.backfaceVisibility = "";
        }
        if (newSlide) {
            newSlide.style.transition = "";
            newSlide.style.transform = "";
            newSlide.style.opacity = "1";
            newSlide.style.filter = "";
            newSlide.style.clipPath = "";
            newSlide.style.borderRadius = "";
            newSlide.style.zIndex = "";
            newSlide.style.backfaceVisibility = "";
        }
    }

    switch (transitionType) {
        case 'fade':
            currentSlide.style.opacity = "0";
            newSlide.style.opacity = "0";
            requestAnimationFrame(() => {
                newSlide.style.opacity = "1";
            });
            break;

        case 'slideTop':
            currentSlide.style.transform = "translateY(0)";
            currentSlide.style.opacity = "1";
            newSlide.style.transform = "translateY(-100%)";
            newSlide.style.opacity = "0";

            requestAnimationFrame(() => {
                newSlide.style.transform = "translateY(0)";
                newSlide.style.opacity = "1";
            });
            break;

        case 'slideBottom':
            currentSlide.style.transform = "translateY(0)";
            currentSlide.style.opacity = "1";
            newSlide.style.transform = "translateY(100%)";
            newSlide.style.opacity = "0";

            requestAnimationFrame(() => {
                newSlide.style.transform = "translateY(0)";
                newSlide.style.opacity = "1";
            });
            break;

        case 'rotateIn':
            currentSlide.style.transform = "rotate(0deg) scale(1)";
            currentSlide.style.opacity = "1";
            newSlide.style.transform = "rotate(-180deg) scale(0)";
            newSlide.style.opacity = "0";

            requestAnimationFrame(() => {
                newSlide.style.transform = "rotate(0deg) scale(1)";
                newSlide.style.opacity = "1";
            });
            break;

        case 'flipInX':
            currentSlide.style.transform = "perspective(400px) rotateX(0deg)";
            currentSlide.style.opacity = "1";
            newSlide.style.transform = "perspective(400px) rotateX(90deg)";
            newSlide.style.opacity = "0";
            newSlide.style.backfaceVisibility = "hidden";

            requestAnimationFrame(() => {
                newSlide.style.transform = "perspective(400px) rotateX(0deg)";
                newSlide.style.opacity = "1";
                newSlide.style.backfaceVisibility = "visible";
            });
            break;

        case 'flipInY':
            currentSlide.style.transform = "perspective(400px) rotateY(0deg)";
            currentSlide.style.opacity = "1";
            newSlide.style.transform = "perspective(400px) rotateY(90deg)";
            newSlide.style.opacity = "0";
            newSlide.style.backfaceVisibility = "hidden";

            requestAnimationFrame(() => {
                newSlide.style.transform = "perspective(400px) rotateY(0deg)";
                newSlide.style.opacity = "1";
                newSlide.style.backfaceVisibility = "visible";
            });
            break;

        case 'jelly':
            currentSlide.style.animation = "none";
            newSlide.style.animation = "none";
            setTimeout(() => {
                if (newSlide) {
                    newSlide.style.animation = "jelly 0.6s ease";
                }
            }, 20);
                setTimeout(() => {
                    if (newSlide) {
                        newSlide.style.animation = "";
                        }
                    }, 620);
            break;

        case 'flip':
            currentSlide.style.transform = `rotateY(${direction > 0 ? -180 : 180}deg)`;
            currentSlide.style.opacity = "0";
            newSlide.style.transform = `rotateY(${direction > 0 ? 180 : -180}deg)`;
            newSlide.style.opacity = "0";

            requestAnimationFrame(() => {
                newSlide.style.transform = "rotateY(0deg)";
                newSlide.style.opacity = "1";
            });
            break;

            case 'eye':
    currentSlide.style.animation = "none";
    newSlide.style.animationName = "none";

    requestAnimationFrame(() => {
        newSlide.style.animationName = "eye";
        newSlide.style.animationDuration = "0.6s";
        newSlide.style.animationTimingFunction = "ease";
    });
    setTimeout(() => {
        newSlide.style.animationName = "";
        newSlide.style.animationDuration = "";
        newSlide.style.animationTimingFunction = "";
    }, 600);
    break;

        case 'glitch':
            currentSlide.style.filter = "blur(10px)";
            currentSlide.style.opacity = "0";
            newSlide.style.filter = "blur(10px)";
            newSlide.style.opacity = "0";
            newSlide.style.clipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";

            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    if (newSlide) {
                        newSlide.style.clipPath = `polygon(
                            0 ${Math.random() * 100}%,
                            100% ${Math.random() * 100}%,
                            100% ${Math.random() * 100}%,
                            0 ${Math.random() * 100}%
                        )`;
                    }
                }, i * 50);
            }

            setTimeout(() => {
                if (newSlide) {
                    newSlide.style.filter = "blur(0)";
                    newSlide.style.opacity = "1";
                    newSlide.style.clipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
                }
            }, duration - 100);
            break;

        case 'morph':
            currentSlide.style.borderRadius = "50%";
            currentSlide.style.transform = "scale(0.1) rotate(180deg)";
            currentSlide.style.opacity = "0";
            newSlide.style.borderRadius = "50%";
            newSlide.style.transform = "scale(0.1) rotate(-180deg)";
            newSlide.style.opacity = "0";

            requestAnimationFrame(() => {
                newSlide.style.borderRadius = "0";
                newSlide.style.transform = "scale(1) rotate(0deg)";
                newSlide.style.opacity = "1";
            });
            break;

        case 'cube':
            currentSlide.style.transform = `translateZ(-200px) rotateY(${direction > 0 ? -90 : 90}deg)`;
            currentSlide.style.opacity = "0";

            newSlide.style.transform = `translateZ(-200px) rotateY(${direction > 0 ? 90 : -90}deg)`;
            newSlide.style.opacity = "0";
            newSlide.style.backfaceVisibility = "hidden";

            requestAnimationFrame(() => {
                if (newSlide) {
                    newSlide.style.transform = "translateZ(0) rotateY(0deg)";
                    newSlide.style.opacity = "1";
                    newSlide.style.backfaceVisibility = "visible";
                }
            });
            break;

        case 'zoom':
            currentSlide.style.transform = "scale(1.5)";
            currentSlide.style.opacity = "0";
            newSlide.style.transform = "scale(0.5)";
            newSlide.style.opacity = "0";

            requestAnimationFrame(() => {
                if (newSlide) {
                    newSlide.style.transform = "scale(1)";
                    newSlide.style.opacity = "1";
                }
            });
            break;

        case 'slide3d':
            currentSlide.style.transform = `translateX(${direction > 0 ? -100 : 100}%) translateZ(-100px) rotateY(30deg)`;
            currentSlide.style.opacity = "0";
            newSlide.style.transform = `translateX(${direction > 0 ? 100 : -100}%) translateZ(-100px) rotateY(-30deg)`;
            newSlide.style.opacity = "0";

            requestAnimationFrame(() => {
                if (newSlide) {
                    newSlide.style.transform = "translateX(0) translateZ(0) rotateY(0deg)";
                    newSlide.style.opacity = "1";
                }
            });
            break;

        case 'slide':
            currentSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;
            newSlide.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`;

            currentSlide.style.transform = `translateX(${direction > 0 ? '-100%' : '100%'})`;
            currentSlide.style.opacity = '0';

            newSlide.style.transform = `translateX(${direction > 0 ? '100%' : '-100%'})`;
            newSlide.style.opacity = '1';

            setTimeout(() => {
                newSlide.style.transform = 'translateX(0)';
            }, 20);
            break;

        case 'diagonal':
            currentSlide.style.transform = `translate(${direction > 0 ? "-100%" : "100%"}, -100%)`;
            currentSlide.style.opacity = "0";
            newSlide.style.transform = `translate(${direction > 0 ? "100%" : "-100%"}, 100%)`;
            newSlide.style.opacity = "0";

            requestAnimationFrame(() => {
                newSlide.style.transform = "translate(0, 0)";
                newSlide.style.opacity = "1";
            });
            break;

        case 'fadezoom':
            currentSlide.style.opacity = "1";
            currentSlide.style.transform = "scale(1)";
            newSlide.style.opacity = "0";
            newSlide.style.transform = "scale(1.5)";

            requestAnimationFrame(() => {
                newSlide.style.opacity = "1";
                newSlide.style.transform = "scale(1)";
            });
            break;

        case 'parallax':
            const slideDuration = config.slideAnimationDuration || 700;
            const easing = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

            currentSlide.style.transition = `transform ${slideDuration}ms ${easing}, opacity ${slideDuration}ms ease`;
            newSlide.style.transition = `transform ${slideDuration}ms ${easing}, opacity ${slideDuration}ms ease`;

            currentSlide.style.transform = `translateX(${direction > 0 ? '-30%' : '30%'})`;
            currentSlide.style.opacity = "0";

            newSlide.style.transform = `translateX(${direction > 0 ? '50%' : '-50%'})`;
            newSlide.style.opacity = "0.5";
            newSlide.style.zIndex = "5";

            void newSlide.offsetWidth;

            requestAnimationFrame(() => {
                newSlide.style.transform = "translateX(0)";
                newSlide.style.opacity = "1";
            });

            setTimeout(() => {
                currentSlide.style.transition = "";
                currentSlide.style.transform = "";
                currentSlide.style.opacity = "";
                newSlide.style.transition = "";
                newSlide.style.zIndex = "";
            }, slideDuration + 100);
            break;

        case 'blur-fade':
            currentSlide.style.transition = `filter ${duration}ms ease, opacity ${duration}ms ease`;
            newSlide.style.transition = `filter ${duration}ms ease, opacity ${duration}ms ease`;

            currentSlide.style.filter = 'blur(5px)';
            currentSlide.style.opacity = '0';
            newSlide.style.filter = 'blur(5px)';
            newSlide.style.opacity = '0';

            requestAnimationFrame(() => {
                newSlide.style.filter = 'blur(0)';
                newSlide.style.opacity = '1';
            });
            break;

        default:
            if (newSlide) {
                newSlide.style.opacity = "1";
            }
    }
    setTimeout(cleanupStyles, duration);
}


export function applyDotPosterAnimation(dot, isActive) {
    const config = getConfig();
    if (!config.enableDotPosterAnimations || !config.dotPosterMode) return;

    const duration = config.dotPosterAnimationDuration;
    const transitionType = config.dotPosterTransitionType;

    dot.classList.remove(
        'scale-animation',
        'bounce-animation',
        'rotate-animation',
        'color-animation',
        'float-animation',
        'pulse-animation',
        'tilt-animation',
        'shake-animation'
    );

    dot.classList.add(`${transitionType}-animation`);

    dot.style.transition = `all ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;

    if (isActive && ['scale', 'bounce', 'rotate', 'float', 'flip', 'flash', 'wobble', 'rubberBand', 'swing', 'glow'].includes(transitionType)) {
        dot.style.animation = 'none';
        dot.offsetHeight;
        dot.style.animation = '';
    }

    switch (transitionType) {
        case 'scale':
            dot.style.transform = isActive ? "scale(1.1)" : "scale(1)";
            dot.style.zIndex = isActive ? "10" : "";
            dot.style.boxShadow = isActive ? "0 0 20px rgba(255, 255, 255, 0.5)" : "";
            break;
        case 'bounce':
            dot.style.animation = isActive ? `bounce ${duration}ms` : "";
            dot.style.boxShadow = isActive ? "0 0 15px rgba(255, 255, 255, 0.7)" : "";
            break;
        case 'rotate':
            dot.style.transform = isActive ? "rotate(5deg)" : "rotate(0deg)";
            break;
        case 'color':
            const image = dot.querySelector('img');
            if (image) {
                image.style.filter = isActive
                    ? "brightness(1.2) saturate(1.5)"
                    : "brightness(1) saturate(1)";
            }
            break;
        case 'float':
            dot.style.transform = isActive
                ? "translateY(-10px)"
                : "translateY(0)";
            break;
        case 'pulse':
        case 'tilt':
        case 'shake':
            break;

        case 'glow':
            dot.style.animation = isActive ? `glow ${duration}ms infinite` : "";
            break;

        case 'rubberBand':
            if (isActive) {
                dot.style.animation = `rubberBand ${duration}ms`;
                setTimeout(() => {
                    dot.style.animation = "";
                }, duration);
            }
            break;

        case 'swing':
            if (isActive) {
                dot.style.transformOrigin = "top center";
                dot.style.animation = `swing ${duration}ms`;
                setTimeout(() => {
                    dot.style.animation = "";
                }, duration);
            }
            break;

        case 'flip':
            if (isActive) {
                dot.style.animation = `flip ${duration}ms`;
                setTimeout(() => {
                    dot.style.animation = "";
                }, duration);
            }
            break;

        case 'flash':
            if (isActive) {
                dot.style.animation = `flash ${duration}ms`;
                setTimeout(() => {
                    dot.style.animation = "";
                }, duration);
            }
            break;

        case 'wobble':
            if (isActive) {
                dot.style.animation = `wobble ${duration}ms`;
                setTimeout(() => {
                    dot.style.animation = "";
                }, duration);
            }
            break;
    }
}

export {
  styleElement,
  animationStyles,
  existingStyle
};
