import { z } from "zod";
import { isoDate, isoDuration, language, schemaId, url } from "./types.js";

const authorSchema = z.object({
  name: z.string().min(1),
  url: url.optional(),
});

const podcastSeriesSchema = z.object({
  url,
  name: z.string().min(1),
  description: z.string().min(1),
  inLanguage: z.array(language).min(1),
  image: url,
  webFeed: url.optional(),
  author: authorSchema.optional(),
  sameAs: z.array(url).default([]),
});

export type PodcastSeriesInput = z.input<typeof podcastSeriesSchema>;

export const podcastSeries = (
  input: PodcastSeriesInput,
): Record<string, unknown> => {
  const parsed = podcastSeriesSchema.parse(input);
  const node: Record<string, unknown> = {
    "@type": "PodcastSeries",
    "@id": schemaId(parsed.url, "podcast-series"),
    url: parsed.url,
    name: parsed.name,
    description: parsed.description,
    inLanguage: parsed.inLanguage,
    image: parsed.image,
  };
  if (parsed.webFeed !== undefined) node.webFeed = parsed.webFeed;
  if (parsed.author !== undefined) {
    node.author = {
      "@type": "Person",
      name: parsed.author.name,
      ...(parsed.author.url !== undefined && { url: parsed.author.url }),
    };
  }
  if (parsed.sameAs.length > 0) node.sameAs = parsed.sameAs;
  return node;
};

const associatedMediaSchema = z.object({
  contentUrl: url,
  encodingFormat: z.string().min(1).optional(),
});

const podcastEpisodeSchema = z.object({
  url,
  name: z.string().min(1),
  description: z.string().min(1),
  datePublished: isoDate,
  duration: isoDuration,
  episodeNumber: z.number().int().positive(),
  image: url,
  inLanguage: language,
  partOfSeries: z.object({
    name: z.string().min(1),
    url,
  }),
  associatedMedia: z.array(associatedMediaSchema).default([]),
  transcript: url.optional(),
  sameAs: z.array(url).default([]),
});

export type PodcastEpisodeInput = z.input<typeof podcastEpisodeSchema>;

export const podcastEpisode = (
  input: PodcastEpisodeInput,
): Record<string, unknown> => {
  const parsed = podcastEpisodeSchema.parse(input);
  const node: Record<string, unknown> = {
    "@type": "PodcastEpisode",
    "@id": schemaId(parsed.url, "podcast-episode"),
    url: parsed.url,
    name: parsed.name,
    description: parsed.description,
    datePublished: parsed.datePublished,
    duration: parsed.duration,
    episodeNumber: parsed.episodeNumber,
    image: parsed.image,
    inLanguage: parsed.inLanguage,
    partOfSeries: {
      "@type": "PodcastSeries",
      "@id": schemaId(parsed.partOfSeries.url, "podcast-series"),
      name: parsed.partOfSeries.name,
      url: parsed.partOfSeries.url,
    },
  };
  if (parsed.associatedMedia.length > 0) {
    node.associatedMedia = parsed.associatedMedia.map((media) => ({
      "@type": "MediaObject",
      contentUrl: media.contentUrl,
      ...(media.encodingFormat !== undefined && {
        encodingFormat: media.encodingFormat,
      }),
    }));
  }
  if (parsed.transcript !== undefined) node.transcript = parsed.transcript;
  if (parsed.sameAs.length > 0) node.sameAs = parsed.sameAs;
  return node;
};
