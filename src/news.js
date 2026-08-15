const USER_AGENT = "Whats-Happening/3.0";

const MAX_STORIES = 10;
const MAX_AGE_HOURS = 24;

const TOPIC_GROUPS = {
  USA: [
    "united states",
    "u.s.",
    "usa",
    "america",
    "american",
    "donald trump",
    "trump",
    "white house",
    "us congress",
    "congress",
    "pentagon",
    "washington",
    "federal reserve",
    "fed"
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
    "syrian",
    "syria",
    "iraq",
    "iraqi",
    "yemen",
    "houthi",
    "red sea",
    "strait of hormuz",
    "hormuz",
    "saudi arabia",
    "saudi",
    "uae",
    "qatar",
    "middle east"
  ],

  China: [
    "china",
    "chinese",
    "beijing",
    "xi jinping",
    "taiwan",
    "taiwanese",
    "south china sea",
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
    "black sea"
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
    "india china"
  ],

  World: [
    "nato",
    "united nations",
    "european union",
    "eu",
    "g7",
    "g20",
    "geopolitics",
    "international",
    "global",
    "diplomatic crisis",
    "global crisis",
    "international crisis"
  ],

  Finance: [
    "federal reserve",
    "interest rate",
    "interest rates",
    "inflation",
    "oil prices",
    "oil price",
    "opec",
    "global markets",
    "stock market",
    "financial markets",
    "tariff",
    "tariffs",
    "sanctions"
  ],

  "AI & Tech": [
    "openai",
    "google",
    "microsoft",
    "nvidia",
    "artificial intelligence",
    "artificial intelligence",
    "ai model",
    "ai models",
    "semiconductor",
    "chip"
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
  "Hindustan Times",
  "France 24",
  "Times of India"
]);

const LOW_VALUE_KEYWORDS = [
  "celebrity",
  "celebrity news",
  "horoscope",
  "recipe",
  "weather forecast",
  "movie review",
  "tv review",
  "lifestyle",
  "fashion",
  "entertainment",
  "shopping",
  "restaurant",
  "travel guide",
  "tourism guide",
  "local council",
  "local election",
  "sports result",
  "football result",
  "cricket score",
  "match report",
  "transfer news",
  "award ceremony",
  "red carpet",
  "reality show",
  "concert",
  "music release",
  "book review"
];

const ROUTINE_BUSINESS_KEYWORDS = [
  "quarterly earnings",
  "quarterly results",
  "earnings report",
  "profit rises",
  "profit falls",
  "revenue rises",
  "revenue falls",
  "shares rise",
  "shares fall",
  "stock rises",
  "stock falls",
  "company launches",
  "company opens",
  "new store",
  "factory expansion",
  "battery factory",
  "gigafactory",
  "job cuts",
  "hiring",
  "layoffs",
  "business review",
  "market analysis"
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
  "ceasefire",
  "peace talks",
  "peace deal",
  "nuclear",
  "nuclear weapon",
  "nuclear weapons",
  "nuclear program",
  "sanctions",
  "sanction",
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
  "hostage",
  "hostages",
  "diplomatic crisis",
  "international crisis",
  "military",
  "military operation",
  "troops",
  "airspace",
  "border",
  "territory",
  "peace agreement",
  "trade war",
  "trade deal",
  "summit",
  "alliance",
  "nato",
  "united nations",
  "security council"
];

const INDIA_INTERNATIONAL_KEYWORDS = [
  "pakistan",
  "china",
  "iran",
  "russia",
  "ukraine",
  "united states",
  "usa",
  "america",
  "trump",
  "nuclear",
  "defence",
  "defense",
  "military",
  "sanctions",
  "tariff",
  "trade",
  "diplomatic",
  "diplomacy",
  "international",
  "global",
  "border",
  "foreign policy",
  "g20",
  "g7",
  "brics",
  "sco",
  "united nations",
  "nato"
];

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
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
    return Infinity;
  }

  const age =
    (Date.now() - date.getTime()) / 60000;

  return Math.max(0, age);
}

function getAgeLabel(publishedAt) {
  const minutes = Math.floor(
    getAgeMinutes(publishedAt)
  );

  if (!Number.isFinite(minutes)) {
    return "unknown age";
  }

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
    Number.isFinite(age) &&
    age >= 0 &&
    age <= MAX_AGE_HOURS * 60
  );
}

function getTopicMatches(title, description) {
  const text =
    `${title} ${description}`.toLowerCase();

  const matches = {};

  for (
    const [category, keywords]
    of Object.entries(TOPIC_GROUPS)
  ) {
    let count = 0;

    for (const keyword of keywords) {
      if (
        text.includes(
          keyword.toLowerCase()
        )
      ) {
        count++;
      }
    }

    matches[category] = count;
  }

  return matches;
}

function getCategory(title, description) {
  const matches =
    getTopicMatches(
      title,
      description
    );

  const priority = [
    "Middle East",
    "Russia-Ukraine",
    "China",
    "USA",
    "India",
    "World",
    "Finance",
    "AI & Tech"
  ];

  let bestCategory = "World";
  let bestMatches = 0;

  for (const category of priority) {
    const count =
      matches[category] || 0;

    if (count > bestMatches) {
      bestMatches = count;
      bestCategory = category;
    }
  }

  return bestCategory;
}

function containsKeyword(text, keywords) {
  const lower =
    text.toLowerCase();

  return keywords.some(
    keyword =>
      lower.includes(
        keyword.toLowerCase()
      )
  );
}

function isLowValue(article) {
  const text =
    `${article.title} ${article.description}`
      .toLowerCase();

  return (
    containsKeyword(
      text,
      LOW_VALUE_KEYWORDS
    ) ||
    containsKeyword(
      text,
      ROUTINE_BUSINESS_KEYWORDS
    )
  );
}

function isMajorEvent(article) {
  const text =
    `${article.title} ${article.description}`
      .toLowerCase();

  return containsKeyword(
    text,
    MAJOR_EVENT_KEYWORDS
  );
}

function isCorePriorityCategory(category) {
  return [
    "USA",
    "Middle East",
    "China",
    "Russia-Ukraine"
  ].includes(category);
}

function isIndiaInternational(article) {
  const text =
    `${article.title} ${article.description}`
      .toLowerCase();

  return containsKeyword(
    text,
    INDIA_INTERNATIONAL_KEYWORDS
  );
}

function isWorldMajor(article) {
  const text =
    `${article.title} ${article.description}`
      .toLowerCase();

  return (
    isMajorEvent(article) ||
    containsKeyword(
      text,
      [
        "global crisis",
        "global security",
        "world leaders",
        "security council",
        "nato summit",
        "g7 summit",
        "g20 summit",
        "international summit"
      ]
    )
  );
}

function isInternationallyRelevant(article) {
  const category =
    article.category;

  if (isLowValue(article)) {
    return false;
  }

  if (
    isCorePriorityCategory(
      category
    )
  ) {
    return true;
  }

  if (category === "India") {
    return isIndiaInternational(
      article
    );
  }

  if (category === "World") {
    return isWorldMajor(article);
  }

  if (category === "Finance") {
    const text =
      `${article.title} ${article.description}`
        .toLowerCase();

    return containsKeyword(
      text,
      [
        "federal reserve",
        "interest rate",
        "oil",
        "opec",
        "sanctions",
        "tariff",
        "trade war",
        "global markets"
      ]
    );
  }

  if (category === "AI & Tech") {
    const text =
      `${article.title} ${article.description}`
        .toLowerCase();

    return containsKeyword(
      text,
      [
        "openai",
        "google",
        "microsoft",
        "nvidia",
        "artificial intelligence",
        "ai model",
        "semiconductor",
        "chip"
      ]);
  }

  return false;
}

function getImportance(
  title,
  description,
  source,
  publishedAt,
  category
) {
  const text =
    `${title} ${description}`
      .toLowerCase();

  let score = 30;

  if (
    TRUSTED_SOURCES.has(
      source
    )
  ) {
    score += 20;
  }

  if (
    isCorePriorityCategory(
      category
    )
  ) {
    score += 20;
  }

  if (
    category === "India"
  ) {
    score += 10;
  }

  if (
    category === "World"
  ) {
    score += 5;
  }

  if (
    isMajorEvent({
      title,
      description
    })
  ) {
    score += 20;
  }

  const age =
    getAgeMinutes(
      publishedAt
    );

  if (age <= 15) {
    score += 25;
  } else if (age <= 60) {
    score += 20;
  } else if (age <= 180) {
    score += 15;
  } else if (age <= 360) {
    score += 10;
  } else if (age <= 720) {
    score += 5;
  }

  if (
    containsKeyword(
      text,
      [
        "war",
        "attack",
        "missile",
        "strike",
        "nuclear",
        "ceasefire",
        "peace deal",
        "sanctions",
        "tariff",
        "invasion",
        "military operation"
      ]
    )
  ) {
    score += 10;
  }

  if (isLowValue({
    title,
    description
  })) {
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

  if (
    !title ||
    !url
  ) {
    return null;
  }

  const publishedDate =
    parseDate(
      article.publishedAt
    );

  if (!publishedDate) {
    return null;
  }

  const publishedAt =
    publishedDate.toISOString();

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
    `${title
      .toLowerCase()
      .replace(
        /[^\p{L}\p{N}]+/gu,
        " "
      )
      .trim()
      .slice(0, 200)}|${source
      .toLowerCase()}`;

  const normalized = {
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
      Boolean(
        imageUrl
      ),

    imageDownloadUrl:
      imageUrl ||
      null,

    videoUrl:
      normalizeUrl(
        article.videoUrl
      ),

    videoSource:
      article.videoUrl
        ? source
        : null,

    videoAvailable:
      Boolean(
        article.videoUrl
      ),

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
        publishedAt,
        category
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

  return normalized;
}

async function fetchJson(
  url,
  options = {}
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      options.timeout ||
        15000
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

            ...(options.headers ||
              {})
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
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video:url["']/i
    ];

    let imageUrl = null;
    let videoUrl = null;

    for (
      const pattern
      of imagePatterns
    ) {
      const match =
        html.match(
          pattern
        );

      if (
        match &&
        match[1]
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
      const pattern
      of videoPatterns
    ) {
      const match =
        html.match(
          pattern
        );

      if (
        match &&
        match[1]
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
    "Trump OR White House OR Pentagon OR United States",
    "Iran OR Israel OR Gaza OR Lebanon OR Yemen OR Hormuz",
    "Russia OR Ukraine OR Putin OR Zelensky",
    "China OR Taiwan OR Beijing OR Xi Jinping",
    "India AND (Pakistan OR China OR Iran OR Russia OR United States OR Trump OR NATO OR G20 OR BRICS OR nuclear)",
    "NATO OR sanctions OR tariff OR nuclear OR ceasefire OR war OR missile OR military",
    "Federal Reserve OR oil OR OPEC"
  ].join(" OR ");
}

async function fetchNewsAPI() {
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

  const query =
    encodeURIComponent(
      buildNewsQuery()
    );

  const url =
    "https://newsapi.org/v2/everything" +
    `?q=${query}` +
    `&from=${encodeURIComponent(
      from
    )}` +
    "&language=en" +
    "&sortBy=publishedAt" +
    "&pageSize=100" +
    `&apiKey=${encodeURIComponent(
      apiKey
    )}`;

  try {
    const data =
      await fetchJson(
        url
      );

    return (
      data.articles ||
      []
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
    `&apikey=${encodeURIComponent(
      apiKey
    )}`;

  try {
    const data =
      await fetchJson(
        url
      );

    return (
      data.articles ||
      []
    ).map(
      article => ({
        title:
          article.title,

        description:
    
