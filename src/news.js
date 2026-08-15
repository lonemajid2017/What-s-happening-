const USER_AGENT = "whats-Happening/2.0";

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
  "Al Jazeera English",
  "Al Jazeera",
  "The Telegraph",
  "TPI World",
  "Bloomberg",
  "The Washington Post",
  "The New York Times",
  "CNN",
  "CNBC",
  "Financial Times",
  "The Wall Street Journal",
  "Politico",
  "The Hill",
  "The Guardian",
  "Agence France-Presse",
  "AFP",
  "DW",
  "Deutsche Welle",
  "Euronews",
  "TASS",
  "The Hindu",
  "The Indian Express",
  "Hindustan Times",
  "ANI",
  "CoinDesk",
  "The Block",
  "CoinGecko",
  "NPR",
  "France 24"
]);

function cleanText(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
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

function getCategory(text) {
  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(TOPICS)) {
    const found = keywords.some((keyword) =>
      lower.includes(keyword.toLowerCase())
    );

    if (found) {
      return category;
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

  const majorKeywords = [
    "breaking",
    "trump",
    "president",
    "federal reserve",
    "fed",
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
    "rate hike"
  ];

  for (const keyword of majorKeywords) {
    if (text.includes(keyword)) {
      score += 5;
    }
  }

  const ageHours = Math.max(
    0,
    (Date.now() - new Date(publishedAt || Date.now()).getTime()) /
      3600000
  );

  score -= Math.min(20, ageHours * 1.5);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeArticle(article) {
  const title = cleanText(article.title);
  const description = cleanText(article.description);
  const source = cleanText(article.source || "Unknown");
  const url = article.url;
  const publishedAt =
    article.publishedAt || new Date().toISOString();

  if (!title || !url) {
    return null;
  }

  const fingerprint =
    `${title.toLowerCase()}|${source.toLowerCase()}`
      .replace(/[^\w\s|]/g, " ")
      .trim()
      .slice(0, 220);

  return {
    id: createId(fingerprint),
    title,
    description,
    source,
    url,
    publishedAt,
    category: getCategory(`${title} ${description}`),
    importance: getImportance(
      title,
      description,
      source,
      publishedAt
    ),
    verified: TRUSTED_SOURCES.has(source),
    sources: [source],
    fetchedAt: new Date().toISOString()
  };
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

function decodeXml(value = "") {
  return cleanText(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function getXmlTag(block, tagNames) {
  for (const tag of tagNames) {
    const regex = new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    );

    const match = block.match(regex);

    if (match) {
      return decodeXml(match[1]);
    }
  }

  return "";
}

function getXmlAttribute(block, tag, attribute) {
  const regex = new RegExp(
    `<${tag}[^>]*${attribute}=["']([^"']+)["'][^>]*>`,
    "i"
  );

  const match = block.match(regex);

  return match ? decodeXml(match[1]) : "";
}

async function fetchRSS(url, source) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml"
      }
    });

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}`
      );
    }

    const xml = await response.text();

    const items = [
      ...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)
    ].map((match) => match[1]);

    const entries = [
      ...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)
    ].map((match) => match[1]);

    const blocks = items.length > 0 ? items : entries;

    return blocks
      .map((block) => {
        const title = getXmlTag(block, ["title"]);

        const description = getXmlTag(block, [
          "description",
          "summary",
          "content"
        ]);

        let articleUrl = getXmlTag(block, ["link"]);

        if (!articleUrl) {
          articleUrl = getXmlAttribute(
            block,
            "link",
            "href"
          );
        }

        const publishedAt =
          getXmlTag(block, [
            "pubDate",
            "published",
            "updated",
            "dc:date"
          ]) || new Date().toISOString();

        return {
          title,
          description,
          source,
          url: articleUrl,
          publishedAt
        };
      })
      .filter((article) => article.title && article.url)
      .slice(0, 50);
  } catch (error) {
    console.error(
      `${source} RSS request failed:`,
      error.message
    );

    return [];
  }
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

    return (data.articles || []).map((article) => ({
      title: article.title,
      description: article.description,
      source: article.source?.name,
      url: article.url,
      publishedAt: article.publishedAt
    }));
  } catch (error) {
    console.error(
      "NewsAPI request failed:",
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

    return (data.articles || []).map((article) => ({
      title: article.title,
      description: article.description,
      source: article.source?.name,
      url: article.url,
      publishedAt: article.publishedAt
    }));
  } catch (error) {
    console.error(
      "GNews request failed:",
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
    "&show-fields=trailText" +
    `&api-key=${encodeURIComponent(apiKey)}`;

  try {
    const data = await fetchJson(url);

    return (data.response?.results || []).map((article) => ({
      title: article.webTitle,
      description: article.fields?.trailText || "",
      source: "The Guardian",
      url: article.webUrl,
      publishedAt: article.webPublicationDate
    }));
  } catch (error) {
    console.error(
      "Guardian request failed:",
      error.message
    );

    return [];
  }
}

async function fetchAlJazeera() {
  return fetchRSS(
    "https://www.aljazeera.com/xml/rss/all.xml",
    "Al Jazeera"
  );
}

async function fetchBBC() {
  return fetchRSS(
    "https://feeds.bbci.co.uk/news/rss.xml",
    "BBC News"
  );
}

async function fetchDW() {
  return fetchRSS(
    "https://rss.dw.com/rdf/rss-en-all",
    "DW"
  );
}

async function fetchFrance24() {
  return fetchRSS(
    "https://www.france24.com/en/rss",
    "France 24"
  );
}

async function fetchEuronews() {
  return fetchRSS(
    "https://www.euronews.com/rss",
    "Euronews"
  );
}

async function fetchIndianExpress() {
  return fetchRSS(
    "https://indianexpress.com/section/india/feed/",
    "The Indian Express"
  );
}

async function fetchIndianExpressWorld() {
  return fetchRSS(
    "https://indianexpress.com/section/world/feed/",
    "The Indian Express"
  );
}

async function fetchNPR() {
  return fetchRSS(
    "https://feeds.npr.org/1001/rss.xml",
    "NPR"
  );
}

async function fetchCoinGecko() {
  const headers = {};

  const apiKey = process.env.COINGECKO_API_KEY;

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
      .filter(
        (coin) =>
          Math.abs(
            Number(coin.price_change_percentage_24h || 0)
          ) >= 3
      )
      .map((coin) => ({
        title:
          `${coin.name} (${String(
            coin.symbol
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
        publishedAt: new Date().toISOString()
      }));
  } catch (error) {
    console.error(
      "CoinGecko request failed:",
      error.message
    );

    return [];
  }
}

function mergeDuplicateStories(stories) {
  const groups = new Map();

  for (const story of stories) {
    const key = story.title
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 12)
      .join(" ");

    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        ...story,
        sources: [...(story.sources || [story.source])]
      });

      continue;
    }

    const sourceSet = new Set([
      ...(existing.sources || []),
      ...(story.sources || [story.source])
    ]);

    existing.sources = [...sourceSet];

    existing.verified =
      existing.verified || story.verified;

    if (story.importance > existing.importance) {
      const sources = existing.sources;

      Object.assign(existing, story);

      existing.sources = sources;
    }
  }

  return [...groups.values()];
}

export async function collectNews() {
  const results = await Promise.allSettled([
    fetchNewsAPI(),
    fetchGNews(),
    fetchGuardian(),
    fetchAlJazeera(),
    fetchBBC(),
    fetchDW(),
    fetchFrance24(),
    fetchEuronews(),
    fetchIndianExpress(),
    fetchIndianExpressWorld(),
    fetchNPR(),
    fetchCoinGecko()
  ]);

  const rawArticles = results.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value
      : []
  );

  const normalized = rawArticles
    .map(normalizeArticle)
    .filter(Boolean);

  const uniqueStories =
    mergeDuplicateStories(normalized);

  return uniqueStories
    .filter((story) => story.importance >= 35)
    .sort((a, b) => {
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }

      return (
        new Date(b.publishedAt).getTime() -
        new Date(a.publishedAt).getTime()
      );
    })
    .slice(0, 100);
}
```0
