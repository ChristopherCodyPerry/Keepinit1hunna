const express = require("express");
const path = require("path");
const espn = require("./espn");
const sleeper = require("./sleeper");
const content = require("./contentStore");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// helpers

function asyncRoute(handler) {
  return (req, res) => {
    handler(req, res).catch((err) => {
      console.error(err);
      res.status(502).json({ error: "Upstream error", message: err.message });
    });
  };
}

// Sleeper-backed routes

app.get(
  "/api/league",
  asyncRoute(async (req, res) => res.json(await sleeper.getLeague())),
);

app.get(
  "/api/state",
  asyncRoute(async (req, res) => res.json(await sleeper.getNFLState())),
);

app.get(
  "/api/teams",
  asyncRoute(async (req, res) => res.json(await sleeper.getTeams())),
);

app.get(
  "/api/standings",
  asyncRoute(async (req, res) => res.json(await sleeper.getStandings())),
);

app.get(
  "/api/players",
  asyncRoute(async (req, res) => res.json(await sleeper.getPlayers())),
);

app.get(
  "/api/matchups/:week",
  asyncRoute(async (req, res) =>
    res.json(await sleeper.getWeekMatchups(req.params.week)),
  ),
);

app.get(
  "/api/matchup-of-the-week/:week",
  asyncRoute(async (req, res) =>
    res.json(await sleeper.getMatchupOfTheWeek(req.params.week)),
  ),
);

// A specific team's roster, with player names/positions filled in.
app.get(
  "/api/team/:rosterId",
  asyncRoute(async (req, res) => {
    const [teams, players] = await Promise.all([
      sleeper.getTeams(),
      sleeper.getPlayers(),
    ]);
    const team = teams.find(
      (t) => String(t.rosterId) === String(req.params.rosterId),
    );
    if (!team) return res.status(404).json({ error: "Team not found" });

    const roster = team.players.map((id) => ({
      playerId: id,
      isStarter: team.starters.includes(id),
      ...(players[id] || {
        name: `Unknown (${id})`,
        position: null,
        team: null,
      }),
    }));

    res.json({ ...team, roster });
  }),
);

// local content routes (news + blog)

app.get(
  "/api/news",
  asyncRoute(async (req, res) => res.json(await espn.getNFLNews())),
);

app.post("/api/news", (req, res) => {
  const { title, body } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required" });
  }
  res.status(201).json(content.addNews({ title, body }));
});

app.get("/api/blog", (req, res) => res.json(content.getBlogPosts()));

app.get("/api/blog/:week", (req, res) => {
  const post = content.getBlogPostByWeek(req.params.week);
  if (!post)
    return res.status(404).json({ error: "No post for that week yet" });
  res.json(post);
});

// Creates or replaces the post for a given week.
app.post("/api/blog", (req, res) => {
  const { week, title, body } = req.body || {};
  if (!week || !title || !body) {
    return res
      .status(400)
      .json({ error: "week, title, and body are required" });
  }
  res.status(201).json(content.upsertBlogPost({ week, title, body }));
});

app.listen(PORT, () => {
  console.log(`FFL league site running at http://localhost:${PORT}`);
  console.log(`Using Sleeper league ID: ${sleeper.LEAGUE_ID}`);
});
