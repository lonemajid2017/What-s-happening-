const USER_AGENT = "Whats-Happening/4.0";

const MAX_STORIES = 10;
const MAX_AGE_HOURS = 24;

const TOPICS = {
  USA: [
    "united states",
    "usa",
    "u.s.",
    "america",
    "american",
    "donald trump",
    "trump",
    "white house",
    "us congress",
    "congress",
    "pentagon",
    "federal reserve",
    "washington"
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
    "uae",
    "qatar",
    "middle east",
    "tehran",
    "jerusalem",
    "tel aviv"
  ],

  China: [
    "china",
    "chinese",
    "beijing",
    "xi jinping",
    "taiwan",
    "taiwan strait",
    "south china sea",
    "chinese military",
    "pla"
  ],

  "Russia-Ukraine": [
    "russia",
    "russian",
    "ukraine",
    "ukrainian",
    "moscow",
    "kyiv",
    "zelensky",
    "zelenskyy",
    "putin",
    "kremlin",
    "russian military",
    "ukrainian military"
  ],

  India: [
    "india",
    "indian",
    "new delhi",
    "narendra modi",
    "modi",
    "indian government",
    "rbi",
    "reserve bank of india",
    "india pakistan",
    "india china",
    "india iran",
    "india russia",
    "mea"
  ],

  World: [
    "nato",
    "united nations",
    "un",
    "european union",
    "eu",
    "geopolitics",
    "international",
    "diplomatic",
    "diplomacy",
    "global crisis",
    "international crisis",
    "global security",
    "world leaders"
  ],

  "AI & Tech": [
    "openai",
    "chatgpt",
    "google ai",
    "google",
    "microsoft",
    "nvidia",
    "artificial intelligence",
    "ai model",
    "ai company",
    "technology regulation",
    "semiconductor",
    "semiconductors",
    "chip export"
  ],

  Finance: [
    "federal reserve",
    "interest rate",
    "interest rates",
    "inflation",
    "oil prices",
    "crude oil",
    "opec",
    "global markets",
    "stock market",
    "financial markets",
    "economy",
    "economic policy",
    "tariff",
    "tariffs"
  ]
};

const TRUSTED_SOURCES = new Set([
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

const LOW_VALUE_KEYWORDS = [
  "celebrity",
  "horoscope",
  "recipe",
  "movie review",
  "tv review",
  "lifestyle",
  "fashion",
  "shopping",
  "restaurant",
  "food review",
  "travel guide",
  "real estate",
  "local council",
  "local election",
  "school district",
  "football result",
  "cricket score",
  "sports result",
  "transfer news",
  "player injury",
  "entertainment",
  "box office",
  "concert",
  "festival"
];

const MAJOR_EVENT_KEYWORDS = [
  "breaking",
  "developing",
  "urgent",
  "war",
  "attack",
  "attacks",
  "missile",
  "missiles",
  "strike",
  "strikes",
  "airstrike",
  "airstrikes",
  "invasion",
  "offensive",
  "ceasefire",
  "peace talks",
  "peace deal",
  "nuclear",
  "nuclear weapon",
  "nuclear weapons",
  "hostage",
  "hostages",
  "terror attack",
  "terrorist attack",
  "bombing",
  "explosion",
  "military",
  "troops",
  "sanctions",
  "tariff",
  "tariffs",
  "election",
  "presidential election",
  "president",
  "prime minister",
  "supreme court",
  "federal reserve",
  "interest rate",
  "oil",
  "opec",
  "earthquake",
  "tsunami",
  "diplomatic crisis",
  "international crisis",
  "national security",
  "export controls",
  "trade war",
  "cyberattack",
  "cyber attack",
  "major announcement",
  "government announces",
  "government announced",
  "resigns",
  "resignation",
  "dies",
  "death"
];

const INTERNATIONAL_TERMS = [
  "war",
  "attack",
  "missile",
  "strike",
  "airstrike",
  "invasion",
  "offensive",
  "ceasefire",
  "peace talks",
  "peace deal",
  "nuclear",
  "hostage",
  "sanctions",
  "tariff",
  "tariffs",
  "election",
  "president",
  "prime minister",
  "military",
  "troops",
  "diplomatic",
  "diplomacy",
  "international",
  "global",
  "trade war",
  "oil",
  "opec",
  "federal reserve",
  "interest rate",
  "supreme court",
  "export controls",
  "semiconductor",
  "chip export",
  "artificial intelligence",
  "ai model",
  "cyberattack",
  "nuclear weapon"
];

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createId(text) {
  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function normalizeUrl(url) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(String(url).trim());

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return null;
    }

    return parsed.toString();
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

function getAgeMinutes(publishedAt) {
  const date = parseDate(publishedAt);

  if (!date) {
    return MAX_AGE_HOURS * 60 + 1;
  }

  const age =
    (Date.now() - date.getTime()) / 60000;

  return Math.max(0, age);
}

function getAgeLabel(publishedAt) {
  const minutes = Math.floor(
    getAgeMinutes(publishedAt)
  );

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

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function isWithin24Hours(publishedAt) {
  const age = getAgeMinutes(publishedAt);

  return (
    age >= 0 &&
    age <= MAX_AGE_HOURS * 60
  );
}

function getArticleText(article) {
  return cleanText(
    `${article.title || ""} ${article.description || ""}`
  ).toLowerCase();
}

function getCategory(title, description) {
  const text =
    `${title || ""} ${description || ""}`.toLowerCase();

  let bestCategory = "World";
  let bestMatches = 0;

  for (const [category, keywords] of Object.entries(TOPICS)) {
    let matches = 0;

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matches++;
      }
    }

    if (matches > bestMatches) {
      bestMatches = matches;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function isLowValue(article) {
  const text = getArticleText(article);

  return LOW_VALUE_KEYWORDS.some(
    keyword =>
      text.includes(keyword.toLowerCase())
  );
}

function countMatches(text, keywords) {
  let count = 0;

  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      count++;
    }
  }

  return count;
}

function isInternationallyRelevant(article) {
  const text = getArticleText(article);
  const category = article.category;

  if (isLowValue(article)) {
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
    return (
      countMatches(
        text,
        INTERNATIONAL_TERMS
      ) >= 1
    );
  }

  if (category === "World") {
    return (
      countMatches(
        text,
        INTERNATIONAL_TERMS
      ) >= 1
    );
  }

  if (category === "Finance") {
    return (
      countMatches(
        text,
        INTERNATIONAL_TERMS
      ) >= 1
    );
  }

  if (category === "AI & Tech") {
    return (
      text.includes("openai") ||
      text.includes("chatgpt") ||
      text.includes("google ai") ||
      text.includes("microsoft") ||
      text.includes("nvidia") ||
      text.includes("artificial intelligence") ||
      text.includes("ai model") ||
      text.includes("semiconductor") ||
      text.includes("chip export")
    );
  }

  return false;
}

function getImportance(
  title,
  description,
  source,
  publishedAt
) {
  const text =
    `${title || ""} ${description || ""}`.toLowerCase();

  const category =
    getCategory(
      title,
      description
    );

  let score = 20;

  if (TRUSTED_SOURCES.has(source)) {
    score += 15;
  }

  if (
    category === "USA" ||
    category === "Middle East" ||
    category === "China" ||
    category === "Russia-Ukraine"
  ) {
    score += 20;
  }

  if (category === "India") {
    score += 10;
  }

  if (category === "World") {
    score += 8;
  }

  if (category === "AI & Tech") {
    score += 8;
  }

  if (category === "Finance") {
    score += 5;
  }

  const majorMatches =
    countMatches(
      text,
      MAJOR_EVENT_KEYWORDS
    );

  score += Math.min(
    30,
    majorMatches * 5
  );

  if (isLowValue({ title, description })) {
    score -= 40;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}

function normalizeArticle(article) {
  if (!article) {
    return null;
  }

  const title =
    cleanText(article.title);

  const description =
    cleanText(article.description);

  const source =
    cleanText(
      article.source || "Unknown"
    );

  const url =
    normalizeUrl(article.url);

  if (!title || !url) {
    return null;
  }

  const published =
    parseDate(article.publishedAt);

  if (!published) {
    return null;
  }

  const publishedAt =
    published.toISOString();

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

  const videoUrl =
    normalizeUrl(
      article.videoUrl ||
      null
    );

  const fingerprint =
    title
      .toLowerCase()
      .replace(
        /\b(live|update|breaking|latest)\b/g,
        ""
      )
      .replace(
        /[^\p{L}\p{N}]+/gu,
        " "
      )
      .trim()
      .slice(0, 220);

  return {
    id:
      createId(
        `${fingerprint}|${source.toLowerCase()}`
      ),

    title,
    description,
    source,
    url,

    imageUrl,

    imageSource:
      imageUrl
        ? source
        : null,

    imageAvailable:
      Boolean(imageUrl),

    imageDownloadUrl:
      imageUrl || null,

    videoUrl,

    videoSource:
      videoUrl
        ? source
        : null,

    videoAvailable:
      Boolean(videoUrl),

    publishedAt,

    age:
      getAgeLabel(publishedAt),

    ageMinutes:
      Math.round(
        getAgeMinutes(
          publishedAt
        )
      ),

    category,

    importance:
      getImportance(
        title,
        description,
        source,
        publishedAt
      ),

    verified:
      TRUSTED_SOURCES.has(source),

    sources: [
      source
    ],

    fetchedAt:
      new Date().toISOString()
  };
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
      await fetch(
        url,
        {
          ...options,

          signal:
            controller.signal,

          headers: {
            "User-Agent":
              USER_AGENT,

            Accept:
              "application/json",

            ...(options.headers || {})
          }
        }
      );

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

async function fetchArticleMedia(url) {
  if (!url) {
    return {
      imageUrl: null,
      videoUrl: null
    };
  }

  try {
    const response =
      await fetch(
        url,
        {
          headers: {
            "User-Agent":
              USER_AGENT,

            Accept:
              "text/html,application/xhtml+xml"
          },

          signal:
            AbortSignal.timeout(
              10000
            )
        }
      );

    if (!response.ok) {
      return {
        imageUrl: null,
        videoUrl: null
      };
    }

    const html =
      await response.text();

    const imagePatterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
    ];

    const videoPatterns = [
      /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video["']/i,
      /<meta[^>]+property=["']og:video:url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video:url["']/i
    ];

    let imageUrl = null;
    let videoUrl = null;

    for (const pattern of imagePatterns) {
      const match =
        html.match(pattern);

      if (match?.[1]) {
        imageUrl =
          normalizeUrl(match[1]);

        if (imageUrl) {
          break;
        }
      }
    }

    for (const pattern of videoPatterns) {
      const match =
        html.match(pattern);

      if (match?.[1]) {
        videoUrl =
          normalizeUrl(match[1]);

        if (videoUrl) {
          break;
        }
      }
    }

    return {
      imageUrl,
      videoUrl
    };
  } catch {
    return {
      imageUrl: null,
      videoUrl: null
    };
  }
}

async function addMediaToSelectedStories(stories) {
  const result =
    stories.map(
      story => ({
        ...story
      })
    );

  const batchSize = 3;

  for (
    let i = 0;
    i < result.length;
    i += batchSize
  ) {
    const batch =
      result.slice(
        i,
        i + batchSize
      );

    const mediaResults =
      await Promise.all(
        batch.map(
          story =>
            fetchArticleMedia(
              story.url
            )
        )
      );

    for (
      let j = 0;
      j < batch.length;
      j++
    ) {
      const story =
        batch[j];

      const media =
        mediaResults[j];

      if (
        !story.imageUrl &&
        media.imageUrl
      ) {
        story.imageUrl =
          media.imageUrl;

        story.imageSource =
          story.source;

        story.imageAvailable =
          true;

        story.imageDownloadUrl =
          media.imageUrl;
      }

      if (
        !story.videoUrl &&
        media.videoUrl
      ) {
        story.videoUrl =
          media.videoUrl;

        story.videoSource =
          story.source;

        story.videoAvailable =
          true;
      }
    }
  }

  return result;
}

function buildRegionalQueries() {
  return [
    "Trump OR \"White House\" OR Pentagon OR \"US Congress\"",

    "Iran OR Israel OR Gaza OR Hezbollah OR Houthi OR \"Middle East\"",

    "China OR Taiwan OR Beijing OR \"Xi Jinping\"",

    "Russia OR Ukraine OR Putin OR Zelensky OR Zelenskyy",

    "India AND (Modi OR government OR diplomacy OR China OR Pakistan OR Iran OR Russia)",

    "NATO OR sanctions OR geopolitics OR \"United Nations\"",

    "OpenAI OR ChatGPT OR \"Google AI\" OR Microsoft OR Nvidia OR \"artificial intelligence\"",

    "\"Federal Reserve\" OR \"interest rates\" OR oil OR OPEC OR tariffs"
  ];
}

async function fetchNewsAPIQuery(query) {
  const apiKey =
    process.env.NEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const from =
    new Date(
      Date.now() -
      MAX_AGE_HOURS *
      60 *
      60 *
      1000
    ).toISOString();

  const url =
    "https://newsapi.org/v2/everything" +
    `?q=${encodeURIComponent(query)}` +
    `&from=${encodeURIComponent(from)}` +
    "&language=en" +
    "&sortBy=publishedAt" +
    "&pageSize=50" +
    `&apiKey=${encodeURIComponent(apiKey)}`;

  try {
    const data =
      await fetchJson(url);

    return (
      data.articles || []
    ).map(
      article => ({
        title:
          article.title,

        description:
          article.description,

        source:
          article.source?.name ||
          "NewsAPI",

        url:
          article.url,

        imageUrl:
          article.urlToImage ||
          null,

        publishedAt:
          article.publishedAt
      })
    );
  } catch (error) {
    console.error(
      "NewsAPI request failed:",
      error.message
    );

    return [];
  }
}

async function fetchNewsAPI() {
  const queries =
    buildRegionalQueries();

  const results =
    await Promise.all(
      queries.map(
        query =>
          fetchNewsAPIQuery(
            query
          )
      )
    );

  return results.flat();
}

async function fetchGNewsQuery(query) {
  const apiKey =
    process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const url =
    "https://gnews.io/api/v4/search" +
    `?q=${encodeURIComponent(query)}` +
    "&lang=en" +
    "&max=20" +
    "&sortby=publishedAt" +
    `&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const data =
      await fetchJson(url);

    return (
      data.articles || []
    ).map(
      article => ({
        title:
          article.title,

        description:
          article.description,

        source:
          article.source?.name ||
          "GNews",

        url:
          article.url,

        imageUrl:
          article.image ||
          null,

        publishedAt:
          article.publishedAt
      })
    );
  } catch (error) {
    console.error(
      "GNews request failed:",
      error.message
    );

    return [];
  }
}

async function fetchGNews() {
  const queries =
    buildRegionalQueries();

  const results =
    await Promise.all(
      queries.map(
        query =>
          fetchGNewsQuery(
            query
          )
      )
    );

  return results.flat();
}

async function fetchGuardianQuery(query) {
  const apiKey =
    process.env.GUARDIAN_API_KEY;

  if (!apiKey) {
    return [];
  }

  const url =
    "https://content.guardianapis.com/search" +
    `?q=${encodeURIComponent(query)}` +
    "&order-by=newest" +
    "&page-size=30" +
    "&show-fields=trailText" +
    "&show-elements=image" +
    `&api-key=${encodeURIComponent(apiKey)}`;

  try {
    const data =
      await fetchJson(url);

    return (
      data.response?.results || []
    ).map(
      article => {
        let imageUrl = null;

        const imageElement =
          article.elements?.find(
            element =>
              element.type ===
              "image"
          );

        if (
          imageElement?.assets?.length
        ) {
          const assets =
            imageElement.assets;

          const preferred =
            assets.find(
              asset =>
                asset.type ===
                "image"
            ) ||
            assets[
              assets.length - 1
            ];

          imageUrl =
            preferred?.file ||
            null;
        }

        return {
          title:
            article.webTitle,

          description:
            article.fields
              ?.trailText ||
            "",

          source:
            "The Guardian",

          url:
            article.webUrl,

          imageUrl,

          publishedAt:
            article.webPublicationDate
        };
      }
    );
  } catch (error) {
    console.error(
      "Guardian request failed:",
      error.message
    );

    return [];
  }
}

async function fetchGuardian() {
  const queries =
    buildRegionalQueries();

  const results =
    await Promise.all(
      queries.map(
        query =>
          fetchGuardianQuery(
            query
          )
      )
    );

  return results.flat();
}

function normalizeTitle(title) {
  return cleanText(title)
    .toLowerCase()
    .replace(
      /\b(live|update|breaking|latest)\b/g,
      ""
    )
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " "
    )
    .trim();
}

function titleSimilarity(a, b) {
  const wordsA =
    new Set(
      normalizeTitle(a)
        .split(" ")
        .filter(
          word =>
            word.length > 2
        )
    );

  const wordsB =
    new Set(
      normalizeTitle(b)
        .split(" ")
        .filter(
          word =>
            word.length > 2
        )
    );

  if (
    wordsA.size === 0 ||
    wordsB.size === 0
  ) {
    return 0;
  }

  let common = 0;

  for (const word of wordsA) {
    if (wordsB.has(word)) {
      common++;
    }
  }

  return (
    common /
    Math.max(
      wordsA.size,
      wordsB.size
    )
  );
}

function mergeDuplicateStories(stories) {
  const groups = [];

  const sorted =
    [...stories].sort(
      (a, b) =>
        getAgeMinutes(
          a.publishedAt
        ) -
        getAgeMinutes(
          b.publishedAt
        )
    );

  for (const story of sorted) {
    let matched = null;

    for (const group of groups) {
      const sameUrl =
        group.url ===
        story.url;

      const similar =
        titleSimilarity(
          group.title,
          story.title
        ) >= 0.72;

      if (
        sameUrl ||
        similar
      ) {
        matched = group;
        break;
      }
    }

    if (!matched) {
      groups.push({
        ...story,
        sources: [
          ...(story.sources ||
            [story.source])
        ]
      });

      continue;
    }

    const sourceSet =
      new Set([
        ...(matched.sources ||
          []),
        ...(story.sources ||
          [story.source])
      ]);

    matched.sources =
      [...sourceSet].slice(
        0,
        5
      );

    matched.verified =
      matched.verified ||
      story.verified;

    matched.importance =
      Math.max(
        matched.importance,
        story.importance
      );

    if (
      getAgeMinutes(
        story.publishedAt
      ) <
      getAgeMinutes(
        matched.publishedAt
      )
    ) {
      matched.publishedAt =
        story.publishedAt;

      matched.age =
        story.age;

      matched.ageMinutes =
        story.ageMinutes;
    }

    if (
      !matched.imageUrl &&
      story.imageUrl
    ) {
      matched.imageUrl =
        story.imageUrl;

      matched.imageSource =
        story.imageSource ||
        story.source;

      matched.imageAvailable =
        true;

      matched.imageDownloadUrl =
        story.imageUrl;
    }

    if (
      !matched.videoUrl &&
      story.videoUrl
    ) {
      matched.videoUrl =
        story.videoUrl;

      matched.videoSource =
        story.videoSource ||
        story.source;

      matched.videoAvailable =
        true;
    }
  }

  return groups;
}

function getFreshnessScore(ageMinutes) {
  if (ageMinutes <= 1) {
    return 60;
  }

  if (ageMinutes <= 5) {
    return 55;
  }

  if (ageMinutes <= 10) {
    return 52;
  }

  if (ageMinutes <= 30) {
    return 48;
  }

  if (ageMinutes <= 60) {
    return 43;
  }

  if (ageMinutes <= 120) {
    return 37;
  }

  if (ageMinutes <= 180) {
    return 32;
  }

  if (ageMinutes <= 360) {
    return 25;
  }

  if (ageMinutes <= 720) {
    return 16;
  }

  return 8;
}

function calculateFinalScore(story) {
  const age =
    getAgeMinutes(
      story.publishedAt
    );

  let score =
    story.importance;

  score +=
    getFreshnessScore(
      age
    );

  if (
    story.sources?.length >= 3
  ) {
    score += 15;
  } else if (
    story.sources?.length >= 2
  ) {
    score += 8;
  }

  if (story.verified) {
    score += 8;
  }

  if (story.imageAvailable) {
    score += 3;
  }

  if (story.videoAvailable) {
    score += 5;
  }

  return score;
}

function rankStories(stories) {
  return stories
    .filter(
      story =>
        isWithin24Hours(
          story.publishedAt
        )
    )
    .filter(
      story =>
        !isLowValue(story)
    )
    .filter(
      story =>
        isInternationallyRelevant(
          story
        )
    )
    .map(
      story => ({
        ...story,

        finalScore:
          calculateFinalScore(
            story
          )
      })
    )
    .sort(
      (a, b) => {
        if (
          b.finalScore !==
          a.finalScore
        ) {
          return (
            b.finalScore -
            a.finalScore
          );
        }

        return (
          getAgeMinutes(
            a.publishedAt
          ) -
          getAgeMinutes(
            b.publishedAt
          )
        );
      }
    );
}

function selectFinalStories(ranked) {
  const selected = [];

  const categoryCount =
    new Map();

  const sourceCount =
    new Map();

  for (const story of ranked) {
    const category =
      story.category;

    const categoryUsed =
      categoryCount.get(
        category
      ) || 0;

    if (
      categoryUsed >= 3
    ) {
      continue;
    }

    const source =
      story.source;

    const sourceUsed =
      sourceCount.get(
        source
      ) || 0;

    if (
      sourceUsed >= 4
    ) {
      continue;
    }

    selected.push(
      story
    );

    categoryCount.set(
      category,
      categoryUsed + 1
    );

    sourceCount.set(
      source,
      sourceUsed + 1
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

export async function collectNews() {
  console.log(
    "Starting What's Happening news monitor..."
  );

  console.log(
    "Fetching latest major international news..."
  );

  console.log(
    "Latest news has highest priority."
  );

  console.log(
    "No 30-minute cutoff."
  );

  console.log(
    "Maximum news age: 24 hours."
  );

  const results =
    await Promise.allSettled([
      fetchNewsAPI(),
      fetchGNews(),
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
      .map(
        normalizeArticle
      )
      .filter(Boolean);

  console.log(
    `${normalized.length} valid articles after normalization.`
  );

  const recent =
    normalized.filter(
      story =>
        isWithin24Hours(
          story.publishedAt
        )
    );

  console.log(
    `${recent.length} articles are within the last 24 hours.`
  );

  const uniqueStories =
    mergeDuplicateStories(
      recent
    );

  console.log(
    `${uniqueStories.length} unique stories after deduplication.`
  );

  const ranked =
    rankStories(
      uniqueStories
    );

  console.log(
    `${ranked.length} major international stories passed strict filtering.`
  );

  const selected =
    selectFinalStories(
      ranked
    );

  console.log(
    `Selected ${selected.length} final stories.`
  );

  const withMedia =
    await addMediaToSelectedStories(
      selected
    );

  const finalStories =
    withMedia.map(
      story => ({
        ...story,

        age:
          getAgeLabel(
            story.publishedAt
          ),

        ageMinutes:
          Math.round(
            getAgeMinutes(
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
            : null,

        videoAvailable:
          Boolean(
            story.videoUrl
          ),

        videoSource:
          story.videoUrl
            ? story.videoSource ||
              story.source
            : null
      })
    );

  console.log(
    "FINAL SELECTED NEWS:"
  );

  for (
    const story of finalStories
  ) {
    console.log(
      `[${story.age}] ${story.category} | ${story.title} | ${story.source} | image=${story.imageAvailable} | video=${story.videoAvailable}`
    );
  }

  console.log(
    `Finished. ${finalStories.length} stories ready for tweet generation.`
  );

  return finalStories;
}
