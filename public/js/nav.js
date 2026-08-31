function renderHeader(activePage) {
  const mount = document.getElementById("site-header");
  if (!mount) return;

  const links = [
    { id: "home", label: "Home", href: "index.html" },
    { id: "blog", label: "League Blog", href: "WeeklyBlog.html" },
    { id: "teams", label: "Teams", href: "Teams.html" },
    { id: "matchups", label: "Matchups", href: "MatchUps.html" },
  ];

  mount.innerHTML = `
    <div class="header-inner">
      <div class="nav-menu">
        <button class="nav-menu-btn" id="nav-toggle" aria-haspopup="true" aria-expanded="false">
          <span class="bars"><span></span><span></span><span></span></span>
          Menu
        </button>
        <nav class="nav-dropdown" id="nav-dropdown" role="menu">
          ${links
            .map(
              (l) => `
            <div class="nav-dropdown-row">
              <a class="nav-link ${
                l.id === activePage ? "active" : ""
              }" href="${l.href}" role="menuitem">${l.label}</a>
            </div>
          `,
            )
            .join("")}
        </nav>
      </div>
      <a class="brand" href="index.html">Keepin' it <span>1hunna</span></a>
    </div>
  `;

  const toggle = document.getElementById("nav-toggle");
  const dropdown = document.getElementById("nav-dropdown");

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== toggle) {
      dropdown.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dropdown.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}
