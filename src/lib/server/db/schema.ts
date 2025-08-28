import { numeric, pgTable, timestamp, varchar, pgEnum } from 'drizzle-orm/pg-core';

export const CountryMappingEnum = {
	PL: 'Polska',
	HU: 'Węgry',
	CZ: 'Republika Czeska',
	SK: 'Słowacja',
	DE: 'Niemcy',
	AT: 'Austria',
	NL: 'Niderlandy'
} as const;

// Get the keys (country codes) as a const array
export const CountryCodes = Object.keys(CountryMappingEnum) as (keyof typeof CountryMappingEnum)[];
// Get the values (country names) as a const array
export const CountryNames = Object.values(
	CountryMappingEnum
) as (typeof CountryMappingEnum)[keyof typeof CountryMappingEnum][];

// Use CountryNames for the enum
export const CountryEnum = pgEnum('country', CountryCodes as [string, ...string[]]);

export const linksSchema = pgTable('links', {
	createdAt: timestamp('created_at').defaultNow(),
	link: varchar('link').notNull().unique(),
	country: CountryEnum('country').notNull().$type<CountryCode>().default('PL')
});

export const analyticsSchema = pgTable('analytics', {
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	numberOfAvailableLinks: numeric('number_of_available_links').notNull(),
	country: CountryEnum('country').notNull().$type<CountryCode>().default('PL')
});

// Example usage:
export type CountryCode = (typeof CountryCodes)[number]; // 'PL' | 'HU' | 'CZ' | etc.
export type CountryName = (typeof CountryNames)[number]; // 'Polska' | 'Węgry' | 'Republika Czeska' | etc.
