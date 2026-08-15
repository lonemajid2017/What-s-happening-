const USER_AGENT = "Whats-Happening/3.0";

const MAX_STORIES = 10;
const MAX_AGE_HOURS = 24;
const BREAKING_WINDOW_MINUTES = 30;

const TOPICS = {
  USA: [
    "united states",
    "usa",
    "u.s.",
    "america",
    "american",
    "trump",
    "donald trump",
    "white house",
    "us congress",
    "congress",
    "pentagon",
    "federal reserve",
    "washington",
    "nato",
    "tariff",
    "sanctions"
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
    "west bank",
    "red sea",
    "strait of hormuz"
  ],

  China: [
    "china",
    "chinese",
    "beijing",
    "xi jinping",
    "taiwan",
    "taiwan strait",
    "south china sea",
    "chinese government",
    "pla",
    "people's liberation army"
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
    "crimea",
    "donbas"
  ],

  India: [
    "india",
    "indian",
    "new delhi",
    "modi",
    "narendra modi",
    "indian government",
    "rbi",
    "india-pakistan",
    "india china",
    "indian army",
    "indian navy",
    "indian air force"
  ],

  World: [
    "nato",
    "united nations",
    "european union",
    "geopolitics",
    "sanctions",
    "diplomatic",
    "diplomacy",
    "global",
    "international",
    "g7",
    "g20",
    "un security council",
    "security council"
  ],

  "AI & Tech": [
    "openai",
    "chatgpt",
    "google",
    "gemini",
    "microsoft",
    "nvidia",
    "artificial intelligence",
    "ai",
    "technology",
    "semiconductor",
    "chip",
    "chips"
  ],

  Finance: [
    "federal reserve",
    "interest rates",
    "inflation",
    "oil prices",
    "global markets",
    "stock market",
    "economy",
    "opec",
    "oil",
    "markets",
    "tariffs"
  ]
};

const TRUSTED_SOURCES = new Set([
  "Reuters",
  "Reuters News",
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
  "restaurant",
  "travel guide",
  "local council",
  "local election",
  "obituary",
  "birthday"
];

const HIGH_IMPORTANCE_KEYWORDS = [
  "breaking",
  "developing",
  "urgent",
  "war",
  "attack",
  "missile",
  "missiles",
  "strike",
  "airstrike",
  "invasion",
  "ceasefire",
  "peace talks",
  "nuclear",
  "nuclear weapon",
  "nuclear weapons",
  "iran",
  "iranian",
  "israel",
  "israeli",
  "gaza",
  "hamas",
  "hezbollah",
  "russia",
  "russian",
  "ukraine",
  "ukrainian",
  "china",
  "taiwan",
  "trump",
  "white house",
  "pentagon",
  "sanctions",
  "tariff",
  "tariffs",
  "election",
  "president",
  "prime minister",
  "supreme court",
  "federal reserve",
  "interest rate",
  "oil",
  "opec",
  "earthquake",
  "tsunami",
  "terror attack",
  "hostage",
  "diplomatic crisis",
  "international crisis",
  "peace deal",
  "trade war",
  "military",
  "troops",
  "border",
  "coup"
];

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
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
    const parsed = new URL(url);

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
    return MAX_AGE_HOURS * 60;
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

function getCategory(title, description) {
  const text =
    `${title} ${description}`.toLowerCase();

  let bestCategory = "World";
  let bestMatches = 0;

  for (const [category, keywords] of Object.entries(
    TOPICS
  )) {
    let matches = 0;

    for (const keyword of keywords) {
      if (
        text.includes(
          keyword.toLowerCase()
        )
      ) {
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
  const text =
    `${article.title} ${article.description}`.toLowerCase();

  return LOW_VALUE_KEYWORDS.some(
    keyword => text.includes(keyword)
  );
}

function hasHighImportanceKeyword(article) {
  const text =
    `${article.title} ${article.description}`.toLowerCase();

  return HIGH_IMPORTANCE_KEYWORDS.some(
    keyword => text.includes(keyword)
  );
}

function isInternationallyRelevant(article) {
  const text =
    `${article.title} ${article.description}`.toLowerCase();

  const category = article.category;

  if (
    category === "USA" ||
    category === "Middle East" ||
    category === "China" ||
    category === "Russia-Ukraine"
  ) {
    return true;
  }

  if (
    category === "World" ||
    category === "Finance" ||
    category === "AI & Tech"
  ) {
    return hasHighImportanceKeyword(article);
  }

  if (category === "India") {
    const internationalTerms = [
      "war",
      "attack",
      "sanctions",
      "tariff",
      "tariffs",
      "election",
      "president",
      "prime minister",
      "diplomatic",
      "china",
      "pakistan",
      "nuclear",
      "international",
      "global",
      "russia",
      "ukraine",
      "iran",
      "israel",
      "usa",
      "united states",
      "nato",
      "trade",
      "military",
      "border"
    ];

    return internationalTerms.some(
      term => text.includes(term)
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
    `${title} ${description}`.toLowerCase();

  let score = 20;

  if (
    TRUSTED_SOURCES.has(source)
  ) {
    score += 25;
  }

  const category =
    getCategory(
      title,
      description
    );

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
    score += 5;
  }

  if (category === "Finance") {
    score += 5;
  }

  for (
    const keyword of HIGH_IMPORTANCE_KEYWORDS
  ) {
    if (
      text.includes(
        keyword
      )
    ) {
      score += 3;
    }
  }

  const ageMinutes =
    getAgeMinutes(
      publishedAt
    );

  if (
    ageMinutes <=
    BREAKING_WINDOW_MINUTES
  ) {
    score += 40;
  } else if (ageMinutes <= 60) {
    score += 30;
  } else if (ageMinutes <= 180) {
    score += 20;
  } else if (ageMinutes <= 360) {
    score += 12;
  } else if (ageMinutes <= 720) {
    score += 6;
  }

  if (
    isLowValue({
      title,
      description
    })
  ) {
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
    cleanText(
      article.title
    );

  const description =
    cleanText(
      article.description
    );

  const source =
    cleanText(
      article.source ||
      "Unknown"
    );

  const url =
    normalizeUrl(
      article.url
    );

  if (!title || !url) {
    return null;
  }

  const parsedDate =
    parseDate(
      article.publishedAt
    );

  if (!parsedDate) {
    return null;
  }

  const publishedAt =
    parsedDate.toISOString();

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
    `${title
      .toLowerCase()
      .replace(
        /[^\p{L}\p{N}]+/gu,
        " "
      )
      .trim()
      .slice(0, 180)}|${source.toLowerCase()}`;

  return {
    id:
      createId(
        fingerprint
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
      getAgeLabel(
        publishedAt
      ),

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
      TRUSTED_SOURCES.has(
        source
      ),

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
    clearTimeout(
      timeout
    );
  }
}

async function fetchArticleMedia(
  url
) {
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
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video:url["']/i,
      /<meta[^>]+name=["']twitter:player:stream["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:player:stream["']/i
    ];

    let imageUrl = null;
    let videoUrl = null;

    for (
      const pattern of imagePatterns
    ) {
      const match =
        html.match(
          pattern
        );

      if (
        match?.[1]
      ) {
        imageUrl =
          normalizeUrl(
            match[1]
          );

        if (imageUrl) {
          break;
        }
      }
    }

    for (
      const pattern of videoPatterns
    ) {
      const match =
        html.match(
          pattern
        );

      if (
        match?.[1]
      ) {
        videoUrl =
          normalizeUrl(
            match[1]
          );

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

async function addMediaToSelectedStories(
  stories
) {
  const result =
    stories.map(
      story => ({
        ...story
      })
    );

  const candidates =
    result.filter(
      story =>
        !story.imageUrl ||
        !story.videoUrl
    );

  const batchSize = 3;

  for (
    let i = 0;
    i < candidates.length;
    i += batchSize
  ) {
    const batch =
      candidates.slice(
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
        result.find(
          item =>
            item.id ===
            batch[j].id
        );

      if (!story) {
        continue;
      }

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

function buildNewsQuery() {
  return [
    "\"United States\"",
    "Trump",
    "\"White House\"",
    "Iran",
    "Israel",
    "Gaza",
    "\"Middle East\"",
    "Russia",
    "Ukraine",
    "China",
    "Taiwan",
    "India",
    "Modi",
    "geopolitics",
    "NATO",
    "sanctions",
    "war",
    "ceasefire",
    "missile",
    "attack",
    "nuclear",
    "oil",
    "\"Federal Reserve\"",
    "OpenAI",
    "Nvidia"
  ].join(" OR ");
}

async function fetchNewsAPI() {
  const apiKey =
    process.env.NEWS_API_KEY;

  if (!apiKey) {
    console.log(
      "NEWS_API_KEY not configured."
    );

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

  const query =
    encodeURIComponent(
      buildNewsQuery()
    );

  const url =
    "https://newsapi.org/v2/everything" +
    `?q=${query}` +
    `&from=${encodeURIComponent(from)}` +
    "&language=en" +
    "&sortBy=publishedAt" +
    "&pageSize=100" +
    `&apiKey=${encodeURIComponent(apiKey)}`;

  try {
    const data =
      await fetchJson(
        url
      );

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

async function fetchGNews() {
  const apiKey =
    process.env.GNEWS_API_KEY;

  if (!apiKey) {
    console.log(
      "GNEWS_API_KEY not configured."
    );

    return [];
  }

  const query =
    encodeURIComponent(
      buildNewsQuery()
    );

  const url =
    "https://gnews.io/api/v4/search" +
    `?q=${query}` +
    "&lang=en" +
    "&max=100" +
    "&sortby=publishedAt" +
    `&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const data =
      await fetchJson(
        url
      );

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

async function fetchGuardian() {
  const apiKey =
    process.env.GUARDIAN_API_KEY;

  if (!apiKey) {
    console.log(
      "GUARDIAN_API_KEY not configured."
    );

    return [];
  }

  const query =
    encodeURIComponent(
      buildNewsQuery()
    );

  const url =
    "https://content.guardianapis.com/search" +
    `?q=${query}` +
    "&order-by=newest" +
    "&page-size=100" +
    "&show-fields=trailText" +
    "&show-elements=image" +
    `&api-key=${encodeURIComponent(apiKey)}`;

  try {
    const data =
      await fetchJson(
        url
      );

    return (
      data.response?.results ||
      []
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
          imageElement?.assets
            ?.length
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

function mergeDuplicateStories(
  stories
) {
  const groups =
    new Map();

  for (
    const story of stories
  ) {
    const key =
      story.title
        .toLowerCase()
        .replace(
          /[^\p{L}\p{N}]+/gu,
          " "
        )
        .trim()
        .split(" ")
        .filter(Boolean)
        .slice(0, 12)
        .join(" ");

    const existing =
      groups.get(key);

    if (!existing) {
      groups.set(
        key,
        {
          ...story,

          sources: [
            ...(story.sources ||
              [story.source])
          ]
        }
      );

      continue;
    }

    const sourceSet =
      new Set([
        ...(existing.sources ||
          []),

        ...(story.sources ||
          [story.source])
      ]);

    existing.sources =
      [...sourceSet];

    existing.verified =
      existing.verified ||
      story.verified;

    if (
      story.importance >
      existing.importance
    ) {
      const sources =
        existing.sources;

      Object.assign(
        existing,
        story
      );

      existing.sources =
        sources;
    }

    if (
      !existing.imageUrl &&
      story.imageUrl
    ) {
      existing.imageUrl =
        story.imageUrl;

      existing.imageSource =
        story.imageSource ||
        story.source;

      existing.imageAvailable =
        true;

      existing.imageDownloadUrl =
        story.imageUrl;
    }

    if (
      !existing.videoUrl &&
      story.videoUrl
    ) {
      existing.videoUrl =
        story.videoUrl;

      existing.videoSource =
        story.videoSource ||
        story.source;

      existing.videoAvailable =
        true;
    }
  }

  return [
    ...groups.values()
  ];
}

function rankStories(
  stories
) {
  return stories
    .filter(
      story =>
        isWithin24Hours(
          story.publishedAt
        )
    )
    .filter(
      story =>
        !isLowValue(
          story
        )
    )
    .filter(
      story =>
        isInternationallyRelevant(
          story
        )
    )
    .sort(
      (a, b) => {
        const ageA =
          getAgeMinutes(
            a.publishedAt
          );

        const ageB =
          getAgeMinutes(
            b.publishedAt
          );

        let scoreA =
          a.importance;

        let scoreB =
          b.importance;

        if (
          ageA <=
          BREAKING_WINDOW_MINUTES
        ) {
          scoreA += 50;
        }

        if (
          ageB <=
          BREAKING_WINDOW_MINUTES
        ) {
          scoreB += 50;
        }

        if (
          ageA <= 10
        ) {
          scoreA += 15;
        }

        if (
          ageB <= 10
        ) {
          scoreB += 15;
        }

        scoreA -=
          Math.min(
            25,
            ageA / 60
          );

        scoreB -=
          Math.min(
            25,
            ageB / 60
          );

        return (
          scoreB -
          scoreA
        );
      }
    );
}

function limitByCategory(
  stories
) {
  const result = [];

  const categoryCount =
    new Map();

  for (
    const story of stories
  ) {
    const count =
      categoryCount.get(
        story.category
      ) || 0;

    if (
      count >= 4
    ) {
      continue;
    }

    result.push(
      story
    );

    categoryCount.set(
      story.category,
      count + 1
    );

    if (
      result.length >=
      MAX_STORIES
    ) {
      break;
    }
  }

  return result;
}

function sortFinalStories(
  stories
) {
  return stories.sort(
    (a, b) => {
      const ageA =
        getAgeMinutes(
          a.publishedAt
        );

      const ageB =
        getAgeMinutes(
          b.publishedAt
        );

      return (
        ageA - ageB
      );
    }
  );
}

export async function collectNews() {
  console.log(
    "Starting What's Happening news monitor..."
  );

  console.log(
    `Fetching news from the last ${MAX_AGE_HOURS} hours...`
  );

  console.log(
    `Breaking priority window: last ${BREAKING_WINDOW_MINUTES} minutes.`
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
      .filter(
        Boolean
      );

  console.log(
    `${normalized.length} valid articles after normalization.`
  );

  const uniqueStories =
    mergeDuplicateStories(
      normalized
    );

  console.log(
    `${uniqueStories.length} unique stories after deduplication.`
  );

  const ranked =
    rankStories(
      uniqueStories
    );

  console.log(
    `${ranked.length} important international stories within 24 hours.`
  );

  const selected =
    limitByCategory(
      ranked
    );

  console.log(
    `Selected ${selected.length} final stories before media lookup.`
  );

  const withMedia =
    await addMediaToSelectedStories(
      selected
    );

  const finalStories =
    sortFinalStories(
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
      )
    );

  console.log(
    "Final selected stories:"
  );

  for (
    const story of finalStories
  ) {
    console.log(
      `[${story.age}] ${story.title} | ${story.source} | ${story.category} | image=${story.imageAvailable}`
    );
  }

  return finalStories;
}
