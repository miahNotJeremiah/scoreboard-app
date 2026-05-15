/**
 * admin.js – Admin panel logic
 * Applied Computing 1&2 – Basketball Scoreboard
 */

// ── Timer state ──────────────────────────────────────────────
let timerInterval  = null;   // handle from setInterval
let timerRunning   = false;  // true while counting down
let timerSeconds   = 0;      // current seconds left (local authoritative)

// ── Toggle Start / Pause ────────────────────────────────────
async function toggleTimer() {
  if (timerRunning) {
    _pauseTimer();
  } else {
    _startTimer();
  }
}

function _pauseTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning  = false;
  setTimerButtonState(false);
  resetClockClasses();
  postAPI('/api/timer', { running: false });   // fire-and-forget
}

async function _startTimer() {
  // Read seconds from whatever is showing on the clock right now
  const clockEl = document.getElementById('center-clock');
  const display = clockEl ? clockEl.textContent.trim() : '10:00';
  const parts   = display.split(':');
  timerSeconds  = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);

  if (timerSeconds <= 0) {
    alert('Clock is at 0:00 – please set a time first using the inputs above.');
    return;
  }

  timerRunning = true;
  setTimerButtonState(true);
  await postAPI('/api/timer', { running: true });

  timerInterval = setInterval(async () => {
    timerSeconds--;
    if (timerSeconds < 0) timerSeconds = 0;

    const timeStr = formatTime(timerSeconds);

    // Update local display immediately (smooth, no flicker)
    setText('center-clock', timeStr);
    setText('prev-clock',   timeStr);

    // Trigger visual animation on the clock display
    animateClock(timerSeconds);

    // Sync to server so the scoreboard page sees the live clock
    await postAPI('/api/time', { time: timeStr });

    // Auto-stop at zero
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerRunning  = false;
      setTimerButtonState(false);
      resetClockClasses();
      playBuzzer();   // 🔊 End-of-period buzzer
      await postAPI('/api/timer', { running: false });
    }
  }, 1000);
}

/** Format total seconds → "MM:SS" */
function formatTime(totalSecs) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Animate the clock display element based on remaining seconds.
 * Adds a tick pulse every second, switches to urgent/critical
 * colour states as time runs low.
 */
function animateClock(secs) {
  const el = document.getElementById('center-clock');
  if (!el) return;

  // Remove all state classes first
  el.classList.remove('tick', 'urgent', 'critical');

  // Force a reflow so re-adding the class re-triggers the animation
  void el.offsetWidth;

  if (secs <= 10) {
    el.classList.add('critical');
  } else if (secs <= 60) {
    el.classList.add('urgent');
  } else {
    el.classList.add('tick');
    // Remove the tick class after the animation completes
    setTimeout(() => el.classList.remove('tick'), 400);
  }
}

/** Strip all animation classes when the timer stops. */
function resetClockClasses() {
  const el = document.getElementById('center-clock');
  if (el) el.classList.remove('tick', 'urgent', 'critical');
}

/**
 * Play a basketball buzzer sound using the Web Audio API.
 * Synthesises a loud two-tone horn (no external files needed).
 */
function playBuzzer() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Main buzzer tone – low square wave
    const osc1 = ctx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(220, ctx.currentTime);       // A3
    osc1.frequency.setValueAtTime(196, ctx.currentTime + 0.5); // G3

    // Second harmonic – slightly detuned for thickness
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(223, ctx.currentTime);
    osc2.frequency.setValueAtTime(199, ctx.currentTime + 0.5);

    // Gain envelope – ramp up, sustain, fade out
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.05);  // attack
    gain.gain.setValueAtTime(0.35, ctx.currentTime + 1.0);            // sustain
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);      // release

    // Connect: oscillators → gain → speakers
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.5);
    osc2.stop(ctx.currentTime + 1.5);

    // Clean up after playback
    setTimeout(() => ctx.close(), 2000);
  } catch (e) {
    console.warn('Buzzer audio not supported:', e);
  }
}

/** Swap the toggle button between green ▶ and amber ⏸ */
function setTimerButtonState(running) {
  const btn = document.getElementById('timer-toggle-btn');
  if (!btn) return;
  if (running) {
    btn.textContent = '⏸ Pause Timer';
    btn.classList.remove('btn-success');
    btn.classList.add('btn-warning');
  } else {
    btn.textContent = '▶ Start Timer';
    btn.classList.remove('btn-warning');
    btn.classList.add('btn-success');
  }
}

// ── Score actions ────────────────────────────────────────────
async function addScore(team, points) {
  const data = await postAPI('/api/score', { team, points });
  if (data) updateAdminUI(data);
}

// ── Foul actions ─────────────────────────────────────────────
async function addFoul(team, action) {
  const data = await postAPI('/api/foul', { team, action });
  if (data) updateAdminUI(data);
}

// ── Timeout actions ──────────────────────────────────────────
async function useTimeout(team) {
  const data = await postAPI('/api/timeout', { team });
  if (data) updateAdminUI(data);
}

// ── Set clock from inputs ────────────────────────────────────
async function setClock() {
  // Pause the timer before changing time
  if (timerRunning) _pauseTimer();

  const mins = parseInt(document.getElementById('clock-min').value) || 0;
  const secs = parseInt(document.getElementById('clock-sec').value) || 0;
  timerSeconds = mins * 60 + secs;               // keep local state in sync
  const time   = formatTime(timerSeconds);
  const data   = await postAPI('/api/time', { time });
  if (data) updateAdminUI(data);
}

// ── Quarter ──────────────────────────────────────────────────
async function nextQuarter() {
  if (timerRunning) _pauseTimer();               // stop clock when quarter ends
  const data = await postAPI('/api/quarter', {});
  if (data) {
    updateAdminUI(data);
    // Sync local seconds to the reset time the server gave back
    const parts = data.time_remaining.split(':');
    timerSeconds = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  }
}

// ── Full reset ───────────────────────────────────────────────
async function resetGame() {
  if (!confirm('Reset the entire game? All scores and fouls will be cleared.')) return;
  if (timerRunning) _pauseTimer();
  const data = await postAPI('/api/reset', {});
  if (data) {
    updateAdminUI(data);
    timerSeconds = 600;   // 10:00 default
  }
}

// ── Player foul ──────────────────────────────────────────────
async function playerFoul(team, playerIndex) {
  const data = await postAPI('/api/player_foul', { team, player_index: playerIndex });
  if (data) updateAdminUI(data);
}

// ── Update ALL admin UI elements from a state object ─────────
function updateAdminUI(state) {
  // Team names
  setText('admin-t1-name',    state.team1.name);
  setText('admin-t2-name',    state.team2.name);
  setText('prev-team1-name',  state.team1.name);
  setText('prev-team2-name',  state.team2.name);

  // Scores (with pop animation)
  animateScore('admin-t1-score', state.team1.score);
  animateScore('admin-t2-score', state.team2.score);
  setText('prev-team1-score', state.team1.score);
  setText('prev-team2-score', state.team2.score);

  // Fouls & timeouts
  setText('admin-t1-fouls',    state.team1.fouls);
  setText('admin-t2-fouls',    state.team2.fouls);
  setText('admin-t1-timeouts', state.team1.timeouts);
  setText('admin-t2-timeouts', state.team2.timeouts);

  // Period
  setText('center-period', state.period_label);
  setText('prev-period',   state.period_label);

  // Clock – only update from server when timer is NOT running locally
  // (prevents the server's slightly stale value jumping ahead)
  if (!timerRunning) {
    setText('center-clock', state.time_remaining);
    setText('prev-clock',   state.time_remaining);
  }

  // Players
  renderAdminPlayers('admin-players-team1', state.team1.players, 'team1');
  renderAdminPlayers('admin-players-team2', state.team2.players, 'team2');

  // Team colour strips
  const s1 = document.getElementById('strip1');
  const s2 = document.getElementById('strip2');
  if (s1) s1.style.background = state.team1.color;
  if (s2) s2.style.background = state.team2.color;
}

function renderAdminPlayers(containerId, players, team) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = players.map((p, i) => `
    <div class="player-admin-row">
      <span class="player-num">#${p.number}</span>
      <span class="player-nm">${p.name}</span>
      <span class="player-fl" id="${team}p${i}-fouls">${p.fouls} fls</span>
      <button class="btn btn-xs btn-warning" onclick="playerFoul('${team}', ${i})" id="${team}p${i}-btn">Foul</button>
    </div>
  `).join('');
}

function animateScore(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.textContent !== String(value)) {
    el.textContent = value;
    el.classList.add('score-bump');
    setTimeout(() => el.classList.remove('score-bump'), 300);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Generic POST helper ──────────────────────────────────────
async function postAPI(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    return null;
  }
}

// ── Initialise on page load ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Apply data-color attributes as background styles (moved out of
  // inline Jinja2 to avoid IDE linter false-positives)
  document.querySelectorAll('[data-color]').forEach(el => {
    el.style.background = el.dataset.color;
  });
});

// ── Background poll – syncs non-clock state every 3 s ────────
async function pollState() {
  try {
    const res   = await fetch('/api/state');
    const state = await res.json();
    updateAdminUI(state);   // clock skipped if timer is running (see updateAdminUI)
  } catch (e) { /* silent */ }
}
setInterval(pollState, 3000);
