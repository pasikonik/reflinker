// src/hooks.server.ts
import { initCronJobs } from '$lib/server/cron';
import type { Handle } from '@sveltejs/kit';

// Domena, której zezwalasz na dostęp
const allowedOrigin = 'https://witalnosci.pl';

// Inicjalizacja cron jobs - pozostaje bez zmian
initCronJobs();

// Rozbudowana funkcja handle do obsługi CORS
export const handle: Handle = async ({ event, resolve }) => {
    // 1. Obsługa zapytania przedwstępnego (Preflight OPTIONS)
    // Przeglądarka wysyła je, by zapytać o pozwolenie przed właściwym zapytaniem
    if (event.request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Headers': 'Content-Type, Authorization' // Dodaj inne, jeśli są potrzebne
            }
        });
    }

    // 2. Obsługa właściwego zapytania (GET, POST, etc.)
    // Pozwól SvelteKit normalnie przetworzyć zapytanie...
    const response = await resolve(event);

    // ...a następnie dodaj nagłówek CORS do odpowiedzi, która zostanie wysłana do przeglądarki.
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);

    return response;
};