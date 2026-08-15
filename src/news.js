const USER_AGENT = "whats-happening/1.0";

const TOPICS = {
  USA: [
    "Trump",
    "United States",
    "White House",
    "US politics",
    "US Congress",
    "Federal Reserve",
    "US economy"
  ],

  Finance: [
    "stock market",
    "stocks",
    "Federal Reserve",
    "interest rates",
    "inflation",
    "banking",
    "markets",
    "economy"
  ],

  Crypto: [
    "Bitcoin",
    "Ethereum",
    "crypto",
    "cryptocurrency",
    "SEC crypto",
    "crypto ETF",
    "blockchain"
  ],

  "Middle East": [
    "Israel",
    "Palestine",
    "Gaza",
    "Iran",
    "Lebanon",
    "Syria",
    "Middle East",
    "Saudi Arabia",
    "UAE",
    "Qatar"
  ],

  India: [
    "India",
    "Indian government",
    "Modi",
    "RBI",
    "Indian economy",
    "Indian markets",
    "New Delhi"
  ],

  World: [
    "Russia",
    "Ukraine",
    "China",
    "Europe",
    "Asia",
    "geopolitics",
    "United Nations"
  ],

  "AI & Tech": [
    "OpenAI",
    "Google AI",
    "Microsoft",
    "Nvidia",
    "Apple",
    "Meta",
    "artificial intelligence",
    "AI",
    "technology"
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
  "NPR",
  "DW",
  "France 24",
  "Euronews",
  "The Guardian",
  "Bloomberg",
  "CNN",
  "CNBC",
  "Financial Times",
  "The New York Times",
  "The Washington Post",
  "The Telegraph",
  "The Hindu",
  "The Indian Express",
  "Hindustan Times",
  "ANI",
  "CoinDesk",
  "CoinGecko"
]);

const RSS_SOURCES = [
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml"
  },
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml"
  },
  {
    name: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml"
  },
  {
    name: "DW",
    url: "https://rss.dw.com/rdf/rss-en-all"
  },
  {
    name: "France 24",
    url: "https://www.france24.com/en/rss"
  },
  {
    name: "Euronews",
    url: "https://www.euronews.com/rss"
  }
];

function cleanText(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[|\]\]>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
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

function validDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function isWithin24Hours(dateValue) {
  const time = new Date(dateValue).getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  const age = Date.now() - time;

  return age >= 0 && age <= 24 * 60 * 60 * 1000;
}

function getAgeText(dateValue) {
  const time = new Date(dateValue).getTime();

  if (Number.isNaN(time)) {
    return "Unknown time";
  }

  let seconds = Math.floor((Date.now() - time) / 1000);

  if (seconds < 0) {
    seconds = 0;
  }

  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  }

  const minutes = Math.floor(seconds / 60);

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

function getCategory(text) {
  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(TOPICS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return "World";
}

function getImportance(title, description, source, publishedAt) {
  const text = `${title} ${description}`.toLowerCase();

  let score = 30;

  if (TRUSTED_SOURCES.has(source)) {
    score += 20;
  }

  const keywords = [
    "breaking",
    "trump",
    "president",
    "federal reserve",
    "interest rate",
    "war",
    "attack",
    "ceasefire",
    "iran",
    "israel",
    "gaza",
    "ukraine",
    "russia",
    "china",
    "bitcoin",
    "crypto",
    "election",
    "sanctions",
    "oil",
    "market crash",
    "rate cut",
    "rate hike",
    "earthquake",
    "wildfire",
    "explosion",
    "nuclear"
  ];

  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      score += 5;
    }
  }

  const ageHours =
    Math.max(
      0,
      (Date.now() - new Date(publishedAt).getTime()) / 3600000
    );

  score -= Math.min(20, ageHours * 1.5);

  return Math.max(0, Math.min(100, Math.round(score)));
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

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

function xmlValue(block, tag) {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = block.match(regex);

  return match ? cleanText(match[1]) : "";
}

function getRssImage(block) {
  const patterns = [
    /<media:content[^>]+url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
    /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);

    if (match && match[1]) {
      const image = normalizeUrl(match[1]);

      if (image) {
        return image;
      }
    }
  }

  return null;
}

function parseRss(xml, source) {
  const items =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return items
    .map(item => ({
      title: xmlValue(item, "title"),
      description: xmlValue(item, "description"),
      source,
      url:
        xmlValue(item, "link") ||
        xmlValue(item, "guid"),
      imageUrl: getRssImage(item),
      publishedAt:
        xmlValue(item, "pubDate") ||
        xmlValue(item, "dc:date") ||
        xmlValue(item, "published") ||
        xmlValue(item, "updated")
    }))
    .filter(item => {
      return (
        item.title &&
        item.url &&
        item.publishedAt
      );
    });
}

async function fetchRSS(source) {
  try {
    const xml = await fetchText(source.url);

    return parseRss(xml, source.name);
  } catch (error) {
    console.error(
      `${source.name} RSS failed:`,
      error.message
    );

    return [];
  }
}

async function fetchAllRSS() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(fetchRSS)
  );

  return results.flatMap(result => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    return [];
  });
}

async function fetchArticleImage(url) {
  try {
    const html = await fetchText(url, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml"
      }
    });

    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);

      if (match && match[1]) {
        const image = normalizeUrl(match[1]);

        if (image) {
          return image;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function addMissingImages(stories) {
  const missing = stories
    .filter(story => !story.imageUrl)
    .slice(0, 30);

  const results = await Promise.allSettled(
    missing.map(story =>
      fetchArticleImage(story.url)
    )
  );

  for (let i = 0; i < missing.length; i++) {
    const result = results[i];

    if (
      result.status === "fulfilled" &&
      result.value
    ) {
      missing[i].imageUrl = result.value;
      missing[i].imageSource = missing[i].source;
      missing[i].imageAvailable = true;
    }
  }

  return stories;
}

async function fetchNewsAPI() {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query = encodeURIComponent(
    "Trump OR finance OR Bitcoin OR crypto OR Middle East OR India OR geopolitics OR AI"
  );

  const url =
    "https://newsapi.org/v2/everything" +
    `?q=${query}` +
    "&language=en" +
    "&sortBy=publishedAt" +
    "&pageSize=50" +
    `&apiKey=${encodeURIComponent(apiKey)}`;

  try {
    const data = await fetchJson(url);

    return (data.articles || []).map(article => ({
      title: article.title,
      description: article.description,
      source: article.source?.name || "NewsAPI",
      url: article.url,
      imageUrl: article.urlToImage || null,
      publishedAt: article.publishedAt
    }));
  } catch (error) {
    console.error(
      "NewsAPI failed:",
      error.message
    );

    return [];
  }
}

async function fetchGNews() {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query = encodeURIComponent(
    "Trump OR finance OR Bitcoin OR crypto OR Middle East OR India OR geopolitics OR AI"
  );

  const url =
    "https://gnews.io/api/v4/search" +
    `?q=${query}` +
    "&lang=en" +
    "&max=50" +
    "&sortby=publishedAt" +
    `&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const data = await fetchJson(url);

    return (data.articles || []).map(article => ({
      title: article.title,
      description: article.description,
      source: article.source?.name || "GNews",
      url: article.url,
      imageUrl: article.image || null,
      publishedAt: article.publishedAt
    }));
  } catch (error) {
    console.error(
      "GNews failed:",
      error.message
    );

    return [];
  }
}

async function fetchGuardian() {
  const apiKey = process.env.GUARDIAN_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query = encodeURIComponent(
    "Trump OR finance OR Bitcoin OR crypto OR Middle East OR India OR geopolitics OR AI"
  );

  const url =
    "https://content.guardianapis.com/search" +
    `?q=${query}` +
    "&order-by=newest" +
    "&page-size=50" +
    "&show-fields=trailText,thumbnail" +
    `&api-key=${encodeURIComponent(apiKey)}`;

  try {
    const data = await fetchJson(url);

    return (data.response?.results || []).map(article => ({
      title: article.webTitle,
      description:
        article.fields?.trailText || "",
      source: "The Guardian",
      url: article.webUrl,
      imageUrl:
        article.fields?.thumbnail || null,
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

async function fetchCoinGecko() {
  const apiKey =
    process.env.COINGECKO_API_KEY;

  const headers = {};

  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd" +
    "&order=market_cap_desc" +
    "&per_page=20" +
    "&page=1" +
    "&sparkline=false";

  try {
    const data = await fetchJson(url, {
      headers
    });

    return data
      .filter(coin => {
        return Math.abs(
          Number(
            coin.price_change_percentage_24h || 0
          )
        ) >= 3;
      })
      .map(coin => ({
        title:
          `${coin.name} (${String(
            coin.symbol || ""
          ).toUpperCase()}) moved ` +
          `${Number(
            coin.price_change_percentage_24h || 0
          ).toFixed(2)}% in 24 hours`,

        description:
          `Market cap: $${Number(
            coin.market_cap || 0
          ).toLocaleString("en-US")}. ` +
          `24h volume: $${Number(
            coin.total_volume || 0
          ).toLocaleString("en-US")}.`,

        source: "CoinGecko",

        url:
          `https://www.coingecko.com/en/coins/${coin.id}`,

        imageUrl:
          coin.image || null,

        publishedAt:
          new Date().toISOString()
      }));
  } catch (error) {
    console.error(
      "CoinGecko failed:",
      error.message
    );

    return [];
  }
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
  const url = normalizeUrl(article.url);
  const publishedAt =
    validDate(article.publishedAt);

  if (
    !title ||
    !url ||
    !publishedAt
  ) {
    return null;
  }

  if (!isWithin24Hours(publishedAt)) {
    return null;
  }

  const fingerprint =
    `${title.toLowerCase()}|${source.toLowerCase()}`;

  const imageUrl =
    normalizeUrl(article.imageUrl);

  return {
    id: createId(fingerprint),
    title,
    description,
    source,
    url,
    imageUrl,
    imageSource:
      imageUrl ? source : null,
    imageAvailable:
      Boolean(imageUrl),
    publishedAt,
    age:
      getAgeText(publishedAt),
    category:
      getCategory(
        `${title} ${description}`
      ),
    importance:
      getImportance(
        title,
        description,
        source,
        publishedAt
      ),
    verified:
      TRUSTED_SOURCES.has(source),
    sources: [source],
    fetchedAt:
      new Date().toISOString()
  };
}

function mergeDuplicates(stories) {
  const groups = new Map();

  for (const story of stories) {
    const key = story.title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(" ")
      .filter(Boolean)
      .slice(0, 12)
      .join(" ");

    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        ...story,
        sources: [...story.sources]
      });

      continue;
    }

    const sourceSet = new Set([
      ...existing.sources,
      ...story.sources
    ]);

    existing.sources = [...sourceSet];

    existing.verified =
      existing.verified ||
      story.verified;

    if (
      !existing.imageUrl &&
      story.imageUrl
    ) {
      existing.imageUrl =
        story.imageUrl;

      existing.imageSource =
        story.imageSource ||
        story.source;

      existing.imageAvailable = true;
    }

    const oldTime =
      new Date(
        existing.publishedAt
      ).getTime();

    const newTime =
      new Date(
        story.publishedAt
      ).getTime();

    if (newTime > oldTime) {
      const sources =
        existing.sources;

      const image =
        existing.imageUrl;

      const imageSource =
        existing.imageSource;

      Object.assign(
        existing,
        story
      );

      existing.sources =
        sources;

      if (!existing.imageUrl && image) {
        existing.imageUrl = image;
        existing.imageSource =
          imageSource;
        existing.imageAvailable = true;
      }
    }
  }

  return [...groups.values()];
}

export async function collectNews() {
  const results =
    await Promise.allSettled([
      fetchNewsAPI(),
      fetchGNews(),
      fetchGuardian(),
      fetchCoinGecko(),
      fetchAllRSS()
    ]);

  const rawArticles = results.flatMap(
    result => {
      if (
        result.status === "fulfilled" &&
        Array.isArray(result.value)
      ) {
        return result.value;
      }

      return [];
    }
  );

  const normalized =
    rawArticles
      .map(normalizeArticle)
      .filter(Boolean);

  const uniqueStories =
    mergeDuplicates(normalized);

  uniqueStories.sort((a, b) => {
    const timeDifference =
      new Date(b.publishedAt).getTime() -
      new Date(a.publishedAt).getTime();

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return b.importance - a.importance;
  });

  const last30Minutes =
    uniqueStories.filter(story => {
      return isWithinRecentMinutes(
        story.publishedAt,
        30
      );
    });

  let selectedStories;

  if (last30Minutes.length >= 5) {
    selectedStories =
      last30Minutes;
  } else {
    selectedStories =
      uniqueStories;
  }

  selectedStories =
    selectedStories.slice(0, 50);

  await addMissingImages(
    selectedStories
  );

  return selectedStories
    .sort((a, b) => {
      return (
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime()
      );
    })
    .map(story => ({
      ...story,
      age:
        getAgeText(
          story.publishedAt
        ),
      fetchedAt:
        new Date().toISOString()
    }));
}

function isWithinRecentMinutes(
  dateValue,
  minutes
) {
  const time =
    new Date(dateValue).getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  const age =
    Date.now() - time;

  return (
    age >= 0 &&
    age <= minutes * 60 * 1000
  );
    }
