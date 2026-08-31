let teamsCache = [];

document.addEventListener("DOMContentLoaded", async () => {
  renderHeader("teams");
  await loadTeamList();

  document.getElementById("team-select").addEventListener("change", (e) => {
    loadRoster(e.target.value);
  });
});

async function loadTeamList() {
  const select = document.getElementById("team-select");
  const rosterMount = document.getElementById("roster-mount");
  try {
    teamsCache = await apiGet("/teams");
    if (!teamsCache.length) {
      showEmpty(rosterMount, "No teams found for this league yet.");
      return;
    }
    // Alphabetical by team name for an easy-to-scan picker.
    const sorted = [...teamsCache].sort((a, b) =>
      a.teamName.localeCompare(b.teamName),
    );
    select.innerHTML = sorted
      .map(
        (t) =>
          `<option value="${t.rosterId}">${escapeHtml(t.teamName)}</option>`,
      )
      .join("");

    const params = new URLSearchParams(window.location.search);
    const requestedRosterId = params.get("rosterId");
    const validIds = sorted.map((t) => String(t.rosterId));

    if (requestedRosterId && validIds.includes(requestedRosterId)) {
      select.value = requestedRosterId;
    }

    loadRoster(select.value);
  } catch (err) {
    showError(rosterMount, err.message);
  }
}

async function loadRoster(rosterId) {
  const rosterMount = document.getElementById("roster-mount");
  const metaMount = document.getElementById("team-meta-mount");
  const heading = document.getElementById("team-heading");
  showLoading(rosterMount, "Loading roster…");
  metaMount.innerHTML = "";

  try {
    const team = await apiGet(`/team/${rosterId}`);
    heading.textContent = team.teamName;

    metaMount.innerHTML = `
      <p class="page-subtitle">
        ${escapeHtml(team.ownerName)} &middot;
        ${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ""} &middot;
        ${team.pointsFor.toFixed(1)} pts for
      </p>
    `;

    if (!team.roster.length) {
      showEmpty(rosterMount, "No players on this roster yet.");
      return;
    }

    // Starters first, then bench, each alphabetized by position for scanability.
    const sorted = [...team.roster].sort((a, b) => {
      if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
      return (a.position || "").localeCompare(b.position || "");
    });

    rosterMount.innerHTML = sorted
      .map(
        (p) => `
      <div class="roster-row ${p.isStarter ? "starter" : ""}">
        <span class="pos">${escapeHtml(p.position || "-")}</span>
        <span class="player-name">${escapeHtml(
          p.name || "Unknown player",
        )}</span>
        <span class="player-team">${escapeHtml(p.team || "FA")}</span>
      </div>
    `,
      )
      .join("");
  } catch (err) {
    showError(rosterMount, err.message);
  }
}
