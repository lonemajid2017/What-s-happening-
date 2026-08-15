const USER_AGENT = "whats-Happening/2.0";

const TOPICS = [
  "Trump", "United States", "White House", "US politics", "US Congress",
  "Federal Reserve", "stock market", "stocks", "interest rates", "inflation",
  "Bitcoin", "Ethereum", "crypto", "cryptocurrency", "blockchain",
  "Israel", "Palestine", "Gaza", "Iran", "Lebanon", "Syria", "Middle East",
  "India", "Indian government", "Modi", "RBI", "Indian economy", "New Delhi",
  "Russia", "Ukraine", "China", "Europe", "Asia", "geopolitics", "United Nations",
  "OpenAI", "Google AI", "Microsoft", "Nvidia", "Apple", "Meta",
  "artificial intelligence", "AI", "technology"
];

const TRUSTED_SOURCES = new Set([
  "Reuters",
  "Associated Press",
  "AP",
  "BBC News",
  "BBC",
  "Al Jazeera English",
  "Al Jazeera",
  "The Telegraph",
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

  const groups = {
    USA: [
      "trump",
      "united states",
      "white house",
      "us politics",
      "us congress",
      "federal reserve"
    ],

    Finance: [
      "stock",
      "market",
      "interest rate",
      "inflation",
      "banking",
      "economy"
    ],

    Crypto: [
      "bitcoin",
      "ethereum",
      "crypto",
      "cryptocurrency",
      "blockchain",
      "crypto etf"
    ],

    "Middle East": [
      "israel",
      "palestine",
      "gaza",
      "iran",
      "lebanon",
      "syria",
      "middle east",
      "saudi",
      "uae",
      "qatar"
    ],

    India: [
      "india",
      "indian",
      "modi",
      "rbi",
      "new delhi"
    ],

    World: [
      "russia",
      "ukraine",
      "china",
      "europe",
      "asia",
      "geopolitics",
      "united nations"
    ],

    "AI & Tech": [
      "openai",
      "google ai",
      "microsoft",
      "nvidia",
      "apple",
      "meta",
      "artificial intelligence",
      " ai ",
      "technology"
    ]
  };

  for (const [category, words] of Object.entries(groups)) {
    if (words.some(word => lower.includes(word))) {
      return category;
    }
  }

  return "World";
}

function getImportance(title, description, source, publishedAt) {
  const text = `${title} ${description}`.toLowerCase();

  let score = TRUSTED_SOURCES.has(source) ? 50 : 30;

  const keywords = [
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

  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      score += 5;
    }
  }

  const ageHours = Math.max(
    0,
    (Date.now() -
      new Date(publishedAt || Date.now()).getTime()) /
      3600000
  );

  score -= Math.min(20, ageHours * 1.5);

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

function normalizeArticle(article) {
  const title = cleanText(article.title);
  const description = cleanText(article.description);
  const source = cleanText(
    article.source || "Unknown"
  );

  const url = article.url;

  const publishedAt =
    article.publishedAt ||
    new Date().toISOString();

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
    category: getCategory(
      `${title} ${description}`
    ),
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
    .replace(/&#x27;/g, "'");
}

function getXmlTag(block, tags) {
  for (const tag of tags) {
    const match = block.match(
      new RegExp(
        `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
        "i"
      )
    );

    if (match) {
      return decodeXml(match[1]);
    }
  }

  return "";
}

function getXmlAttribute(
  block,
  tag,
  attribute
) {
  const match = block.match(
    new RegExp(
      `<${tag}[^>]*${attribute}=["']([^"']+)["'][^>]*>`,
      "i"
    )
  );

  return match
    ? decodeXml(match[1])
    : "";
}

async function fetchRSS(url, source) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "application/rss+xml, application/xml, text/xml"
      }
    });

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}`
      );
    }

    const xml = await response.text();

    const items = [
      ...xml.matchAll(
        /<item\b[^>]*>([\s\S]*?)<\/item>/gi
      )
    ].map(match => match[1]);

    const entries = [
      ...xml.matchAll(
        /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi
      )
    ].map(match => match[1]);

    const blocks =
      items.length > 0
        ? items
        : entries;

    return blocks
      .map(block => ({
        title: getXmlTag(
          block,
          ["title"]
        ),

        description: getXmlTag(
          block,
          [
            "description",
            "summary",
            "content"
          ]
        ),

        source,

        url:
          getXmlTag(
            block,
            ["link"]
          ) ||
          getXmlAttribute(
            block,
            "link",
            "href"
          ),

        publishedAt:
          getXmlTag(
            block,
            [
              "pubDate",
              "published",
              "updated",
              "dc:date"
            ]
          ) ||
          new Date().toISOString()
      }))
      .filter(
        article =>
          article.title &&
          article.url
      )
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
  const apiKey =
    process.env.NEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query = encodeURIComponent(
    TOPICS.slice(0, 20).join(" OR ")
  );

  const url =
    `https://newsapi.org/v2/everything` +
    `?q=${query}` +
    `&language=en` +
    `&sortBy=publishedAt` +
    `&pageSize=50` +
    `&apiKey=${encodeURIComponent(apiKey)}`;

  try {
    const data =
      await fetchJson(url);

    return (data.articles || [])
      .map(article => ({
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
  const apiKey =
    process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query = encodeURIComponent(
    TOPICS.slice(0, 20).join(" OR ")
  );

  const url =
    `https://gnews.io/api/v4/search` +
    `?q=${query}` +
    `&lang=en` +
    `&max=50` +
    `&sortby=publishedAt` +
    `&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const data =
      await fetchJson(url);

    return (data.articles || [])
      .map(article => ({
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
  const apiKey =
    process.env.GUARDIAN_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query = encodeURIComponent(
    TOPICS.slice(0, 20).join(" OR ")
  );

  const url =
    `https://content.guardianapis.com/search` +
    `?q=${query}` +
    `&order-by=newest` +
    `&page-size=50` +
    `&show-fields=trailText` +
    `&api-key=${encodeURIComponent(apiKey)}`;

  try {
    const data =
      await fetchJson(url);

    return (
      data.response?.results || []
    ).map(article => ({
      title: article.webTitle,

      description:
        article.fields?.trailText ||
        "",

      source:
        "The Guardian",

      url:
        article.webUrl,

      publishedAt:
        article.webPublicationDate
    }));

  } catch (error) {
    console.error(
      "Guardian request failed:",
      error.message
    );

    return [];
  }
}

async function fetchCoinGecko() {
  try {
    const headers = {};

    if (
      process.env.COINGECKO_API_KEY
    ) {
      headers[
        "x-cg-demo-api-key"
      ] =
        process.env.COINGECKO_API_KEY;
    }

    const url =
      "https://api.coingecko.com/api/v3/coins/markets" +
      "?vs_currency=usd" +
      "&order=market_cap_desc" +
      "&per_page=20" +
      "&page=1" +
      "&sparkline=false";

    const data =
      await fetchJson(url, {
        headers
      });

    return data
      .filter(
        coin =>
          Math.abs(
            Number(
              coin.price_change_percentage_24h ||
                0
            )
          ) >= 3
      )
      .map(coin => ({
        title:
          `${coin.name} ` +
          `(${String(
            coin.symbol
          ).toUpperCase()}) moved ` +
          `${Number(
            coin.price_change_percentage_24h ||
              0
          ).toFixed(2)}% in 24 hours`,

        description:
          `Market cap: $${Number(
            coin.market_cap || 0
          ).toLocaleString("en-US")}. ` +
          `24h volume: $${Number(
            coin.total_volume || 0
          ).toLocaleString("en-US")}.`,

        source:
          "CoinGecko",

        url:
          `https://www.coingecko.com/en/coins/${coin.id}`,

        publishedAt:
          new Date().toISOString()
      }));

  } catch (error) {
    console.error(
      "CoinGecko request failed:",
      error.message
    );

    return [];
  }
}

function mergeDuplicateStories(
  stories
) {
  const groups = new Map();

  for (const story of stories) {
    const key =
      story.title
        .toLowerCase()
        .replace(
          /[^\w\s]/g,
          " "
        )
        .split(/\s+/)
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

    existing.sources = [
      ...new Set([
        ...(existing.sources || []),
        ...(story.sources || [
          story.source
        ])
      ])
    ];

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
  }

  return [
    ...groups.values()
  ];
}

export async function collectNews() {
  const results =
    await Promise.allSettled([
      fetchNewsAPI(),

      fetchGNews(),

      fetchGuardian(),

      fetchRSS(
        "https://www.aljazeera.com/xml/rss/all.xml",
        "Al Jazeera"
      ),

      fetchRSS(
        "https://feeds.bbci.co.uk/news/rss.xml",
        "BBC News"
      ),

      fetchRSS(
        "https://rss.dw.com/rdf/rss-en-all",
        "DW"
      ),

      fetchRSS(
        "https://www.france24.com/en/rss",
        "France 24"
      ),

      fetchRSS(
        "https://www.euronews.com/rss",
        "Euronews"
      ),

      fetchRSS(
        "https://indianexpress.com/section/india/feed/",
        "The Indian Express"
      ),

      fetchRSS(
        "https://indianexpress.com/section/world/feed/",
        "The Indian Express"
      ),

      fetchRSS(
        "https://feeds.npr.org/1001/rss.xml",
        "NPR"
      ),

      fetchCoinGecko()
    ]);

  const rawArticles =
    results.flatMap(
      result =>
        result.status ===
        "fulfilled"
          ? result.value
          : []
    );

  const normalized =
    rawArticles
      .map(normalizeArticle)
      .filter(Boolean);

  const uniqueStories =
    mergeDuplicateStories(
      normalized
    );

  return uniqueStories
    .filter(
      story =>
        story.importance >= 35
    )
    .sort((a, b) => {
      if (
        b.importance !==
        a.importance
      ) {
        return (
          b.importance -
          a.importance
        );
      }

      return (
        new Date(
          b.publishedAt
        ).getTime() -
        new Date(
          a.publishedAt
        ).getTime()
      );
    })
    .slice(0, 100);
      }
