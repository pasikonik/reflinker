import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { linksSchema, type CountryCode } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
    const country = (event.url.searchParams.get('country') || 'PL') as CountryCode;

    try {
        const linkRecords = await db
            .select()
            .from(linksSchema)
            .where(eq(linksSchema.country, country))
            .limit(1);

        if (linkRecords.length === 0) {
            // Nie trzeba już dodawać nagłówków CORS tutaj!
            return json({ success: false, error: 'No links found' }, { status: 404 });
        }

        const recordToDelete = linkRecords[0];
        await db.delete(linksSchema).where(eq(linksSchema.link, recordToDelete.link));

        // Ani tutaj!
        return json({ success: true, link: recordToDelete.link });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        // Ani tutaj!
        return json({ success: false, error: 'Failed to fetch the link', details: message }, { status: 500 });
    }
};

// CAŁY HANDLER OPTIONS MOŻESZ STĄD USUNĄĆ