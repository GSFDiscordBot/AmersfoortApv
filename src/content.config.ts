import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Elk regelboek is één Markdown-bestand in src/content/regels/ (apv.md, wetboek.md, ...).
// Koppen bepalen de structuur: "## Hoofdstuk" en "### Artikel ..." worden kaarten.
const regels = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/regels' }),
  schema: z.object({}).passthrough(),
});

export const collections = { regels };
