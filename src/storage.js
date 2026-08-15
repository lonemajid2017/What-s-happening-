import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data");

const MAX_NEWS_AGE_HOURS = 24;
const MAX_STORED_NEWS = 50;
const MAX_STORED_POSTS = 10;

await fs.mkdir(DATA_DIR, { recursive: true });

function isWithin24Hours(dateValue) {
  if (!dateValue) {
    return false;
  }

  const timestamp = new Date(dateValue).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  const ageMs = Date.now() - timestamp;

  return (
    ageMs >= 0 &&
    ageMs <= MAX_NEWS_AGE_HOURS * 60 * 60 * 1000
  );
}

export async function readJson(fileName, fallback) {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    const content = await fs.readFile(filePath, "utf8");

    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

export async function writeJson(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);

  await fs.writeFile(
    filePath,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

export async function addStories(stories) {
  const current = await readJson("news.json", {
    updatedAt: null,
    stories: []
  });

  const storyMap = new Map();

  for (const story of current.stories || []) {
    if (
      isWithin24Hours(story.publishedAt)
    ) {
      storyMap.set(story.id, story);
    }
  }

  for (const story of stories || []) {
    if (
      isWithin24Hours(story.publishedAt)
    ) {
      storyMap.set(story.id, story);
    }
  }

  const mergedStories = [...storyMap.values()]
    .sort(
      (a, b) =>
        new Date(b.publishedAt || 0) -
        new Date(a.publishedAt || 0)
    )
    .slice(0, MAX_STORED_NEWS);

  await writeJson("news.json", {
    updatedAt: new Date().toISOString(),
    stories: mergedStories
  });

  return mergedStories;
}

export async function addPosts(posts) {
  const current = await readJson("posts.json", {
    updatedAt: null,
    posts: []
  });

  const postMap = new Map();

  for (const post of current.posts || []) {
    if (
      isWithin24Hours(post.publishedAt)
    ) {
      postMap.set(post.id, post);
    }
  }

  for (const post of posts || []) {
    if (
      isWithin24Hours(post.publishedAt)
    ) {
      postMap.set(post.id, post);
    }
  }

  const mergedPosts = [...postMap.values()]
    .sort(
      (a, b) =>
        new Date(b.publishedAt || b.createdAt || 0) -
        new Date(a.publishedAt || a.createdAt || 0)
    )
    .slice(0, MAX_STORED_POSTS);

  await writeJson("posts.json", {
    updatedAt: new Date().toISOString(),
    posts: mergedPosts
  });

  return mergedPosts;
}
