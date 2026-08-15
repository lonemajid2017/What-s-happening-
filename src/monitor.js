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
const MIN_IMPORTANCE = 55;
const SEEN_LIMIT = 1000;

const PREFERRED_SOURCES = new Set([
  "Reuters",
  "Associated Press",
  "AP",
  "BBC News",
  "BBC",
  "Al Jazeera",
  "Al Jazeera English",
  "CNN",
  "CNBC",
  "Bloomberg",
  "The Guardian",
  "The Washington Post",
  "The New York Times",
  "Financial Times",
  "The Wall Street Journal",
  "Politico",
  "DW",
  "Euronews",
  "Agence France-Presse",
  "AFP",
  "NPR",
  "The Hindu",
  "The Indian Express",
  "Hindustan Times"
]);

const LOW_QUALITY_SOURCES = new Set([
  "Devdiscourse",
  "Times of India",
  "Yahoo",
  "MSN",
  "Daily Mail",
  "Express",
  "Mirror",
  "New York Post"
]);

function createId(text) {
  return crypto
    .createHash("sha256")
    .update(text)
    .digest("hex")
    .slice(0, 24);
}

function getAgeMinutes(story) {
  if (Number.isFinite(story.ageMinutes)) {
    return Math.max(0, story.ageMinutes);
  }

  if (!story.publishedAt) {
    return 999999;
  }

  const published =
    new Date(story.publishedAt).getTime();

  if (Number.isNaN(published)) {
    return 999999;
  }

  return Math.max(
    0,
    (Date.now() - published) / 60000
  );
}

function getFreshnessScore(story) {
  const age = getAgeMinutes(story);

  if (age <= 5) return 100;
  if (age <= 15) return 90;
  if (age <= 30) return 80;
  if (age <= 60) return 70;
  if (age <= 180) return 55;
  if (age <= 360) return 40;
  if (age <= 720) return 25;
  if (age <= 1440) return 10;

  return 0;
}

function getSourceScore(story) {
  const sources = Array.isArray(story.sources)
    ? story.sources
    : [story.source];

  if (
    sources.some(source =>
      PREFERRED_SOURCES.has(source)
    )
  ) {
    return 35;
  }

  if (
    sources.some(source =>
      LOW_QUALITY_SOURCES.has(source)
    )
  ) {
    return -35;
  }

  return 0;
}

function getFinalScore(story) {
  const importance =
    Number.isFinite(story.importance)
      ? story.importance
      : 0;

  return (
    importance +
    getFreshnessScore(story) +
    getSourceScore(story)
  );
}

function isLowQualitySource(story) {
  const sources = Array.isArray(story.sources)
    ? story.sources
    : [story.source];

  return sources.some(source =>
    LOW_QUALITY_SOURCES.has(source)
  );
}

function isUsableStory(story) {
  if (!story || !story.id) {
    return false;
  }

  if (!story.title || !story.url) {
    return false;
  }

  if (
    !Number.isFinite(story.importance) ||
    story.importance < MIN_IMPORTANCE
  ) {
    return false;
  }

  if (isLowQualitySource(story)) {
    return false;
  }

  const age = getAgeMinutes(story);

  if (age > 24 * 60) {
    return false;
  }

  return true;
}

function sortStories(stories) {
  return [...stories].sort((a, b) => {
    const scoreA = getFinalScore(a);
    const scoreB = getFinalScore(b);

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    return (
      getAgeMinutes(a) -
      getAgeMinutes(b)
    );
  });
}

function selectFreshStories(
  stories,
  seenIds
) {
  const usable =
    stories
      .filter(isUsableStory)
      .filter(
        story => !seenIds.has(story.id)
      );

  const preferred =
    usable.filter(story => {
      const sources = Array.isArray(story.sources)
        ? story.sources
        : [story.source];

      return sources.some(source =>
        PREFERRED_SOURCES.has(source)
      );
    });

  const fallback =
    usable.filter(story => {
      const sources = Array.isArray(story.sources)
        ? story.sources
        : [story.source];

      return !sources.some(source =>
        PREFERRED_SOURCES.has(source)
      );
    });

  const sortedPreferred =
    sortStories(preferred);

  const sortedFallback =
    sortStories(fallback);

  const selected = [];

  for (const story of sortedPreferred) {
    if (selected.length >= MAX_POSTS) {
      break;
    }

    selected.push(story);
  }

  if (selected.length < MAX_POSTS) {
    for (const story of sortedFallback) {
      if (selected.length >= MAX_POSTS) {
        break;
      }

      selected.push(story);
    }
  }

  return selected;
}

function buildPost(story, generated) {
  const sourceNames =
    story.sources?.length > 0
      ? story.sources.join(", ")
      : story.source;

  const currentAgeMinutes =
    Math.round(getAgeMinutes(story));

  return {
    id: createId(
      `${story.id}|${generated.post}`
    ),

    storyId: story.id,

    post: generated.post,

    source: sourceNames,

    url: story.url,

    category: story.category,

    importance: story.importance,

    verified: Boolean(story.verified),

    publishedAt: story.publishedAt,

    age:
      story.age || null,

    ageMinutes:
      currentAgeMinutes,

    imageAvailable:
      Boolean(story.imageUrl),

    imageUrl:
      story.imageUrl || null,

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
      Boolean(story.videoUrl),

    videoUrl:
      story.videoUrl || null,

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

    ready: true
  };
}

async function saveSeenIds(seenIds) {
  await writeJson("seen.json", {
    items:
      [...seenIds].slice(-SEEN_LIMIT)
  });
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

  if (!Array.isArray(stories)) {
    throw new Error(
      "collectNews() did not return an array."
    );
  }

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

  const freshStories =
    selectFreshStories(
      stories,
      seenIds
    );

  console.log(
    `Found ${freshStories.length} fresh high-priority stories.`
  );

  for (const story of freshStories) {
    console.log(
      `[${story.age || "just now"}] ${story.title}`
    );
  }

  if (freshStories.length === 0) {
    console.log(
      "No fresh high-priority stories available."
    );

    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.log(
      "GEMINI_API_KEY is not configured. Stories were saved, but posts were not generated."
    );

    for (const story of freshStories) {
      seenIds.add(story.id);
    }

    await saveSeenIds(seenIds);

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

  if (!Array.isArray(generatedPosts)) {
    throw new Error(
      "Gemini did not return a valid posts array."
    );
  }

  const posts = [];

  for (const generated of generatedPosts) {
    if (
      !generated ||
      !generated.storyId ||
      !generated.post
    ) {
      continue;
    }

    const story =
      freshStories.find(
        item =>
          item.id ===
          generated.storyId
      );

    if (!story) {
      continue;
    }

    posts.push(
      buildPost(
        story,
        generated
      )
    );

    seenIds.add(story.id);
  }

  if (posts.length > 0) {
    await addPosts(posts);
  }

  await saveSeenIds(seenIds);

  console.log(
    `Generated ${posts.length} Tweet Ready posts.`
  );

  console.log(
    JSON.stringify(
      {
        fetched:
          stories.length,

        eligible:
          stories.filter(
            isUsableStory
          ).length,

        fresh:
          freshStories.length,

        generated:
          posts.length,

        withImages:
          posts.filter(
            post =>
              post.imageAvailable
          ).length,

        withVideos:
          posts.filter(
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
