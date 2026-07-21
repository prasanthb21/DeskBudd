const stage = document.getElementById('stage');
const character = document.getElementById('character');
const bubble = document.getElementById('bubble');
const bubbleText = document.getElementById('bubble-text');
const bubbleDismiss = document.getElementById('bubble-dismiss');
const bubbleAck = document.getElementById('bubble-ack');
const onboarding = document.getElementById('onboarding');
const onboardGrid = document.getElementById('onboard-grid');
const onboardName = document.getElementById('onboard-name');
const onboardStart = document.getElementById('onboard-start');
const treatBtn = document.getElementById('treat-btn');
const focusBadge = document.getElementById('focus-badge');
const focusTime = document.getElementById('focus-time');
const focusCancel = document.getElementById('focus-cancel');

let hideTimer = null;
let currentCharacterId = 'nightfall';
let buddyName = 'Buddy';
let selectedOnboardId = 'nightfall';
let deliverToken = 0;
let currentAckType = null;

const SIZE_SCALE = { small: 0.82, medium: 1, large: 1.25 };

function renderCharacter(id, emotionId) {
  currentCharacterId = id;
  const cfg = getCharacter(id);
  character.innerHTML = buildCharacterSVG(cfg, emotionId);
}

function showBubble(message, ackType) {
  clearTimeout(hideTimer);
  bubbleText.textContent = message;
  bubble.classList.remove('hidden');
  currentAckType = ackType || null;
  bubbleAck.classList.toggle('hidden', !ackType);

  hideTimer = setTimeout(() => {
    hideBubble();
  }, 12000);
}

function hideBubble() {
  bubble.classList.add('hidden');
  character.classList.remove('talk');
  character.classList.add('idle');
  currentAckType = null;
}

bubbleDismiss.addEventListener('click', hideBubble);

bubbleAck.addEventListener('click', async () => {
  if (currentAckType) {
    const result = await window.buddy.ackReminder(currentAckType);
    if (result && result.mood >= 85) {
      character.classList.add('wave');
      setTimeout(() => character.classList.remove('wave'), 1200);
    }
  }
  hideBubble();
});

// Full "delivery" sequence: walk in -> jump/ping for attention -> face shows
// the message's emotion -> speech bubble appears -> settle back to idle talk.
async function deliverMessage(message, emotionId, ackType) {
  const token = ++deliverToken;
  clearTimeout(hideTimer);
  bubble.classList.add('hidden');

  character.classList.remove('idle', 'talk', 'wave', 'attention');
  setFace(character, emotionId);
  character.classList.add('walking');
  await wait(800);
  if (token !== deliverToken) return;

  character.classList.remove('walking');
  character.classList.add('attention');
  await wait(950);
  if (token !== deliverToken) return;

  character.classList.remove('attention');
  character.classList.add('talk');
  showBubble(message, ackType);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ACKABLE_TYPES = new Set(['water', 'standup', 'custom']);

window.buddy.onReminder(({ type, message, emotion }) => {
  deliverMessage(message, emotion || 'happy', ACKABLE_TYPES.has(type) ? type : null);
});

window.buddy.onCharacterChanged(({ characterId }) => {
  renderCharacter(characterId, 'neutral');
});

window.buddy.onSizeChanged(({ scale }) => {
  stage.style.transform = `scale(${scale})`;
});

window.buddy.onReduceMotionChanged(({ reduceMotion }) => {
  document.body.classList.toggle('reduce-motion', !!reduceMotion);
});

window.buddy.onFocusTick((data) => {
  if (!data) {
    focusBadge.classList.add('hidden');
    return;
  }
  focusBadge.classList.remove('hidden');
  const totalSec = Math.max(0, Math.round(data.remainingMs / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  focusTime.textContent = `${mm}:${ss}`;
});

focusCancel.addEventListener('click', () => window.buddy.cancelFocus());

treatBtn.addEventListener('click', async () => {
  treatBtn.classList.remove('feeding');
  void treatBtn.offsetWidth; // restart animation
  treatBtn.classList.add('feeding');

  const result = await window.buddy.feedBuddy();
  if (result && result.fed) {
    deliverMessage(`${buddyName}: Yum, thanks! 🍪`, 'excited', null);
  } else {
    deliverMessage(`${buddyName}: I'm full for now — thank you though!`, 'happy', null);
  }
});

character.addEventListener('dblclick', hideBubble);

// Distinguish click (quip) from drag (move window).
let dragging = false;
let moved = false;
let lastX = 0;
let lastY = 0;

character.addEventListener('mousedown', (e) => {
  dragging = true;
  moved = false;
  lastX = e.screenX;
  lastY = e.screenY;
});

window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.screenX - lastX;
  const dy = e.screenY - lastY;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
  lastX = e.screenX;
  lastY = e.screenY;
  window.buddy.dragWindow(dx, dy);
});

window.addEventListener('mouseup', () => {
  if (dragging && !moved) {
    const quip = QUIPS[Math.floor(Math.random() * QUIPS.length)];
    deliverMessage(`${buddyName}: ${quip}`, 'happy', null);
  }
  dragging = false;
});

character.addEventListener('contextmenu', () => {
  window.buddy.openSettings();
});

function renderOnboardGrid() {
  onboardGrid.innerHTML = '';
  CHARACTERS.forEach((c) => {
    const cell = document.createElement('div');
    cell.className = 'char-cell' + (c.id === selectedOnboardId ? ' selected' : '');
    cell.innerHTML = buildCharacterSVG(c);
    const label = document.createElement('div');
    label.className = 'char-cell-label';
    label.textContent = c.name;
    cell.appendChild(label);
    cell.addEventListener('click', () => {
      selectedOnboardId = c.id;
      renderOnboardGrid();
    });
    onboardGrid.appendChild(cell);
  });
}

onboardStart.addEventListener('click', async () => {
  const name = onboardName.value.trim() || 'Buddy';
  buddyName = name;
  await window.buddy.saveSettings({
    characterId: selectedOnboardId,
    buddyName: name,
    onboarded: true
  });
  renderCharacter(selectedOnboardId, 'neutral');
  onboarding.classList.add('hidden');
});

async function init() {
  const settings = await window.buddy.getSettings();
  buddyName = settings.buddyName || 'Buddy';
  selectedOnboardId = settings.characterId || 'nightfall';
  renderCharacter(settings.characterId || 'nightfall', 'neutral');
  character.classList.add('idle');

  stage.style.transform = `scale(${SIZE_SCALE[settings.buddySize] || 1})`;
  document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);

  if (!settings.onboarded) {
    renderOnboardGrid();
    onboarding.classList.remove('hidden');
  }
}

init();
