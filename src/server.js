import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectNews } from "./news.js";
import {
  generatePosts,
  generateReplies
} from "./gemini.js";

import {
  addPosts,
  addStories,
  readJson
} from "./storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(
  process.env.PORT || 3000
);

app.use(express.json({ limit: "1mb" }));

app.use(
  express.static(
    path.resolve(__dirname, "../public")
  )
);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,

    gemini:
      Boolean(process.env.GEMINI_API_KEY),

    newsApi:
      Boolean(process.env.NEWS_API_KEY),

    gnews:
      Boolean(process.env.GNEWS_API_KEY),

    guardian:
      Boolean(process.env.GUARDIAN_API_KEY),

    coingecko:
      Boolean(process.env.COINGECKO_API_KEY)
  });
});

app.get("/api/news", async (_req, res) => {
  try {
    const data = await readJson(
      "news.json",
      {
        updatedAt: null,
        stories: []
      }
    );

    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.get("/api/posts", async (_req, res) => {
  try {
    const data = await readJson(
      "posts.json",
      {
        updatedAt: null,
        posts: []
      }
    );

    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.post("/api/refresh", async (_req, res) => {
  try {
    const stories =
      await collectNews();

    await addStories(stories);

    const importantStories =
      stories
        .filter(
          (story) =>
            story.importance >= 55
        )
        .slice(0, 12);

    let generated = [];

    if (
      process.env.GEMINI_API_KEY &&
      importantStories.length > 0
    ) {
      generated =
        await generatePosts(
          importantStories
        );
    }

    const posts =
      generated
        .map((item) => {
          const story =
            importantStories.find(
              (news) =>
                news.id === item.storyId
            );

          if (!story) {
            return null;
          }

          const sources =
            story.sources?.length
              ? story.sources.join(", ")
              : story.source;

          return {
            id: `${story.id}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}`,

            storyId: story.id,

            post: item.post,

            source: sources,

            url: story.url,

            category:
              story.category,

            importance:
              story.importance,

            publishedAt:
              story.publishedAt,

            createdAt:
              new Date().toISOString(),

            ready: true
          };
        })
        .filter(Boolean);

    if (posts.length > 0) {
      await addPosts(posts);
    }

    res.json({
      success: true,
      stories,
      posts
    });
  } catch (error) {
    console.error(
      "Refresh failed:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post("/api/replies", async (req, res) => {
  try {
    const text =
      String(
        req.body?.text || ""
      ).trim();

    if (!text) {
      return res.status(400).json({
        error:
          "Please provide an X post."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error:
          "Gemini API is not configured."
      });
    }

    const replies =
      await generateReplies(text);

    res.json({
      success: true,
      replies
    });
  } catch (error) {
    console.error(
      "Reply generation failed:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get("*splat", (_req, res) => {
  res.sendFile(
    path.resolve(
      __dirname,
      "../public/index.html"
    )
  );
});

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `What's Happening is running on port ${PORT}`
    );
  }
);
