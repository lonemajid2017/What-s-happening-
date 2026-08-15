import fs from "node:fs/promises";

const USER_AGENT = "Whats-Happening/3.0";

const MAX_STORIES = 10;
const MAX_POSTS = 10;
const MAX_AGE_HOURS = 24;

const TOPIC_KEYWORDS = {
  USA: [
    "united states",
    "u.s.",
    "usa",
    "america",
    "american",
    "donald trump",
    "trump",
    "white house",
    "pentagon",
    "washington",
    "u.s. government",
    "us government",
    "us congress",
    "federal reserve"
  ],

  "Middle East": [
    "iran",
    "iranian",
    "israel",
    "israeli",
    "gaza",
    "palestine",
    "palestinian",
    "hamas",
    "hezbollah",
    "lebanon",
    "syria",
    "iraq",
    "yemen",
    "houthi",
    "saudi arabia",
    "qatar",
    "uae",
    "united arab emirates",
    "strait of hormuz",
    "middle east"
  ],

  China: [
    "china",
    "chinese",
    "beijing",
    "xi jinping",
    "taiwan",
    "taiwan strait",
    "south china sea"
  ],

  "Russia-Ukraine": [
    "russia",
    "russian",
    "ukraine",
    "ukrainian",
    "moscow",
    "kyiv",
    "zelensky",
    "putin",
    "kremlin"
  ],

  India: [
    "india",
    "indian",
    "new delhi",
    "narendra modi",
    "modi",
    "indian government",
    "rbi"
  ],

  World: [
    "nato",
    "united nations",
    "european union",
    "eu",
    "geopolitics",
    "sanctions",
    "diplomatic",
    "international crisis",
    "global crisis",
    "trade war"
  ],

  "AI & Tech": [
    "openai",
    "google",
    "microsoft",
    "nvidia",
    "artificial intelligence",
    "artificial intelligence",
    "ai chip",
    "technology"
  ],

  Finance: [
    "federal reserve",
    "interest rate",
    "interest rates",
    "inflation",
    "oil prices",
    "opec",
    "global markets",
    "stock market",
    "financial markets"
  ]
};

const TRUSTED_SOURCES = new Set([
  "Reuters",
  "Associated Press",
  "AP",
  "BBC",
  "BBC News",
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
  "AFP",
  "Agence France-Presse",
  "NPR",
  "The Hindu",
  "The Indian Express",
  "Hindustan Times"
]);

const LOW_VALUE_KEYWORDS = [
  "celebrity",
  "horoscope",
  "recipe",
  "weather forecast",
  "sports result",
  "football result",
  "cricket score",
  "movie review",
  "tv review",
  "lifestyle",
  "fashion",
  "entertainment",
  "shopping",
  "local council",
  "local election",
  "celebrity news"
];

const HIGH_IMPORTANCE_KEYWORDS = [
  "breaking",
  "developing",
  "war",
  "attack",
  "missile",
  "strike",
  "airstrike",
  "invasion",
  "ceasefire",
  "peace talks",
  "nuclear",
  "nuclear weapon",
  "sanctions",
  "tariff",
  "election",
  "president",
  "prime minister",
  "supreme court",
  "interest rate",
  "oil",
  "opec",
  "hostage",
  "terror attack",
  "diplomatic crisis",
  "international crisis",
  "military",
  "troops",
  "navy",
  "air force",
  "trade war",
  "strait"
];

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function ageMinutes(value) {
  const date = parseDate(value);

  if (!date) {
    return MAX_AGE_HOURS * 60;
  }

  return Math.max(
    0,
    (Date.now() - date.getTime()) / 60000
  );
}

function ageLabel(value) {
  const minutes = Math.floor(ageMinutes(value));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  return `${Math.floor(hours / 24)} days ago`;
}

function containsKeyword(text, keyword) {
  const value = text.toLowerCase();
  const key = keyword.toLowerCase();

  return value.includes(key);
}

function getCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  let bestCategory = "World";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(
    TOPIC_KEYWORDS
  )) {
    let score = 0;

    for (const keyword of keywords) {
      if (containsKeyword(text, keyword)) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function isLowValue(title, description) {
  const text =
    `${title} ${description}`.toLowerCase();

  return LOW_VALUE_KEYWORDS.some(
    keyword => text.includes(keyword)
  );
}

function isIndiaInternational(title, description) {
  const text =
    `${title} ${description}`.toLowerCase();

  const importantTerms = [
    "china",
    "pakistan",
    "russia",
    "ukraine",
    "iran",
    "israel",
    "united states",
    "usa",
    "america",
    "nato",
    "united nations",
    "sanctions",
    "tariff",
    "nuclear",
    "missile",
    "military",
    "war",
    "trade",
    "diplomatic",
    "international",
    "global"
  ];

  return importantTerms.some(
    term => text.includes(term)
  );
}

function isInternationallyRelevant(
  title,
  description,
  category
) {
  if (isLowValue(title, description)) {
    return false;
  }

  if (
    category === "USA" ||
    category === "Middle East" ||
    category === "China" ||
    category === "Russia-Ukraine"
  ) {
    return true;
  }

  if (category === "India") {
    return isIndiaInternational(
      title,
      description
    );
  }

  if (
    category === "World" ||
    category === "Finance" ||
    category === "AI & Tech"
  ) {
    const text =
      `${title} ${description}`.toLowerCase();

    return HIGH_IMPORTANCE_KEYWORDS.some(
      keyword => text.includes(keyword)
    );
  }

  return false;
}

function importanceScore(article) {
  const text =
    `${article.title} ${article.description}`.toLowerCase();

  let score = 30;

  if (TRUSTED_SOURCES.has(article.source)) {
    score += 20;
  }

  if (
    article.category === "USA" ||
    article.category === "Middle East" ||
    article.category === "China" ||
    article.category === "Russia-Ukraine"
  ) {
    score += 20;
  }

  if (article.category === "India") {
    score += 10;
  }

  for (const keyword of HIGH_IMPORTANCE_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 3;
    }
  }

  const age = ageMinutes(article.publishedAt);

  if (age <= 5) {
    score += 35;
  } else if (age <= 15) {
    score += 30;
  } else if (age <= 30) {
    score += 25;
  } else if (age <= 60) {
    score += 20;
  } else if (age <= 180) {
    score += 12;
  } else if (age <= 360) {
    score += 7;
  }

  return Math.min(
    100,
    Math.round(score)
  );
}

function createId(text) {
  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function normalizeArticle(article) {
  if (!article) {
    return null;
  }

  const title = cleanText(article.title);
  const description =
    cleanText(article.description);

  const source =
    cleanText(article.source || "Unknown");

  const url =
    normalizeUrl(article.url);

  const published =
    parseDate(article.publishedAt);

  if (!title || !url || !published) {
    return null;
  }

  const publishedAt =
    published.toISOString();

  if (
    ageMinutes(publishedAt) >
    MAX_AGE_HOURS * 60
  ) {
    return null;
  }

  const category =
    getCategory(
      title,
      description
    );

  const imageUrl =
    normalizeUrl(
      article.imageUrl ||
      article.urlToImage ||
      article.image ||
      null
    );

  const fingerprint =
    `${title.toLowerCase()}|${source.toLowerCase()}`;

  const result = {
    id: createId(fingerprint),
    title,
    description,
    source,
    url,
    category,
    publishedAt,
    age: ageLabel(publishedAt),
    ageMinutes: Math.round(
      ageMinutes(publishedAt)
    ),
    imageUrl,
    imageSource:
      imageUrl ? source : null,
    imageAvailable:
      Boolean(imageUrl),
    imageDownloadUrl:
      imageUrl,
    videoUrl:
      normalizeUrl(article.videoUrl),
    videoAvailable:
      Boolean(article.videoUrl),
    videoSource:
      article.videoUrl
        ? source
        : null,
    verified:
      TRUSTED_SOURCES.has(source),
    sources: [source],
    importance: 0,
    fetchedAt:
      new Date().toISOString()
  };

  result.importance =
    importanceScore(result);

  return result;
}

async function fetchJson(
  url,
  options = {}
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      options.timeout || 15000
    );

  try {
    const response =
      await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
          ...(options.headers || {})
        }
      });

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildQuery() {
  return [
    "Trump",
    "United States",
    "White House",
    "Iran",
    "Israel",
    "Gaza",
    "Middle East",
    "Russia",
    "Ukraine",
    "China",
    "Taiwan",
    "India",
    "NATO",
    "sanctions",
    "war",
    "ceasefire",
    "missile",
    "military",
    "attack",
    "oil",
    "Federal Reserve"
  ].join(" OR ");
}

async function fetchNewsAPI() {
  const key =
    process.env.NEWS_API_KEY;

  if (!key) {
    console.log(
      "NEWS_API_KEY not configured."
    );

    return [];
  }

  const from =
    new Date(
      Date.now() -
      MAX_AGE_HOURS * 60 * 60 * 1000
    ).toISOString();

  const url =
    "https://newsapi.org/v2/everything" +
    `?q=${encodeURIComponent(buildQuery())}` +
    `&from=${encodeURIComponent(from)}` +
    "&language=en" +
    "&sortBy=publishedAt" +
    "&pageSize=100" +
    `&apiKey=${encodeURIComponent(key)}`;

  try {
    const data =
      await fetchJson(url);

    return (
      data.articles || []
    ).map(article => ({
      title: article.title,
      description: article.description,
      source:
        article.source?.name ||
        "NewsAPI",
      url: article.url,
      imageUrl:
        article.urlToImage ||
        null,
      publishedAt:
        article.publishedAt
    }));
  } catch (error) {
    console.error(
      "NewsAPI failed:",
      error.message
    );

    return [];
  }
}

async function fetchGuardian() {
  const key =
    process.env.GUARDIAN_API_KEY;

  if (!key) {
    console.log(
      "GUARDIAN_API_KEY not configured."
    );

    return [];
  }

  const url =
    "https://content.guardianapis.com/search" +
    `?q=${encodeURIComponent(buildQuery())}` +
    "&order-by=newest" +
    "&page-size=100" +
    "&show-fields=trailText,thumbnail" +
    `&api-key=${encodeURIComponent(key)}`;

  try {
    const data =
      await fetchJson(url);

    return (
      data.response?.results || []
    ).map(article => ({
      title:
        article.webTitle,

      description:
        article.fields?.trailText ||
        "",

      source:
        "The Guardian",

      url:
        article.webUrl,

      imageUrl:
        article.fields?.thumbnail ||
        null,

      publishedAt:
        article.webPublicationDate
    }));
  } catch (error) {
    console.error(
      "Guardian failed:",
      error.message
    );

    return [];
  }
}

async function fetchArticleImage(url) {
  try {
    const response =
      await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml"
        },
        signal:
          AbortSignal.timeout(8000)
      });

    if (!response.ok) {
      return null;
    }

    const html =
      await response.text();

    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
    ];

    for (const pattern of patterns) {
      const match =
        html.match(pattern);

      if (match?.[1]) {
        const image =
          normalizeUrl(match[1]);

        if (image) {
          return image;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

function mergeDuplicates(stories) {
  const map = new Map();

  for (const story of stories) {
    const key =
      story.title
        .toLowerCase()
        .replace(
          /[^\p{L}\p{N}]+/gu,
          " "
        )
        .trim()
        .split(" ")
        .slice(0, 12)
        .join(" ");

    const existing =
      map.get(key);

    if (!existing) {
      map.set(key, {
        ...story,
        sources: [
          ...story.sources
        ]
      });

      continue;
    }

    const sources =
      new Set([
        ...existing.sources,
        ...story.sources
      ]);

    existing.sources =
      [...sources];

    existing.verified =
      existing.verified ||
      story.verified;

    if (
      story.importance >
      existing.importance
    ) {
      const oldSources =
        existing.sources;

      Object.assign(
        existing,
        story
      );

      existing.sources =
        oldSources;
    }

    if (
      !existing.imageUrl &&
      story.imageUrl
    ) {
      existing.imageUrl =
        story.imageUrl;

      existing.imageAvailable =
        true;

      existing.imageDownloadUrl =
        story.imageUrl;

      existing.imageSource =
        story.source;
    }
  }

  return [...map.values()];
}

function rankStories(stories) {
  return stories
    .filter(story =>
      isInternationallyRelevant(
        story.title,
        story.description,
        story.category
      )
    )
    .sort((a, b) => {
      const ageA =
        ageMinutes(
          a.publishedAt
        );

      const ageB =
        ageMinutes(
          b.publishedAt
        );

      let scoreA =
        a.importance;

      let scoreB =
        b.importance;

      scoreA -=
        Math.min(20, ageA / 120);

      scoreB -=
        Math.min(20, ageB / 120);

      return scoreB - scoreA;
    });
}

function selectStories(stories) {
  const selected = [];
  const categoryCount =
    new Map();

  for (const story of stories) {
    const count =
      categoryCount.get(
        story.category
      ) || 0;

    if (count >= 4) {
      continue;
    }

    selected.push(story);

    categoryCount.set(
      story.category,
      count + 1
    );

    if (
      selected.length >=
      MAX_STORIES
    ) {
      break;
    }
  }

  return selected;
}

async function enrichImages(stories) {
  const result =
    [...stories];

  const missing =
    result.filter(
      story => !story.imageUrl
    );

  for (const story of missing) {
    const image =
      await fetchArticleImage(
        story.url
      );

    if (image) {
      story.imageUrl =
        image;

      story.imageSource =
        story.source;

      story.imageAvailable =
        true;

      story.imageDownloadUrl =
        image;
    }
  }

  return result;
}

async function generateTweetPosts(
  stories
) {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log(
      "GEMINI_API_KEY not configured."
    );

    return [];
  }

  if (!stories.length) {
    return [];
  }

  const model =
    process.env.GEMINI_MODEL ||
    "gemini-3.5-flash";

  const storyData =
    stories.map(
      (story, index) => ({
        index,
        title: story.title,
        description:
          story.description,
        source: story.source,
        category:
          story.category,
        publishedAt:
          story.publishedAt,
        url: story.url
      })
    );

  const prompt = `
You are the editorial AI for a serious international news X account.

Create one concise X post for each supplied news story.

Rules:
- Focus only on major international significance.
- Prioritize USA, Middle East/Iran, China, Russia-Ukraine.
- India is allowed only when the story has clear international importance.
- Do not exaggerate.
- Do not invent facts.
- Do not add facts that are absent from the supplied story.
- Do not use hashtags.
- Do not use emojis.
- Keep each post under 280 characters when possible.
- Write naturally, like a professional news account.
- Clearly attribute important claims when needed.
- Do not start every post with the same phrase.
- Return ONLY valid JSON.
- Return an array.
- Each item must contain:
  storyIndex
  post

Stories:
${JSON.stringify(storyData)}
`;

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const response =
      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          "x-goog-api-key":
            apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType:
              "application/json"
          }
        }),
        signal:
          AbortSignal.timeout(30000)
      });

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `${response.status}: ${errorText}`
      );
    }

    const data =
      await response.json();

    const text =
      data.candidates?.[0]?.content
        ?.parts?.[0]?.text;

    if (!text) {
      throw new Error(
        "Gemini returned no text."
      );
    }

    let parsed;

    try {
      parsed =
        JSON.parse(text);
    } catch {
      const cleaned =
        text
          .replace(
            /^```json\s*/i,
            ""
          )
          .replace(
            /^```\s*/i,
            ""
          )
          .replace(
            /\s*```$/i,
            ""
          )
          .trim();

      parsed =
        JSON.parse(cleaned);
    }

    if (!Array.isArray(parsed)) {
      throw new Error(
        "Gemini response was not an array."
      );
    }

    return parsed
      .filter(
        item =>
          Number.isInteger(
            item.storyIndex
          ) &&
          typeof item.post ===
            "string" &&
          item.post.trim()
      )
      .slice(0, MAX_POSTS)
      .map(item => {
        const story =
          stories[item.storyIndex];

        if (!story) {
          return null;
        }

        return {
          id:
            createId(
              `${story.id}|${item.post}`
            ),

          storyId:
            story.id,

          post:
            item.post.trim(),

          source:
            story.source,

          url:
            story.url,

          category:
            story.category,

          importance:
            story.importance,

          verified:
            story.verified,

          publishedAt:
            story.publishedAt,

          age:
            ageLabel(
              story.publishedAt
            ),

          ageMinutes:
                        Math.round(
              ageMinutes(
                story.publishedAt
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
            story.imageUrl ||
            null,

          imageSource:
            story.imageUrl
              ? story.imageSource ||
                story.source
              : null,

          videoAvailable:
            Boolean(
              story.videoUrl
            ),

          videoUrl:
            story.videoUrl ||
            null,

          videoSource:
            story.videoUrl
              ? story.videoSource ||
                story.source
              : null,

          sources:
            story.sources,

          createdAt:
            new Date().toISOString(),

          ready: true
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error(
      "Gemini generation failed:",
      error.message
    );

    return [];
  }
}

async function saveJson(
  path,
  data
) {
  const lastSlash =
    path.lastIndexOf("/");

  if (lastSlash > 0) {
    await fs.mkdir(
      path.substring(
        0,
        lastSlash
      ),
      {
        recursive: true
      }
    );
  }

  await fs.writeFile(
    path,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );
}

export async function collectNews() {
  console.log(
    "Starting What's Happening news monitor..."
  );

  console.log(
    "Fetching latest major international news..."
  );

  console.log(
    "No 30-minute cutoff. Newest available stories are prioritized."
  );

  const results =
    await Promise.allSettled([
      fetchNewsAPI(),
      fetchGuardian()
    ]);

  const rawArticles =
    results.flatMap(
      result =>
        result.status ===
        "fulfilled"
          ? result.value
          : []
    );

  console.log(
    `Fetched ${rawArticles.length} raw articles.`
  );

  const normalized =
    rawArticles
      .map(normalizeArticle)
      .filter(Boolean);

  console.log(
    `${normalized.length} valid articles after normalization.`
  );

  const unique =
    mergeDuplicates(
      normalized
    );

  console.log(
    `${unique.length} unique stories after deduplication.`
  );

  const ranked =
    rankStories(unique);

  console.log(
    `${ranked.length} major international stories passed filtering.`
  );

  const selected =
    selectStories(ranked);

  console.log(
    `Selected ${selected.length} final stories.`
  );

  const storiesWithImages =
    await enrichImages(
      selected
    );

  const finalStories =
    storiesWithImages.map(
      story => ({
        ...story,

        age:
          ageLabel(
            story.publishedAt
          ),

        ageMinutes:
          Math.round(
            ageMinutes(
              story.publishedAt
            )
          ),

        imageAvailable:
          Boolean(
            story.imageUrl
          ),

        imageDownloadUrl:
          story.imageUrl ||
          null,

        imageSource:
          story.imageUrl
            ? story.imageSource ||
              story.source
            : null
      })
    );

  await saveJson(
    "data/news.json",
    {
      updatedAt:
        new Date().toISOString(),

      stories:
        finalStories
    }
  );

  console.log(
    `Saved ${finalStories.length} stories to data/news.json.`
  );

  const posts =
    await generateTweetPosts(
      finalStories
    );

  await saveJson(
    "data/posts.json",
    {
      updatedAt:
        new Date().toISOString(),

      posts
    }
  );

  console.log(
    `Generated ${posts.length} Tweet Ready posts.`
  );

  console.log(
    "Final selected stories:"
  );

  for (const story of finalStories) {
    console.log(
      `[${story.age}] ${story.category} | ${story.title} | image=${story.imageAvailable}`
    );
  }

  return finalStories;
}

if (
  process.argv[1] &&
  process.argv[1].endsWith(
    "monitor.js"
  )
) {
  collectNews()
    .then(() => {
      console.log(
        "News monitor completed successfully."
      );
    })
    .catch(error => {
      console.error(
        "News monitor failed:",
        error
      );

      process.exit(1);
    });
      }
