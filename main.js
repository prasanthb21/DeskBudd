const { app, BrowserWindow, Tray, Menu, ipcMain, screen, powerMonitor } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    waterIntervalMin: 45,
    standupIntervalMin: 60,
    activeStart: '09:00',
    activeEnd: '18:00',
    activeDaysOnly: true,
    customReminders: [
      // { id, label, time: 'HH:MM', days: ['Mon',...] or [] for every day, emotion }
    ],
    snoozeUntil: 0,
    characterId: 'nightfall',
    buddyName: 'Buddy',
    onboarded: false,
    // Productivity / gamification
    mood: 70, // 0-100, drifts down over time, boosted by acknowledged reminders + feeding
    streakDays: 0,
    lastAckDate: null,
    stats: { water: 0, standup: 0, custom: 0, date: null },
    dailySummaryTime: '18:00',
    lastSummaryDate: null,
    idleWelcomeBackMin: 15,
    feedState: { date: null, count: 0 },
    // Customization
    buddySize: 'medium', // small | medium | large
    alwaysOnTop: true,
    reduceMotion: false
  }
});

const SIZE_SCALE = { small: 0.82, medium: 1, large: 1.25 };
const BASE_WIN_WIDTH = 240;
const BASE_WIN_HEIGHT = 300;
const EDGE_MARGIN = 24;

// The OS window is always sized for the largest possible stage (it's
// transparent, so unused space is invisible); only the CSS stage inside it
// scales for the "small/medium/large" setting. This avoids re-flowing window
// bounds/positioning every time the size setting changes.
const MAX_SCALE = Math.max(...Object.values(SIZE_SCALE));
function currentWinSize() {
  return {
    width: Math.round(BASE_WIN_WIDTH * MAX_SCALE),
    height: Math.round(BASE_WIN_HEIGHT * MAX_SCALE)
  };
}

let mainWindow;
let settingsWindow;
let tray;

let waterTimer, standupTimer, customTickTimer, idleTimer, focusTicker;
let lastCustomFireKey = {};
let wasIdle = false;
let focusEndsAt = 0;
let focusLabel = '';

// The display holding the mouse cursor is used as a proxy for "the screen
// the user is actively looking at" on multi-monitor setups.
function getActiveDisplay() {
  return screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}

function moveWindowToActiveDisplay() {
  if (!mainWindow) return;
  const display = getActiveDisplay();
  const { x, y, width, height } = display.workArea;
  const { width: winWidth, height: winHeight } = currentWinSize();
  mainWindow.setPosition(
    x + width - winWidth - EDGE_MARGIN,
    y + height - winHeight - EDGE_MARGIN
  );
}

function isSnoozed() {
  return Date.now() < (store.get('snoozeUntil') || 0);
}

function isWithinActiveWindow() {
  const cfg = store.store;
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'short' });
  if (cfg.activeDaysOnly && (day === 'Sat' || day === 'Sun')) return false;
  const [sh, sm] = cfg.activeStart.split(':').map(Number);
  const [eh, em] = cfg.activeEnd.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= startMins && nowMins <= endMins;
}

function isFocusing() {
  return Date.now() < focusEndsAt;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_STATS = { water: 0, standup: 0, custom: 0, date: null };

function resetStatsIfNewDay() {
  const stats = store.get('stats', DEFAULT_STATS);
  if (stats.date !== todayKey()) {
    store.set('stats', { water: 0, standup: 0, custom: 0, date: todayKey() });
  }
}

function bumpMood(delta) {
  const mood = store.get('mood', 70);
  store.set('mood', Math.max(0, Math.min(100, mood + delta)));
}

function recordAck(type) {
  resetStatsIfNewDay();
  const stats = store.get('stats', DEFAULT_STATS);
  if (stats[type] !== undefined) stats[type] += 1;
  store.set('stats', stats);
  bumpMood(4);

  const last = store.get('lastAckDate', null);
  const today = todayKey();
  if (last !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = store.get('streakDays', 0);
    store.set('streakDays', last === yesterday ? streak + 1 : 1);
    store.set('lastAckDate', today);
  }
}

function sendReminder(type, message, emotion = 'happy') {
  if (isSnoozed()) return;
  if (isFocusing() && type !== 'focus-done') return;
  if (!mainWindow) return;
  moveWindowToActiveDisplay();
  mainWindow.webContents.send('reminder', { type, message, emotion });
}

function scheduleTimers() {
  clearInterval(waterTimer);
  clearInterval(standupTimer);
  const cfg = store.store;

  waterTimer = setInterval(() => {
    if (!isWithinActiveWindow()) return;
    sendReminder('water', "Time for a water break! Stay hydrated 💧", 'calm');
  }, cfg.waterIntervalMin * 60 * 1000);

  standupTimer = setInterval(() => {
    if (!isWithinActiveWindow()) return;
    sendReminder('standup', "Stand up, stretch, and give your eyes a rest 🧍", 'excited');
  }, cfg.standupIntervalMin * 60 * 1000);
}

function scheduleCustomReminderTicker() {
  clearInterval(customTickTimer);
  customTickTimer = setInterval(() => {
    const cfg = store.store;
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5);
    const day = now.toLocaleDateString('en-US', { weekday: 'short' });
    const dateKey = now.toISOString().slice(0, 10);

    resetStatsIfNewDay();

    (cfg.customReminders || []).forEach((r) => {
      if (r.time !== hhmm) return;
      if (r.days && r.days.length > 0 && !r.days.includes(day)) return;
      const key = `${r.id}-${dateKey}-${hhmm}`;
      if (lastCustomFireKey[key]) return;
      lastCustomFireKey[key] = true;
      sendReminder('custom', r.label, r.emotion || 'happy');
    });

    if (cfg.dailySummaryTime === hhmm) {
      if (store.get('lastSummaryDate') !== dateKey) {
        const stats = cfg.stats || {};
        const total = (stats.water || 0) + (stats.standup || 0) + (stats.custom || 0);
        const msg = total > 0
          ? `Today: ${stats.water || 0} water breaks, ${stats.standup || 0} standups, ${stats.custom || 0} reminders handled. Nice work! 🎉`
          : `No breaks logged yet today — I'm still here whenever you need a nudge.`;
        sendReminder('summary', msg, total > 0 ? 'excited' : 'calm');
        store.set('lastSummaryDate', dateKey);
      }
    }
  }, 20 * 1000);
}

function scheduleMoodAndIdleWatch() {
  clearInterval(idleTimer);
  idleTimer = setInterval(() => {
    // Mood drifts down slowly over time so it reflects ongoing engagement.
    bumpMood(-0.5);

    const thresholdMin = store.get('idleWelcomeBackMin') || 15;
    const idleState = powerMonitor.getSystemIdleState(thresholdMin * 60);
    if (idleState === 'idle' || idleState === 'locked') {
      wasIdle = true;
    } else if (wasIdle) {
      wasIdle = false;
      if (isWithinActiveWindow()) {
        sendReminder('welcome-back', "Welcome back! Ready to pick up where you left off?", 'happy');
      }
    }
  }, 60 * 1000);
}

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const { width: winWidth, height: winHeight } = currentWinSize();

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - EDGE_MARGIN,
    y: height - winHeight - EDGE_MARGIN,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  applyAlwaysOnTopSetting();
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function applyAlwaysOnTopSetting() {
  if (!mainWindow) return;
  const enabled = store.get('alwaysOnTop');
  mainWindow.setAlwaysOnTop(enabled, enabled ? 'screen-saver' : undefined);
}

function applySizeSetting() {
  if (!mainWindow) return;
  mainWindow.webContents.send('size-changed', { scale: SIZE_SCALE[store.get('buddySize')] || 1 });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 480,
    height: 620,
    resizable: false,
    title: 'DeskBudd Settings',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

function startFocusSession(minutes) {
  clearInterval(focusTicker);
  focusEndsAt = Date.now() + minutes * 60 * 1000;
  focusLabel = `${minutes} min focus`;
  moveWindowToActiveDisplay();
  mainWindow.webContents.send('focus-tick', { remainingMs: minutes * 60 * 1000, label: focusLabel });

  focusTicker = setInterval(() => {
    const remainingMs = focusEndsAt - Date.now();
    if (remainingMs <= 0) {
      clearInterval(focusTicker);
      focusEndsAt = 0;
      mainWindow.webContents.send('focus-tick', null);
      sendReminder('focus-done', "Focus session complete — nice work! Take a 5 min break 🎉", 'excited');
      return;
    }
    mainWindow.webContents.send('focus-tick', { remainingMs, label: focusLabel });
  }, 1000);
  rebuildTrayMenu();
}

function cancelFocusSession() {
  clearInterval(focusTicker);
  focusEndsAt = 0;
  if (mainWindow) mainWindow.webContents.send('focus-tick', null);
  rebuildTrayMenu();
}

function createTray() {
  // macOS menu bar icons need to be small (the full 1024px app icon would be
  // wildly oversized there); Windows' system tray handles the big one fine.
  const trayIconFile = process.platform === 'darwin' ? 'icon-tray-mac.png' : 'icon.png';
  tray = new Tray(path.join(__dirname, trayIconFile));
  tray.setToolTip('DeskBudd');
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  const snoozed = isSnoozed();
  const focusing = isFocusing();
  const mood = Math.round(store.get('mood'));
  const streak = store.get('streakDays');

  const contextMenu = Menu.buildFromTemplate([
    { label: `Mood: ${mood}/100 · Streak: ${streak}d`, enabled: false },
    { type: 'separator' },
    { label: 'Show Buddy', click: () => mainWindow && mainWindow.show() },
    { label: 'Settings…', click: () => createSettingsWindow() },
    { type: 'separator' },
    focusing
      ? { label: 'Cancel Focus Session', click: cancelFocusSession }
      : {
          label: 'Start Focus Session',
          submenu: [
            { label: '25 min (Pomodoro)', click: () => startFocusSession(25) },
            { label: '50 min (Deep work)', click: () => startFocusSession(50) },
            { label: '10 min (Quick sprint)', click: () => startFocusSession(10) }
          ]
        },
    {
      label: snoozed ? 'Snoozed — Resume Now' : 'Snooze 30 min',
      click: () => {
        store.set('snoozeUntil', snoozed ? 0 : Date.now() + 30 * 60 * 1000);
        rebuildTrayMenu();
      }
    },
    {
      label: 'Send Test Reminder',
      click: () => sendReminder('custom', "This is a test reminder 👋", 'excited')
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  scheduleTimers();
  scheduleCustomReminderTicker();
  scheduleMoodAndIdleWatch();
});

// Electron does NOT quit automatically when all windows close — you have to
// call app.quit() yourself, or the process keeps running invisibly with no
// window and no way back short of a task manager. On Windows/Linux we want
// closing the window (e.g. via the taskbar) to actually quit, matching normal
// desktop-app behavior. On macOS the convention is the opposite: closing
// windows leaves the app running in the menu bar/Dock until Cmd+Q or an
// explicit Quit — so this only fires the auto-quit on non-mac platforms.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-settings', () => store.store);

ipcMain.handle('save-settings', (event, newSettings) => {
  const prevCharacterId = store.get('characterId');
  const prevSize = store.get('buddySize');
  const prevAlwaysOnTop = store.get('alwaysOnTop');
  store.set(newSettings);
  scheduleTimers();
  rebuildTrayMenu();
  if (newSettings.characterId && newSettings.characterId !== prevCharacterId && mainWindow) {
    mainWindow.webContents.send('character-changed', { characterId: newSettings.characterId });
  }
  if (newSettings.buddySize && newSettings.buddySize !== prevSize) {
    applySizeSetting();
  }
  if (typeof newSettings.alwaysOnTop === 'boolean' && newSettings.alwaysOnTop !== prevAlwaysOnTop) {
    applyAlwaysOnTopSetting();
  }
  if (mainWindow) {
    mainWindow.webContents.send('reduce-motion-changed', { reduceMotion: !!store.get('reduceMotion') });
  }
  return store.store;
});

ipcMain.handle('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('drag-window', (event, { dx, dy }) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(x + dx, y + dy);
});

ipcMain.handle('ack-reminder', (event, type) => {
  recordAck(type === 'water' || type === 'standup' ? type : 'custom');
  rebuildTrayMenu();
  return { mood: store.get('mood', 70), streakDays: store.get('streakDays', 0) };
});

ipcMain.handle('feed-buddy', () => {
  const today = todayKey();
  const feedState = store.get('feedState', { date: today, count: 0 });
  if (feedState.date !== today) {
    feedState.date = today;
    feedState.count = 0;
  }
  if (feedState.count >= 6) {
    return { fed: false, mood: store.get('mood', 70), reason: 'full' };
  }
  feedState.count += 1;
  store.set('feedState', feedState);
  bumpMood(5);
  return { fed: true, mood: store.get('mood', 70) };
});

ipcMain.handle('start-focus', (event, minutes) => {
  startFocusSession(Math.max(5, Math.min(120, Number(minutes) || 25)));
  return { focusing: true };
});

ipcMain.handle('cancel-focus', () => {
  cancelFocusSession();
  return { focusing: false };
});

ipcMain.handle('get-mood', () => ({
  mood: store.get('mood', 70),
  streakDays: store.get('streakDays', 0),
  stats: store.get('stats', DEFAULT_STATS)
}));

ipcMain.handle('add-custom-reminder', (event, { label, time, emotion }) => {
  const reminders = store.get('customReminders', []);
  reminders.push({
    id: `${Date.now()}`,
    label,
    time,
    days: [],
    emotion: emotion || 'happy'
  });
  store.set('customReminders', reminders);
  rebuildTrayMenu();
  return { ok: true, customReminders: reminders };
});
