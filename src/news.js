const USER_AGENT = "whats-Happening/1.0";

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
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
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
    const found = keywords.some(keyword =>
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
    "rate hike",
    "earthquake",
    "wildfire",
    "explosion",
    "terror",
    "nuclear"
  ];

  for (const keyword of majorKeywords) {
    if (text.includes(keyword)) {
      score += 5;
    }
  }

  const publishedTime =
    new Date(publishedAt || Date.now()).getTime();

  const ageHours = Math.max(
    0,
    (Date.now() - publishedTime) / 3600000
  );

  score -= Math.min(20, ageHours * 1.5);

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

function normalizeImageUrl(url) {
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

function parsePublishedAt(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getAgeText(publishedAt) {
  const publishedTime =
    new Date(publishedAt).getTime();

  if (Number.isNaN(publishedTime)) {
    return "Unknown time";
  }

  let seconds =
    Math.floor(
      (Date.now() - publishedTime) / 1000
    );

  if (seconds < 0) {
    seconds = 0;
  }

  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days =
    Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function isWithinHours(
  publishedAt,
  hours
) {
  const time =
    new Date(publishedAt).getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  const age =
    Date.now() - time;

  return (
    age >= 0 &&
    age <= hours * 60 * 60 * 1000
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
    article.url;

  if (!title || !url) {
    return null;
  }

  const publishedAt =
    parsePublishedAt(
      article.publishedAt
    );

  if (!publishedAt) {
    return null;
  }

  const imageUrl =
    normalizeImageUrl(
      article.imageUrl ||
      article.urlToImage ||
      article.image ||
      null
    );

  const fingerprint =
    `${title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .slice(0, 200)}|${source.toLowerCase()}`;

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
    clearTimeout(timeout);
  }
}

async function fetchText(
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
              "application/rss+xml, application/xml, text/xml, text/html",

            ...(options.headers || {})
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}`
      );
    }

    return await response.text();

  } finally {
    clearTimeout(timeout);
  }
}

function extractXmlTag(
  block,
  tag
) {
  const regex =
    new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    );

  const match =
    block.match(regex);

  return match
    ? cleanText(match[1])
    : "";
}

function extractXmlUrl(
  block,
  tag
) {
  const regex =
    new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    );

  const match =
    block.match(regex);

  if (!match) {
    return null;
  }

  return normalizeImageUrl(
    cleanText(match[1])
  );
}

function extractRssImage(
  block
) {
  const patterns = [

    /<media:content[^>]+url=["']([^"']+)["']/i,

    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,

    /<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\//i,

    /<image[^>]*>[\s\S]*?<url[^>]*>([^<]+)<\/url>[\s\S]*?<\/image>/i

  ];

  for (const pattern of patterns) {
    const match =
      block.match(pattern);

    if (match?.[1]) {
      const image =
        normalizeImageUrl(
          match[1]
        );

      if (image) {
        return image;
      }
    }
  }

  return null;
}

function parseRssFeed(
  xml,
  source
) {
  if (!xml) {
    return [];
  }

  const items =
    xml.match(
      /<item\b[\s\S]*?<\/item>/gi
    ) || [];

  return items.map(item => {

    const title =
      extractXmlTag(
        item,
        "title"
      );

    const description =
      extractXmlTag(
        item,
        "description"
      );

    let url =
      extractXmlTag(
        item,
        "link"
      );

    if (!url) {
      const guid =
        extractXmlTag(
          item,
          "guid"
        );

      if (
        guid &&
        /^https?:\/\//i.test(guid)
      ) {
        url = guid;
      }
    }

    const publishedAt =
      extractXmlTag(
        item,
        "pubDate"
      ) ||
      extractXmlTag(
        item,
        "dc:date"
      ) ||
      extractXmlTag(
        item,
        "published"
      ) ||
      extractXmlTag(
        item,
        "updated"
      );

    const imageUrl =
      extractRssImage(item);

    return {
      title,
      description,
      source,
      url,
      imageUrl,
      publishedAt
    };

  }).filter(
    article =>
      article.title &&
      article.url &&
      article.publishedAt
  );
}

async function fetchRssSource(
  source
) {
  try {

    const xml =
      await fetchText(
        source.url,
        {
          timeout: 12000
        }
      );

    return parseRssFeed(
      xml,
      source.name
    );

  } catch (error) {

    console.error(
      `${source.name} RSS request failed:`,
      error.message
    );

    return [];
  }
}

async function fetchAllRSS() {

  const results =
    await Promise.allSettled(
      RSS_SOURCES.map(
        fetchRssSource
      )
    );

  return results.flatMap(
    result =>
      result.status === "fulfilled"
        ? result.value
        : []
  );
}

async function fetchArticleImage(
  url
) {
  if (!url) {
    return null;
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
      return null;
    }

    const html =
      await response.text();

    const patterns = [

      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,

      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,

      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,

      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,

      /<meta[^>]+property=["']og:image:url["'][^>]+content=["']([^"']+)["']/i,

      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:url["']/i

    ];

    for (const pattern of patterns) {

      const match =
        html.match(pattern);

      if (match?.[1]) {

        const image =
          normalizeImageUrl(
            match[1]
          );

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

async function addMissingImages(
  articles
) {
  const result =
    [...articles];

  const candidates =
    result
      .filter(
        article =>
          !article.imageUrl
      )
      .filter(
        article =>
          article.url
      )
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      )
      .slice(0, 40);

  const batchSize = 5;

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

    const images =
      await Promise.all(
        batch.map(
          article =>
            fetchArticleImage(
              article.url
            )
        )
      );

    for (
      let j = 0;
      j < batch.length;
      j++
    ) {

      const image =
        images[j];

      if (!image) {
        continue;
      }

      const original =
        result.find(
          item =>
            item.id ===
            batch[j].id
        );

      if (original) {

        original.imageUrl =
          image;

        original.imageSource =
          original.source;

        original.imageAvailable =
          true;
      }
    }
  }

  return result;
}

async function fetchNewsAPI() {

  const apiKey =
    process.env.NEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query =
    encodeURIComponent(
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

async function fetchGNews() {

  const apiKey =
    process.env.GNEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query =
    encodeURIComponent(
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

async function fetchGuardian() {

  const apiKey =
    process.env.GUARDIAN_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query =
    encodeURIComponent(
      "Trump OR finance OR Bitcoin OR crypto OR Middle East OR India OR geopolitics OR AI"
    );

  const url =
    "https://content.guardianapis.com/search" +
    `?q=${query}` +
    "&order-by=newest" +
    "&page-size=50" +
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

        let imageUrl =
          null;

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

async function fetchCoinGecko() {

  const apiKey =
    process.env.COINGECKO_API_KEY;

  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    "?vs_currency=usd" +
    "&order=market_cap_desc" +
    "&per_page=20" +
    "&page=1" +
    "&sparkline=false";

  const headers = {};

  if (apiKey) {
    headers[
      "x-cg-demo-api-key"
    ] = apiKey;
  }

  try {

    const data =
      await fetchJson(
        url,
        {
          headers
        }
      );

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
      .map(
        coin => ({

          title:
            `${coin.name} (${String(
              coin.symbol || ""
            ).toUpperCase()}) moved ` +
            `${Number(
              coin.price_change_percentage_24h ||
              0
            ).toFixed(2)}% in 24 hours`,

          description:
            `Market cap: $${Number(
              coin.market_cap ||
              0
            ).toLocaleString(
              "en-US"
            )}. ` +
            `24h volume: $${Number(
              coin.total_volume ||
              0
            ).toLocaleString(
              "en-US"
            )}.`,

          source:
            "CoinGecko",

          url:
            `https://www.coingecko.com/en/coins/${coin.id}`,

          imageUrl:
            coin.image ||
            null,

          publishedAt:
            new Date().toISOString()
        })
      );

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

  const groups =
    new Map();

  for (const story of stories) {

    const key =
      story.title
        .toLowerCase()
        .replace(
          /[^\p{L}\p{N}]+/gu,
          " "
        )
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
        .
