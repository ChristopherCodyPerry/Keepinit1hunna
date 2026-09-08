const MAX_WEEK = 18;
let currentWeek = 1;

app.post("/api/blog", (req, res) => {
  const { week, title, body, password } = req.body || {};

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  if (!week || !title || !body) {
    return res
      .status(400)
      .json({ error: "week, title, and body are required" });
  }
  res.status(201).json(content.upsertBlogPost({ week, title, body }));
});

document.addEventListener("DOMContentLoaded", async () => {
  renderHeader("blog");
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
    loadPost();
  });

  loadPost();
});

function buildWeekSelect() {
  const select = document.getElementById("week-select");
  select.innerHTML = Array.from({ length: MAX_WEEK }, (_, i) => i + 1)
    .map((w) => `<option value="${w}">${w}</option>`)
    .join("");
}

function changeWeek(delta) {
  const next = currentWeek + delta;
  if (next < 1 || next > MAX_WEEK) return;
  currentWeek = next;
  document.getElementById("week-select").value = String(currentWeek);
  loadPost();
}

async function loadPost() {
  const mount = document.getElementById("blog-mount");
  const heading = document.getElementById("blog-heading");
  heading.textContent = ordinalWeek(currentWeek);
  showLoading(mount, "Loading post…");

  try {
    const post = await apiGet(`/blog/${currentWeek}`);
    mount.innerHTML = `
      <article class="blog-post">
        <div class="blog-meta">${ordinalWeek(post.week)} · ${formatDate(
          post.postedAt,
        )}</div>
        <h2>${escapeHtml(post.title)}</h2>
        <div class="blog-body">${escapeHtml(post.body)}</div>
      </article>
    `;
  } catch (err) {
    showEmpty(mount, `No blog post for ${ordinalWeek(currentWeek)} yet.`);
  }
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
