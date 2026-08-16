export async function collectNews() {
  console.log(
    "Starting What's Happening news monitor..."
  );

  console.log(
    "Fetching latest major international news..."
  );

  console.log(
    "No 30-minute cutoff. Newest available stories are prioritized."
  );

  const results =
    await Promise.allSettled([
      fetchNewsAPI(),
      fetchGuardian()
    ]);

  const rawArticles =
    results.flatMap(
      result =>
        result.status === "fulfilled"
          ? result.value
          : []
    );

  console.log(
    `Fetched ${rawArticles.length} raw articles.`
  );

  const normalized =
    rawArticles
      .map(normalizeArticle)
      .filter(Boolean);

  console.log(
    `${normalized.length} valid articles after normalization.`
  );

  const unique =
    mergeDuplicates(normalized);

  console.log(
    `${unique.length} unique stories after deduplication.`
  );

  const ranked =
    rankStories(unique);

  console.log(
    `${ranked.length} major international stories passed filtering.`
  );

  const selected =
    selectStories(ranked);

  console.log(
    `Selected ${selected.length} final stories.`
  );

  const storiesWithImages =
    await enrichImages(selected);

  const finalStories =
    storiesWithImages.map(
      story => ({
        ...story,

        age:
          ageLabel(
            story.publishedAt
          ),

        ageMinutes:
          Math.round(
            ageMinutes(
              story.publishedAt
            )
          ),

        imageAvailable:
          Boolean(
            story.imageUrl
          ),

        imageDownloadUrl:
          story.imageUrl ||
          null,

        imageSource:
          story.imageUrl
            ? story.imageSource ||
              story.source
            : null
      })
    );

  await saveJson(
    "data/news.json",
    {
      updatedAt:
        new Date().toISOString(),

      stories:
        finalStories
    }
  );

  console.log(
    `Saved ${finalStories.length} stories to data/news.json.`
  );

  if (!finalStories.length) {
    console.log(
      "No stories available. Existing Tweet posts will be preserved."
    );

    return finalStories;
  }

  const generatedPosts =
    await generateTweetPosts(
      finalStories
    );

  if (
    Array.isArray(generatedPosts) &&
    generatedPosts.length > 0
  ) {
    await saveJson(
      "data/posts.json",
      {
        updatedAt:
          new Date().toISOString(),

        posts:
          generatedPosts
      }
    );

    console.log(
      `Generated and saved ${generatedPosts.length} Tweet Ready posts.`
    );
  } else {
    console.log(
      "No new Tweet posts generated. Existing data/posts.json was preserved."
    );
  }

  console.log(
    "Final selected stories:"
  );

  for (const story of finalStories) {
    console.log(
      `[${story.age}] ${story.category} | ${story.title} | image=${story.imageAvailable}`
    );
  }

  return finalStories;
      }
