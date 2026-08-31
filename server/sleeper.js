const LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID || "1389720332146868224";
const BASE = "https://api.sleeper.app/v1";

// --- tiny in-memory cache -------------------------------------------------

const cache = new Map(); // key -> { data, expiresAt }

async function cached(key, ttlMs, fetcher) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  const data = await fetcher();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

async function getJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(
      `Sleeper API ${path} failed: ${res.status} ${res.statusText}`,
    );
  }
  return res.json();
}

// --- TTLs ------------------------------------------------------------------

const TTL_SHORT = 60 * 1000; // 1 min — matchups/live scores
const TTL_MEDIUM = 5 * 60 * 1000; // 5 min — rosters, standings
const TTL_LONG = 60 * 60 * 1000; // 1 hr — league/users
const TTL_DAY = 24 * 60 * 60 * 1000; // 1 day — player dictionary

// --- public functions --------------------------------------------------

function getLeague() {
  return cached("league", TTL_LONG, () => getJSON(`/league/${LEAGUE_ID}`));
}

function getUsers() {
  return cached("users", TTL_LONG, () => getJSON(`/league/${LEAGUE_ID}/users`));
}

function getRosters() {
  return cached("rosters", TTL_MEDIUM, () =>
    getJSON(`/league/${LEAGUE_ID}/rosters`),
  );
}

function getMatchups(week) {
  return cached(`matchups:${week}`, TTL_SHORT, () =>
    getJSON(`/league/${LEAGUE_ID}/matchups/${week}`),
  );
}

function getNFLState() {
  return cached("state", TTL_SHORT, () => getJSON(`/state/nfl`));
}

// The full player dictionary is huge (~5MB, every NFL player ever).
// We only keep the fields we actually use, to keep memory/JSON size sane.
function getPlayers() {
  return cached("players", TTL_DAY, async () => {
    const raw = await getJSON(`/players/nfl`);
    const slim = {};
    for (const [id, p] of Object.entries(raw)) {
      if (!p) continue;
      slim[id] = {
        name:
          p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        position: p.position,
        team: p.team,
      };
    }
    return slim;
  });
}

// --- derived helpers ------------------------------------------------------

// Joins rosters -> users so every team has an owner name / team name / avatar.
async function getTeams() {
  const [rosters, users] = await Promise.all([getRosters(), getUsers()]);
  const usersById = Object.fromEntries(users.map((u) => [u.user_id, u]));

  return rosters.map((r) => {
    const owner = usersById[r.owner_id] || {};
    const teamName =
      owner.metadata?.team_name || owner.display_name || `Team ${r.roster_id}`;
    return {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      teamName,
      ownerName: owner.display_name || "Unknown",
      avatar: owner.avatar || null,
      wins: r.settings?.wins ?? 0,
      losses: r.settings?.losses ?? 0,
      ties: r.settings?.ties ?? 0,
      pointsFor:
        (r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100,
      pointsAgainst:
        (r.settings?.fpts_against ?? 0) +
        (r.settings?.fpts_against_decimal ?? 0) / 100,
      players: r.players || [],
      starters: r.starters || [],
    };
  });
}

// Standings sorted by wins, then points for.
async function getStandings() {
  const teams = await getTeams();
  return [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  });
}

// Builds this week's matchups, each with both teams' info + live score attached.
async function getWeekMatchups(week) {
  const [rawMatchups, teams] = await Promise.all([
    getMatchups(week),
    getTeams(),
  ]);
  const teamsByRoster = Object.fromEntries(teams.map((t) => [t.rosterId, t]));

  const byMatchupId = new Map();
  for (const m of rawMatchups) {
    if (!byMatchupId.has(m.matchup_id)) byMatchupId.set(m.matchup_id, []);
    byMatchupId.get(m.matchup_id).push(m);
  }

  const pairs = [];
  for (const [matchupId, sides] of byMatchupId.entries()) {
    const [a, b] = sides;
    pairs.push({
      matchupId,
      teamA: a
        ? { ...teamsByRoster[a.roster_id], points: a.points ?? 0 }
        : null,
      teamB: b
        ? { ...teamsByRoster[b.roster_id], points: b.points ?? 0 }
        : null,
    });
  }
  return pairs;
}

// "Matchup of the week": among this week's pairs, pick the one where the two
// teams have the best combined season record (i.e. the two strongest teams
// that happen to be playing each other). Falls back to highest combined
// points if records are all tied (e.g. very early season).
async function getMatchupOfTheWeek(week) {
  const pairs = await getWeekMatchups(week);
  const complete = pairs.filter((p) => p.teamA && p.teamB);
  if (complete.length === 0) return null;

  complete.sort((p1, p2) => {
    const winsScore = (p) =>
      (p.teamA.wins + p.teamB.wins) * 1000 - // wins dominate
      (p.teamA.losses + p.teamB.losses);
    const w = winsScore(p2) - winsScore(p1);
    if (w !== 0) return w;
    const pts = (p) => p.teamA.pointsFor + p.teamB.pointsFor;
    return pts(p2) - pts(p1);
  });

  return complete[0];
}

module.exports = {
  LEAGUE_ID,
  getLeague,
  getUsers,
  getRosters,
  getMatchups,
  getNFLState,
  getPlayers,
  getTeams,
  getStandings,
  getWeekMatchups,
  getMatchupOfTheWeek,
};
