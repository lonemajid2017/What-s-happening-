const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODEL = "gemini-3.6-flash";

const API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function cleanJsonText(text) {
  if (!text) return "";

  let value = String(text).trim();

  value = value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstArray = value.indexOf("[");
  const lastArray = value.lastIndexOf("]");

  if (
    firstArray !== -1 &&
    lastArray !== -1 &&
    lastArray > firstArray
  ) {
    value = value.slice(firstArray, lastArray + 1);
  }

  return value.trim();
}

function getResponseText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text || "")
      .join("") || ""
  );
}

function validatePosts(posts, stories) {
  if (!Array.isArray(posts)) {
    return [];
  }

  const storyIds = new Set(
    stories.map(story => String(story.id))
  );

  return posts
    .map(item => ({
      storyId: String(item?.storyId || ""),
      post: String(item?.post || "").trim()
    }))
    .filter(item => {
      if (!item.storyId) {
        return false;
      }

      if (!storyIds.has(item.storyId)) {
        return false;
      }

      if (!item.post) {
        return false;
      }

      return true;
    });
}

export async function generatePosts(stories) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  if (!Array.isArray(stories)) {
    throw new Error(
      "Stories must be an array."
    );
  }

  if (stories.length === 0) {
    return [];
  }

  const selectedStories =
    stories.slice(0, 12);

  const compactStories =
    selectedStories.map(story => ({
      storyId: String(story.id),
      title: story.title || "",
      description:
        story.description || "",
      source:
        story.source || "Unknown",
      publishedAt:
        story.publishedAt || "",
      category:
        story.category || "World",
      importance:
        story.importance || 0
    }));

  const prompt = `
You are an expert X/Twitter news writer.

Create ONE original X post for each news story below.

Rules:

1. Return ONLY valid JSON.
2. Return a JSON array.
3. Every object must contain exactly:
   "storyId"
   "post"
4. storyId must exactly match the supplied storyId.
5. Do not invent facts.
6. Use only information contained in the supplied story.
7. Keep each post concise and natural.
8. Write for X/Twitter.
9. Do not use hashtags.
10. Do not use emojis.
11. Do not write "breaking" unless the story clearly indicates it.
12. Do not copy the article description word for word.
13. Rewrite the information in original wording.
14. Do not include the article URL inside the post.
15. Mention the source when useful.
16. Do not create multiple posts for one story.
17. Do not add explanations outside the JSON array.

Stories:

${JSON.stringify(
  compactStories,
  null,
  2
)}
`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],

    generationConfig: {
      responseMimeType:
        "application/json",

      responseSchema: {
        type: "array",

        items: {
          type: "object",

          properties: {
            storyId: {
              type: "string"
            },

            post: {
              type: "string"
            }
          },

          required: [
            "storyId",
            "post"
          ]
        }
      }
    }
  };

  let response;

  try {
    response = await fetch(
      API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            GEMINI_API_KEY
        },

        body: JSON.stringify(body)
      }
    );
  } catch (error) {
    throw new Error(
      `Gemini network request failed: ${error.message}`
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Gemini returned a non-JSON response with HTTP ${response.status}.`
    );
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      "Unknown Gemini API error.";

    throw new Error(
      `Gemini API error ${response.status}: ${message}`
    );
  }

  const text =
    getResponseText(data);

  if (!text) {
    const reason =
      data?.candidates?.[0]?.finishReason ||
      data?.promptFeedback?.blockReason ||
      "No response text";

    throw new Error(
      `Gemini returned no text. Reason: ${reason}`
    );
  }

  let parsed;

  try {
    parsed =
      JSON.parse(
        cleanJsonText(text)
      );
  } catch {
    console.error(
      "Gemini raw response:",
      text
    );

    throw new Error(
      "Gemini returned invalid JSON."
    );
  }

  const posts =
    validatePosts(
      parsed,
      selectedStories
    );

  if (posts.length === 0) {
    throw new Error(
      "Gemini returned JSON, but no valid Tweet posts were found."
    );
  }

  return posts;
}

// Keeps compatibility with existing monitor code.
export const generateTweetPosts =
  generatePosts;
