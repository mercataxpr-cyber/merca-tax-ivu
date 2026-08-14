import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';

const DB_NAME = 'mercatax-ivu-r1';
const STORE_NAME = 'records';
const SETTINGS_PREFIX = 'mt_setting_';
let notificationPermission = 'default';

function openStructuredStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB unavailable'));
  });
}

async function structuredStore(mode, action) {
  const db = await openStructuredStore();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let request;
      try {
        request = action(store);
      } catch (error) {
        reject(error);
        return;
      }
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    });
  } finally {
    db.close();
  }
}

function normalizePermission(value) {
  if (value === 'granted') return 'granted';
  if (value === 'denied') return 'denied';
  return 'default';
}

const bridge = {
  platform: Capacitor.getPlatform(),
  isNative: Capacitor.isNativePlatform(),
  data: {
    get: (key) => structuredStore('readonly', (store) => store.get(String(key))),
    set: (key, value) => structuredStore('readwrite', (store) => store.put(value, String(key))),
    remove: (key) => structuredStore('readwrite', (store) => store.delete(String(key))),
    keys: () => structuredStore('readonly', (store) => store.getAllKeys()),
    clear: () => structuredStore('readwrite', (store) => store.clear())
  },
  settings: {
    get: async (key) => (await Preferences.get({ key: SETTINGS_PREFIX + key })).value,
    set: (key, value) => Preferences.set({ key: SETTINGS_PREFIX + key, value: String(value) }),
    remove: (key) => Preferences.remove({ key: SETTINGS_PREFIX + key })
  },
  notifications: {
    status: async () => {
      const status = await LocalNotifications.checkPermissions();
      notificationPermission = normalizePermission(status.display);
      return notificationPermission;
    },
    request: async () => {
      let status = await LocalNotifications.checkPermissions();
      if (normalizePermission(status.display) === 'default') status = await LocalNotifications.requestPermissions();
      notificationPermission = normalizePermission(status.display);
      return notificationPermission;
    },
    schedule: async ({ id, title, body, at }) => {
      const permission = await bridge.notifications.request();
      if (permission !== 'granted') return { ok: false, reason: 'permission-denied' };
      await LocalNotifications.schedule({
        notifications: [{
          id: Number(id),
          title: String(title),
          body: String(body),
          schedule: at ? { at: new Date(at) } : undefined
        }]
      });
      return { ok: true };
    }
  },
  files: {
    writeJson: async (fileName, value) => bridge.files.writeText(fileName, JSON.stringify(value, null, 2)),
    writeText: async (fileName, text) => {
      const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `MercaTax/${safeName}`;
      const result = await Filesystem.writeFile({
        path,
        data: String(text),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true
      });
      return { path, uri: result.uri };
    },
    readText: async (path) => {
      const result = await Filesystem.readFile({
        path: String(path),
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      return String(result.data);
    }
  },
  share: {
    text: (title, text) => Share.share({ title: String(title), text: String(text), dialogTitle: String(title) }),
    file: (title, uri) => Share.share({ title: String(title), url: String(uri), dialogTitle: String(title) })
  },
  links: {
    openExternal: async (url) => {
      const parsed = new URL(String(url));
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported external URL protocol');
      await Browser.open({ url: parsed.href });
      return true;
    }
  },
  lifecycle: {
    onChange: (callback) => App.addListener('appStateChange', callback)
  },
  network: {
    status: () => Network.getStatus(),
    onChange: (callback) => Network.addListener('networkStatusChange', callback)
  }
};

window.MercaTaxNative = bridge;

function showNativeNotificationHelp() {
  const title = notificationPermission === 'denied' ? 'Notificaciones bloqueadas' : 'Notificaciones no disponibles';
  const body = notificationPermission === 'denied'
    ? '<p>Las notificaciones locales están bloqueadas para MercaTax IVU PR.</p><p>Abre los Ajustes del sistema, busca MercaTax IVU PR y permite Notificaciones. La app continúa funcionando sin este permiso.</p>'
    : '<p>Las notificaciones locales no están disponibles en este dispositivo. La app continúa funcionando normalmente.</p>';
  const titleNode = document.getElementById('modalTitle');
  const bodyNode = document.getElementById('modalBody');
  const actionsNode = document.getElementById('modalActions');
  const modal = document.getElementById('modal');
  if (titleNode) titleNode.textContent = title;
  if (bodyNode) bodyNode.innerHTML = body;
  if (actionsNode) actionsNode.innerHTML = '<button class="btn warn" onclick="closeDialog()">Entendido</button>';
  if (modal) modal.style.display = 'flex';
}

async function installNativeOverrides() {
  if (!bridge.isNative) return;

  try {
    notificationPermission = await bridge.notifications.status();
  } catch (_) {
    notificationPermission = 'default';
  }

  window.notificationState = () => notificationPermission;
  window.showNotificationHelp = showNativeNotificationHelp;
  window.requestPushPermission = async () => {
    try {
      notificationPermission = await bridge.notifications.request();
      if (typeof window.updateNotificationButton === 'function') window.updateNotificationButton();
      if (notificationPermission === 'granted') {
        if (typeof window.toast === 'function') window.toast('Notificaciones locales activadas');
      } else {
        showNativeNotificationHelp();
      }
    } catch (_) {
      showNativeNotificationHelp();
    }
  };

  window.sendLocalReminder = async (days) => {
    const key = 'mt_notice_' + new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key)) return;
    const result = await bridge.notifications.schedule({
      id: Number(new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(-8)),
      title: 'MercaTax IVU PR',
      body: `Recordatorio: faltan ${days} días para rendir/pagar IVU.`,
      at: Date.now() + 1000
    });
    if (result.ok) localStorage.setItem(key, '1');
  };

  window.checkIvuReminder = () => {
    if (typeof window.updateNotificationButton === 'function') window.updateNotificationButton();
    const day = new Date().getDate();
    let days = 20 - day;
    if (days < 0) days = 20;
    if ((day >= 15 || day === 1) && notificationPermission === 'granted') {
      setTimeout(() => window.sendLocalReminder(days), 800);
    }
  };

  window.openExternal = (url) => {
    bridge.links.openExternal(url).catch(() => {});
    return true;
  };

  window.openWhatsAppMessage = async (message) => {
    const number = typeof WA !== 'undefined' ? WA : '17873566336';
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    try {
      await bridge.links.openExternal(url);
    } catch (_) {
      try { await navigator.clipboard?.writeText(message); } catch (_) {}
      if (typeof window.toast === 'function') window.toast('No se pudo abrir WhatsApp. Copia el mensaje e inténtalo de nuevo.');
    }
  };

  window.shareReport = async () => {
    if (typeof allMonthSales !== 'function' || typeof reportText !== 'function') return;
    const sales = allMonthSales();
    if (!sales.length) return typeof window.toast === 'function' && window.toast('Registre ventas para generar reporte');
    try {
      await bridge.share.text('Reporte MercaTax IVU PR', reportText(sales));
    } catch (error) {
      if (error?.message && !/cancel/i.test(error.message) && typeof window.toast === 'function') {
        window.toast('No se pudo compartir automáticamente.');
      }
    }
  };

  window.exportBackup = async () => {
    try {
      const payload = MercaTaxDomain.createBackupPayload(state);
      const fileName = 'mercatax-ivu-backup-v1-' + new Date().toISOString().slice(0, 10) + '.json';
      const file = await bridge.files.writeJson(fileName, payload);
      try { await bridge.share.file('Backup MercaTax IVU PR', file.uri); } catch (_) {}
      if (typeof window.toast === 'function') window.toast('Backup v1 guardado en el dispositivo');
    } catch (_) {
      if (typeof window.toast === 'function') window.toast('No se pudo crear el backup');
    }
  };

  window.downloadReportHtml = async () => {
    const sales = typeof allMonthSales === 'function' ? allMonthSales() : [];
    if (!sales.length) return typeof window.toast === 'function' && window.toast('Registre ventas para generar reporte');
    try {
      const fileName = typeof reportFileName === 'function' ? reportFileName('html') : 'mercatax-ivu-reporte.html';
      const file = await bridge.files.writeText(fileName, window.reportHtml(sales));
      try { await bridge.share.file('Reporte MercaTax IVU PR', file.uri); } catch (_) {}
      if (typeof window.toast === 'function') window.toast('Reporte guardado en el dispositivo');
    } catch (_) {
      if (typeof window.toast === 'function') window.toast('No se pudo guardar el reporte');
    }
  };

  const updateConnectivity = ({ connected }) => {
    document.documentElement.classList.toggle('is-offline', !connected);
    window.dispatchEvent(new CustomEvent('mercatax:network-change', { detail: { connected } }));
  };
  try { updateConnectivity(await bridge.network.status()); } catch (_) {}
  bridge.network.onChange(updateConnectivity);
  bridge.lifecycle.onChange((detail) => window.dispatchEvent(new CustomEvent('mercatax:app-state', { detail })));

  if (typeof window.updateNotificationButton === 'function') window.updateNotificationButton();
  try { await SplashScreen.hide(); } catch (_) {}
  window.dispatchEvent(new CustomEvent('mercatax:native-ready', { detail: { platform: bridge.platform } }));
}

window.addEventListener('load', () => {
  installNativeOverrides().catch(() => {});
}, { once: true });
