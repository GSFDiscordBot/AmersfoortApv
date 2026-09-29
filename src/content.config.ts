import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Elke regelset (apv, wetboek, ...) is een map in src/content/regels/.
// Elk hoofdstuk is één .yaml-bestand met daarin de artikelen.
const regels = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/regels' }),
  schema: z.object({
    titel: z.string(),
    volgorde: z.number().default(0),
    intro: z.string().optional(),
    artikelen: z
      .array(
        z.object({
          nr: z.string(),
          titel: z.string(),
          tekst: z.string(),
          categorie: z.string().optional(),
          niveau: z.enum(['licht', 'middel', 'zwaar']).optional(),
          boete: z.number().optional(),
          straf: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

export const collections = { regels };
