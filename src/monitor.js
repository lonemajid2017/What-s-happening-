import crypto from "node:crypto";

import { collectNews } from "./news.js";
import { generatePosts } from "./gemini.js";
import {
  addPosts,
  addStories,
  readJson,
  writeJson
} from "./storage.js";

function createId(text) {
  return crypto
    .createHash("sha256")
    .update(text)
    .digest("hex")
    .slice(0, 24);
}

async function main() {
  console.log("Starting What's Happening news monitor...");

  const stories = await collectNews();

  console.log(`Collected ${stories.length} important stories.`);

  await addStories(stories);

  const seen = await readJson("seen.json", {
    items: []
  });

  const seenIds = new Set(seen.items);

  const freshStories = stories
    .filter((story) => !seenIds.has(story.id))
    .filter((story) => story.importance >= 55)
    .slice(0, 12);

  console.log(
    `Found ${freshStories.length} new high-priority stories.`
  );

  if (freshStories.length === 0) {
    console.log("No new high-priority stories.");

    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.log(
      "GEMINI_API_KEY is not configured. Stories were saved, but posts were not generated."
    );

    for (const story of freshStories) {
      seenIds.add(story.id);
    }

    await writeJson("seen.json", {
      items: [...seenIds].slice(-1000)
    });

    return;
  }

  let generatedPosts = [];

  try {
    generatedPosts = await generatePosts(
      freshStories
    );
  } catch (error) {
    console.error(
      "Gemini generation failed:",
      error.message
    );

    process.exitCode = 1;
    return;
  }

  const posts = [];

  for (const generated of generatedPosts) {
    const story = freshStories.find(
      (item) => item.id === generated.storyId
    );

    if (!story) {
      continue;
    }

    const sourceNames =
      story.sources?.length > 0
        ? story.sources.join(", ")
        : story.source;

    const post = {
      id: createId(
        `${story.id}|${generated.post}`
      ),

      storyId: story.id,

      post: generated.post,

      source: sourceNames,

      url: story.url,

      category: story.category,

      importance: story.importance,

      publishedAt: story.publishedAt,

      createdAt: new Date().toISOString(),

      ready: true
    };

    posts.push(post);

    seenIds.add(story.id);
  }

  if (posts.length > 0) {
    await addPosts(posts);
  }

  await writeJson("seen.json", {
    items: [...seenIds].slice(-1000)
  });

  console.log(
    `Generated ${posts.length} Tweet Ready posts.`
  );

  console.log(
    JSON.stringify(
      {
        fetched: stories.length,
        fresh: freshStories.length,
        generated: posts.length,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "News monitor failed:",
    error
  );

  process.exitCode = 1;
});
