const MAX_WEEK = 18;
const SCORE_REFRESH_MS = 30000; // re-check live scores every 30s
let currentWeek = 1;
let refreshTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  renderHeader("matchups");
  buildWeekSelect();

  const state = await apiGet("/state").catch(() => null);
  currentWeek = state?.season_type === "regular" ? state.week : 1;
  document.getElementById("week-select").value = String(currentWeek);

  document
    .getElementById("prev-week")
    .addEventListener("click", () => changeWeek(-1));
  document
    .getElementById("next-week")
    .addEventListener("click", () => changeWeek(1));
  document.getElementById("week-select").addEventListener("change", (e) => {
    currentWeek = Number(e.target.value);
    loadMatchups();
    loadStandings();
  });

  loadMatchups();
  loadStandings();
  startAutoRefresh();
});

// Only worth auto-refreshing the *current* NFL week — past/future weeks
// won't have scores changing under you.
function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(async () => {
    if (document.hidden) return;
    const state = await apiGet("/state").catch(() => null);
    if (state && currentWeek === state.week) {
      loadMatchups({ silent: true });
      loadStandings({ silent: true });
    }
  }, SCORE_REFRESH_MS);

  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) return;
    const state = await apiGet("/state").catch(() => null);
    if (state && currentWeek === state.week) {
      loadMatchups({ silent: true });
      loadStandings({ silent: true });
    }
  });
}

function stopAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}

function buildWeekSelect() {
  const select = document.getElementById("week-select");
  select.innerHTML = Array.from({ length: MAX_WEEK }, (_, i) => i + 1)
    .map((w) => `<option value="${w}">Week ${w}</option>`)
    .join("");
}

function changeWeek(delta) {
  const next = currentWeek + delta;
  if (next < 1 || next > MAX_WEEK) return;
  currentWeek = next;
  document.getElementById("week-select").value = String(currentWeek);
  loadMatchups();
}

async function loadMatchups({ silent = false } = {}) {
  const mount = document.getElementById("matchups-mount");
  if (!silent) showLoading(mount, "Loading matchups…");
  try {
    const matchups = await apiGet(`/matchups/${currentWeek}`);
    if (!matchups.length) {
      showEmpty(mount, `No matchups found for ${ordinalWeek(currentWeek)}.`);
      return;
    }
    mount.innerHTML = matchups.map(renderMatchupCard).join("");
  } catch (err) {
    if (!silent) showError(mount, err.message);
  }
}

function renderMatchupCard(m) {
  const a = m.teamA;
  const b = m.teamB;
  if (!a || !b) {
    // Odd number of teams / bye week case.
    const solo = a || b;
    return `
      <div class="matchup-card">
        <div class="row"><span class="name">${escapeHtml(
          solo?.teamName || "TBD",
        )}</span><span class="pts">BYE</span></div>
      </div>
    `;
  }
  return `
    <div class="matchup-card">
      <div class="row">
        <span class="name">${escapeHtml(a.teamName)}</span>
        <span class="pts">${a.points.toFixed(1)}</span>
      </div>
      <div class="row">
        <span class="name">${escapeHtml(b.teamName)}</span>
        <span class="pts">${b.points.toFixed(1)}</span>
      </div>
    </div>
  `;
}

async function loadStandings({ silent = false } = {}) {
  const mount = document.getElementById("standings-mount");
  if (!silent) showLoading(mount, "Loading standings…");
  try {
    const standings = await apiGet("/standings");
    if (!standings.length) {
      showEmpty(mount, "No standings yet.");
      return;
    }
    mount.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>Owner</th>
            <th class="num">W</th>
            <th class="num">L</th>
            <th class="num">PF</th>
            <th class="num">PA</th>
          </tr>
        </thead>
        <tbody>
          ${standings
            .map(
              (t, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><a a href="Teams.html?rosterId=${t.rosterId}" class="standings-team-link">${escapeHtml(t.teamName)}</td>
              <td>${escapeHtml(t.ownerName)}</td>
              <td class="num">${t.wins}</td>
              <td class="num">${t.losses}</td>
              <td class="num">${t.pointsFor.toFixed(1)}</td>
              <td class="num">${t.pointsAgainst.toFixed(1)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    if (!silent) showError(mount, err.message);
  }
}
