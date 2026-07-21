// Rule-based command understanding: maps recognized speech to DeskBudd's
// existing actions. No LLM call, fully offline, instant. Deliberately a fixed
// vocabulary rather than open-ended understanding — see the plan doc for the
// "swap in Claude later" upgrade path if this proves too limited.

const COMMAND_PATTERNS = [
  { action: 'startFocus', test: /\b(start|begin)\b.*\bfocus\b/i },
  { action: 'cancelFocus', test: /\b(cancel|stop|end)\b.*\bfocus\b/i },
  { action: 'feed', test: /\b(feed|treat|snack)\b/i },
  { action: 'mood', test: /\bmood\b|\bhow are you\b|\bhow('?s| is) it going\b/i },
  { action: 'snooze', test: /\bsnooze\b/i },
  { action: 'addReminder', test: /\bremind me to\b/i }
];

function extractMinutes(text) {
  const m = text.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractReminder(text) {
  // "remind me to check email at 3 pm" -> { label: "check email", time: "15:00" }
  const match = text.match(/remind me to (.+?) at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;

  const label = match[1].trim();
  let hour = parseInt(match[2], 10);
  const minute = match[3] ? parseInt(match[3], 10) : 0;
  const ampm = (match[4] || '').toLowerCase();
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;

  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return { label, time: `${hh}:${mm}` };
}

function parseCommand(rawText) {
  const text = (rawText || '').trim();
  if (!text) return { action: 'unknown', text };

  for (const { action, test } of COMMAND_PATTERNS) {
    if (!test.test(text)) continue;

    if (action === 'startFocus') {
      return { action, minutes: extractMinutes(text) || 25, text };
    }
    if (action === 'addReminder') {
      const reminder = extractReminder(text);
      if (!reminder) return { action: 'unknown', text };
      return { action, ...reminder, text };
    }
    return { action, text };
  }

  return { action: 'unknown', text };
}

window.buddyCommands = { parseCommand };
