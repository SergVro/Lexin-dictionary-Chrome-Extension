/**
 * Animation utilities using requestAnimationFrame
 */

/**
 * Fade out animation with callback
 * @param element Element to fade out
 * @param duration Duration in milliseconds (default: 400ms)
 * @param callback Callback function to execute after animation completes
 */
export function fadeOut(element: HTMLElement | null, duration: number = 400, callback?: () => void): void {
    if (!element) {
        if (callback) {callback();}
        return;
    }

    const startOpacity = parseFloat(window.getComputedStyle(element).opacity) || 1;
    const startTime = performance.now();

    function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentOpacity = startOpacity * (1 - easeProgress);
        
        element.style.opacity = currentOpacity.toString();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.style.display = "none";
            element.style.opacity = "";
            if (callback) {callback();}
        }
    }

    requestAnimationFrame(animate);
}

/**
 * Fade in animation
 * @param element Element to fade in
 * @param duration Duration in milliseconds (default: 400ms)
 * @param callback Callback function to execute after animation completes
 */
export function fadeIn(element: HTMLElement | null, duration: number = 400, callback?: () => void): void {
    if (!element) {
        if (callback) {callback();}
        return;
    }

    element.style.display = "";
    const startOpacity = parseFloat(window.getComputedStyle(element).opacity) || 0;
    const targetOpacity = 1;
    const opacityDiff = targetOpacity - startOpacity;
    const startTime = performance.now();

    function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentOpacity = startOpacity + opacityDiff * easeProgress;
        
        element.style.opacity = currentOpacity.toString();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.style.opacity = "";
            if (callback) {callback();}
        }
    }

    requestAnimationFrame(animate);
}
