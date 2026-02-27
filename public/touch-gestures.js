/**
 * touch-gestures.js — Touch gesture support for mobile devices
 * Handles pinch-zoom, two-finger pan, tap, double-tap, and long-press
 */
const TouchGestures = (() => {
  let canvas = null;
  let isActive = false;
  let isMobile = false;

  // Touch state
  let touches = [];
  let lastTouchEnd = 0;
  let lastTapTime = 0;
  let lastTapPos = null;
  let longPressTimer = null;
  let initialPinchDist = 0;
  let initialPinchCenter = null;
  let isPinching = false;
  let isSingleTouch = false;
  let touchStartPos = null;
  let touchMoved = false;

  const LONG_PRESS_MS = 500;
  const DOUBLE_TAP_MS = 300;
  const DOUBLE_TAP_DIST = 30;
  const MOVE_THRESHOLD = 8;

  function init(canvasElement) {
    canvas = canvasElement;
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isMobile) return;

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    // Prevent default gestures on the canvas
    canvas.style.touchAction = 'none';

    isActive = true;
  }

  function onTouchStart(e) {
    e.preventDefault();
    touches = Array.from(e.touches);

    if (touches.length === 2) {
      // Start pinch
      isPinching = true;
      isSingleTouch = false;
      clearLongPress();
      initialPinchDist = getTouchDistance(touches[0], touches[1]);
      initialPinchCenter = getTouchCenter(touches[0], touches[1]);
      EventBus.emit('touch:pinchstart', {
        center: canvasPoint(initialPinchCenter),
        distance: initialPinchDist
      });
    } else if (touches.length === 1) {
      isSingleTouch = true;
      isPinching = false;
      touchMoved = false;
      touchStartPos = { x: touches[0].clientX, y: touches[0].clientY };

      // Start long press detection
      longPressTimer = setTimeout(() => {
        if (!touchMoved) {
          const pt = canvasPoint(touchStartPos);
          EventBus.emit('touch:longpress', { x: pt.x, y: pt.y, clientX: touchStartPos.x, clientY: touchStartPos.y });
          // Haptic feedback if available
          if (navigator.vibrate) navigator.vibrate(30);
        }
      }, LONG_PRESS_MS);
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    touches = Array.from(e.touches);

    if (touches.length === 2 && isPinching) {
      const dist = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);
      const scale = dist / initialPinchDist;

      EventBus.emit('touch:pinch', {
        scale: scale,
        center: canvasPoint(center),
        delta: {
          x: center.x - initialPinchCenter.x,
          y: center.y - initialPinchCenter.y
        }
      });

      initialPinchDist = dist;
      initialPinchCenter = center;
    } else if (touches.length === 1 && isSingleTouch) {
      const dx = touches[0].clientX - touchStartPos.x;
      const dy = touches[0].clientY - touchStartPos.y;

      if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
        touchMoved = true;
        clearLongPress();
      }

      // Emit drag event
      if (touchMoved) {
        EventBus.emit('touch:drag', {
          x: touches[0].clientX,
          y: touches[0].clientY,
          deltaX: dx,
          deltaY: dy,
          point: canvasPoint({ x: touches[0].clientX, y: touches[0].clientY })
        });
      }
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    clearLongPress();

    const now = Date.now();
    const remainingTouches = Array.from(e.touches);

    if (isPinching && remainingTouches.length < 2) {
      isPinching = false;
      EventBus.emit('touch:pinchend', {});
    }

    if (isSingleTouch && remainingTouches.length === 0) {
      isSingleTouch = false;

      if (!touchMoved && touchStartPos) {
        const pt = canvasPoint(touchStartPos);

        // Check for double tap
        if (lastTapTime && (now - lastTapTime) < DOUBLE_TAP_MS && lastTapPos) {
          const tapDist = Math.hypot(pt.x - lastTapPos.x, pt.y - lastTapPos.y);
          if (tapDist < DOUBLE_TAP_DIST) {
            EventBus.emit('touch:doubletap', { x: pt.x, y: pt.y, clientX: touchStartPos.x, clientY: touchStartPos.y });
            lastTapTime = 0;
            lastTapPos = null;
            return;
          }
        }

        // Single tap
        lastTapTime = now;
        lastTapPos = pt;
        EventBus.emit('touch:tap', { x: pt.x, y: pt.y, clientX: touchStartPos.x, clientY: touchStartPos.y });
      }
    }

    touches = remainingTouches;
  }

  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function getTouchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTouchCenter(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  }

  function canvasPoint(pt) {
    if (!canvas) return pt;
    const rect = canvas.getBoundingClientRect();
    return {
      x: pt.x - rect.left,
      y: pt.y - rect.top
    };
  }

  function isMobileDevice() {
    return isMobile;
  }

  function destroy() {
    if (canvas) {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    }
    isActive = false;
  }

  return { init, isMobileDevice, destroy };
})();
