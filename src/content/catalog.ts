import { z } from 'zod';
import rawClubs from './clubs.json' with { type: 'json' };
import rawCountries from './countries.json' with { type: 'json' };
import rawCrests from './crests.json' with { type: 'json' };

export const regionSchema = z.enum(['europe', 'asia', 'africa', 'americas']);
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
});
export type ClubId = z.infer<typeof clubIdSchema>;
export type Club = Readonly<z.infer<typeof clubSchema>>;
export type Region = z.infer<typeof regionSchema>;
export const clubs: readonly Club[] = z.array(clubSchema).parse(rawClubs);
export const clubById = new Map(clubs.map((club) => [club.id, club]));
export const clubCrests = z.record(z.string(), z.string()).parse(rawCrests);
export function countryName(id: string, language: 'en' | 'ar') {
  return countries[id]?.[language] ?? id;
}
