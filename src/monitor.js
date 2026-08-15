import crypto from "node:crypto";

import { collectNews } from "./news.js";
import { generatePosts } from "./gemini.js";
import {
  addPosts,
  addStories,
  readJson,
  writeJson
} from "./storage.js";

const MAX_POSTS = 10;
const MAX_AGE_HOURS = 24;
const MIN_IMPORTANCE = 55;

function createId(text) {
  return crypto
    .createHash("sha256")
    .update(text)
    .digest("hex")
    .slice(0, 24);
}

function getPublishedTime(story) {
  const time = new Date(
    story?.publishedAt || 0
  ).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function getAgeMinutes(story) {
  if (
    Number.isFinite(story?.ageMinutes)
  ) {
    return Math.max(
      0,
      story.ageMinutes
    );
  }

  const published =
    getPublishedTime(story);

  if (!published) {
    return Infinity;
  }

  return Math.max(
    0,
    (Date.now() - published) / 60000
  );
}

function isFreshStory(story) {
  const ageMinutes =
    getAgeMinutes(story);

  return (
    Number.isFinite(ageMinutes) &&
    ageMinutes >= 0 &&
    ageMinutes <=
      MAX_AGE_HOURS * 60
  );
}

function sortLatestFirst(a, b) {
  const ageA =
    getAgeMinutes(a);

  const ageB =
    getAgeMinutes(b);

  if (ageA !== ageB) {
    return ageA - ageB;
  }

  return (
    (b.importance || 0) -
    (a.importance || 0)
  );
}

async function main() {
  console.log(
    "Starting What's Happening news monitor..."
  );

  const stories =
    await collectNews();

  console.log(
    `Collected ${stories.length} important stories.`
  );

  await addStories(stories);

  const seen =
    await readJson("seen.json", {
      items: []
    });

  const seenIds =
    new Set(
      Array.isArray(seen.items)
        ? seen.items
        : []
    );

  const eligibleStories =
    stories
      .filter(isFreshStory)
      .filter(
        story =>
          story.importance >=
          MIN_IMPORTANCE
      )
      .sort(sortLatestFirst);

  console.log(
    `Found ${eligibleStories.length} fresh important stories within 24 hours.`
  );

  const freshStories =
    eligibleStories
      .filter(
        story =>
          !seenIds.has(story.id)
      )
      .slice(0, MAX_POSTS);

  console.log(
    `Selected ${freshStories.length} new latest stories.`
  );

  if (
    freshStories.length === 0
  ) {
    console.log(
      "No new latest stories available."
    );

    await addPosts([]);

    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.log(
      "GEMINI_API_KEY is not configured. Stories were saved, but posts were not generated."
    );

    return;
  }

  let generatedPosts = [];

  try {
    generatedPosts =
      await generatePosts(
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

  for (
    const generated of generatedPosts
  ) {
    const story =
      freshStories.find(
        item =>
          item.id ===
          generated.storyId
      );

    if (!story) {
      continue;
    }

    if (!isFreshStory(story)) {
      console.log(
        `Skipped expired story: ${story.title}`
      );

      continue;
    }

    const sourceNames =
      Array.isArray(
        story.sources
      ) &&
      story.sources.length > 0
        ? story.sources.join(", ")
        : story.source;

    const post = {
      id: createId(
        `${story.id}|${generated.post}`
      ),

      storyId:
        story.id,

      post:
        generated.post,

      source:
        sourceNames,

      url:
        story.url,

      category:
        story.category,

      importance:
        story.importance,

      verified:
        Boolean(
          story.verified
        ),

      publishedAt:
        story.publishedAt,

      age:
        story.age ||
        null,

      ageMinutes:
        Number.isFinite(
          story.ageMinutes
        )
          ? story.ageMinutes
          : Math.round(
              getAgeMinutes(
                story
              )
            ),

      imageAvailable:
        Boolean(
          story.imageUrl
        ),

      imageUrl:
        story.imageUrl ||
        null,

      imageDownloadUrl:
        story.imageDownloadUrl ||
        story.imageUrl ||
        null,

      imageSource:
        story.imageSource ||
        (
          story.imageUrl
            ? story.source
            : null
        ),

      videoAvailable:
        Boolean(
          story.videoUrl
        ),

      videoUrl:
        story.videoUrl ||
        null,

      videoSource:
        story.videoSource ||
        (
          story.videoUrl
            ? story.source
            : null
        ),

      sources:
        Array.isArray(
          story.sources
        )
          ? story.sources
          : [story.source],

      createdAt:
        new Date().toISOString(),

      ready:
        true
    };

    posts.push(post);

    seenIds.add(
      story.id
    );
  }

  posts.sort(
    (a, b) =>
      new Date(
        a.publishedAt || 0
      ) -
      new Date(
        b.publishedAt || 0
      )
  );

  posts.reverse();

  const finalPosts =
    posts.slice(
      0,
      MAX_POSTS
    );

  await addPosts(
    finalPosts
  );

  await writeJson(
    "seen.json",
    {
      items:
        [...seenIds].slice(
          -1000
        )
    }
  );

  console.log(
    `Generated ${finalPosts.length} Tweet Ready posts.`
  );

  console.log(
    JSON.stringify(
      {
        fetched:
          stories.length,

        eligible:
          eligibleStories.length,

        fresh:
          freshStories.length,

        generated:
          finalPosts.length,

        latestAgeMinutes:
          finalPosts.length > 0
            ? Math.min(
                ...finalPosts.map(
                  post =>
                    post.ageMinutes
                )
              )
            : null,

        withImages:
          finalPosts.filter(
            post =>
              post.imageAvailable
          ).length,

        withVideos:
          finalPosts.filter(
            post =>
              post.videoAvailable
          ).length,

        updatedAt:
          new Date().toISOString()
      },
      null,
      2
    )
  );
}

main().catch(error => {
  console.error(
    "News monitor failed:",
    error
  );

  process.exitCode = 1;
});
