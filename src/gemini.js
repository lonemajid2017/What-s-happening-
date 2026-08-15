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
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Gemini API error ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  const text = data.candidates?.[0]?.content?.parts
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

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

export async function generatePosts(stories) {
  if (!Array.isArray(stories) || stories.length === 0) {
    return [];
  }

  const storyData = stories.map((story) => ({
    id: story.id,
    title: story.title,
    description: story.description || "",
    source: story.source || "",
    category: story.category || "",
    url: story.url || ""
  }));

  const prompt = `
You are an expert X/Twitter content writer.

Create one high-quality X post for every news story below.

Rules:
- Write in natural English.
- Make each post informative and engaging.
- Do not invent facts.
- Do not use hashtags.
- Do not use emojis.
- Keep each post concise.
- Do not mention that AI generated the post.
- Preserve the story ID exactly.
- Return ONLY valid JSON.
- Return an array.
- Each item must contain exactly these fields:
  storyId
  post

News stories:

${JSON.stringify(storyData, null, 2)}
`;

  const text = await callGemini(prompt);
  const result = extractJson(text);

  if (!Array.isArray(result)) {
    throw new Error("Gemini posts response is not an array");
  }

  return result
    .filter(
      (item) =>
        item &&
        typeof item.storyId === "string" &&
        typeof item.post === "string" &&
        item.post.trim().length > 0
    )
    .map((item) => ({
      storyId: item.storyId,
      post: item.post.trim()
    }));
}

export async function generateReplies(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    return [];
  }

  const prompt = `
Create one short, useful reply for each X post below.

Rules:
- Natural English.
- No hashtags.
- No emojis.
- Do not spam.
- Do not make unsupported claims.
- Return ONLY valid JSON.
- Each item must contain:
  postId
  reply

Posts:

${JSON.stringify(posts, null, 2)}
`;

  const text = await callGemini(prompt);
  const result = extractJson(text);

  if (!Array.isArray(result)) {
    throw new Error("Gemini replies response is not an array");
  }

  return result
    .filter(
      (item) =>
        item &&
        typeof item.postId === "string" &&
        typeof item.reply === "string"
    )
    .map((item) => ({
      postId: item.postId,
      reply: item.reply.trim()
    }));
}
