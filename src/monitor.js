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
const SEEN_RETENTION_HOURS = 6;

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

  return Number.isFinite(time) ? time : 0;
}

function getAgeMinutes(story) {
  if (Number.isFinite(story?.ageMinutes)) {
    return Math.max(0, story.ageMinutes);
  }

  const published = getPublishedTime(story);

  if (!published) {
    return Infinity;
  }

  return Math.max(
    0,
    (Date.now() - published) / 60000
  );
}

function isFreshStory(story) {
  const ageMinutes = getAgeMinutes(story);

  return (
    Number.isFinite(ageMinutes) &&
    ageMinutes >= 0 &&
    ageMinutes <= MAX_AGE_HOURS * 60
  );
}

function sortLatestFirst(a, b) {
  const ageA = getAgeMinutes(a);
  const ageB = getAgeMinutes(b);

  if (ageA !== ageB) {
    return ageA - ageB;
  }

  return (
    (b.importance || 0) -
    (a.importance || 0)
  );
}

function cleanSeenEntries(items) {
  const cutoff =
    Date.now() -
    SEEN_RETENTION_HOURS * 60 * 60 * 1000;

  return items.filter(item => {
    if (!item || !item.id) {
      return false;
    }

    const createdAt = new Date(
      item.createdAt || 0
    ).getTime();

    if (!createdAt) {
      return false;
    }

    return createdAt >= cutoff;
  });
}

function isRecentlySeen(story, seenEntries) {
  const now = Date.now();

  return seenEntries.some(entry => {
    if (entry.id !== story.id) {
      return false;
    }

    const createdAt = new Date(
      entry.createdAt || 0
    ).getTime();

    if (!createdAt) {
      return false;
    }

    return (
      now - createdAt <
      SEEN_RETENTION_HOURS * 60 * 60 * 1000
    );
  });
}

function makeSeenEntry(story) {
  return {
    id: story.id,
    createdAt: new Date().toISOString()
  };
}

async function main() {
  console.log(
    "Starting What's Happening news monitor..."
  );

  const stories = await collectNews();

  console.log(
    `Collected ${stories.length} important stories.`
  );

  await addStories(stories);

  const seenData = await readJson(
    "seen.json",
    {
      items: []
    }
  );

  const existingSeen =
    Array.isArray(seenData.items)
      ? seenData.items
      : [];

  const seenEntries =
    cleanSeenEntries(existingSeen);

  console.log(
    `${seenEntries.length} recently seen stories retained.`
  );

  const eligibleStories = stories
    .filter(isFreshStory)
    .filter(
      story =>
        story.importance >= MIN_IMPORTANCE
    )
    .sort(sortLatestFirst);

  console.log(
    `Found ${eligibleStories.length} fresh important stories within 24 hours.`
  );

  const unseenStories = eligibleStories.filter(
    story =>
      !isRecentlySeen(
        story,
        seenEntries
      )
  );

  let selectedStories =
    unseenStories.slice(0, MAX_POSTS);

  /*
   * If all current stories were recently seen,
   * use the latest important stories instead of
   * returning an empty queue.
   *
   * This prevents posts.json from becoming empty
   * simply because the monitor ran again.
   */
  if (selectedStories.length === 0) {
    selectedStories =
      eligibleStories.slice(0, MAX_POSTS);

    console.log(
      "No unseen stories found. Using latest important stories instead."
    );
  }

  console.log(
    `Selected ${selectedStories.length} latest stories.`
  );

  if (selectedStories.length === 0) {
    console.log(
      "No suitable stories available."
    );

    await addPosts([]);

    await writeJson(
      "seen.json",
      {
        items: seenEntries
      }
    );

    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.log(
      "GEMINI_API_KEY is not configured."
    );

    return;
  }

  let generatedPosts = [];

  try {
    generatedPosts =
      await generatePosts(
        selectedStories
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
  const newSeenEntries = [...seenEntries];

  for (const generated of generatedPosts) {
    const story =
      selectedStories.find(
        item =>
          item.id === generated.storyId
      );

    if (!story) {
      continue;
    }

    if (!isFreshStory(story)) {
      continue;
    }

    const sourceNames =
      Array.isArray(story.sources) &&
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
              getAgeMinutes(story)
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
        Array.isArray(story.sources)
          ? story.sources
          : [story.source],

      createdAt:
        new Date().toISOString(),

      ready:
        true
    };

    posts.push(post);

    newSeenEntries.push(
      makeSeenEntry(story)
    );
  }

  const finalPosts =
    posts
      .sort(
        (a, b) =>
          new Date(
            b.publishedAt || 0
          ).getTime() -
          new Date(
            a.publishedAt || 0
          ).getTime()
      )
      .slice(0, MAX_POSTS);

  await addPosts(finalPosts);

  await writeJson(
    "seen.json",
    {
      items: cleanSeenEntries(
        newSeenEntries
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

        selected:
          selectedStories.length,

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
