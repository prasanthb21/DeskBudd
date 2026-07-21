let currentSettings = null;
let selectedCharacterId = 'nightfall';

const buddyNameInput = document.getElementById('buddyName');
const charGrid = document.getElementById('charGrid');
const waterInput = document.getElementById('waterInterval');
const standupInput = document.getElementById('standupInterval');
const activeStartInput = document.getElementById('activeStart');
const activeEndInput = document.getElementById('activeEnd');
const activeDaysOnlyInput = document.getElementById('activeDaysOnly');
const reminderListEl = document.getElementById('reminderList');
const newLabelInput = document.getElementById('newLabel');
const newTimeInput = document.getElementById('newTime');
const newEmotionInput = document.getElementById('newEmotion');
const addReminderBtn = document.getElementById('addReminder');
const saveBtn = document.getElementById('save');
const savedNote = document.getElementById('savedNote');
const moodReadout = document.getElementById('moodReadout');
const dailySummaryTimeInput = document.getElementById('dailySummaryTime');
const idleWelcomeBackMinInput = document.getElementById('idleWelcomeBackMin');
const buddySizeInput = document.getElementById('buddySize');
const alwaysOnTopInput = document.getElementById('alwaysOnTop');
const reduceMotionInput = document.getElementById('reduceMotion');

function renderReminders() {
  reminderListEl.innerHTML = '';
  (currentSettings.customReminders || []).forEach((r) => {
    const row = document.createElement('div');
    row.className = 'reminder-item';
    const emotionLabel = { happy: 'Friendly', excited: 'Excited', urgent: 'Urgent', calm: 'Calm' }[r.emotion] || 'Friendly';
    row.innerHTML = `<span>${r.time} — ${r.label} <em class="emotion-tag">${emotionLabel}</em></span>`;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      currentSettings.customReminders = currentSettings.customReminders.filter((x) => x.id !== r.id);
      renderReminders();
    });
    row.appendChild(removeBtn);
    reminderListEl.appendChild(row);
  });
}

function renderCharGrid() {
  charGrid.innerHTML = '';
  CHARACTERS.forEach((c) => {
    const cell = document.createElement('div');
    cell.className = 'char-cell' + (c.id === selectedCharacterId ? ' selected' : '');
    cell.innerHTML = buildCharacterSVG(c);
    const label = document.createElement('div');
    label.className = 'char-cell-label';
    label.textContent = c.name;
    cell.appendChild(label);
    cell.addEventListener('click', () => {
      selectedCharacterId = c.id;
      renderCharGrid();
    });
    charGrid.appendChild(cell);
  });
}

async function load() {
  currentSettings = await window.buddy.getSettings();
  buddyNameInput.value = currentSettings.buddyName || 'Buddy';
  selectedCharacterId = currentSettings.characterId || 'nightfall';
  renderCharGrid();
  waterInput.value = currentSettings.waterIntervalMin;
  standupInput.value = currentSettings.standupIntervalMin;
  activeStartInput.value = currentSettings.activeStart;
  activeEndInput.value = currentSettings.activeEnd;
  activeDaysOnlyInput.checked = currentSettings.activeDaysOnly;
  renderReminders();

  dailySummaryTimeInput.value = currentSettings.dailySummaryTime || '18:00';
  idleWelcomeBackMinInput.value = currentSettings.idleWelcomeBackMin || 15;
  buddySizeInput.value = currentSettings.buddySize || 'medium';
  alwaysOnTopInput.checked = currentSettings.alwaysOnTop !== false;
  reduceMotionInput.checked = !!currentSettings.reduceMotion;

  const stats = currentSettings.stats || {};
  const todayTotal = (stats.water || 0) + (stats.standup || 0) + (stats.custom || 0);
  moodReadout.textContent =
    `Mood: ${Math.round(currentSettings.mood ?? 70)}/100 · Streak: ${currentSettings.streakDays || 0} day(s) · Today: ${todayTotal} handled`;
}

addReminderBtn.addEventListener('click', () => {
  const label = newLabelInput.value.trim();
  const time = newTimeInput.value;
  if (!label || !time) return;
  currentSettings.customReminders = currentSettings.customReminders || [];
  currentSettings.customReminders.push({
    id: `${Date.now()}`,
    label,
    time,
    days: [],
    emotion: newEmotionInput.value || 'happy'
  });
  newLabelInput.value = '';
  newTimeInput.value = '';
  renderReminders();
});

saveBtn.addEventListener('click', async () => {
  currentSettings.buddyName = buddyNameInput.value.trim() || 'Buddy';
  currentSettings.characterId = selectedCharacterId;
  currentSettings.waterIntervalMin = Number(waterInput.value) || 45;
  currentSettings.standupIntervalMin = Number(standupInput.value) || 60;
  currentSettings.activeStart = activeStartInput.value || '09:00';
  currentSettings.activeEnd = activeEndInput.value || '18:00';
  currentSettings.activeDaysOnly = activeDaysOnlyInput.checked;
  currentSettings.dailySummaryTime = dailySummaryTimeInput.value || '18:00';
  currentSettings.idleWelcomeBackMin = Number(idleWelcomeBackMinInput.value) || 15;
  currentSettings.buddySize = buddySizeInput.value || 'medium';
  currentSettings.alwaysOnTop = alwaysOnTopInput.checked;
  currentSettings.reduceMotion = reduceMotionInput.checked;

  await window.buddy.saveSettings(currentSettings);
  savedNote.classList.remove('hidden');
  setTimeout(() => savedNote.classList.add('hidden'), 1600);
});

load();
