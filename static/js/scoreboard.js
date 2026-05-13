/**
 * scoreboard.js – Live public scoreboard auto-refresh
 * Applied Computing 1&2 – Basketball Scoreboard
 */

// Poll every 2 seconds to keep the live display up-to-date
async function pollScoreboard() {
  try {
    const res = await fetch('/api/state');
    const state = await res.json();
    updateScoreboardUI(state);
  } catch (e) {
    console.warn('Polling error:', e);
  }
}

function updateScoreboardUI(state) {
  // Team names
  setText('team1-name', state.team1.name);
  setText('team2-name', state.team2.name);
  setText('players-team1-title', `${state.team1.name} Roster`);
  setText('players-team2-title', `${state.team2.name} Roster`);

  // Scores with bump animation
  animateScore('team1-score', state.team1.score);
  animateScore('team2-score', state.team2.score);

  // Stats
  setText('team1-fouls', state.team1.fouls);
  setText('team1-timeouts', state.team1.timeouts);
  setText('team2-fouls', state.team2.fouls);
  setText('team2-timeouts', state.team2.timeouts);

  // Period & clock
  setText('period-label', state.period_label);
  setText('clock', state.time_remaining);

  // Team colors
  const c1 = document.getElementById('team1-color');
  const c2 = document.getElementById('team2-color');
  if (c1) c1.style.background = state.team1.color;
  if (c2) c2.style.background = state.team2.color;

  // Game over banner
  const banner = document.getElementById('gameover-banner');
  if (banner) {
    if (state.game_over) {
      banner.style.display = 'block';
      const winner = state.team1.score >= state.team2.score
        ? state.team1.name : state.team2.name;
      setText('gameover-winner', winner);
    } else {
      banner.style.display = 'none';
    }
  }

  // Players
  renderPlayers('player-list-team1', state.team1.players);
  renderPlayers('player-list-team2', state.team2.players);
}

function renderPlayers(containerId, players) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!players || players.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No players listed</p>';
    return;
  }
  container.innerHTML = players.map(p => `
    <div class="sb-player-row">
      <span class="sb-player-number">#${p.number}</span>
      <span class="sb-player-name">${p.name}</span>
      <span class="sb-player-fouls">${p.fouls > 0 ? p.fouls + ' fouls' : ''}</span>
    </div>
  `).join('');
}

function animateScore(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.textContent !== String(value)) {
    el.textContent = value;
    el.classList.add('score-bump');
    setTimeout(() => el.classList.remove('score-bump'), 350);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el && el.textContent !== String(val)) el.textContent = val;
}

// Apply data-color attributes on initial load
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-color]').forEach(el => {
    el.style.background = el.dataset.color;
  });
});

// Start polling immediately and every 2 seconds
pollScoreboard();
setInterval(pollScoreboard, 2000);
