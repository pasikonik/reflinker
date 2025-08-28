import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { linksSchema, type CountryCode } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(event: RequestEvent) {
    // Extract the `country` parameter from the query string
    const country = (event.url.searchParams.get('country') || 'PL') as CountryCode;

    try {
        // Fetch the first link for the specified country
        const linkRecord = await db
            .select()
            .from(linksSchema)
            .where(eq(linksSchema.country, country))
            .limit(1);

        // If no link is found, return a 404 response
        if (linkRecord.length === 0) {
            return json({ success: false, error: 'No links found for the specified country' }, { status: 404 });
        }

        // Return the link in the response
        return json({ success: true, link: linkRecord[0].link });
    } catch (error) {
        // Handle any errors during the database query
        return json(
            {
                success: false,
                error: 'Failed to fetch the link',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}