const GEMINI_MODEL = "gemini-3.6-flash";

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
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
  maxOutputTokens: 2048
      }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Gemini API error ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

function extractJson(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Gemini did not return valid JSON");
    }

    return JSON.parse(
      cleaned.slice(start, end + 1)
    );
  }
}

export async function generatePosts(stories) {
  if (!Array.isArray(stories) || stories.length === 0) {
    return [];
  }

  const newsData = stories.map((story) => ({
    id: story.id,
    title: story.title,
    description: story.description,
    source: story.source,
    sources: story.sources || [story.source],
    url: story.url,
    category: story.category,
    importance: story.importance,
    publishedAt: story.publishedAt
  }));

  const prompt = `
You are the editorial AI for an X account called "What's Happening".

Your job is to turn verified news information into original, factual X posts.

STRICT RULES:

1. Use ONLY the facts supplied in the news data.
2. Never invent facts.
3. Never invent quotes.
4. Never copy article wording.
5. Never exaggerate.
6. Never create a post just to meet a quota.
7. If a story is weak or unclear, do not create a post for it.
8. Prioritize important breaking and high-impact stories.
9. Keep the language natural and concise.
10. Every post must include the source attribution.
11. Use the exact supplied source name.
12. If multiple independent sources are supplied, use:
   "Sources: Reuters, AP"
13. If only one source is supplied, use:
   "Source: Reuters"
14. Never write "Verified by Gemini".
15. Never claim something is confirmed unless the supplied data supports it.
16. Do not mention that you are an AI.
17. Do not use hashtags unless genuinely necessary.
18. Avoid clickbait.
19. Avoid generic wording.
20. The final post should normally stay below 280 characters including the source attribution.

STYLE:

Write like a fast, credible global news account on X.

Lead with the most important fact.

For breaking news, be direct.

For finance and crypto, include the important market fact when supplied.

For Trump and US politics, clearly state what happened without partisan language.

For Middle East and geopolitical stories, avoid inflammatory wording and unsupported claims.

For AI and technology, focus on what actually changed or was announced.

Return ONLY valid JSON.

Return an array using exactly this structure:

[
  {
    "storyId": "story-id",
    "post": "Original X post here"
  }
]

NEWS DATA:

${JSON.stringify(newsData, null, 2)}
`;

  const response = await callGemini(prompt);
  const parsed = extractJson(response);

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not an array");
  }

  return parsed
    .map((item) => ({
      storyId: String(item.storyId || "").trim(),
      post: String(item.post || "").trim()
    }))
    .filter(
      (item) =>
        item.storyId.length > 0 &&
        item.post.length > 0
    );
}

export async function generateReplies(postText) {
  const text = String(postText || "").trim();

  if (!text) {
    throw new Error("X post text is required");
  }

  const prompt = `
You generate useful replies for an X account.

Generate exactly 3 different replies to the following X post.

Reply 1:
Informative

Reply 2:
Conversational

Reply 3:
Insightful

RULES:

1. Each reply must add something useful.
2. Do not write "Great post".
3. Do not write generic praise.
4. Do not invent facts.
5. Do not make unsupported claims.
6. Do not be unnecessarily argumentative.
7. Keep replies natural and human.
8. Do not use hashtags unless necessary.
9. Do not mention that you are AI.
10. Keep each reply concise.

Return ONLY valid JSON.

Required format:

[
  {
    "style": "Informative",
    "reply": "..."
  },
  {
    "style": "Conversational",
    "reply": "..."
  },
  {
    "style": "Insightful",
    "reply": "..."
  }
]

X POST:

${text}
`;

  const response = await callGemini(prompt);
  const parsed = extractJson(response);

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini reply response is not an array");
  }

  return parsed
    .slice(0, 3)
    .map((item) => ({
      style: String(item.style || "").trim(),
      reply: String(item.reply || "").trim()
    }))
    .filter((item) => item.reply.length > 0);
      }
