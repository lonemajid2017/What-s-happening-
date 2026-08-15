const USER_AGENT = "whats-happening/2.0";

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
    "United Nations",
    "war",
    "conflict"
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
  "TRT World",
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
  "NPR",
  "CoinDesk",
  "The Block",
  "CoinGecko"
]);

const RSS_FEEDS = [
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml"
  },
  {
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/rss.xml"
  },
  {
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml"
  },
  {
    name: "BBC Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml"
  },
  {
    name: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml"
  },
  {
    name: "DW",
    url: "https://rss.dw.com/rdf/rss-en-all"
  },
  {
    name: "Euronews",
    url: "https://www.euronews.com/rss"
  },
  {
    name: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml"
  },
  {
    name: "NPR World",
    url: "https://feeds.npr.org/1004/rss.xml"
  }
];

function cleanText(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getTag(block, tag) {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = block.match(regex);

  if (!match) {
    return "";
  }

  return decodeXml(cleanText(match[1]));
}

function getAttribute(block, tag, attribute) {
  const regex = new RegExp(
    `<${tag}[^>]*${attribute}=["']([^"']+)["'][^>]*>`,
    "i"
  );

  const match = block.match(regex);

  return match ? decodeXml(match[1]) : "";
}

function getImageFromBlock(block) {
  const enclosureUrl = getAttribute(block, "enclosure", "url");

  if (enclosureUrl) {
    return enclosureUrl;
  }

  const mediaUrl = getAttribute(block, "media:content", "url");

  if (mediaUrl) {
    return mediaUrl;
  }

  const mediaThumbnail = getAttribute(block, "media:thumbnail", "url");

  if (mediaThumbnail) {
    return mediaThumbnail;
  }

  const imageMatch = block.match(
    /https?:\/\/[^"' <]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"' <]*)?/i
  );

  if (imageMatch) {
    return imageMatch[0];
  }

  return null;
}

function parseRSS(xml, sourceName) {
  const items = [];

  const blocks = xml.match(
    /<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi
  ) || [];

  for (const block of blocks) {
    const title =
      getTag(block, "title") ||
      getTag(block, "media:title");

    const description =
      getTag(block, "description") ||
      getTag(block, "summary") ||
      getTag(block, "content");

    const linkTag = block.match(
      /<link[^>]*>([\s\S]*?)<\/link>/i
    );

    let url = "";

    if (linkTag) {
      url = decodeXml(cleanText(linkTag[1]));
    }

    if (!url) {
      const hrefMatch = block.match(
        /<link[^>]+href=["']([^"']+)["']/i
      );

      if (hrefMatch) {
        url = decodeXml(hrefMatch[1]);
      }
    }

    const publishedAt =
      getTag(block, "pubDate") ||
      getTag(block, "published") ||
      getTag(block, "updated") ||
      getTag(block, "dc:date");

    const imageUrl = getImageFromBlock(block);

    if (!title || !url || !publishedAt) {
      continue;
    }

    items.push({
      title,
      description,
      source: sourceName,
      url,
      imageUrl,
      publishedAt
    });
  }

  return items;
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
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return "World";
}

function getImportance(
  title,
  description,
  source,
  publishedAt
) {
  const text =
    `${title} ${description}`.toLowerCase();

  let score = 30;

  if (TRUSTED_SOURCES.has(source)) {
    score += 20;
  }

  const majorKeywords = [
    "breaking",
    "urgent",
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
    "hurricane",
    "terror",
    "nuclear"
  ];

  for (const keyword of majorKeywords) {
    if (text.includes(keyword)) {
      score += 5;
    }
  }

  const time = new Date(publishedAt).getTime();

  if (Number.isFinite(time)) {
    const ageHours =
      Math.max(0, Date.now() - time) / 3600000;

    if (ageHours <= 0.5) {
      score += 30;
    } else if (ageHours <= 2) {
      score += 20;
    } else if (ageHours <= 6) {
      score += 10;
    } else if (ageHours <= 12) {
      score += 5;
    }
  }

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

function normalizeArticle(article) {
  const title = cleanText(article.title);
  const description = cleanText(
    article.description || ""
  );
  const source = cleanText(
    article.source || "Unknown"
  );
  const url = String(article.url || "").trim();

  if (!title || !url) {
    return null;
  }

  const publishedDate = new Date(
    article.publishedAt
  );

  if (!Number.isFinite(publishedDate.getTime())) {
    return null;
  }

  const publishedAt =
    publishedDate.toISOString();

  const fingerprint =
    `${title.toLowerCase()}|${source.toLowerCase()}`
      .replace(/[^\w\s|]/g, "")
      .trim();

  return {
    id: createId(fingerprint),
    title,
    description,
    source,
    url,
    imageUrl:
      article.imageUrl ||
      article.image ||
      null,
    publishedAt,
    category:
      article.category ||
      getCategory(`${title} ${description}`),
    importance:
      typeof article.importance === "number"
        ? article.importance
        : getImportance(
            title,
            description,
            source,
            publishedAt
          ),
    verified:
      TRUSTED_SOURCES.has(source),
    sources: [source],
    fetchedAt: new Date().toISOString()
  };
}

function isWithinLast24Hours(article) {
  const time = new Date(
    article.publishedAt
  ).getTime();

  if (!Number.isFinite(time)) {
    return false;
  }

  const age = Date.now() - time;

  return age >= 0 && age <= 24 * 60 * 60 * 1000;
}

function ageMinutes(article) {
  const time = new Date(
    article.publishedAt
  ).getTime();

  if (!Number.isFinite(time)) {
    return Infinity;
  }

  return Math.max(
    0,
    (Date.now() - time) / 60000
  );
}

function mergeDuplicateStories(stories) {
  const groups = new Map();

  for (const story of stories) {
    const key = story.title
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 14)
      .join(" ");

    if (!key) {
      continue;
    }

    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, story);
      continue;
    }

    const sourceSet = new Set([
      ...(existing.sources || []),
      ...(story.sources || []),
      existing.source,
      story.source
    ]);

    const better =
      story.importance > existing.importance ||
      (
        story.importance === existing.importance &&
        new Date(story.publishedAt).getTime() >
          new Date(existing.publishedAt).getTime()
      );

    if (better) {
      story.sources =
        Array.from(sourceSet);

      story.verified =
        existing.verified ||
        story.verified;

      if (!story.imageUrl) {
        story.imageUrl =
          existing.imageUrl || null;
      }

      groups.set(key, story);
    } else {
      existing.sources =
        Array.from(sourceSet);

      existing.verified =
        existing.verified ||
        story.verified;

      if (!existing.imageUrl) {
        existing.imageUrl =
          story.imageUrl || null;
      }
    }
  }

  return Array.from(groups.values());
}

async function fetchNewsAPI() {
  const apiKey =
    process.env.NEWS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const query = encodeURIComponent(
    '"Trump" OR "Bitcoin" OR "crypto" OR "Middle East" OR "Israel" OR "Gaza" OR "Iran" OR "Ukraine" OR "Russia" OR "China" OR "India" OR "AI" OR "technology" OR "Federal Reserve"'
  );

  const from = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const url =
    "https://newsapi.org/v2/everything" +
    `?q=${query}` +
    `&from=${encodeURIComponent(from)}` +
    "&language=en" +
    "&sortBy=publishedAt" +
    "&pageSize=100" +
    `&apiKey=${encodeURIComponent(apiKey)}`;

  try {
    const data = await fetchJson(url);

    return (data.articles || []).map(
      article => ({
        title: article.title,
        description: article.description,
        source:
          article.source?.name || "NewsAPI",
        url: article.url,
        imageUrl: article.urlToImage || null,
        publishedAt: article.publishedAt
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

  const query = encodeURIComponent(
    "Trump OR Bitcoin OR crypto OR Israel OR Gaza OR Iran OR Ukraine OR Russia OR China OR India OR AI OR technology"
  );

  const url =
    "https://gnews.io/api/v4/search" +
    `?q=${query}` +
    "&lang=en" +
    "&max=100" +
    "&sortby=publishedAt" +
    `&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const data = await fetchJson(url);

    return (data.articles || []).map(
      article => ({
        title: article.title,
        description: article.description,
        source:
          article.source?.name || "GNews",
        url: article.url,
        imageUrl: article.image || null,
        publishedAt: article.publishedAt
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

  const query = encodeURIComponent(
    "Trump OR Bitcoin OR crypto OR Middle East OR Israel OR Gaza OR Iran OR Ukraine OR Russia OR China OR India OR AI OR technology OR economy"
  );

  const url =
    "https://content.guardianapis.com/search" +
    `?q=${query}` +
    "&order-by=newest" +
    "&page-size=100" +
    "&show-fields=trailText,thumbnail" +
    `&from-date=${new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString().slice(0, 10)}` +
    `&api-key=${encodeURIComponent(apiKey)}`;

  try {
    const data = await fetchJson(url);

    return (
      data.response?.results || []
    ).map(article => ({
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
      "Guardian request failed:",
      error.message
    );

    return [];
  }
}

async function fetchRSSFeed(feed) {
  try {
    const xml =
      await fetchText(feed.url);

    return parseRSS(
      xml,
      feed.name
    );
  } catch (error) {
    console.error(
      `${feed.name} RSS failed:`,
      error.message
    );

    return [];
  }
}

async function fetchAllRSS() {
  const results =
    await Promise.allSettled(
      RSS_FEEDS.map(fetchRSSFeed)
    );

  const articles = [];

  for (const result of results) {
    if (
      result.status === "fulfilled"
    ) {
      articles.push(
        ...result.value
      );
    }
  }

  return articles;
}

function sortStories(stories) {
  return stories.sort(
    (a, b) => {
      const aAge =
        ageMinutes(a);

      const bAge =
        ageMinutes(b);

      const aFresh =
        aAge <= 30;

      const bFresh =
        bAge <= 30;

      if (
        aFresh !== bFresh
      ) {
        return aFresh ? -1 : 1;
      }

      if (
        aFresh &&
        bFresh &&
        aAge !== bAge
      ) {
        return aAge - bAge;
      }

      if (
        a.importance !==
        b.importance
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
    }
  );
}

export async function collectNews() {
  const results =
    await Promise.allSettled([
      fetchNewsAPI(),
      fetchGNews(),
      fetchGuardian(),
      fetchAllRSS()
    ]);

  const rawArticles = [];

  for (const result of results) {
    if (
      result.status ===
      "fulfilled"
    ) {
      rawArticles.push(
        ...result.value
      );
    }
  }

  console.log(
    `Fetched ${rawArticles.length} raw articles.`
  );

  const normalized =
    rawArticles
      .map(normalizeArticle)
      .filter(Boolean);

  const last24Hours =
    normalized.filter(
      isWithinLast24Hours
    );

  console.log(
    `${last24Hours.length} articles are within the last 24 hours.`
  );

  const unique =
    mergeDuplicateStories(
      last24Hours
    );

  const sorted =
    sortStories(unique);

  const finalStories =
    sorted.slice(0, 100);

  const fresh30 =
    finalStories.filter(
      article =>
        ageMinutes(article) <= 30
    );

  console.log(
    `${fresh30.length} articles are from the last 30 minutes.`
  );

  console.log(
    `${finalStories.length} latest unique stories kept.`
  );

  return finalStories;
}
