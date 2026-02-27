/**
 * event-bus.js — Pub/sub event system for Planta3D
 */
const EventBus = (() => {
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => off(event, callback);
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => {
      try { cb(data); } catch (e) { console.error(`EventBus error [${event}]:`, e); }
    });
  }

  function once(event, callback) {
    const wrapper = (data) => {
      off(event, wrapper);
      callback(data);
    };
    on(event, wrapper);
    return () => off(event, wrapper);
  }

  function clear(event) {
    if (event) {
      delete listeners[event];
    } else {
      Object.keys(listeners).forEach(k => delete listeners[k]);
    }
  }

  return { on, off, emit, once, clear };
})();
