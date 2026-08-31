const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "content.json");

function readAll() {
  if (!fs.existsSync(DATA_PATH)) {
    return { news: [], blogPosts: [] };
  }
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeAll(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

//  news

function getNews() {
  return readAll().news;
}

function addNews({ title, body }) {
  const data = readAll();
  const item = {
    id: Date.now(),
    title,
    body,
    postedAt: new Date().toISOString(),
  };
  data.news.unshift(item);
  writeAll(data);
  return item;
}

// blog

function getBlogPosts() {
  return readAll().blogPosts;
}

function getBlogPostByWeek(week) {
  const w = Number(week);
  return readAll().blogPosts.find((p) => p.week === w) || null;
}

function upsertBlogPost({ week, title, body }) {
  const data = readAll();
  const w = Number(week);
  const existingIndex = data.blogPosts.findIndex((p) => p.week === w);
  const post = {
    week: w,
    title,
    body,
    postedAt: new Date().toISOString(),
  };
  if (existingIndex >= 0) {
    data.blogPosts[existingIndex] = post;
  } else {
    data.blogPosts.push(post);
  }
  data.blogPosts.sort((a, b) => a.week - b.week);
  writeAll(data);
  return post;
}

module.exports = {
  getNews,
  addNews,
  getBlogPosts,
  getBlogPostByWeek,
  upsertBlogPost,
};
