import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data");

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

export async function addStories(stories) {
  const current = await readJson("news.json", {
    updatedAt: null,
    stories: []
  });

  const storyMap = new Map(
    current.stories.map((story) => [story.id, story])
  );

  for (const story of stories) {
    storyMap.set(story.id, story);
  }

  const mergedStories = [...storyMap.values()]
    .sort(
      (a, b) =>
        new Date(b.publishedAt || 0) -
        new Date(a.publishedAt || 0)
    )
    .slice(0, 300);

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

  const postMap = new Map(
    current.posts.map((post) => [post.id, post])
  );

  for (const post of posts) {
    postMap.set(post.id, post);
  }

  const mergedPosts = [...postMap.values()]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    )
    .slice(0, 300);

  await writeJson("posts.json", {
    updatedAt: new Date().toISOString(),
    posts: mergedPosts
  });

  return mergedPosts;
                 }
