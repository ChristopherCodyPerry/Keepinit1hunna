async function apiGet(path) {
  const res = await fetch(`/api${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function showError(mountEl, message) {
  mountEl.innerHTML = `<div class="error-state">Couldn't load this: ${escapeHtml(
    message,
  )}</div>`;
}

function showEmpty(mountEl, message) {
  mountEl.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function showLoading(mountEl, message = "Loading…") {
  mountEl.innerHTML = `<div class="loading-state">${escapeHtml(message)}</div>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function ordinalWeek(week) {
  return `Week ${week}`;
}
