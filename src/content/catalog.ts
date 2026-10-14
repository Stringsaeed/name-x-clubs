import { z } from 'zod';
import rawAmbiguous from './ambiguous.json' with { type: 'json' };
import rawCatalogVersion from './catalog-version.json' with { type: 'json' };
import rawClubs from './clubs.json' with { type: 'json' };
import rawCountries from './countries.json' with { type: 'json' };
import rawCrests from './crests.json' with { type: 'json' };

export const regionSchema = z.enum(['europe', 'asia', 'africa', 'americas', 'oceania']);

export const countrySchema = z.object({
  en: z.string(),
  ar: z.string(),
  flag: z.string(),
  region: regionSchema,
});

export const countries = z.record(z.string(), countrySchema).parse(rawCountries);

export const clubIdSchema = z
  .string()
  .regex(/^[a-z]+-\d+$/)
  .brand<'ClubId'>();

const clubSchema = z.object({
  id: clubIdSchema,
  country: z.string().refine((id) => Object.hasOwn(countries, id)),
  name: z.string().min(1),
  arabic: z.string().min(1),
  aliases: z.array(z.string()),
  region: regionSchema,
  /** Wikidata item id of the club, e.g. `Q9617`. */
  wikidata: z.string().regex(/^Q\d+$/),
  /** Wikipedia language editions that cover the club; the catalog's popularity signal. */
  sitelinks: z.number().int().nonnegative(),
});

/** Identifies this exact club list (`wd-<count>-<hash>`); the ranked backend stores it per round. */
export const catalogVersion = z
  .object({ version: z.string().min(1) })
  .parse(rawCatalogVersion).version;

export type ClubId = z.infer<typeof clubIdSchema>;

export type Club = Readonly<z.infer<typeof clubSchema>>;

export type Region = z.infer<typeof regionSchema>;

export const clubs: readonly Club[] = z.array(clubSchema).parse(rawClubs);

export const clubById = new Map(clubs.map((club) => [club.id, club]));

/**
 * A name that several clubs share, such as "Real" or "النصر". It never counts on its own: the
 * round's scope must narrow `candidates` to exactly one club. `candidates` may be empty when none
 * of the clubs it could mean is in the catalog.
 */
const ambiguousTermSchema = z.object({
  terms: z.array(z.string().min(1)).min(1),
  candidates: z.array(clubIdSchema.refine((id) => clubById.has(id), 'Unknown club id')),
  /**
   * Hand-reviewed groups always ask which club was meant. Auto groups may be dropped when one
   * club is far better known; see `dominantClub`.
   */
  curated: z.boolean().optional(),
});

export type AmbiguousTerm = Readonly<z.infer<typeof ambiguousTermSchema>>;

export const ambiguousTerms: readonly AmbiguousTerm[] = z
  .array(ambiguousTermSchema)
  .parse(rawAmbiguous);

export const clubCrests = z.record(z.string(), z.string()).parse(rawCrests);

export function countryName(id: string, language: 'en' | 'ar') {
  return countries[id]?.[language] ?? id;
}
