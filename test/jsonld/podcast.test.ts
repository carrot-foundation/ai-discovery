import { describe, expect, it } from "vitest";
import { podcastEpisode, podcastSeries } from "../../src/jsonld/index.js";

describe("podcastSeries", () => {
  it("returns a Schema.org PodcastSeries node", () => {
    const node = podcastSeries({
      url: "https://podcast.carrot.eco",
      name: "The Carrot Podcast",
      description: "Conversations on climate impact.",
      inLanguage: ["en", "pt-BR"],
      image: "https://podcast.carrot.eco/cover.png",
      webFeed: "https://podcast.carrot.eco/feed.xml",
      author: {
        name: "Carrot Foundation",
        url: "https://carrot.eco",
      },
      sameAs: [
        "https://open.spotify.com/show/carrot",
        "https://www.youtube.com/@carrot",
      ],
    });

    expect(node["@type"]).toBe("PodcastSeries");
    expect(node["@id"]).toMatch(
      /^https:\/\/podcast\.carrot\.eco\/#podcast-series-/u,
    );
    expect(node.name).toBe("The Carrot Podcast");
    expect(node.inLanguage).toEqual(["en", "pt-BR"]);
    expect(node.webFeed).toBe("https://podcast.carrot.eco/feed.xml");
    expect(node.sameAs).toEqual([
      "https://open.spotify.com/show/carrot",
      "https://www.youtube.com/@carrot",
    ]);
    expect((node.author as Record<string, unknown>)["@type"]).toBe("Person");
  });

  it("omits optional fields when absent", () => {
    const node = podcastSeries({
      url: "https://podcast.carrot.eco",
      name: "The Carrot Podcast",
      description: "Conversations on climate impact.",
      inLanguage: ["en"],
      image: "https://podcast.carrot.eco/cover.png",
    });

    expect(node.webFeed).toBeUndefined();
    expect(node.author).toBeUndefined();
    expect(node.sameAs).toBeUndefined();
  });
});

describe("podcastEpisode", () => {
  const validEpisode = {
    url: "https://podcast.carrot.eco/en/episodes/ep01",
    name: "Methane: the fastest lever",
    description: "Why methane mitigation matters now.",
    datePublished: "2026-01-15",
    duration: "PT45M",
    episodeNumber: 1,
    image: "https://podcast.carrot.eco/episodes/ep01.png",
    inLanguage: "en",
    partOfSeries: {
      name: "The Carrot Podcast",
      url: "https://podcast.carrot.eco",
    },
  } as const;

  it("returns a Schema.org PodcastEpisode node", () => {
    const node = podcastEpisode(validEpisode);

    expect(node["@type"]).toBe("PodcastEpisode");
    expect(node["@id"]).toMatch(
      /^https:\/\/podcast\.carrot\.eco\/en\/episodes\/ep01\/#podcast-episode-/u,
    );
    expect(node.episodeNumber).toBe(1);
    expect(node.datePublished).toBe("2026-01-15");
    expect((node.partOfSeries as Record<string, unknown>)["@type"]).toBe(
      "PodcastSeries",
    );
  });

  it("includes optional transcript, media, and platform links", () => {
    const node = podcastEpisode({
      ...validEpisode,
      transcript: "https://podcast.carrot.eco/en/episodes/ep01/transcript",
      associatedMedia: [
        {
          contentUrl: "https://podcast.carrot.eco/audio/ep01.mp3",
          encodingFormat: "audio/mpeg",
        },
      ],
      sameAs: [
        "https://open.spotify.com/episode/carrot-ep01",
        "https://www.youtube.com/watch?v=carrot-ep01",
      ],
    });

    expect(node.transcript).toBe(
      "https://podcast.carrot.eco/en/episodes/ep01/transcript",
    );
    expect(node.sameAs).toEqual([
      "https://open.spotify.com/episode/carrot-ep01",
      "https://www.youtube.com/watch?v=carrot-ep01",
    ]);
    expect(node.associatedMedia).toEqual([
      {
        "@type": "MediaObject",
        contentUrl: "https://podcast.carrot.eco/audio/ep01.mp3",
        encodingFormat: "audio/mpeg",
      },
    ]);
  });

  it("rejects invalid podcast inputs", () => {
    expect(() =>
      podcastEpisode({ ...validEpisode, duration: "45min" }),
    ).toThrow();
    expect(() =>
      podcastEpisode({
        ...validEpisode,
        sameAs: ["not-a-url"],
      }),
    ).toThrow();
    expect(() =>
      podcastSeries({
        url: "https://podcast.carrot.eco",
        name: "The Carrot Podcast",
        description: "Conversations on climate impact.",
        inLanguage: ["english"],
        image: "https://podcast.carrot.eco/cover.png",
      }),
    ).toThrow();
  });
});
