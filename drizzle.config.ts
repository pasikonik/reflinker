import { defineConfig } from 'drizzle-kit';
import './scripts/set-env';

console.log('===============================================');
console.log(process.env.NODE_ENV === 'development' ? 'development' : 'production', 'environent');
console.log('===============================================');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
