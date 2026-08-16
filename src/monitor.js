export async function collectNews() {
  console.log("Starting What's Happening news monitor...");
  console.log("Fetching latest major international news...");

  const results = await Promise.allSettled([
    fetchNewsAPI(),
    fetchGuardian()
  ]);

  const rawArticles = results.flatMap(result =>
    result.status === "fulfilled" && Array.isArray(result.value)
      ? result.value
      : []
  );

  console.log(`Fetched ${rawArticles.length} raw articles.`);

  const normalized = rawArticles
    .map(normalizeArticle)
    .filter(Boolean);

  const unique = mergeDuplicates(normalized);
  const ranked = rankStories(unique);
  const selected = selectStories(ranked);

  console.log(`Selected ${selected.length} final stories.`);

  const storiesWithImages = await enrichImages(selected);

  const finalStories = storiesWithImages.map(story => ({
    ...story,
    age: ageLabel(story.publishedAt),
    ageMinutes: Math.round(ageMinutes(story.publishedAt)),
    imageAvailable: Boolean(story.imageUrl),
    imageDownloadUrl: story.imageUrl || null,
    imageSource: story.imageUrl
      ? story.imageSource || story.source
      : null
  }));

  await saveJson("data/news.json", {
    updatedAt: new Date().toISOString(),
    stories: finalStories
  });

  console.log(`Saved ${finalStories.length} stories to data/news.json.`);

  if (!finalStories.length) {
    console.log("No stories available.");
    return finalStories;
  }

  try {
    const generatedPosts = await generatePosts(finalStories);

    if (Array.isArray(generatedPosts) && generatedPosts.length > 0) {
      await saveJson("data/posts.json", {
        updatedAt: new Date().toISOString(),
        posts: generatedPosts
      });

      console.log(
        `Generated and saved ${generatedPosts.length} Tweet Ready posts.`
      );
    }
  } catch (error) {
    console.error("Tweet generation failed:", error);
  }

  return finalStories;
}
