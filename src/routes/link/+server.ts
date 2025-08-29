import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { linksSchema, type CountryCode } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Zmienna przechowująca dozwoloną domenę
const allowedOrigin = 'https://witalnosci.pl';

export const GET: RequestHandler = async (event) => {
    // Extract the `country` parameter from the query string
    const country = (event.url.searchParams.get('country') || 'PL') as CountryCode;

    try {
        // Fetch the first link for the specified country
        const linkRecords = await db
            .select()
            .from(linksSchema)
            .where(eq(linksSchema.country, country))
            .limit(1);

        // If no link is found, return a 404 response
        if (linkRecords.length === 0) {
            return json({ success: false, error: 'No links found for the specified country' }, { 
                status: 404,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin }
            });
        }

        const recordToDelete = linkRecords[0];

        await db.delete(linksSchema).where(eq(linksSchema.link, recordToDelete.link));

        return json({ success: true, link: recordToDelete.link }, {
            headers: { 'Access-Control-Allow-Origin': allowedOrigin }
        });
    } catch (error) {
        // Handle any errors during the database query
        return json(
            {
                success: false,
                error: 'Failed to fetch the link',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { 
                status: 500,
                headers: { 'Access-Control-Allow-Origin': allowedOrigin }
            }
        );
    }
};

// --- DODANA OBSŁUGA METODY OPTIONS (KLUCZOWE DLA CORS) ---
export const OPTIONS: RequestHandler = async () => {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With'
        }
    });
};