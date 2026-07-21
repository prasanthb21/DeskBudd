// Original character roster — archetypes inspired by classic hero tropes,
// but with distinct original names, palettes, and emblems (no copyrighted IP).
const CHARACTERS = [
  {
    id: 'nightfall',
    name: 'Nightfall',
    tagline: 'Silent guardian of your to-do list',
    bodyColor: '#2b2f4a',
    accent: '#c9d6e3',
    capeColor: '#1b1f33',
    emblem: 'moon',
    hasCape: true,
    hairSpikes: false
  },
  {
    id: 'webrunner',
    name: 'Webrunner',
    tagline: 'Swings by with a reminder and vanishes',
    bodyColor: '#c1272d',
    accent: '#1a1a1a',
    capeColor: null,
    emblem: 'web',
    hasCape: false,
    hairSpikes: false
  },
  {
    id: 'titan',
    name: 'Titan',
    tagline: 'Stands tall so your posture doesn’t have to',
    bodyColor: '#2255a4',
    accent: '#f4c430',
    capeColor: '#1b3f80',
    emblem: 'star',
    hasCape: true,
    hairSpikes: false
  },
  {
    id: 'valkyra',
    name: 'Valkyra',
    tagline: 'Warrior spirit, gentle nudges',
    bodyColor: '#b8002e',
    accent: '#f4c430',
    capeColor: null,
    emblem: 'bolt',
    hasCape: false,
    hairSpikes: false
  },
  {
    id: 'buddyjr',
    name: 'Buddy Jr',
    tagline: 'Cheeky, chaotic, weirdly motivating',
    bodyColor: '#f4c430',
    accent: '#ff6f61',
    capeColor: null,
    emblem: 'leaf',
    hasCape: false,
    hairSpikes: true
  }
];

function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

const EMBLEM_PATHS = {
  moon: '<path d="M-6,-8 A8,8 0 1 0 -6,8 A6,6 0 1 1 -6,-8 Z" fill="currentColor"/>',
  web: '<g stroke="currentColor" stroke-width="1" fill="none"><circle r="7"/><circle r="4"/><line x1="-7" y1="0" x2="7" y2="0"/><line x1="0" y1="-7" x2="0" y2="7"/><line x1="-5" y1="-5" x2="5" y2="5"/><line x1="-5" y1="5" x2="5" y2="-5"/></g>',
  star: '<path d="M0,-8 L2.3,-2.5 L8,-2.5 L3.5,1 L5,7 L0,3.5 L-5,7 L-3.5,1 L-8,-2.5 L-2.3,-2.5 Z" fill="currentColor"/>',
  bolt: '<path d="M2,-8 L-4,1 L-0.5,1 L-2,8 L4,-1 L0.5,-1 Z" fill="currentColor"/>',
  leaf: '<path d="M0,-8 C6,-6 6,4 0,8 C-6,4 -6,-6 0,-8 Z" fill="currentColor"/>'
};

const QUIPS = [
  'Hey! Just checking in on you.',
  'Poke received. I’m here!',
  'You clicked me — bold move.',
  'Need a break? Just say the word.',
  'Beep. Boop. Still watching your posture.',
  'I don’t do much, but I care a lot.'
];

// Mouth + eyebrow shapes per emotion, and a body-language tag consumed by CSS.
const EMOTIONS = {
  neutral: {
    mouth: 'M-5,-17 Q0,-14 5,-17',
    browL: 'M-10,-32 L-3,-31',
    browR: 'M3,-31 L10,-32',
    bodyClass: 'mood-neutral'
  },
  happy: {
    mouth: 'M-6,-17 Q0,-10 6,-17',
    browL: 'M-10,-33 L-3,-32',
    browR: 'M3,-32 L10,-33',
    bodyClass: 'mood-happy'
  },
  excited: {
    mouth: 'M-6,-16 Q0,-8 6,-16 Q0,-19 -6,-16 Z',
    browL: 'M-11,-34 L-3,-31',
    browR: 'M3,-31 L11,-34',
    bodyClass: 'mood-excited'
  },
  urgent: {
    mouth: 'M-4,-15 Q0,-17 4,-15',
    browL: 'M-11,-29 L-3,-32',
    browR: 'M3,-32 L11,-29',
    bodyClass: 'mood-urgent'
  },
  calm: {
    mouth: 'M-5,-16 Q0,-13 5,-16',
    browL: 'M-10,-31 L-3,-31',
    browR: 'M3,-31 L10,-31',
    bodyClass: 'mood-calm'
  },
  listening: {
    mouth: 'M-3,-16 L3,-16',
    browL: 'M-11,-35 L-3,-33',
    browR: 'M3,-33 L11,-35',
    bodyClass: 'mood-listening'
  }
};

function getEmotion(id) {
  return EMOTIONS[id] || EMOTIONS.neutral;
}

function buildCharacterSVG(charConfig, emotionId) {
  const emotion = getEmotion(emotionId);

  const cape = charConfig.hasCape
    ? `<path d="M-24,-6 C-30,20 -20,42 0,48 C20,42 30,20 24,-6 C14,-14 -14,-14 -24,-6 Z"
         fill="${charConfig.capeColor}" opacity="0.95"/>`
    : '';

  const hair = charConfig.hairSpikes
    ? `<g fill="${charConfig.accent}">
         <path d="M-16,-30 L-10,-40 L-6,-30 Z"/>
         <path d="M-6,-34 L-2,-45 L2,-34 Z"/>
         <path d="M6,-34 L10,-45 L14,-34 Z"/>
         <path d="M14,-30 L18,-40 L20,-28 Z"/>
       </g>`
    : '';

  return `
    <svg viewBox="-50 -60 100 130" width="130" height="150">
      <ellipse id="shadow" cx="0" cy="62" rx="26" ry="5" fill="rgba(0,0,0,0.15)"/>
      <circle id="ping" cx="0" cy="0" r="30" fill="none" stroke="#ff8a3d" stroke-width="3" opacity="0"/>
      <g id="body-group" class="${emotion.bodyClass}">
        ${cape}
        <g id="leg-l" style="transform-origin: -7.5px 26px;">
          <rect x="-12" y="26" width="9" height="24" rx="4" fill="${charConfig.bodyColor}"/>
        </g>
        <g id="leg-r" style="transform-origin: 7.5px 26px;">
          <rect x="3" y="26" width="9" height="24" rx="4" fill="${charConfig.bodyColor}"/>
        </g>
        <rect x="-18" y="-8" width="36" height="38" rx="14" fill="${charConfig.bodyColor}"/>
        <g transform="translate(0,6)" color="${charConfig.accent}">
          ${EMBLEM_PATHS[charConfig.emblem]}
        </g>
        <g id="arm-l" style="transform-origin: -22.5px -4px;">
          <rect x="-27" y="-4" width="9" height="26" rx="4" fill="${charConfig.bodyColor}"/>
        </g>
        <g id="arm-r" style="transform-origin: 22.5px -4px;">
          <rect x="18" y="-4" width="9" height="26" rx="4" fill="${charConfig.bodyColor}"/>
        </g>
        <circle cx="0" cy="-24" r="16" fill="${charConfig.accent}"/>
        ${hair}
        <path id="brow-l" d="${emotion.browL}" stroke="#1c2b3a" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path id="brow-r" d="${emotion.browR}" stroke="#1c2b3a" stroke-width="2" fill="none" stroke-linecap="round"/>
        <circle id="eye-l" cx="-6" cy="-25" r="2.6" fill="#1c2b3a"/>
        <circle id="eye-r" cx="6" cy="-25" r="2.6" fill="#1c2b3a"/>
        <path id="mouth" d="${emotion.mouth}" stroke="#1c2b3a" stroke-width="2" fill="none" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

function setFace(root, emotionId) {
  const emotion = getEmotion(emotionId);
  const bodyGroup = root.querySelector('#body-group');
  if (!bodyGroup) return;
  bodyGroup.className.baseVal = bodyGroup.className.baseVal
    .replace(/mood-\w+/g, '')
    .trim();
  bodyGroup.classList.add(emotion.bodyClass);
  const mouth = root.querySelector('#mouth');
  const browL = root.querySelector('#brow-l');
  const browR = root.querySelector('#brow-r');
  if (mouth) mouth.setAttribute('d', emotion.mouth);
  if (browL) browL.setAttribute('d', emotion.browL);
  if (browR) browR.setAttribute('d', emotion.browR);
}

if (typeof module !== 'undefined') {
  module.exports = { CHARACTERS, getCharacter, EMBLEM_PATHS, QUIPS, EMOTIONS, getEmotion, buildCharacterSVG, setFace };
}
