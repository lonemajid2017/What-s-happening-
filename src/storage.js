import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data");

const MAX_STORIES = 50;
const MAX_POSTS = 10;
const MAX_AGE_HOURS = 24;

await fs.mkdir(DATA_DIR, { recursive: true });

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

function getTime(value) {
  const time = new Date(value || 0).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function isWithin24Hours(item) {
  const publishedAt = getTime(
    item.publishedAt
  );

  if (!publishedAt) {
    return false;
  }

  const age =
    Date.now() - publishedAt;

  return (
    age >= 0 &&
    age <=
      MAX_AGE_HOURS *
        60 *
        60 *
        1000
  );
}

export async function addStories(stories) {
  const current =
    await readJson("news.json", {
      updatedAt: null,
      stories: []
    });

  const storyMap = new Map(
    Array.isArray(current.stories)
      ? current.stories.map(
          story => [story.id, story]
        )
      : []
  );

  for (const story of stories) {
    if (!story?.id) {
      continue;
    }

    storyMap.set(
      story.id,
      story
    );
  }

  const mergedStories =
    [...storyMap.values()]
      .filter(isWithin24Hours)
      .sort(
        (a, b) =>
          getTime(b.publishedAt) -
          getTime(a.publishedAt)
      )
      .slice(0, MAX_STORIES);

  await writeJson("news.json", {
    updatedAt:
      new Date().toISOString(),

    stories:
      mergedStories
  });

  return mergedStories;
}

export async function addPosts(posts) {
  const cleanPosts =
    Array.isArray(posts)
      ? posts.filter(
          post =>
            post &&
            post.id &&
            post.post
        )
      : [];

  const latestPosts =
    cleanPosts
      .sort(
        (a, b) =>
          getTime(b.publishedAt) -
          getTime(a.publishedAt)
      )
      .slice(0, MAX_POSTS);

  await writeJson("posts.json", {
    updatedAt:
      new Date().toISOString(),

    posts:
      latestPosts
  });

  return latestPosts;
}
