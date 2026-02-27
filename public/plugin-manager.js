/**
 * plugin-manager.js — Plugin registration and lifecycle
 */
const PluginManager = (() => {
  const plugins = new Map();
  let api = null;

  function init(appApi) {
    api = appApi;
  }

  function register(plugin) {
    if (!plugin || !plugin.name) {
      console.error('Plugin must have a name');
      return false;
    }
    if (plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" already registered`);
      return false;
    }

    plugins.set(plugin.name, plugin);
    try {
      if (typeof plugin.init === 'function') {
        plugin.init(api);
      }
      console.log(`Plugin "${plugin.name}" v${plugin.version || '?'} registered`);
      EventBus.emit('plugin:registered', { name: plugin.name });
      return true;
    } catch (e) {
      console.error(`Plugin "${plugin.name}" init failed:`, e);
      plugins.delete(plugin.name);
      return false;
    }
  }

  function unregister(name) {
    const plugin = plugins.get(name);
    if (!plugin) return false;
    try {
      if (typeof plugin.destroy === 'function') {
        plugin.destroy();
      }
    } catch (e) {
      console.error(`Plugin "${name}" destroy failed:`, e);
    }
    plugins.delete(name);
    EventBus.emit('plugin:unregistered', { name });
    return true;
  }

  function getAPI() { return api; }
  function getPlugins() { return Array.from(plugins.values()); }

  return { init, register, unregister, getAPI, getPlugins };
})();
