const SCORE_REFRESH_MS = 30000; // re-check live scores every 30s
let scoreRefreshTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  renderHeader("home");
  loadNews();
  loadMatchupOfWeek();
  startScoreAutoRefresh();
});

function startScoreAutoRefresh() {
  stopScoreAutoRefresh();
  scoreRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    loadMatchupOfWeek({ silent: true });
  }, SCORE_REFRESH_MS);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadMatchupOfWeek({ silent: true });
  });
}

function stopScoreAutoRefresh() {
  if (scoreRefreshTimer) clearInterval(scoreRefreshTimer);
  scoreRefreshTimer = null;
}

async function loadNews() {
  const mount = document.getElementById("news-mount");
  const tickerWrap = document.getElementById("ticker");
  const tickerTrack = document.getElementById("ticker-track");
  try {
    const news = await apiGet("/news");
    if (!news.length) {
      showEmpty(mount, "No news posted yet.");
      return;
    }

    mount.innerHTML = news
      .map(
        (n) => `
      <article class="news-card">
        <div class="news-date">${formatDate(n.postedAt)}</div>
        <h3>${n.link ? `<a href="${n.link}" target="_blank" rel="noopener">${escapeHtml(n.title)}</a>` : escapeHtml(n.title)}</h3>
        <p>${escapeHtml(n.body)}</p>
      </article>
    `,
      )
      .join("");

    const headlines = news.map((n) => n.title);
    tickerTrack.innerHTML = [...headlines, ...headlines]
      .map((h) => `<span>★ ${escapeHtml(h)}</span>`)
      .join("");
    tickerWrap.hidden = false;
  } catch (err) {
    showError(mount, err.message);
  }
}

async function loadMatchupOfWeek({ silent = false } = {}) {
  const mount = document.getElementById("motw-mount");
  const weekPill = document.getElementById("motw-week-pill");
  if (!silent) showLoading(mount, "Loading matchup…");

  try {
    const state = await apiGet("/state");
    const week = state.week || 1;
    weekPill.textContent = ordinalWeek(week);

    const matchup = await apiGet(`/matchup-of-the-week/${week}`);
    if (!matchup) {
      showEmpty(mount, "No matchups found for this week yet.");
      return;
    }

    const isLive =
      state.season_type !== "off" &&
      ["regular", "post"].includes(state.season_type);
    mount.innerHTML = renderScoreboard(matchup, state, isLive);
  } catch (err) {
    if (!silent) showError(mount, err.message);
  }
}

function renderScoreboard(matchup, state, isLive) {
  const { teamA, teamB } = matchup;
  return `
    <div class="scoreboard">
      <div class="scoreboard-row">
        <div class="scoreboard-team">
          <span class="record">${teamA.wins}-${teamA.losses}${
            teamA.ties ? `-${teamA.ties}` : ""
          }</span>
          <span class="team-name">${escapeHtml(teamA.teamName)}</span>
          <span class="owner">${escapeHtml(teamA.ownerName)}</span>
        </div>

        <div class="scoreboard-vs">
          <span class="scoreboard-score">${teamA.points.toFixed(1)}</span>
          <div class="scoreboard-divider"></div>
          <span class="scoreboard-score">${teamB.points.toFixed(1)}</span>
        </div>

        <div class="scoreboard-team right">
          <span class="record">${teamB.wins}-${teamB.losses}${
            teamB.ties ? `-${teamB.ties}` : ""
          }</span>
          <span class="team-name">${escapeHtml(teamB.teamName)}</span>
          <span class="owner">${escapeHtml(teamB.ownerName)}</span>
        </div>
      </div>
      <div class="scoreboard-footer">
        <span>Best combined record this week</span>
        <span style="display:flex; align-items:center; gap:8px;">
          ${isLive ? `<span class="pill live">Live</span>` : ""}
          <span class="pill">Updated ${formatTime(new Date())}</span>
        </span>
      </div>
    </div>
  `;
}

function formatTime(d) {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
